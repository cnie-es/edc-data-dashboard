/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  This program and the accompanying materials are made available under the
 *  terms of the Apache License, Version 2.0 which is available at
 *  https://www.apache.org/licenses/LICENSE-2.0
 *
 *  SPDX-License-Identifier: Apache-2.0
 *
 *  Contributors:
 *       Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V. - initial API and implementation
 *
 */

import { Injectable, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, filter, firstValueFrom, timeout } from 'rxjs';
import { EdcConnectorClient, EdcConnectorClientError } from '@think-it-labs/edc-connector-client';
import { EdcConfig } from '../models/edc-config';
import { DASHBOARD_EDC_BEARER_TOKEN_PROVIDER } from '../models/edc-bearer-token-provider';

@Injectable({
  providedIn: 'root',
})
export class EdcClientService implements OnDestroy {
  private readonly bearerTokenProvider = inject(DASHBOARD_EDC_BEARER_TOKEN_PROVIDER);
  /**
   * Maximum time to wait (ms) for the EDC client service to return a client.
   * @private
   */
  private clientTimeoutMs = 1000;
  /**
   * Health check interval for the current edc client in seconds .
   * @private
   */
  private healthCheckInterval = 30;

  private readonly _client = new BehaviorSubject<EdcConnectorClient | undefined>(undefined);
  /**
   * Config and bearer token the current dashboard client was built with. The token is baked into
   * the client, so {@link getClient} rebuilds it once the provider hands out a renewed token.
   */
  private clientConfig?: EdcConfig;
  private clientBearerToken?: string;
  private readonly _isHealthy: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  readonly isHealthy$ = this._isHealthy.asObservable();

  private healthCheckJob?: ReturnType<typeof setInterval>;

  /**
   * Asynchronously retrieves the {@link EdcConnectorClient} instance.
   * Waits until a client is available or the operation times out ({@link clientTimeoutMs}).
   *
   * @returns A promise that resolves to the {@link EdcConnectorClient} instance.
   * @throws Error If no client is available within the specified timeout period.
   */
  public async getClient(): Promise<EdcConnectorClient> {
    const client = await firstValueFrom(
      this._client.asObservable().pipe(
        filter(x => x !== undefined),
        timeout(this.clientTimeoutMs),
      ),
    ).catch(() => {
      throw new Error(`[${this.constructor.name}] An EDC client is requested, but no client was created yet.`);
    });
    return this.withFreshBearerToken(client);
  }

  /**
   * Rebuilds the dashboard client when the bearer token changed since it was created; otherwise
   * requests made after the access token expires (e.g. after a long session) fail with 401 until reload.
   */
  private async withFreshBearerToken(client: EdcConnectorClient): Promise<EdcConnectorClient> {
    const config = this.clientConfig;
    if (!config) {
      return client;
    }
    const bearerToken = await this.bearerTokenProvider.getBearerToken();
    if (bearerToken === this.clientBearerToken || config !== this.clientConfig) {
      return this._client.getValue() ?? client;
    }
    const refreshed = this.buildEdcConnectorClient(config, bearerToken);
    this.clientBearerToken = bearerToken;
    this._client.next(refreshed);
    return refreshed;
  }

  /**
   * Creates an instance of the {@link EdcConnectorClient} using the provided configuration.
   * This method initializes the client with the specified URLs and optional parameters.
   * Once the client is created, it updates the internal client subject.
   *
   * @param config - The configuration object containing URLs and optional parameters for the EDC client.
   * @param config.managementUrl - The management URL for the EDC client.
   * @param config.defaultUrl - The default URL for the EDC client.
   * @param config.protocolUrl - The protocol URL for the EDC client.
   * @param config.federatedCatalogEnabled - Whether this connector has an FC or not.
   * @param config.controlUrl - (Optional) The control URL for the EDC client.
   * @param config.federatedCatalogUrl - (Optional) The federated catalog URL for the EDC client.
   */
  public async setDashboardClient(config: EdcConfig): Promise<void> {
    this.assertValidConfig(config);
    const bearerToken = await this.bearerTokenProvider.getBearerToken();
    this.clientConfig = config;
    this.clientBearerToken = bearerToken;
    this._client.next(this.buildEdcConnectorClient(config, bearerToken));
    this.startHealthCheckJob();

    console.debug(`[${this.constructor.name}] Client created for connector config: ${JSON.stringify(config)}`);
  }

  /**
   * Create a client WITHOUT setting it as the current dashboard client.
   * Resolves the bearer token from the injected provider; falls back to
   * {@code config.apiToken} when no bearer token is available.
   * @param {EdcConfig} config
   */
  public async createEdcConnectorClient(config: EdcConfig): Promise<EdcConnectorClient> {
    this.assertValidConfig(config);
    return this.buildEdcConnectorClient(config, await this.bearerTokenProvider.getBearerToken());
  }

  private assertValidConfig(config: EdcConfig): void {
    if (!config.protocolUrl || !config.managementUrl || !config.defaultUrl)
      throw new Error(
        `[${this.constructor.name}] EDC client creation failed. Missing protocolUrl, defaultUrl or managementUrl in config: ${JSON.stringify(
          config,
        )}`,
      );
  }

  private buildEdcConnectorClient(config: EdcConfig, bearerToken: string | undefined): EdcConnectorClient {
    const connector = new EdcConnectorClient.Builder()
      .managementUrl(config.managementUrl)
      .defaultUrl(config.defaultUrl)
      .protocolUrl(config.protocolUrl);
    if (bearerToken) connector.apiToken(bearerToken);
    if (config.controlUrl) connector.controlUrl(config.controlUrl);
    if (config.federatedCatalogUrl) connector.federatedCatalogUrl(config.federatedCatalogUrl);
    return connector.build();
  }

  /**
   * Sets the maximum time to wait for an EDC client in {@link getClient}.
   *
   * @param ms - The timeout in milliseconds.
   */
  public setClientTimeoutMs(ms: number): void {
    this.clientTimeoutMs = ms;
  }

  /**
   * Sets the interval for the health check process.
   *
   * @param {number} interval - The interval time in milliseconds to set for health checks.
   * @return {void} This method does not return a value.
   */
  public setHealthCheckInterval(interval: number): void {
    this.healthCheckInterval = interval;
    this.stopHealthCheckJob();
    this.startHealthCheckJob();
  }

  private runHealthCheck(edcConfig?: EdcConfig): void {
    if (this._client.getValue() || edcConfig) {
      const clientPromise = edcConfig
        ? this.createEdcConnectorClient(edcConfig)
        : Promise.resolve(this._client.getValue());
      clientPromise
        .then(client => {
          client?.observability
            .checkHealth()
            .then(healthStatus => {
              if (client === this._client.getValue() && healthStatus.isSystemHealthy !== this._isHealthy.getValue()) {
                this._isHealthy.next(healthStatus.isSystemHealthy);
              }
            })
            .catch((e: EdcConnectorClientError) => {
              if (client === this._client.getValue()) {
                console.error(`[${this.constructor.name}] Health check failed: ${e.message}`);
                this._isHealthy.next(false);
              }
            });
        })
        .catch((e: Error) => {
          console.error(`[${this.constructor.name}] Failed to build client for health check: ${e.message}`);
        });
    } else {
      console.warn(`[${this.constructor.name}] Health check requested with undefined edc client.`);
    }
  }

  private startHealthCheckJob(): void {
    this.stopHealthCheckJob();
    this._isHealthy.next(false);
    this.healthCheckJob = setInterval(this.runHealthCheck.bind(this), this.healthCheckInterval * 1000);
    this.runHealthCheck();
  }

  private stopHealthCheckJob(): void {
    if (this.healthCheckJob) {
      clearInterval(this.healthCheckJob);
      this.healthCheckJob = undefined;
    }
  }

  ngOnDestroy() {
    this._client.complete();
    this._isHealthy.complete();
    this.stopHealthCheckJob();
  }
}

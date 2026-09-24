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

import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { EdcConnectorClientError, EdcConnectorClientErrorType } from '@think-it-labs/edc-connector-client';
import { ModalAndAlertService } from './modal-and-alert.service';

export type ErrorSeverity = 'error' | 'warning' | 'info';

export interface ResolvedDashboardError {
  messageKey: string;
  params?: Record<string, string | number>;
  severity: ErrorSeverity;
  /** For logging only; never show raw to users by default */
  debugMessage?: string;
}

export class DashboardResolvableError extends Error {
  readonly resolved: ResolvedDashboardError;

  constructor(resolved: ResolvedDashboardError) {
    super(resolved.debugMessage ?? resolved.messageKey);
    this.name = 'DashboardResolvableError';
    this.resolved = resolved;
  }
}

export interface DashboardErrorResolveContext {
  domain?: string;
}

export interface DashboardErrorShowToastOptions {
  titleKey?: string;
  seconds?: number;
  domain?: string;
}

export interface DashboardErrorShowInlineOptions {
  domain?: string;
}

const EDC_ERROR_TYPE_KEYS: Record<string, string> = {
  [EdcConnectorClientErrorType.Unknown]: 'common.errors.edc.unknown',
  [EdcConnectorClientErrorType.Duplicate]: 'common.errors.edc.duplicate',
  [EdcConnectorClientErrorType.NotFound]: 'common.errors.edc.notFound',
  [EdcConnectorClientErrorType.BadRequest]: 'common.errors.edc.badRequest',
  [EdcConnectorClientErrorType.Unreachable]: 'common.errors.edc.unreachable',
  [EdcConnectorClientErrorType.BadGateway]: 'common.errors.edc.badGateway',
};

@Injectable({
  providedIn: 'root',
})
export class DashboardErrorService {
  private readonly translate = inject(TranslateService);
  private readonly modalAndAlert = inject(ModalAndAlertService);

  resolve(error: unknown, context?: DashboardErrorResolveContext): ResolvedDashboardError {
    if (error instanceof DashboardResolvableError) {
      return error.resolved;
    }

    if (error instanceof HttpErrorResponse) {
      return this.resolveHttpError(error);
    }

    if (error instanceof EdcConnectorClientError) {
      return this.resolveEdcError(error);
    }

    return this.resolveGeneric(error, context);
  }

  private resolveGeneric(error: unknown, context?: DashboardErrorResolveContext): ResolvedDashboardError {
    void context?.domain;
    return {
      messageKey: 'common.errors.generic',
      severity: 'error',
      debugMessage: this.extractDebugMessage(error),
    };
  }

  toUserMessage(resolved: ResolvedDashboardError): string {
    return this.translate.instant(resolved.messageKey, resolved.params);
  }

  showInline(error: unknown, options?: DashboardErrorShowInlineOptions): ResolvedDashboardError {
    return this.resolve(error, options?.domain ? { domain: options.domain } : undefined);
  }

  showToast(error: unknown, options?: DashboardErrorShowToastOptions): void {
    const resolved = this.resolve(error, options?.domain ? { domain: options.domain } : undefined);
    const msg = this.toUserMessage(resolved);
    const title = this.translate.instant(options?.titleKey ?? 'common.error.title');
    this.modalAndAlert.showAlert(msg, title, 'error', options?.seconds ?? 5);
  }

  private resolveHttpError(error: HttpErrorResponse): ResolvedDashboardError {
    const debugMessage = error.message || error.statusText;

    if (error.status === 401) {
      return { messageKey: 'common.errors.http.sessionExpired', severity: 'error', debugMessage };
    }
    if (error.status === 403) {
      return { messageKey: 'common.errors.http.forbidden', severity: 'error', debugMessage };
    }
    if (error.status === 404) {
      return { messageKey: 'common.errors.http.unavailable', severity: 'error', debugMessage };
    }
    if (error.status === 0) {
      return { messageKey: 'common.errors.http.network', severity: 'error', debugMessage };
    }
    if (error.status >= 500) {
      return { messageKey: 'common.errors.http.server', severity: 'error', debugMessage };
    }

    return {
      messageKey: 'common.errors.http.failedWithStatus',
      params: { status: error.status },
      severity: 'error',
      debugMessage,
    };
  }

  private resolveEdcError(error: EdcConnectorClientError): ResolvedDashboardError {
    const messageKey = EDC_ERROR_TYPE_KEYS[error.type] ?? 'common.errors.edc.unknown';
    return {
      messageKey,
      severity: 'error',
      debugMessage: error.message,
    };
  }

  private extractDebugMessage(error: unknown): string | undefined {
    if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return undefined;
  }
}

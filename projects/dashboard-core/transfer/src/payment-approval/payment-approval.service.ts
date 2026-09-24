import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { DASHBOARD_EDC_BEARER_TOKEN_PROVIDER, DashboardStateService } from '@eclipse-edc/dashboard-core';

export interface PendingPaymentAgreement {
  contractAgreementId: string;
  contractNegotiationId: string;
  assetId: string;
  consumerId: string;
  providerId: string;
  pendingPaymentSince: string;
}

/**
 * Calls the payment-approval proxy endpoints exposed by the EDC management API
 * ({@code /v3/payment/...}) so the provider UI can list, confirm, and reject
 * agreements that are waiting for a payment confirmation.
 */
@Injectable({ providedIn: 'root' })
export class PaymentApprovalService {
  private readonly http = inject(HttpClient);
  private readonly stateService = inject(DashboardStateService);
  private readonly bearerTokenProvider = inject(DASHBOARD_EDC_BEARER_TOKEN_PROVIDER);

  private async buildHeaders(): Promise<HttpHeaders> {
    let headers = new HttpHeaders({ accept: 'application/json' });
    const token = await this.bearerTokenProvider.getBearerToken();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  private async managementUrl(): Promise<string> {
    const config = await firstValueFrom(
      this.stateService.currentEdcConfig$.pipe(
        filter(c => c !== undefined),
        take(1),
      ),
    );
    return config!.managementUrl;
  }

  async listPendingPayments(): Promise<PendingPaymentAgreement[]> {
    const [baseUrl, headers] = await Promise.all([this.managementUrl(), this.buildHeaders()]);
    return firstValueFrom(this.http.get<PendingPaymentAgreement[]>(`${baseUrl}/v3/payment/pending`, { headers }));
  }

  async confirmPayment(contractAgreementId: string): Promise<void> {
    const [baseUrl, headers] = await Promise.all([this.managementUrl(), this.buildHeaders()]);
    await firstValueFrom(
      this.http.post<void>(`${baseUrl}/v3/payment/${contractAgreementId}/confirm`, null, { headers }),
    );
  }

  async rejectPayment(contractAgreementId: string): Promise<void> {
    const [baseUrl, headers] = await Promise.all([this.managementUrl(), this.buildHeaders()]);
    await firstValueFrom(
      this.http.post<void>(`${baseUrl}/v3/payment/${contractAgreementId}/reject`, null, { headers }),
    );
  }
}

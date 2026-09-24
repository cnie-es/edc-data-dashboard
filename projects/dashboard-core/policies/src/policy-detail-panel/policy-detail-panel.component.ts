import { HttpClient } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { allowDashboardMocks, DashboardStateService } from '@eclipse-edc/dashboard-core';
import { PolicyService } from '../policy.service';
import { getMockPolicyDefinitionForRouteId } from '../policy-detail/policy-definition-mock.response';

@Component({
  selector: 'lib-policy-detail-panel',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './policy-detail-panel.component.html',
})
export class PolicyDetailPanelComponent {
  private readonly http = inject(HttpClient);
  private readonly policyService = inject(PolicyService);
  private readonly dashboardState = inject(DashboardStateService);

  private readonly currentEdcConfig = toSignal(this.dashboardState.currentEdcConfig$, {
    initialValue: undefined,
  });
  private readonly allowDashboardMocksNow = computed(() => allowDashboardMocks(this.currentEdcConfig()));

  readonly policyId = input<string>('');
  readonly licenseUrl = input<string | undefined>(undefined);
  readonly embedded = input(false);

  readonly activeTab = signal<'legal' | 'odrl'>('legal');

  readonly licenseLoading = signal(false);
  readonly licenseLoadFailed = signal(false);
  readonly licenseText = signal<string | null>(null);

  readonly odrlLoading = signal(false);
  readonly odrlLoadFailed = signal(false);
  readonly odrlJson = signal<string | null>(null);

  private licenseFetchStarted = false;
  private odrlFetchStarted = false;
  private lastLicenseUrl = '';
  private lastPolicyId = '';

  constructor() {
    effect(() => {
      const url = this.licenseUrl()?.trim() ?? '';
      const id = this.policyId().trim();
      if (url !== this.lastLicenseUrl) {
        this.lastLicenseUrl = url;
        this.licenseFetchStarted = false;
        this.licenseText.set(null);
        this.licenseLoadFailed.set(false);
      }
      if (id !== this.lastPolicyId) {
        this.lastPolicyId = id;
        this.odrlFetchStarted = false;
        this.odrlJson.set(null);
        this.odrlLoadFailed.set(false);
      }
      if (this.activeTab() === 'legal') {
        void this.ensureLicenseLoaded();
      }
    });
  }

  setTab(tab: 'legal' | 'odrl'): void {
    this.activeTab.set(tab);
    if (tab === 'legal') {
      void this.ensureLicenseLoaded();
    } else {
      void this.ensureOdrlLoaded();
    }
  }

  private normalizeLicenseUrl(url: string): string {
    return url.split('?')[0];
  }

  private async ensureLicenseLoaded(): Promise<void> {
    const rawUrl = this.licenseUrl()?.trim();
    if (!rawUrl || this.licenseFetchStarted) {
      return;
    }

    const url = this.normalizeLicenseUrl(rawUrl);
    this.licenseFetchStarted = true;
    this.licenseLoading.set(true);
    this.licenseLoadFailed.set(false);
    this.licenseText.set(null);

    try {
      const text = await firstValueFrom(
        this.http.get(url, {
          responseType: 'text' as 'json',
        }),
      );

      if (!text || typeof text !== 'string') {
        this.licenseLoadFailed.set(true);
        return;
      }

      this.licenseText.set(text);
    } catch {
      this.licenseLoadFailed.set(true);
    } finally {
      this.licenseLoading.set(false);
    }
  }

  private async ensureOdrlLoaded(): Promise<void> {
    const id = this.policyId().trim();
    if (!id || this.odrlFetchStarted) {
      return;
    }
    this.odrlFetchStarted = true;
    this.odrlLoadFailed.set(false);
    this.odrlJson.set(null);

    const mockPayload = this.allowDashboardMocksNow() ? getMockPolicyDefinitionForRouteId(id) : undefined;
    if (mockPayload) {
      this.odrlJson.set(JSON.stringify(mockPayload, null, 2));
      return;
    }

    this.odrlLoading.set(true);
    try {
      const def = await this.policyService.getPolicyDefinitionById(id);
      this.odrlJson.set(JSON.stringify(def as unknown as Record<string, unknown>, null, 2));
    } catch {
      this.odrlLoadFailed.set(true);
    } finally {
      this.odrlLoading.set(false);
    }
  }
}

import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import {
  allowDashboardMocks,
  DashboardStateService,
  OdrlPolicySummaryComponent,
  type OdrlPolicySummaryVariant,
} from '@eclipse-edc/dashboard-core';
import { PolicyService } from '../policy.service';
import { getMockPolicyDefinitionForRouteId } from '../policy-detail/policy-definition-mock.response';
import type { PolicyListKind } from '../policy-display.util';

@Component({
  selector: 'lib-policy-detail-panel',
  standalone: true,
  imports: [TranslateModule, OdrlPolicySummaryComponent],
  templateUrl: './policy-detail-panel.component.html',
})
export class PolicyDetailPanelComponent {
  private readonly policyService = inject(PolicyService);
  private readonly dashboardState = inject(DashboardStateService);

  private readonly currentEdcConfig = toSignal(this.dashboardState.currentEdcConfig$, {
    initialValue: undefined,
  });
  private readonly allowDashboardMocksNow = computed(() => allowDashboardMocks(this.currentEdcConfig()));

  readonly policyId = input<string>('');
  /** Publication policies are shown like the form access policy cards, contract ones like the usage policy cards. */
  readonly policyKind = input<PolicyListKind | undefined>(undefined);

  readonly activeTab = signal<'summary' | 'odrl'>('summary');

  readonly loading = signal(false);
  readonly loadFailed = signal(false);
  readonly policyDefinition = signal<Record<string, unknown> | null>(null);

  readonly odrlJson = computed(() => {
    const def = this.policyDefinition();
    return def ? JSON.stringify(def, null, 2) : null;
  });

  readonly summaryVariant = computed<OdrlPolicySummaryVariant | undefined>(() => {
    switch (this.policyKind()) {
      case 'Publicación':
        return 'access';
      case 'Contratación':
        return 'usage';
      default:
        return undefined;
    }
  });

  private lastPolicyId: string | null = null;
  private lastMocksAllowed: boolean | null = null;
  /** Ignores responses of a load superseded by a newer one. */
  private loadRequestId = 0;

  constructor() {
    effect(() => {
      const id = this.policyId().trim();
      const mocksAllowed = this.allowDashboardMocksNow();
      if (id === this.lastPolicyId && mocksAllowed === this.lastMocksAllowed) {
        return;
      }
      this.lastPolicyId = id;
      this.lastMocksAllowed = mocksAllowed;
      untracked(() => void this.loadPolicyDefinition(id, mocksAllowed));
    });
  }

  setTab(tab: 'summary' | 'odrl'): void {
    this.activeTab.set(tab);
  }

  private async loadPolicyDefinition(id: string, mocksAllowed: boolean): Promise<void> {
    const requestId = ++this.loadRequestId;
    this.policyDefinition.set(null);
    this.loadFailed.set(false);
    this.loading.set(false);
    if (!id) {
      return;
    }

    const mockPayload = mocksAllowed ? getMockPolicyDefinitionForRouteId(id) : undefined;
    if (mockPayload) {
      this.policyDefinition.set(mockPayload);
      return;
    }

    this.loading.set(true);
    try {
      const def = await this.policyService.getPolicyDefinitionById(id);
      if (requestId === this.loadRequestId) {
        this.policyDefinition.set(def as unknown as Record<string, unknown>);
      }
    } catch {
      if (requestId === this.loadRequestId) {
        this.loadFailed.set(true);
      }
    } finally {
      if (requestId === this.loadRequestId) {
        this.loading.set(false);
      }
    }
  }
}

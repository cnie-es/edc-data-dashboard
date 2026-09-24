import { Component, OnInit, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { AsyncPipe, JsonPipe } from '@angular/common';
import { from, Observable, of, switchMap } from 'rxjs';
import { AssetService } from '@eclipse-edc/dashboard-core/assets';
import { PolicyService } from '@eclipse-edc/dashboard-core/policies';
import { AlertComponent, DashboardStateService, useFixtureMocks } from '@eclipse-edc/dashboard-core';
import { ContractDefinitionsService } from '../contract-definitions.service';
import { ContractDefinitionCardComponent } from '../contract-definition-card/contract-definition-card.component';
import { OfferCardViewModel, toOfferCardViewModel } from '../offer-card-view-model';
import { MOCK_ASSETS, MOCK_CONTRACT_DEFINITIONS, MOCK_POLICIES } from '../contract-definitions.mock-data';

@Component({
  selector: 'lib-contract-definition-details-page',
  standalone: true,
  imports: [ContractDefinitionCardComponent, AsyncPipe, AlertComponent, JsonPipe],
  templateUrl: './contract-definition-details-page.component.html',
})
export class ContractDefinitionDetailsPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly contractDefinitionsService = inject(ContractDefinitionsService);
  private readonly assetService = inject(AssetService);
  private readonly policyService = inject(PolicyService);
  private readonly dashboardState = inject(DashboardStateService);

  private readonly currentEdcConfig = toSignal(this.dashboardState.currentEdcConfig$, {
    initialValue: undefined,
  });
  private readonly useFixtureMocksNow = computed(() => useFixtureMocks(this.currentEdcConfig()));

  offerCard$: Observable<OfferCardViewModel | undefined> = of(undefined);

  ngOnInit(): void {
    this.offerCard$ = this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id') ?? '';
        return from(this.getById(id));
      }),
    );
  }

  goBack() {
    this.router.navigate(['/contract-definitions']);
  }

  private async getById(id: string): Promise<OfferCardViewModel | undefined> {
    if (this.useFixtureMocksNow()) {
      const contractDefinition = MOCK_CONTRACT_DEFINITIONS.find(item => item.id === id);
      return contractDefinition ? toOfferCardViewModel(contractDefinition, MOCK_ASSETS, MOCK_POLICIES) : undefined;
    }

    const [contractDefinitions, assets, policies] = await Promise.all([
      this.contractDefinitionsService.getAllContractDefinitions(),
      this.assetService.getAllAssets(),
      this.policyService.getAllPolicies(),
    ]);
    const contractDefinition = contractDefinitions.find(item => item.id === id);
    return contractDefinition ? toOfferCardViewModel(contractDefinition, assets, policies) : undefined;
  }
}

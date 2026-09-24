import { Component, inject } from '@angular/core';
import type { OnDestroy, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import type { Asset, PolicyDefinition } from '@think-it-labs/edc-connector-client';
import { AssetService } from '@eclipse-edc/dashboard-core/assets';
import { PolicyService } from '@eclipse-edc/dashboard-core/policies';
import { DashboardStateService, useFixtureMocks } from '@eclipse-edc/dashboard-core';
import { Subject, takeUntil } from 'rxjs';
import {
  mockRequestAssetsForCreate,
  mockRequestPoliciesForCreateStep2,
  mockRequestPoliciesForCreateStep3,
} from '../contract-definitions.mock-data';
import { filterAndSortByDate } from './create-page-filter-sort.util';
import type { CreateAssetRow, CreatePolicyRow } from './create-page.types';
import { CreatePageHeaderStepperComponent } from './components/create-page-header-stepper.component';
import { CreateStepAssetTableComponent } from './components/create-step-asset-table.component';
import { CreateStepContractPolicyTableComponent } from './components/create-step-contract-policy-table.component';
import { CreateStepPublicationPolicyTableComponent } from './components/create-step-publication-policy-table.component';
import { CreateStepReviewPublishComponent } from './components/create-step-review-publish.component';

@Component({
  selector: 'lib-contract-definition-create-page',
  standalone: true,
  imports: [
    CreatePageHeaderStepperComponent,
    CreateStepAssetTableComponent,
    CreateStepContractPolicyTableComponent,
    CreateStepPublicationPolicyTableComponent,
    CreateStepReviewPublishComponent,
  ],
  templateUrl: './contract-definition-create-page.component.html',
})
export class ContractDefinitionCreatePageComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly assetService = inject(AssetService);
  private readonly policyService = inject(PolicyService);
  private readonly dashboardState = inject(DashboardStateService);
  private readonly destroy$ = new Subject<void>();

  private readonly currentEdcConfig = toSignal(this.dashboardState.currentEdcConfig$, {
    initialValue: undefined,
  });

  currentStep = 1;
  selectedAssetId: string | null = null;
  assetRows: CreateAssetRow[] = [];
  filteredAssetRows: CreateAssetRow[] = [];
  policyRows: CreatePolicyRow[] = [];
  filteredPolicyRows: CreatePolicyRow[] = [];
  publicationPolicyRows: CreatePolicyRow[] = [];
  filteredPublicationPolicyRows: CreatePolicyRow[] = [];
  assetSearchText = '';
  policySearchText = '';
  publicationPolicySearchText = '';
  assetSortDirection: 'asc' | 'desc' = 'desc';
  policySortDirection: 'asc' | 'desc' = 'desc';
  publicationPolicySortDirection: 'asc' | 'desc' = 'desc';
  selectedContractPolicyId: string | null = null;
  selectedPublicationPolicyId: string | null = null;
  showInPublicCatalog = false;
  publishFeedbackVisible = false;
  private publishFeedbackTimeout?: ReturnType<typeof setTimeout>;

  async ngOnInit(): Promise<void> {
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.currentStep = Number(params.get('step') ?? '1');
      this.selectedAssetId = params.get('assetId');
      this.selectedContractPolicyId = params.get('contractPolicyId');
      this.selectedPublicationPolicyId = params.get('publicationPolicyId');
    });

    const useMocks = useFixtureMocks(this.currentEdcConfig());
    const [assets, contractPolicies, publicationPolicies] = await Promise.all([
      useMocks ? mockRequestAssetsForCreate() : this.assetService.getAllAssets(),
      useMocks ? mockRequestPoliciesForCreateStep2() : this.policyService.getAllPolicies(),
      useMocks ? mockRequestPoliciesForCreateStep3() : this.policyService.getAllPolicies(),
    ]);

    this.assetRows = assets.map(asset => this.toAssetRow(asset));
    this.policyRows = contractPolicies.map(policy => this.toPolicyRow(policy, 'Contratación'));
    this.publicationPolicyRows = publicationPolicies.map(policy => this.toPolicyRow(policy, 'Publicación'));
    this.applyAssetFilterAndSort();
    this.applyPolicyFilterAndSort();
    this.applyPublicationPolicyFilterAndSort();
  }

  goBack() {
    this.router.navigate(['/contract-definitions']);
  }

  goHome() {
    this.router.navigate(['/home']);
  }

  goStepOne() {
    this.currentStep = 1;
    this.router.navigate(['/contract-definitions/create'], {
      queryParams: this.selectedAssetId
        ? {
            step: 1,
            assetId: this.selectedAssetId,
            contractPolicyId: this.selectedContractPolicyId,
            publicationPolicyId: this.selectedPublicationPolicyId,
          }
        : { step: 1 },
    });
  }

  goStepTwo() {
    if (!this.selectedAssetId) {
      return;
    }

    this.currentStep = 2;
    this.router.navigate(['/contract-definitions/create'], {
      queryParams: {
        step: 2,
        assetId: this.selectedAssetId,
        contractPolicyId: this.selectedContractPolicyId,
        publicationPolicyId: this.selectedPublicationPolicyId,
      },
    });
  }

  goStepThree() {
    if (!this.selectedAssetId || !this.selectedContractPolicyId) {
      return;
    }

    this.currentStep = 3;
    this.router.navigate(['/contract-definitions/create'], {
      queryParams: {
        step: 3,
        assetId: this.selectedAssetId,
        contractPolicyId: this.selectedContractPolicyId,
        publicationPolicyId: this.selectedPublicationPolicyId,
      },
    });
  }

  applyAssetSearch(searchText: string) {
    this.assetSearchText = searchText.trim().toLowerCase();
    this.applyAssetFilterAndSort();
  }

  applyPolicySearch(searchText: string) {
    this.policySearchText = searchText.trim().toLowerCase();
    this.applyPolicyFilterAndSort();
  }

  applyPublicationPolicySearch(searchText: string) {
    this.publicationPolicySearchText = searchText.trim().toLowerCase();
    this.applyPublicationPolicyFilterAndSort();
  }

  toggleAssetDateSort() {
    this.assetSortDirection = this.assetSortDirection === 'asc' ? 'desc' : 'asc';
    this.applyAssetFilterAndSort();
  }

  togglePolicyDateSort() {
    this.policySortDirection = this.policySortDirection === 'asc' ? 'desc' : 'asc';
    this.applyPolicyFilterAndSort();
  }

  togglePublicationPolicyDateSort() {
    this.publicationPolicySortDirection = this.publicationPolicySortDirection === 'asc' ? 'desc' : 'asc';
    this.applyPublicationPolicyFilterAndSort();
  }

  selectAsset(assetId: string) {
    this.selectedAssetId = assetId;
  }

  selectContractPolicy(policyId: string) {
    this.selectedContractPolicyId = policyId;
  }

  selectPublicationPolicy(policyId: string) {
    this.selectedPublicationPolicyId = policyId;
  }

  goPreviousStep() {
    if (this.currentStep === 2) {
      this.goStepOne();
      return;
    }

    if (this.currentStep === 3) {
      this.goStepTwo();
      return;
    }

    if (this.currentStep === 4) {
      this.goStepThree();
    }
  }

  saveAndContinue() {
    if (this.currentStep === 1 && !this.selectedAssetId) {
      return;
    }

    if (this.currentStep === 1) {
      this.goStepTwo();
      return;
    }

    if (this.currentStep === 2) {
      if (!this.selectedAssetId || !this.selectedContractPolicyId) {
        return;
      }

      this.goStepThree();
      return;
    }

    if (this.currentStep === 3) {
      if (!this.selectedAssetId || !this.selectedContractPolicyId || !this.selectedPublicationPolicyId) {
        return;
      }

      this.currentStep = 4;
      this.router.navigate(['/contract-definitions/create'], {
        queryParams: {
          step: 4,
          assetId: this.selectedAssetId,
          contractPolicyId: this.selectedContractPolicyId,
          publicationPolicyId: this.selectedPublicationPolicyId,
        },
      });
    }
  }

  ngOnDestroy(): void {
    if (this.publishFeedbackTimeout) {
      clearTimeout(this.publishFeedbackTimeout);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  get selectedAssetRow(): CreateAssetRow | undefined {
    if (!this.selectedAssetId) {
      return undefined;
    }
    return this.assetRows.find(row => row.id === this.selectedAssetId);
  }

  get selectedContractPolicyRow(): CreatePolicyRow | undefined {
    if (!this.selectedContractPolicyId) {
      return undefined;
    }
    return this.policyRows.find(row => row.id === this.selectedContractPolicyId);
  }

  get selectedPublicationPolicyRow(): CreatePolicyRow | undefined {
    if (!this.selectedPublicationPolicyId) {
      return undefined;
    }
    return this.publicationPolicyRows.find(row => row.id === this.selectedPublicationPolicyId);
  }

  get canPublishOffer(): boolean {
    return Boolean(this.selectedAssetRow && this.selectedContractPolicyRow && this.selectedPublicationPolicyRow);
  }

  togglePublicCatalog() {
    this.showInPublicCatalog = !this.showInPublicCatalog;
  }

  publishOffer() {
    if (!this.canPublishOffer) {
      return;
    }
    this.publishFeedbackVisible = true;

    if (this.publishFeedbackTimeout) {
      clearTimeout(this.publishFeedbackTimeout);
    }

    this.publishFeedbackTimeout = setTimeout(() => {
      this.router.navigate(['/contract-definitions']);
    }, 1200);
  }

  private applyAssetFilterAndSort() {
    this.filteredAssetRows = filterAndSortByDate(this.assetRows, this.assetSearchText, this.assetSortDirection);
  }

  private applyPolicyFilterAndSort() {
    this.filteredPolicyRows = filterAndSortByDate(this.policyRows, this.policySearchText, this.policySortDirection);
  }

  private applyPublicationPolicyFilterAndSort() {
    this.filteredPublicationPolicyRows = filterAndSortByDate(
      this.publicationPolicyRows,
      this.publicationPolicySearchText,
      this.publicationPolicySortDirection,
    );
  }

  private toAssetRow(asset: Asset): CreateAssetRow {
    const properties = asset.properties as {
      optionalValue?: <T>(ns: string, key: string) => T | undefined;
      name?: string;
      description?: string;
      createdAt?: string;
      offerType?: string;
    };
    const dataAddress = asset.dataAddress as {
      optionalValue?: <T>(ns: string, key: string) => T | undefined;
      type?: string;
    };

    const getProperty = (key: string): string | undefined => {
      if (typeof properties?.optionalValue === 'function') {
        return properties.optionalValue<string>('edc', key);
      }
      return (properties as Record<string, string | undefined>)?.[key];
    };

    const assetId = asset.id ?? (asset as { '@id'?: string })['@id'] ?? '';
    const name = getProperty('name') ?? assetId;
    const description = getProperty('description') ?? 'Sin descripción';
    const createdAt = getProperty('createdAt') ?? '2025-01-01';
    const typeLabel =
      getProperty('offerType') ??
      (typeof dataAddress?.optionalValue === 'function'
        ? (dataAddress.optionalValue<string>('edc', 'type') ?? 'Recurso')
        : (dataAddress?.type ?? 'Recurso'));

    return {
      id: assetId,
      title: name,
      description,
      createdAt: this.formatDate(createdAt),
      typeLabel,
    };
  }

  private toPolicyRow(policyDefinition: PolicyDefinition, fallbackTypeLabel: string): CreatePolicyRow {
    const policyRecord = policyDefinition as unknown as {
      properties?: {
        optionalValue?: <T>(ns: string, key: string) => T | undefined;
        name?: string;
        description?: string;
        policyType?: string;
      };
      createdAt?: number | string;
      id?: string;
      '@id'?: string;
    };

    const getProperty = (key: string): string | undefined => {
      if (typeof policyRecord.properties?.optionalValue === 'function') {
        return policyRecord.properties.optionalValue<string>('edc', key);
      }
      return (policyRecord.properties as Record<string, string | undefined>)?.[key];
    };

    const id = policyDefinition.id ?? policyRecord['@id'] ?? '';
    return {
      id,
      title: getProperty('name') ?? `Policy ${id}`,
      description: getProperty('description') ?? 'Sin descripción',
      typeLabel: getProperty('policyType') ?? fallbackTypeLabel,
      createdAt: this.formatDate(policyRecord.createdAt),
    };
  }

  private formatDate(rawDate: string | number | undefined): string {
    if (!rawDate) {
      return '01/01/2025';
    }
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) {
      return String(rawDate);
    }

    return `${parsed.getDate()}/${parsed.getMonth() + 1}/${parsed.getFullYear()}`;
  }
}

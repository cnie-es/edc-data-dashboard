import { CommonModule, formatDate } from '@angular/common';
import { Component, DestroyRef, inject, type OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  OwnOfferSelfDescriptionsService,
  ParticipantNameService,
  isOwnSelfDescription,
  type BreadcrumbItem,
} from '@eclipse-edc/dashboard-core';
import { SimplAdvancedSearchService } from '../advanced-search.service';
import { SdDetailViewLayoutComponent } from './sd-detail-view-layout.component';
import { ContractConsumptionService } from '../services/contract-consumption.service';
import { ContractNegotiationStateService } from '../state/contract-negotiation-state.service';
import { createSelfDescriptor } from '../models/self-descriptor.model';
import { getContractNegotiationData, isEligibleForContractNegotiation } from '../services/contract-negotiation.util';
import type {
  ContractNegotiationOffersResponse,
  ContractNegotiationRequestData,
  UiError,
} from '../types/contract-negotiation.model';
import type { SelfDescriptorModel } from '../models/self-descriptor.model';
import type { SdDetailsNavigationState } from '../types/sd-details-navigation.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  mapCorpusOfferingSelfDescription,
  OfferSelfDescriptionDetailViewModel,
  AccessPolicyRow,
  UsagePolicyRow,
} from 'dist/@eclipse-edc/dashboard-core';
@Component({
  selector: 'lib-sd-details-view',
  standalone: true,
  imports: [CommonModule, SdDetailViewLayoutComponent, RouterLink, TranslateModule],
  templateUrl: './sd-details-view.component.html',
})
export class SdDetailsViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(SimplAdvancedSearchService);
  private readonly contractConsumption = inject(ContractConsumptionService);
  private readonly negotiationState = inject(ContractNegotiationStateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);
  private readonly participantNameService = inject(ParticipantNameService);
  private readonly ownOffers = inject(OwnOfferSelfDescriptionsService);

  loading = false;
  errorMessage: string | undefined;
  sd: SelfDescriptorModel | undefined;

  // Nuevo view model completo desde el mapper de corpus
  fullVm?: OfferSelfDescriptionDetailViewModel;

  isEligibleForNegotiation = false;
  contractNegotiationData: ContractNegotiationRequestData | null = null;
  catalogOffersError: UiError | null = null;
  catalogOffersData: ContractNegotiationOffersResponse | null = null;
  catalogOffersLoading = false;
  isTransferWizardVisible = false;
  /** La SD la publicó este conector (se llega aquí por URL: en la lista la tarjeta está bloqueada). */
  isOwnOffer = false;
  isAccessPolicySortAscending = true;
  isUsagePolicySortAscending = true;
  isPaidAsset = false;

  // Inputs para el layout (políticas)
  contractPolicyId = '';
  publicationPolicyId = '';
  contractPolicyName = '';
  publicationPolicyName = '';

  get displayShortId(): string {
    const fullId = this.sd?.selfDescriptionId ?? '';
    if (!fullId) {
      return 'N/A';
    }
    const parts = fullId.split(':');
    return parts[parts.length - 1] || fullId;
  }

  get displayDescription(): string {
    return this.fullVm?.description || 'No description available.';
  }

  get listDateDisplay(): string {
    const iso = this.fullVm?.issuanceDateIso;
    if (!iso) {
      return '';
    }
    try {
      return formatDate(iso, 'dd/MM/yyyy', 'en-US');
    } catch {
      return '';
    }
  }

  get sortedAccessPolicyRows(): AccessPolicyRow[] {
    const rows = this.fullVm?.sections.servicePolicy.accessPolicyRows ?? [];
    return [...rows].sort((a, b) => {
      const compare = a.user.localeCompare(b.user, undefined, { sensitivity: 'base' });
      return this.isAccessPolicySortAscending ? compare : -compare;
    });
  }

  get sortedUsagePolicyRows(): UsagePolicyRow[] {
    const rows = this.fullVm?.sections.servicePolicy.usagePolicyRows ?? [];
    return [...rows].sort((a, b) => {
      const compare = a.user.localeCompare(b.user, undefined, { sensitivity: 'base' });
      return this.isUsagePolicySortAscending ? compare : -compare;
    });
  }

  get isGetDataDisabled(): boolean {
    return (
      this.isOwnOffer ||
      !this.isEligibleForNegotiation ||
      this.catalogOffersLoading ||
      !!this.catalogOffersError ||
      !this.catalogOffersData
    );
  }

  get currentNegotiationId(): string {
    return this.negotiationState.negotiationId ?? 'N/A';
  }

  get currentNegotiationStatus(): string {
    if (this.isPaidAsset && (this.negotiationState.negotiationStatus?.state ?? 'REQUESTED') === 'VERIFIED') {
      const key = `negotiation.state.PAYMENT_PENDING`;
      const translated = this.translate.instant(key);
      return translated;
    } else {
      const raw = this.negotiationState.negotiationStatus?.state;
      if (!raw) {
        return '-';
      }
      const key = `negotiation.state.${raw}`;
      const translated = this.translate.instant(key);
      return translated !== key ? translated : `${this.translate.instant('negotiation.stateUnknown')} (${raw})`;
    }
  }

  /**
   * Fallo de la negociación, venga por donde venga:
   * - error HTTP al iniciarla o al consultar su estado, o
   * - negociación aceptada por la API pero TERMINATED por el conector (el caso habitual: el
   *   proveedor la rechaza). Aquí el motivo viaja en `errorDetail` de la respuesta de estado.
   */
  get currentNegotiationError(): UiError | null {
    const httpError = this.negotiationState.negotiationStatusError;
    if (httpError) {
      return httpError;
    }
    if (!this.isNegotiationTerminated) {
      return null;
    }
    const errorDetail = this.negotiationState.negotiationStatus?.errorDetail?.trim();
    return {
      title: this.translate.instant('sdDetails.transfer.negotiationRejectedTitle'),
      description: errorDetail || this.translate.instant('sdDetails.transfer.negotiationRejectedNoDetail'),
    };
  }

  get isNegotiationInProgress(): boolean {
    return !this.negotiationState.isNegotiationEnded;
  }

  get isNegotiationFinalized(): boolean {
    return this.negotiationState.isNegotiationFinalized;
  }

  get isNegotiationTerminated(): boolean {
    return this.negotiationState.isNegotiationTerminated;
  }

  /** La negociación terminó sin acuerdo: ni finalizada, ni en curso, ni con fallo explícito. */
  get isNegotiationPendingApproval(): boolean {
    return !this.isNegotiationInProgress && !this.isNegotiationFinalized && !this.currentNegotiationError;
  }

  readonly breadcrumbItems: BreadcrumbItem[] = [
    { label: 'menu.home', route: '/home' },
    { label: 'menu.catalog', route: '/catalog' },
    { label: 'offers.detail.breadcrumbCurrent' },
  ];

  // El layout espera un vm del tipo OfferSelfDescriptionDetailViewModel
  get sdViewModel(): OfferSelfDescriptionDetailViewModel | undefined {
    return this.fullVm;
  }

  private get navigationState(): SdDetailsNavigationState {
    return (history.state ?? {}) as SdDetailsNavigationState;
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const selfDescriptionId = params.get('id');
      if (!selfDescriptionId) {
        this.errorMessage = 'sdDetails.detail.errorInvalidId';
        return;
      }
      void this.resolveIsOwnOffer(selfDescriptionId);
      this.loadDetails(selfDescriptionId);
    });
  }

  private async resolveIsOwnOffer(selfDescriptionId: string): Promise<void> {
    const ownIds = await this.ownOffers.getOwnSelfDescriptionIds();
    this.isOwnOffer = isOwnSelfDescription(ownIds, selfDescriptionId);
  }

  openTransferWizard(): void {
    if (this.isGetDataDisabled || !this.contractNegotiationData) {
      return;
    }

    this.beginTransferWizard();
    this.negotiationState.setNegotiationData(this.contractNegotiationData, this.isPaidAsset);
    this.negotiationState.initiateNegotiation();
  }

  closeTransferWizard(): void {
    this.isTransferWizardVisible = false;
    this.negotiationState.resetNegotiationState();
  }

  private loadDetails(selfDescriptionId: string): void {
    this.loading = true;
    this.errorMessage = undefined;

    const routeState = this.navigationState.sd;
    this.sd =
      routeState && routeState.selfDescriptionId === selfDescriptionId
        ? routeState
        : createSelfDescriptor({
            selfDescriptionId,
            claimsGraphUri0: [],
            name: selfDescriptionId,
            description: '',
            inLanguage: '',
          });

    this.service
      .detailedSearchSD(selfDescriptionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: content => {
          // Usar el mapper de corpus offering
          const fullVm = mapCorpusOfferingSelfDescription(content);
          this.fullVm = fullVm;
          void this.resolveProviderLabel(fullVm);

          this.isEligibleForNegotiation = isEligibleForContractNegotiation(content);
          this.contractNegotiationData = getContractNegotiationData(content);
          this.fetchCatalogOffers();
          this.loading = false;

          // Determinar si es de pago
          this.isPaidAsset = fullVm.priceType !== 'free';

          // Extraer datos de políticas para los inputs del layout
          this.contractPolicyId = fullVm.sections.edcRegistration.accessPolicyId;
          this.publicationPolicyId = fullVm.sections.edcRegistration.servicePolicyId;
          this.contractPolicyName = 'N/A'; // no disponible en el mapper actual
          this.publicationPolicyName = 'N/A';
        },
        error: () => {
          this.loading = false;
          this.fullVm = undefined;
          this.isEligibleForNegotiation = false;
          this.contractNegotiationData = null;
          this.catalogOffersError = null;
          this.catalogOffersData = null;
          this.catalogOffersLoading = false;
          this.errorMessage = 'sdDetails.detail.errorLoadFailed';
        },
      });
  }

  get breadcrumbItemsTranslated(): BreadcrumbItem[] {
    return this.breadcrumbItems.map(item => ({
      ...item,
      label: this.translate.instant(item.label),
    }));
  }

  /** providerLabel normally comes as a uid/DID; resolve it to the participant's display name. */
  private async resolveProviderLabel(vm: OfferSelfDescriptionDetailViewModel): Promise<void> {
    const label = vm.providerLabel?.trim();
    if (!label) {
      return;
    }
    const resolved = await this.participantNameService.getName(label);
    // Ignore if the user navigated to another SD while the request was in flight.
    if (this.fullVm !== vm) {
      return;
    }
    this.fullVm = { ...vm, providerLabel: resolved || label };
  }

  private fetchCatalogOffers(): void {
    if (!this.contractNegotiationData) {
      this.catalogOffersError = null;
      this.catalogOffersData = null;
      this.catalogOffersLoading = false;
      return;
    }

    this.catalogOffersLoading = true;
    this.catalogOffersError = null;
    this.catalogOffersData = null;
    this.contractConsumption.getCatalogOffers(this.contractNegotiationData).subscribe({
      next: data => {
        this.catalogOffersData = data;
        this.catalogOffersLoading = false;
      },
      error: error => {
        this.catalogOffersError = error;
        this.catalogOffersLoading = false;
      },
    });
  }

  private beginTransferWizard(): void {
    this.isTransferWizardVisible = true;
    this.negotiationState.resetNegotiationState();
  }

  toggleAccessPolicyUsersOrder(): void {
    this.isAccessPolicySortAscending = !this.isAccessPolicySortAscending;
  }

  toggleUsagePolicyUsersOrder(): void {
    this.isUsagePolicySortAscending = !this.isUsagePolicySortAscending;
  }
}

/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom, of } from 'rxjs';
import { AssetService } from '@eclipse-edc/dashboard-core/assets';
import { DashboardStateService, SdMatchedAssetsWarmupService } from '@eclipse-edc/dashboard-core';
import { PolicyListEnrichmentService } from '@eclipse-edc/dashboard-core/policies';
import type { Asset } from '@think-it-labs/edc-connector-client';
import { sortOfferCards } from '../offer-list-filter.util';
import { buildOfferCardViewModelsFromAssets } from '../offer-card-from-asset.mapper';

import { ContractDefinitionsViewComponent } from './contract-definitions-view.component';
import { MockOfferResourcesService } from '../mock-offer-resources.service';

function makeAssets(): Asset[] {
  return [
    {
      id: 'corpus-public-free',
      contractPolicyId: 'pol-1',
      properties: {
        'offer.offer_name': 'Corpus free',
        assetType: 'ms:Corpus',
        'offer.isPublic': 'true',
        'offer.isFree': 'true',
      },
    },
    {
      id: 'model-private-paid',
      contractPolicyId: 'pol-2',
      properties: {
        'offer.offer_name': 'Model paid',
        assetType: 'ms:MlModel',
        'offer.isPublic': 'false',
        'offer.isFree': 'false',
        'simpl:price': '10',
      },
    },
    {
      id: 'api-public-paid',
      contractPolicyId: 'pol-3',
      properties: {
        'offer.offer_name': 'API paid',
        assetType: 'ms:Api',
        'offer.isPublic': 'true',
        'offer.isFree': 'false',
        'simpl:price': '5',
      },
    },
  ] as unknown as Asset[];
}

describe('ContractDefinitionsViewComponent', () => {
  let component: ContractDefinitionsViewComponent;
  let fixture: ComponentFixture<ContractDefinitionsViewComponent>;
  let openModalSpy: jasmine.Spy;
  let closeModalSpy: jasmine.Spy;
  let enrichmentSpy: jasmine.SpyObj<PolicyListEnrichmentService>;
  let mockAssets: Asset[];

  beforeEach(async () => {
    mockAssets = makeAssets();
    const translate = {
      instant: (key: string) => (key === 'policies.list.pending' ? 'Cargando…' : key),
      onLangChange: of({ lang: 'es', translations: {} }),
    };
    enrichmentSpy = jasmine.createSpyObj<PolicyListEnrichmentService>('PolicyListEnrichmentService', [
      'setEdcConfig',
      'clearCache',
      'enrichOfferCardPolicyNames',
      'relabelOfferCards',
    ]);
    enrichmentSpy.enrichOfferCardPolicyNames.and.callFake(async cards => {
      for (const card of cards) {
        card.policySummary = `enriched:${card.contractPolicyId}`;
        card.policyEnrichmentStatus = 'ready';
      }
    });

    await TestBed.configureTestingModule({
      imports: [ContractDefinitionsViewComponent],
      providers: [
        { provide: TranslateService, useValue: translate },
        { provide: PolicyListEnrichmentService, useValue: enrichmentSpy },
        {
          provide: DashboardStateService,
          useValue: { currentEdcConfig$: of(undefined) },
        },
        {
          provide: AssetService,
          useValue: {
            getAssetsCacheSnapshotOrLoad: () => Promise.resolve({ data: mockAssets }),
          },
        },
        {
          provide: SdMatchedAssetsWarmupService,
          useValue: { run: () => Promise.resolve() },
        },
        {
          provide: MockOfferResourcesService,
          useValue: {
            ensureLoaded: () => Promise.resolve(),
            getMockAssets: () => mockAssets,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContractDefinitionsViewComponent);
    component = fixture.componentInstance;
    openModalSpy = jasmine.createSpy('open');
    closeModalSpy = jasmine.createSpy('close');
    (component as unknown as { filtersModal: { open: () => void; close: () => void } }).filtersModal = {
      open: openModalSpy,
      close: closeModalSpy,
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('uses a fixed page size of 6', () => {
    expect(component.pageItemCount).toBe(6);
  });

  it('sorts by asset type subtitle when sort type is selected', () => {
    const cards = buildOfferCardViewModelsFromAssets(
      [
        { id: 'z', properties: { 'offer.offer_name': 'Z', assetType: 'ms:Corpus' } },
        { id: 'a', properties: { 'offer.offer_name': 'A', assetType: 'ms:MlModel' } },
      ] as unknown as Asset[],
      'consumer',
    );
    const sorted = sortOfferCards(cards, 'type');
    expect(sorted[0].subtitle).toBe('corpus');
    expect(sorted[1].subtitle).toBe('mlmodel');
  });

  it('loads cards and filters by asset type when applied', fakeAsync(async () => {
    tick();
    await fixture.whenStable();
    tick(300);

    component.toggleFilterSelection({ category: 'assetType', value: 'corpus', checked: true });
    component.applyFilters();
    tick(300);
    await fixture.whenStable();

    const filtered = await firstValueFrom(component.filteredContractDefinitions$);
    expect(filtered.map(card => card.id)).toEqual(['corpus-public-free']);
    expect(closeModalSpy).toHaveBeenCalled();
  }));

  it('filters by visibility and price radios', fakeAsync(async () => {
    tick();
    await fixture.whenStable();

    component.draftVisibilityChanged('private');
    component.draftPriceChanged('paid');
    component.applyFilters();
    tick(300);
    await fixture.whenStable();

    const filtered = await firstValueFrom(component.filteredContractDefinitions$);
    expect(filtered.map(card => card.id)).toEqual(['model-private-paid']);
  }));

  it('opens filters modal and restores draft state from applied filters', () => {
    component.toggleFilterSelection({ category: 'assetType', value: 'corpus', checked: true });
    component.draftVisibilityChanged('public');
    component.applyFilters();

    component.draftVisibilityChanged('private');
    component.openFiltersModal();

    expect(openModalSpy).toHaveBeenCalled();
    expect(component.selectedAssetTypeDraftValues).toEqual(['corpus']);
    expect(component.selectedVisibilityDraft).toBe('public');
  });

  it('removes a single applied filter chip', fakeAsync(async () => {
    component.toggleFilterSelection({ category: 'assetType', value: 'corpus', checked: true });
    component.draftPriceChanged('free');
    component.applyFilters();
    tick(300);

    component.clearSingleFilterChip('price', 'free');
    tick(300);
    await fixture.whenStable();

    expect(component.appliedFilterChips.some(chip => chip.category === 'price')).toBeFalse();
    expect(component.appliedFilterChips.some(chip => chip.category === 'assetType')).toBeTrue();
  }));

  it('enriches current page first then remaining cards in background', fakeAsync(async () => {
    const manyAssets = Array.from({ length: 8 }, (_, index) => ({
      id: `asset-${index}`,
      contractPolicyId: `pol-${index}`,
      properties: {
        'offer.offer_name': `Offer ${index}`,
        assetType: 'ms:Corpus',
        'offer.isPublic': 'true',
        'offer.isFree': 'true',
      },
    })) as unknown as Asset[];

    mockAssets = manyAssets;
    component.fetchContractDefinitions();
    tick();
    await fixture.whenStable();
    tick(300);
    await fixture.whenStable();

    expect(enrichmentSpy.enrichOfferCardPolicyNames).toHaveBeenCalled();
    const firstBatch = enrichmentSpy.enrichOfferCardPolicyNames.calls.first().args[0];
    expect(firstBatch.length).toBeLessThanOrEqual(6);

    tick(300);
    await fixture.whenStable();

    expect(enrichmentSpy.enrichOfferCardPolicyNames.calls.count()).toBeGreaterThan(1);
  }));
});

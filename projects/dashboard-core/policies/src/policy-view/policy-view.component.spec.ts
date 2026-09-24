/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import type { Asset } from '@think-it-labs/edc-connector-client';
import { DashboardStateService } from '@eclipse-edc/dashboard-core';
import { AssetService } from '@eclipse-edc/dashboard-core/assets';

import { PolicyViewComponent } from './policy-view.component';
import { POLICY_LIST_DATE_TEST_FIXTURE, type PolicyUI } from '../policy.models';
import { PolicyListEnrichmentService } from '../policy-list-enrichment.service';

describe('PolicyViewComponent', () => {
  let component: PolicyViewComponent;
  let fixture: ComponentFixture<PolicyViewComponent>;
  let assetServiceSpy: jasmine.SpyObj<AssetService>;
  let enrichmentSpy: jasmine.SpyObj<PolicyListEnrichmentService>;
  const routerMock = { navigate: jasmine.createSpy('navigate') };

  const dashboardStateServiceMock = {
    currentEdcConfig$: new BehaviorSubject({}),
  } as unknown as DashboardStateService;

  const assetWithPolicies = {
    id: 'asset-1',
    '@id': 'asset-1',
    accessPolicyId: 'policy-access-uuid',
    contractPolicyId: 'policy-contract-uuid',
    properties: {
      createdAt: '2026-05-13T09:23:20.288567228Z',
      name: 'Dataset IoT Barcelona',
    },
  } as unknown as Asset;

  beforeEach(async () => {
    assetServiceSpy = jasmine.createSpyObj<AssetService>('AssetService', ['getAssetsCacheSnapshotOrLoad']);
    enrichmentSpy = jasmine.createSpyObj<PolicyListEnrichmentService>('PolicyListEnrichmentService', [
      'setEdcConfig',
      'clearCache',
      'enrichPageRows',
      'relabelRows',
    ]);
    enrichmentSpy.enrichPageRows.and.callFake(async (rows: PolicyUI[]) => {
      for (const row of rows) {
        row.name = `enriched-${row.policyDefinitionId}`;
        row.description = 'enriched-desc';
        row.enrichmentStatus = 'ready';
      }
    });

    assetServiceSpy.getAssetsCacheSnapshotOrLoad.and.resolveTo({
      data: [assetWithPolicies],
      fetchedAt: Date.now(),
      expiresAt: Date.now() + 3600000,
      isRefreshing: false,
    });

    await TestBed.configureTestingModule({
      imports: [PolicyViewComponent, TranslateModule.forRoot()],
      providers: [
        { provide: AssetService, useValue: assetServiceSpy },
        { provide: DashboardStateService, useValue: dashboardStateServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: PolicyListEnrichmentService, useValue: enrichmentSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PolicyViewComponent);
    component = fixture.componentInstance;
  });

  it('should create', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component).toBeTruthy();
  });

  it('uses pageItemCount of 5', () => {
    expect(component.pageItemCount).toBe(5);
  });

  it('maps asset policy ids to two PolicyUI rows with pending placeholders', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise(r => setTimeout(r, 350));

    const rows = await firstValueFrom(component.policies$);
    expect(rows.length).toBe(2);
    const pub = rows.find((r: PolicyUI) => r.type === 'Publicación');
    const con = rows.find((r: PolicyUI) => r.type === 'Contratación');
    expect(pub?.policyDefinitionId).toBe('policy-access-uuid');
    expect(con?.policyDefinitionId).toBe('policy-contract-uuid');
    expect(pub?.date).toBe('13/05/2026');
    expect(pub?.id).toContain('|access|');
    expect(con?.id).toContain('|contract|');
    expect(pub?.enrichmentStatus).toBe('idle');
    expect(pub?.assetDisplayName).toBe('Dataset IoT Barcelona');
    expect(con?.assetDisplayName).toBe('Dataset IoT Barcelona');
  });

  it('enriches at most the current page via PolicyListEnrichmentService', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise(r => setTimeout(r, 350));

    expect(enrichmentSpy.enrichPageRows).toHaveBeenCalled();
    const call = enrichmentSpy.enrichPageRows.calls.mostRecent();
    expect(call.args[0].length).toBeLessThanOrEqual(5);

    const pageRows = await firstValueFrom(component.pagePolicies$);
    expect(pageRows[0]?.name).toContain('enriched-');
  });

  it('enriches off-page rows in background after the current page', async () => {
    const assets = Array.from({ length: 4 }, (_, i) => ({
      id: `asset-${i}`,
      '@id': `asset-${i}`,
      accessPolicyId: `policy-access-${i}`,
      contractPolicyId: `policy-contract-${i}`,
      properties: {
        createdAt: '2026-05-13T09:23:20.288567228Z',
        name: `Dataset ${i}`,
      },
    })) as unknown as Asset[];

    assetServiceSpy.getAssetsCacheSnapshotOrLoad.and.resolveTo({
      data: assets,
      fetchedAt: Date.now(),
      expiresAt: Date.now() + 3600000,
      isRefreshing: false,
    });

    fixture = TestBed.createComponent(PolicyViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise(r => setTimeout(r, 400));

    expect(enrichmentSpy.enrichPageRows.calls.count()).toBeGreaterThan(1);

    const rows = await firstValueFrom(component.policies$);
    expect(rows.length).toBe(8);
    expect(rows.every((r: PolicyUI) => r.enrichmentStatus === 'ready')).toBeTrue();
  });

  it('yields no rows when snapshot has no policy ids on assets', async () => {
    assetServiceSpy.getAssetsCacheSnapshotOrLoad.and.resolveTo({
      data: [{ id: 'a', '@id': 'a', properties: {} } as unknown as Asset],
      fetchedAt: Date.now(),
      expiresAt: Date.now() + 3600000,
      isRefreshing: false,
    });
    fixture = TestBed.createComponent(PolicyViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    const rows = await firstValueFrom(component.policies$);
    expect(rows.length).toBe(0);
  });

  it('navigate to detail includes policy role query param', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    component.goToDetail({
      id: 'asset-1|access|policy-access-uuid',
      policyDefinitionId: 'policy-access-uuid',
      name: 'policy-access-uuid',
      type: 'Publicación',
      description: 'Pending',
      date: POLICY_LIST_DATE_TEST_FIXTURE,
      assetDisplayName: 'Dataset IoT Barcelona',
      enrichmentStatus: 'ready',
    } as PolicyUI);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/policies/detail', 'policy-access-uuid'], {
      queryParams: { rol: 'Publicación', fecha: POLICY_LIST_DATE_TEST_FIXTURE },
    });
  });
});

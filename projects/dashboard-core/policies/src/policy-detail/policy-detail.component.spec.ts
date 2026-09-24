/*
 *  SPDX-License-Identifier: Apache-2.0
 */

import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import type { Asset, PolicyDefinition } from '@think-it-labs/edc-connector-client';
import { AssetService } from '@eclipse-edc/dashboard-core/assets';
import { DashboardStateService } from '@eclipse-edc/dashboard-core';
import type { EdcConfig } from '@eclipse-edc/dashboard-core';
import { BehaviorSubject } from 'rxjs';

import { PolicyDetailComponent } from './policy-detail.component';
import { PolicyService } from '../policy.service';
import { POLICY_LIST_DATE_TEST_FIXTURE } from '../policy.models';

const POLICY_ID = '46382ed4-2ee3-4aa2-aed0-c43363b01b25';
const LICENSE_URL = 'https://licence.test.com/plain.txt';

const defaultEdcConfig: EdcConfig = {
  connectorName: 'c',
  managementUrl: 'https://x/m',
  defaultUrl: 'https://x/a',
  protocolUrl: 'https://x/p',
  federatedCatalogEnabled: false,
  dashboardMocksEnabled: true,
};

describe('PolicyDetailComponent', () => {
  let fixture: ComponentFixture<PolicyDetailComponent>;
  let httpMock: HttpTestingController;
  let policyServiceSpy: jasmine.SpyObj<PolicyService>;
  let assetServiceSpy: jasmine.SpyObj<AssetService>;
  let currentEdcConfig$: BehaviorSubject<EdcConfig | undefined>;

  beforeEach(async () => {
    policyServiceSpy = jasmine.createSpyObj<PolicyService>('PolicyService', [
      'getAllPolicies',
      'getPolicyDefinitionById',
    ]);
    const pd = {
      '@id': POLICY_ID,
      '@type': 'PolicyDefinition',
      createdAt: 1,
      policy: { '@type': 'odrl:Set', 'odrl:permission': { 'odrl:action': { '@id': 'odrl:use' } } },
    } as unknown as PolicyDefinition;
    policyServiceSpy.getAllPolicies.and.resolveTo([pd]);
    policyServiceSpy.getPolicyDefinitionById.and.resolveTo({
      '@id': POLICY_ID,
      '@type': 'PolicyDefinition',
      createdAt: 1771252803631,
    } as unknown as PolicyDefinition);

    const asset = {
      '@id': 'asset-1',
      contractPolicyId: POLICY_ID,
      properties: { 'offer.license': LICENSE_URL },
    } as unknown as Asset;
    assetServiceSpy = jasmine.createSpyObj<AssetService>('AssetService', ['getAssetsCacheSnapshotOrLoad']);
    assetServiceSpy.getAssetsCacheSnapshotOrLoad.and.resolveTo({
      data: [asset],
      fetchedAt: Date.now(),
      expiresAt: Date.now() + 3600000,
      isRefreshing: false,
    });

    currentEdcConfig$ = new BehaviorSubject<EdcConfig | undefined>(defaultEdcConfig);

    await TestBed.configureTestingModule({
      imports: [PolicyDetailComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PolicyService, useValue: policyServiceSpy },
        { provide: AssetService, useValue: assetServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: POLICY_ID }),
              queryParamMap: convertToParamMap({ rol: 'Contratación', fecha: POLICY_LIST_DATE_TEST_FIXTURE }),
            },
          },
        },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        {
          provide: DashboardStateService,
          useValue: { currentEdcConfig$: currentEdcConfig$.asObservable() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PolicyDetailComponent);
    httpMock = TestBed.inject(HttpTestingController);
    TestBed.inject(TranslateService).use('es');
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('fetches and displays license text when offer.license is set', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const req = httpMock.expectOne(LICENSE_URL);
    expect(req.request.method).toBe('GET');
    req.flush('Apache License\nVersion 2.0');

    await fixture.whenStable();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Apache License');
    expect(el.textContent).toContain('Version 2.0');
    expect(fixture.componentInstance.policyKind()).toBe('Contratación');
    expect(fixture.componentInstance.displayDate()).toBe(POLICY_LIST_DATE_TEST_FIXTURE);
  });

  it('fetches license when offer.license is in expanded EDC JSON-LD properties', async () => {
    const edcNs = 'https://w3id.org/edc/v0.0.1/ns/';
    const expandedAsset = {
      '@id': 'asset-expanded',
      accessPolicyId: POLICY_ID,
      contractPolicyId: 'contract-other',
      [`${edcNs}properties`]: [
        {
          [`${edcNs}offer.license`]: [{ '@value': LICENSE_URL }],
        },
      ],
    } as unknown as Asset;
    assetServiceSpy.getAssetsCacheSnapshotOrLoad.and.resolveTo({
      data: [expandedAsset],
      fetchedAt: Date.now(),
      expiresAt: Date.now() + 3600000,
      isRefreshing: false,
    });

    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [PolicyDetailComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PolicyService, useValue: policyServiceSpy },
        { provide: AssetService, useValue: assetServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: POLICY_ID }),
              queryParamMap: convertToParamMap({ rol: 'Publicación', fecha: POLICY_LIST_DATE_TEST_FIXTURE }),
            },
          },
        },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        {
          provide: DashboardStateService,
          useValue: { currentEdcConfig$: currentEdcConfig$.asObservable() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PolicyDetailComponent);
    httpMock = TestBed.inject(HttpTestingController);
    TestBed.inject(TranslateService).use('es');

    fixture.detectChanges();
    await fixture.whenStable();

    const req = httpMock.expectOne(LICENSE_URL);
    req.flush('License body from expanded properties');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('License body from expanded properties');
  });

  it('shows license error when HTTP fails', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    httpMock.expectOne(LICENSE_URL).flush('', { status: 500, statusText: 'Server' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No se ha podido cargar la licencia');
  });

  it('loads ODRL JSON from embedded mock for SD mock contract policy id without calling management', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    httpMock.expectOne(LICENSE_URL).flush('license');
    await fixture.whenStable();
    fixture.detectChanges();

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).filter(b =>
      (b.textContent ?? '').includes('ODRL'),
    );
    expect(buttons.length).toBeGreaterThanOrEqual(1);
    (buttons[0] as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(policyServiceSpy.getPolicyDefinitionById).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('http://simpl.eu/odrl/actions/consume');
  });

  it('loads ODRL via management when dashboardMocksEnabled is false', async () => {
    currentEdcConfig$.next({
      connectorName: 'c',
      managementUrl: 'https://x/m',
      defaultUrl: 'https://x/a',
      protocolUrl: 'https://x/p',
      federatedCatalogEnabled: false,
      dashboardMocksEnabled: false,
    });

    fixture.detectChanges();
    await fixture.whenStable();
    httpMock.expectOne(LICENSE_URL).flush('license');
    await fixture.whenStable();
    fixture.detectChanges();

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).filter(b =>
      (b.textContent ?? '').includes('ODRL'),
    );
    expect(buttons.length).toBeGreaterThanOrEqual(1);
    (buttons[0] as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(policyServiceSpy.getPolicyDefinitionById).toHaveBeenCalled();
  });
});

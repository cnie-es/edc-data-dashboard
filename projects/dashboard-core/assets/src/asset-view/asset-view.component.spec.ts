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

import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { By } from '@angular/platform-browser';
import type { Asset } from '@think-it-labs/edc-connector-client';
import { DashboardStateService, ModalAndAlertService, SdMatchedAssetsWarmupService } from '@eclipse-edc/dashboard-core';
import { AssetService } from '../asset.service';

import { AssetViewComponent } from './asset-view.component';
import type { AssetTableRow } from './asset-table-row.model';

describe('AssetViewComponent', () => {
  let component: AssetViewComponent;
  let fixture: ComponentFixture<AssetViewComponent>;
  let assetServiceSpy: jasmine.SpyObj<AssetService>;

  const dashboardStateServiceMock = {
    currentEdcConfig$: new BehaviorSubject({}),
  } as unknown as DashboardStateService;

  const modalAndAlertServiceMock = {
    closeModal: jasmine.createSpy('closeModal'),
    showAlert: jasmine.createSpy('showAlert'),
    openModal: jasmine.createSpy('openModal'),
  } as unknown as ModalAndAlertService;

  const futureExpiry = () => Date.now() + 60 * 60 * 1000;

  const sampleListAsset = {
    id: 'test-asset-id',
    '@id': 'test-asset-id',
    '@type': 'https://w3id.org/edc/v0.0.1/ns/Asset',
    properties: {
      id: 'test-asset-id',
      createdAt: '2026-05-13T09:23:20.288567228Z',
      assetType: 'ms:Corpus',
      assetTitle: 'ABSITA dataset1',
      assetDescription: 'Italian reviews dataset for tests.',
    },
  } as unknown as Asset;

  beforeEach(async () => {
    assetServiceSpy = jasmine.createSpyObj<AssetService>('AssetService', ['getAssetsCacheSnapshotOrLoad']);
    assetServiceSpy.getAssetsCacheSnapshotOrLoad.and.resolveTo({
      data: [sampleListAsset],
      fetchedAt: Date.now(),
      expiresAt: futureExpiry(),
      isRefreshing: false,
    });

    const assetsWarmupSpy = jasmine.createSpyObj<SdMatchedAssetsWarmupService>('SdMatchedAssetsWarmupService', ['run']);
    assetsWarmupSpy.run.and.resolveTo();

    await TestBed.configureTestingModule({
      imports: [AssetViewComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: AssetService, useValue: assetServiceSpy },
        { provide: SdMatchedAssetsWarmupService, useValue: assetsWarmupSpy },
        { provide: DashboardStateService, useValue: dashboardStateServiceMock },
        { provide: ModalAndAlertService, useValue: modalAndAlertServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssetViewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('uses pageItemCount of 5', () => {
    expect(component.pageItemCount).toBe(5);
  });

  it('toTableRow maps createdAt, assetType, assetTitle, and assetDescription from properties', () => {
    const row = (component as unknown as { toTableRow(asset: Asset): AssetTableRow }).toTableRow(sampleListAsset);
    expect(row.creationDate).toBe('13/05/2026');
    expect(row.type).toBe('ms:Corpus');
    expect(row.assetName).toBe('ABSITA dataset1');
    expect(row.description).toBe('Italian reviews dataset for tests.');
  });

  it('toTableRow formats numeric createdAt as dd/mm/yyyy', () => {
    const epoch = Date.UTC(2024, 5, 15, 12, 0, 0);
    const asset = {
      id: 'n',
      properties: { id: 'n', createdAt: epoch, assetType: 't', assetTitle: 'T', assetDescription: 'D' },
    } as unknown as Asset;
    const row = (component as unknown as { toTableRow(asset: Asset): AssetTableRow }).toTableRow(asset);
    expect(row.creationDate).not.toBe('-');
    expect(row.creationDate.split('/').length).toBe(3);
    expect(row.creationDate.endsWith('2024')).toBe(true);
  });

  it('loads rows from assets cache snapshot and renders mapped fields', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(assetServiceSpy.getAssetsCacheSnapshotOrLoad).toHaveBeenCalled();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('13/05/2026');
    expect(text).toContain('ms:Corpus');
    expect(text).toContain('ABSITA dataset1');
    expect(text).toContain('Italian reviews dataset for tests.');
  });

  it('shows loading indicator when not fetched and there are no rows', () => {
    component.fetched = false;
    component.rows$ = of([]);
    component.pageRows$ = of([]);
    component.filteredRows$ = of([]);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.loading-bars'))).toBeTruthy();
    const text = fixture.nativeElement.textContent as string;
    expect(text).not.toContain('No assets created yet');
  });

  it('shows empty message when fetched and there are no rows', () => {
    component.fetched = true;
    component.rows$ = of([]);
    component.pageRows$ = of([]);
    component.filteredRows$ = of([]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('No assets created yet');
    expect(fixture.debugElement.query(By.css('.loading-bars'))).toBeFalsy();
  });

  it('hides empty message when rows exist', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).not.toContain('No assets created yet');
  });
});

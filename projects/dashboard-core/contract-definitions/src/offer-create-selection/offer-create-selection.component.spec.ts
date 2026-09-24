/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import {
  ModalAndAlertService,
  OFFER_CREATION_PENDING_SCHEMA_STORAGE_KEY,
  OfferCreationSchemasService,
} from '@eclipse-edc/dashboard-core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { of, throwError, NEVER } from 'rxjs';
import { OfferCreateSelectionComponent } from './offer-create-selection.component';

describe('OfferCreateSelectionComponent', () => {
  let fetchCatalog: jasmine.Spy;
  let routerNavigate: jasmine.Spy;
  let showAlert: jasmine.Spy;
  let translate: TranslateService;
  let fixture: ComponentFixture<OfferCreateSelectionComponent>;

  beforeEach(async () => {
    sessionStorage.clear();
    fetchCatalog = jasmine.createSpy('fetchCatalog');
    routerNavigate = jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true));
    showAlert = jasmine.createSpy('showAlert');
    fetchCatalog.and.returnValue(
      of({
        schemas: [{ id: 'CorpusSchema_ES', resourceType: 'data', title: 'CorpusSchema ES title' }],
      }),
    );

    await TestBed.configureTestingModule({
      imports: [OfferCreateSelectionComponent, TranslateModule.forRoot()],
      providers: [
        { provide: OfferCreationSchemasService, useValue: { fetchCatalog } },
        { provide: Router, useValue: { navigate: routerNavigate } },
        { provide: ModalAndAlertService, useValue: { showAlert } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OfferCreateSelectionComponent);
    translate = TestBed.inject(TranslateService);
    fixture.detectChanges();
  });

  it('loads catalog and navigates with CorpusSchema_ES when lang is es', async () => {
    translate.use('es');
    await fixture.whenStable();
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('.card')?.querySelector('button');
    expect(btn).toBeTruthy();
    btn.click();
    await fixture.whenStable();

    expect(routerNavigate).toHaveBeenCalledWith(['/sdtooling'], {
      queryParams: { schemaId: 'CorpusSchema_ES' },
    });
    const raw = sessionStorage.getItem(OFFER_CREATION_PENDING_SCHEMA_STORAGE_KEY);
    expect(raw).toBeTruthy();
    if (!raw) {
      throw new Error('expected sessionStorage payload');
    }
    expect(JSON.parse(raw)).toEqual(
      jasmine.objectContaining({
        id: 'CorpusSchema_ES',
        resourceType: 'data',
        label: 'CorpusSchema ES title',
      }),
    );
    expect(showAlert).not.toHaveBeenCalled();
  });

  it('shows unavailable for en when CorpusSchema_EN is missing even if generic or other locale exists', async () => {
    fetchCatalog.and.returnValue(
      of({
        schemas: [
          { id: 'CorpusSchema', resourceType: 'data', title: 'Generic' },
          { id: 'CorpusSchema_ES', resourceType: 'data', title: 'ES' },
        ],
      }),
    );
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [OfferCreateSelectionComponent, TranslateModule.forRoot()],
      providers: [
        { provide: OfferCreationSchemasService, useValue: { fetchCatalog } },
        { provide: Router, useValue: { navigate: routerNavigate } },
        { provide: ModalAndAlertService, useValue: { showAlert } },
      ],
    }).compileComponents();

    const f = TestBed.createComponent(OfferCreateSelectionComponent);
    TestBed.inject(TranslateService).use('en');
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();

    const btn = f.nativeElement.querySelector('.card')?.querySelector('button');
    expect(btn).toBeTruthy();
    btn.click();
    f.detectChanges();

    expect(routerNavigate).not.toHaveBeenCalled();
    expect(showAlert).toHaveBeenCalledWith(jasmine.stringMatching(/corpus/i), undefined, 'error', 6);
  });

  it('navigates with CorpusSchema_GL when lang is gl and schema is in catalog', async () => {
    fetchCatalog.and.returnValue(
      of({
        schemas: [{ id: 'CorpusSchema_GL', resourceType: 'data', title: 'Corpus GL' }],
      }),
    );
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [OfferCreateSelectionComponent, TranslateModule.forRoot()],
      providers: [
        { provide: OfferCreationSchemasService, useValue: { fetchCatalog } },
        { provide: Router, useValue: { navigate: routerNavigate } },
        { provide: ModalAndAlertService, useValue: { showAlert } },
      ],
    }).compileComponents();

    const f = TestBed.createComponent(OfferCreateSelectionComponent);
    TestBed.inject(TranslateService).use('gl');
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();

    const btn = f.nativeElement.querySelector('.card')?.querySelector('button');
    expect(btn).toBeTruthy();
    btn.click();
    await f.whenStable();

    expect(routerNavigate).toHaveBeenCalledWith(['/sdtooling'], {
      queryParams: { schemaId: 'CorpusSchema_GL' },
    });
    expect(showAlert).not.toHaveBeenCalled();
  });

  it('shows unavailable when model schema is not in catalog', async () => {
    translate.use('en');
    await fixture.whenStable();
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.card button');
    expect(buttons.length).toBe(4);
    buttons[2].click();
    fixture.detectChanges();

    expect(routerNavigate).not.toHaveBeenCalled();
    expect(showAlert).toHaveBeenCalledWith(jasmine.stringMatching(/model/i), undefined, 'error', 6);
  });

  it('shows toast when catalog fetch fails and user picks a type', async () => {
    fetchCatalog.and.returnValue(throwError(() => new Error('network')));
    const f = TestBed.createComponent(OfferCreateSelectionComponent);
    TestBed.inject(TranslateService).use('en');
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();

    const buttons = f.nativeElement.querySelectorAll('.card button');
    buttons[2].click();

    expect(showAlert).toHaveBeenCalledWith(jasmine.stringMatching(/model/i), undefined, 'error', 6);
  });

  it('uses four distinct card images', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    const images = fixture.nativeElement.querySelectorAll('.card figure img');
    expect(images.length).toBe(4);
    const srcs = Array.from(images as NodeListOf<HTMLImageElement>).map(img => img.getAttribute('src'));
    expect(srcs).toContain('/assets/home-1.jpg');
    expect(srcs).toContain('/assets/home-3.jpg');
    expect(srcs).toContain('/assets/home-4.jpg');
    expect(srcs).toContain('/assets/home-service.jpg');
  });

  it('navigates with ApiSchema_ES when lang is es and api schema is in catalog', async () => {
    fetchCatalog.and.returnValue(
      of({
        schemas: [
          { id: 'CorpusSchema_ES', resourceType: 'data', title: 'Corpus' },
          { id: 'ApiSchema_ES', resourceType: 'data', title: 'Api ES' },
        ],
      }),
    );
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [OfferCreateSelectionComponent, TranslateModule.forRoot()],
      providers: [
        { provide: OfferCreationSchemasService, useValue: { fetchCatalog } },
        { provide: Router, useValue: { navigate: routerNavigate } },
        { provide: ModalAndAlertService, useValue: { showAlert } },
      ],
    }).compileComponents();

    const f = TestBed.createComponent(OfferCreateSelectionComponent);
    TestBed.inject(TranslateService).use('es');
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();

    const buttons = f.nativeElement.querySelectorAll('.card button');
    expect(buttons.length).toBe(4);
    buttons[3].click();
    await f.whenStable();

    expect(routerNavigate).toHaveBeenCalledWith(['/sdtooling'], {
      queryParams: { schemaId: 'ApiSchema_ES' },
    });
    const raw = sessionStorage.getItem(OFFER_CREATION_PENDING_SCHEMA_STORAGE_KEY);
    expect(raw).toBeTruthy();
    if (!raw) {
      throw new Error('expected sessionStorage payload');
    }
    expect(JSON.parse(raw)).toEqual(
      jasmine.objectContaining({
        id: 'ApiSchema_ES',
        resourceType: 'data',
        label: 'Api ES',
      }),
    );
    expect(showAlert).not.toHaveBeenCalled();
  });

  it('shows unavailable when api schema is not in catalog', async () => {
    translate.use('en');
    await fixture.whenStable();
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.card button');
    expect(buttons.length).toBe(4);
    buttons[3].click();
    fixture.detectChanges();

    expect(routerNavigate).not.toHaveBeenCalled();
    expect(showAlert).toHaveBeenCalledWith(jasmine.stringMatching(/service/i), undefined, 'error', 6);
  });

  it('ignores click while catalog is still loading', async () => {
    fetchCatalog.and.returnValue(NEVER);
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [OfferCreateSelectionComponent, TranslateModule.forRoot()],
      providers: [
        { provide: OfferCreationSchemasService, useValue: { fetchCatalog } },
        { provide: Router, useValue: { navigate: routerNavigate } },
        { provide: ModalAndAlertService, useValue: { showAlert } },
      ],
    }).compileComponents();

    const f = TestBed.createComponent(OfferCreateSelectionComponent);
    f.detectChanges();
    expect(f.componentInstance.catalogLoading).toBeTrue();

    const btn = f.nativeElement.querySelector('.card')?.querySelector('button');
    expect(btn).toBeTruthy();
    (btn as HTMLButtonElement).click();
    f.detectChanges();

    expect(routerNavigate).not.toHaveBeenCalled();
    expect(showAlert).not.toHaveBeenCalled();
  });
});

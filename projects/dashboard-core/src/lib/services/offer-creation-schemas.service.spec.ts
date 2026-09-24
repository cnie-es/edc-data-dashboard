/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import type { EdcConfig } from '../models/edc-config';
import { DashboardStateService } from './dashboard-state.service';
import { OfferCreationSchemasService } from './offer-creation-schemas.service';

describe('OfferCreationSchemasService', () => {
  let httpMock: HttpTestingController;
  let service: OfferCreationSchemasService;
  const currentEdcConfig$ = new BehaviorSubject<EdcConfig | undefined>(undefined);

  const minimalConfig = (overrides: Partial<EdcConfig> = {}): EdcConfig => ({
    connectorName: 'c1',
    managementUrl: 'https://example/m',
    defaultUrl: 'https://example/d',
    protocolUrl: 'https://example/p',
    federatedCatalogEnabled: false,
    ...overrides,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        OfferCreationSchemasService,
        { provide: DashboardStateService, useValue: { currentEdcConfig$: currentEdcConfig$.asObservable() } },
      ],
    });
    service = TestBed.inject(OfferCreationSchemasService);
    httpMock = TestBed.inject(HttpTestingController);
    currentEdcConfig$.next(minimalConfig());
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('GETs /sdtooling-api/v2/schemas when offerCreationSchemasUrl is unset', done => {
    service.fetchCatalog().subscribe(catalog => {
      expect(catalog.schemas).toEqual([{ id: 'data-DataSchema', resourceType: 'data' }]);
      done();
    });
    const req = httpMock.expectOne('/sdtooling-api/v2/schemas');
    expect(req.request.method).toBe('GET');
    req.flush({ schemas: [{ id: 'data-DataSchema', resourceType: 'data' }] });
  });

  it('GETs resolved absolute sdToolingApiBaseUrl + /schemas', done => {
    currentEdcConfig$.next(minimalConfig({ sdToolingApiBaseUrl: 'https://localhost:8080/sdtooling-api/v2' }));
    service.fetchCatalog().subscribe(catalog => {
      expect(catalog.schemas.length).toBe(1);
      done();
    });
    const req = httpMock.expectOne('https://localhost:8080/sdtooling-api/v2/schemas');
    req.flush({ schemas: [{ id: 'data-DataSchema', resourceType: 'data' }] });
  });

  it('GETs offerCreationSchemasUrl from config when set', done => {
    currentEdcConfig$.next(minimalConfig({ offerCreationSchemasUrl: '/custom/schemas' }));
    service.fetchCatalog().subscribe(catalog => {
      expect(catalog.schemas.length).toBe(1);
      done();
    });
    const req = httpMock.expectOne('/custom/schemas');
    req.flush({ schemas: [{ id: 'x', name: 'X', resourceType: 'application' }] });
  });

  it('parses root-level array body as schemas', done => {
    service.fetchCatalog().subscribe(catalog => {
      expect(catalog.schemas.map(s => s.id)).toEqual(['a', 'b']);
      done();
    });
    const req = httpMock.expectOne('/sdtooling-api/v2/schemas');
    req.flush([{ id: 'a', resourceType: 'data' }, { id: 'b' }]);
  });

  it('drops schema entries without id', done => {
    service.fetchCatalog().subscribe(catalog => {
      expect(catalog.schemas).toEqual([{ id: 'ok', resourceType: 'data' }]);
      done();
    });
    const req = httpMock.expectOne('/sdtooling-api/v2/schemas');
    req.flush({ schemas: [{ name: 'no id' }, { id: 'ok', resourceType: 'data' }] });
  });

  it('parses CorpusSchema_ES catalog payload from live schemas API shape', done => {
    service.fetchCatalog().subscribe(catalog => {
      expect(catalog.schemas).toEqual([
        jasmine.objectContaining({
          id: 'CorpusSchema_ES',
          title: 'CorpusSchema ES title',
          name: 'CorpusSchema_ES',
          description: 'Schema for corpus offerings in the edval dataspace',
          version: '1.0.0',
          resourceType: 'data',
        }),
      ]);
      done();
    });
    const req = httpMock.expectOne('/sdtooling-api/v2/schemas');
    req.flush({
      schemas: [
        {
          id: 'CorpusSchema_ES',
          title: 'CorpusSchema ES title',
          name: 'CorpusSchema_ES',
          description: 'Schema for corpus offerings in the edval dataspace',
          version: '1.0.0',
          resourceType: 'data',
        },
      ],
    });
  });

  it('parses Service and Contract when schemas is missing or empty', done => {
    service.fetchCatalog().subscribe(catalog => {
      expect(catalog.schemas.map(s => s.id)).toEqual(['from-service', 'from-contract']);
      done();
    });
    const req = httpMock.expectOne('/sdtooling-api/v2/schemas');
    req.flush({
      Service: [{ id: 'from-service', resourceType: 'data' }],
      Contract: [{ id: 'from-contract' }],
    });
  });
});

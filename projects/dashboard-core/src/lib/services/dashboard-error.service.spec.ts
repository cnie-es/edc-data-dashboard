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

import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EdcConnectorClientError, EdcConnectorClientErrorType } from '@think-it-labs/edc-connector-client';
import { DashboardErrorService, DashboardResolvableError } from './dashboard-error.service';
import { ModalAndAlertService } from './modal-and-alert.service';

describe('DashboardErrorService', () => {
  let service: DashboardErrorService;
  let translate: TranslateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        DashboardErrorService,
        {
          provide: ModalAndAlertService,
          useValue: jasmine.createSpyObj('ModalAndAlertService', ['showAlert']),
        },
      ],
    });

    service = TestBed.inject(DashboardErrorService);
    translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      'common.errors.http.sessionExpired': 'session expired',
      'common.errors.http.forbidden': 'forbidden',
      'common.errors.http.unavailable': 'unavailable',
      'common.errors.http.network': 'network',
      'common.errors.http.server': 'server',
      'common.errors.http.failedWithStatus': 'failed {{status}}',
      'common.errors.edc.badRequest': 'bad request',
      'common.errors.edc.unknown': 'edc unknown',
      'common.errors.generic': 'generic error',
      'common.error.title': 'Error',
    });
    translate.use('en');
  });

  it('should map Http 401 to sessionExpired', () => {
    const resolved = service.resolve(new HttpErrorResponse({ status: 401 }));
    expect(resolved.messageKey).toBe('common.errors.http.sessionExpired');
  });

  it('should map Http 403 to forbidden', () => {
    const resolved = service.resolve(new HttpErrorResponse({ status: 403 }));
    expect(resolved.messageKey).toBe('common.errors.http.forbidden');
  });

  it('should map Http 404 to unavailable', () => {
    const resolved = service.resolve(new HttpErrorResponse({ status: 404 }));
    expect(resolved.messageKey).toBe('common.errors.http.unavailable');
  });

  it('should map Http 0 to network', () => {
    const resolved = service.resolve(new HttpErrorResponse({ status: 0 }));
    expect(resolved.messageKey).toBe('common.errors.http.network');
  });

  it('should map Http 500 to server', () => {
    const resolved = service.resolve(new HttpErrorResponse({ status: 500 }));
    expect(resolved.messageKey).toBe('common.errors.http.server');
  });

  it('should map other Http status to failedWithStatus', () => {
    const resolved = service.resolve(new HttpErrorResponse({ status: 418 }));
    expect(resolved.messageKey).toBe('common.errors.http.failedWithStatus');
    expect(resolved.params).toEqual({ status: 418 });
  });

  it('should map EdcConnectorClientError BadRequest', () => {
    const resolved = service.resolve(new EdcConnectorClientError(EdcConnectorClientErrorType.BadRequest, 'api msg'));
    expect(resolved.messageKey).toBe('common.errors.edc.badRequest');
    expect(resolved.debugMessage).toBe('api msg');
  });

  it('should map EdcConnectorClientError Unknown', () => {
    const resolved = service.resolve(new EdcConnectorClientError(EdcConnectorClientErrorType.Unknown));
    expect(resolved.messageKey).toBe('common.errors.edc.unknown');
  });

  it('should map unknown errors to generic', () => {
    expect(service.resolve(null).messageKey).toBe('common.errors.generic');
    expect(service.resolve('oops').messageKey).toBe('common.errors.generic');
  });

  it('should unwrap DashboardResolvableError', () => {
    const inner = { messageKey: 'catalog.errors.invalidCounterParty', severity: 'error' as const };
    const resolved = service.resolve(new DashboardResolvableError(inner));
    expect(resolved.messageKey).toBe('catalog.errors.invalidCounterParty');
  });

  it('should call translate.instant in toUserMessage', () => {
    spyOn(translate, 'instant').and.returnValue('translated');
    const result = service.toUserMessage({
      messageKey: 'common.errors.http.failedWithStatus',
      params: { status: 418 },
      severity: 'error',
    });
    expect(translate.instant).toHaveBeenCalledWith('common.errors.http.failedWithStatus', { status: 418 });
    expect(result).toBe('translated');
  });
});

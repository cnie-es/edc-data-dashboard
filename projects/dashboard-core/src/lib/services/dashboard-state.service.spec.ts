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

import { TestBed } from '@angular/core/testing';
import { DashboardStateService } from './dashboard-state.service';
import { EdcClientService } from './edc-client.service';
import type { EdcConfig } from '../models/edc-config';
import { take } from 'rxjs';

class MockEdcClientService {
  createClient() {}
  setDashboardClient() {}
}

describe('DashboardStateService', () => {
  let service: DashboardStateService;
  let edcClientService: EdcClientService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [DashboardStateService, { provide: EdcClientService, useClass: MockEdcClientService }],
    });

    service = TestBed.inject(DashboardStateService);
    edcClientService = TestBed.inject(EdcClientService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set menu open state', () => {
    service.setMenuOpen(false);
    service.isMenuOpen$.subscribe(isOpen => {
      expect(isOpen).toBe(false);
    });
  });

  it('should toggle menu open state', () => {
    service.setMenuOpen(false);
    service.toggleMenuOpen();
    service.isMenuOpen$.pipe(take(1)).subscribe(isOpen => {
      expect(isOpen).toBe(true);
    });
    service.toggleMenuOpen();
    service.isMenuOpen$.pipe(take(1)).subscribe(isOpen => {
      expect(isOpen).toBe(false);
    });
  });

  it('should set federated catalog enabled state', () => {
    service.setFederatedCatalogEnabled(true);
    service.isFederatedCatalogEnabled$.subscribe(isEnabled => {
      expect(isEnabled).toBe(true);
    });
  });

  it('should update EDC configurations', () => {
    const configs: EdcConfig[] = [
      {
        federatedCatalogUrl: 'http://example.com',
        federatedCatalogEnabled: true,
        connectorName: '',
        managementUrl: '',
        defaultUrl: '',
        protocolUrl: '',
      },
    ];
    service.setEdcConfigs(configs);
    service.edcConfigs$.subscribe(updatedConfigs => {
      expect(updatedConfigs).toEqual(configs);
    });
  });

  it('should select first startup EDC config when no current connector exists', () => {
    const first: EdcConfig = {
      connectorName: 'startup-first',
      defaultUrl: 'http://default-startup',
      managementUrl: 'http://management-startup',
      protocolUrl: 'http://protocol-startup',
      federatedCatalogEnabled: false,
    };
    spyOn(edcClientService, 'setDashboardClient');

    service.setEdcConfigs([first]);

    expect(edcClientService.setDashboardClient).toHaveBeenCalledWith(first);
    service.currentEdcConfig$.pipe(take(1)).subscribe(current => {
      expect(current).toEqual(first);
    });
  });

  it('should keep existing current connector when startup EDC configs are set later', () => {
    const current: EdcConfig = {
      connectorName: 'already-selected',
      defaultUrl: 'http://default-selected',
      managementUrl: 'http://management-selected',
      protocolUrl: 'http://protocol-selected',
      federatedCatalogEnabled: false,
    };
    const startup: EdcConfig = {
      connectorName: 'startup-config',
      defaultUrl: 'http://default-startup',
      managementUrl: 'http://management-startup',
      protocolUrl: 'http://protocol-startup',
      federatedCatalogEnabled: false,
    };
    spyOn(edcClientService, 'setDashboardClient');
    service.setCurrentEdcConfig(current);
    (edcClientService.setDashboardClient as jasmine.Spy).calls.reset();

    service.setEdcConfigs([startup]);

    expect(edcClientService.setDashboardClient).not.toHaveBeenCalled();
    service.currentEdcConfig$.pipe(take(1)).subscribe(config => {
      expect(config).toEqual(current);
    });
  });

  it('should set current EDC configuration and update client', () => {
    const config: EdcConfig = {
      connectorName: '',
      defaultUrl: '',
      managementUrl: '',
      protocolUrl: '',
      federatedCatalogUrl: 'http://example.com',
      federatedCatalogEnabled: true,
    };
    spyOn(edcClientService, 'setDashboardClient');
    service.setCurrentEdcConfig(config);

    service.currentEdcConfig$.subscribe(currentConfig => {
      expect(currentConfig).toBe(config);
    });
    expect(edcClientService.setDashboardClient).toHaveBeenCalledWith(config);
  });

  it('should set current connector when adding first local storage config', () => {
    const config: EdcConfig = {
      connectorName: 'first',
      defaultUrl: 'http://default',
      managementUrl: 'http://management',
      protocolUrl: 'http://protocol',
      federatedCatalogEnabled: false,
    };
    spyOn(edcClientService, 'setDashboardClient');
    service.addLocalStorageEdcConfig(config);
    expect(edcClientService.setDashboardClient).toHaveBeenCalledWith(config);
    service.currentEdcConfig$.pipe(take(1)).subscribe(current => {
      expect(current).toEqual(config);
    });
  });

  it('should not replace current connector when adding another local storage config', () => {
    const first: EdcConfig = {
      connectorName: 'first',
      defaultUrl: 'http://default1',
      managementUrl: 'http://management1',
      protocolUrl: 'http://protocol1',
      federatedCatalogEnabled: false,
    };
    const second: EdcConfig = {
      connectorName: 'second',
      defaultUrl: 'http://default2',
      managementUrl: 'http://management2',
      protocolUrl: 'http://protocol2',
      federatedCatalogEnabled: false,
    };
    spyOn(edcClientService, 'setDashboardClient');
    service.setCurrentEdcConfig(first);
    (edcClientService.setDashboardClient as jasmine.Spy).calls.reset();
    service.addLocalStorageEdcConfig(second);
    expect(edcClientService.setDashboardClient).not.toHaveBeenCalled();
    service.currentEdcConfig$.pipe(take(1)).subscribe(current => {
      expect(current).toBe(first);
    });
  });

  afterEach(() => {
    service.ngOnDestroy();
  });
});

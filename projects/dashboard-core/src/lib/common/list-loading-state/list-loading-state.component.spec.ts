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

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { ComponentFixture } from '@angular/core/testing';
import { ListLoadingStateComponent } from './list-loading-state.component';

@Component({
  standalone: true,
  imports: [ListLoadingStateComponent],
  template: `
    <lib-list-loading-state [fetched]="fetched" [variant]="variant" [error]="error">
      <p class="empty-msg">EMPTY</p>
      <p listLoadingError class="error-msg">ERROR</p>
    </lib-list-loading-state>
  `,
})
class HostComponent {
  fetched = false;
  variant: 'centered' | 'grid' | 'table' = 'centered';
  error = false;
}

describe('ListLoadingStateComponent', () => {
  let hostFixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    hostFixture = TestBed.createComponent(HostComponent);
  });

  it('should show spinner when not fetched (centered)', () => {
    hostFixture.componentInstance.fetched = false;
    hostFixture.detectChanges();

    expect(hostFixture.debugElement.query(By.css('.loading-bars'))).toBeTruthy();
    expect(hostFixture.nativeElement.textContent).not.toContain('EMPTY');
  });

  it('should project empty content when fetched', () => {
    hostFixture.componentInstance.fetched = true;
    hostFixture.detectChanges();

    expect(hostFixture.debugElement.query(By.css('.loading-bars'))).toBeFalsy();
    expect(hostFixture.nativeElement.textContent).toContain('EMPTY');
  });

  it('should project error content when fetched and error', () => {
    hostFixture.componentInstance.fetched = true;
    hostFixture.componentInstance.error = true;
    hostFixture.detectChanges();

    expect(hostFixture.nativeElement.textContent).toContain('ERROR');
    expect(hostFixture.nativeElement.textContent).not.toContain('EMPTY');
  });

  it('should render table row with spinner when variant is table and not fetched', () => {
    hostFixture.componentInstance.variant = 'table';
    hostFixture.componentInstance.fetched = false;
    hostFixture.detectChanges();

    const listLoading = hostFixture.debugElement.query(By.directive(ListLoadingStateComponent));
    (listLoading.componentInstance as ListLoadingStateComponent).colspan = 5;
    hostFixture.detectChanges();

    const row = hostFixture.debugElement.query(By.css('tr'));
    expect(row).toBeTruthy();
    expect(hostFixture.debugElement.query(By.css('.loading-bars'))).toBeTruthy();
  });

  it('should render grid variant with col-span-full wrapper', () => {
    hostFixture.componentInstance.variant = 'grid';
    hostFixture.componentInstance.fetched = false;
    hostFixture.detectChanges();

    expect(hostFixture.debugElement.query(By.css('.col-span-full'))).toBeTruthy();
    expect(hostFixture.debugElement.query(By.css('.loading-bars'))).toBeTruthy();
  });
});

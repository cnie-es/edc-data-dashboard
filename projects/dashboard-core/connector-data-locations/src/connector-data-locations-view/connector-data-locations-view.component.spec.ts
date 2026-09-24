import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import type { EdcConfig } from '@eclipse-edc/dashboard-core';
import { DashboardStateService } from '@eclipse-edc/dashboard-core';
import { ConnectorDataLocationsViewComponent } from './connector-data-locations-view.component';

describe('ConnectorDataLocationsViewComponent', () => {
  let component: ConnectorDataLocationsViewComponent;
  let fixture: ComponentFixture<ConnectorDataLocationsViewComponent>;
  const currentEdcConfig$ = new BehaviorSubject<EdcConfig | undefined>(undefined);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConnectorDataLocationsViewComponent],
      providers: [
        { provide: DashboardStateService, useValue: { currentEdcConfig$: currentEdcConfig$.asObservable() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConnectorDataLocationsViewComponent);
    component = fixture.componentInstance;
    currentEdcConfig$.next(undefined);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders expected table headers and row count when dashboardMocksEnabled is true', () => {
    currentEdcConfig$.next({
      connectorName: 'c',
      managementUrl: 'https://x/m',
      defaultUrl: 'https://x/a',
      protocolUrl: 'https://x/p',
      federatedCatalogEnabled: false,
      dashboardMocksEnabled: true,
    });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Name');
    expect(compiled.textContent).toContain('Type');
    expect(compiled.textContent).toContain('URL');
    expect(compiled.querySelectorAll('tbody tr').length).toBe(3);
    expect(compiled.textContent).toContain('cc8630df-49bd-42e5-8bed-73dc43c5b541');
    expect(compiled.textContent).toContain('92b45011-856e-46b8-80de-6cb36f80a24e');
    expect(compiled.textContent).toContain('660b4a68-0eba-480a-b2c7-6b6e79fc6439');
    expect(compiled.textContent).toContain('http://localhost:19192/control/v1/dataflows');
    expect(compiled.textContent).toContain('MinioS3');
    expect(compiled.textContent).toContain('HttpData');
    expect(compiled.textContent).toContain('Infrastructure');
  });

  it('renders no dataplane rows when dashboardMocksEnabled is false', () => {
    currentEdcConfig$.next({
      connectorName: 'c',
      managementUrl: 'https://x/m',
      defaultUrl: 'https://x/a',
      protocolUrl: 'https://x/p',
      federatedCatalogEnabled: false,
      dashboardMocksEnabled: false,
    });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('tbody tr').length).toBe(0);
  });

  it('renders no dataplane rows when dashboardMocksEnabled is omitted', () => {
    currentEdcConfig$.next({
      connectorName: 'c',
      managementUrl: 'https://x/m',
      defaultUrl: 'https://x/a',
      protocolUrl: 'https://x/p',
      federatedCatalogEnabled: false,
    });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('tbody tr').length).toBe(0);
  });
});

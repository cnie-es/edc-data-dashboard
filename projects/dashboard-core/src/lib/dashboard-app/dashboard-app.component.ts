import { Component, Input, ViewChild, ViewContainerRef, inject } from '@angular/core';
import type { AfterViewInit } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AsyncPipe, NgClass } from '@angular/common';
import { filter, map, startWith } from 'rxjs';
import { DashboardStateService } from '../services/dashboard-state.service';
import type { EdcConfig } from '../models/edc-config';
import { ModalAndAlertService } from '../services/modal-and-alert.service';
import type { AppConfig } from '../models/app-config';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DASHBOARD_LANG_OPTIONS, dashboardLangFlagClass, dashboardLangLabel } from '../i18n/dashboard-lang-options';
import { resolveDashboardLang } from '../i18n/resolve-dashboard-lang';
import type { DashboardLang } from '../i18n/resolve-dashboard-lang';

export interface DashboardUserInfo {
  given_name?: string;
  family_name?: string;
}

@Component({
  selector: 'lib-dashboard-app',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe, NgClass, TranslateModule],
  templateUrl: './dashboard-app.component.html',
})
export class DashboardAppComponent implements AfterViewInit {
  stateService = inject(DashboardStateService);
  private readonly router = inject(Router);
  private readonly modalAndAlertService = inject(ModalAndAlertService);

  readonly isManualTokenLogin$ = this.router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    map(() => this.isOnManualTokenLoginRoute()),
    startWith(this.isOnManualTokenLoginRoute()),
  );

  @Input() appConfig?: Promise<AppConfig>;
  @Input() edcConfigs?: Promise<EdcConfig[]>;
  @Input() onLogout?: () => void | Promise<void>;
  @Input() userInfo?: DashboardUserInfo;

  @ViewChild('dashboardModal', { read: ViewContainerRef, static: true }) modal!: ViewContainerRef;
  @ViewChild('dashboardAlert', { read: ViewContainerRef, static: true }) alert!: ViewContainerRef;

  private readonly translate = inject(TranslateService);

  readonly langOptions = DASHBOARD_LANG_OPTIONS;

  currentLang = resolveDashboardLang(this.translate.currentLang);

  flagClassFor(lang: DashboardLang): string {
    return dashboardLangFlagClass(lang);
  }

  labelFor(lang: DashboardLang): string {
    return dashboardLangLabel(lang);
  }

  changeLang(lang: string) {
    const resolved = resolveDashboardLang(lang);
    this.translate.use(resolved);
    this.currentLang = resolved;
    localStorage.setItem('lang', resolved);
    (document.activeElement as HTMLElement)?.blur();
  }

  async ngAfterViewInit() {
    const saved = localStorage.getItem('lang');
    const browser = this.translate.getBrowserLang() ?? navigator.language;
    const lang = resolveDashboardLang(saved ?? browser);

    this.translate.use(lang);
    this.currentLang = lang;

    const dialog = document.querySelector<HTMLDialogElement>('#dashboard-dialog');
    if (!dialog) {
      this.modalAndAlertService.showAlert(
        this.translate.instant('app.configError.dialogMissing'),
        this.translate.instant('app.configError.title'),
        'error',
      );
      return;
    }

    this.modalAndAlertService.setDialogToInject(dialog, this.modal);
    this.modalAndAlertService.setAlertToInject(this.alert);

    const configs = this.edcConfigs ? await this.edcConfigs : undefined;
    if (!configs || configs.length === 0) {
      console.debug('[DashboardAppComponent] No startup EDC configs were provided');
    } else {
      const firstConfig: EdcConfig = configs[0];
      console.debug('[DashboardAppComponent] Applying startup EDC configs', {
        count: configs.length,
        firstConnectorName: firstConfig.connectorName,
      });
      try {
        this.stateService.setFederatedCatalogEnabled(firstConfig.federatedCatalogEnabled);
        this.stateService.setEdcConfigs(configs);
      } catch (e) {
        console.error(e);
        this.modalAndAlertService.showAlert(
          (e as Error).message,
          this.translate.instant('app.configError.title'),
          'error',
        );
      }
    }

    const appConfig = this.appConfig ? await this.appConfig : undefined;
    if (!appConfig?.menuItems) {
      this.modalAndAlertService.showAlert(
        this.translate.instant('app.configError.appConfigMissing'),
        this.translate.instant('app.configError.title'),
        'error',
      );
      return;
    }
    this.stateService.setAppConfig(appConfig);
  }

  async logOut() {
    try {
      if (this.onLogout) {
        await this.onLogout();
      } else {
        this.modalAndAlertService.showAlert(
          this.translate.instant('app.logout.notConfigured'),
          this.translate.instant('app.logout.title'),
          'info',
          4,
        );
      }
    } catch (e) {
      console.error(e);
      this.modalAndAlertService.showAlert(
        this.translate.instant('app.logout.failed'),
        this.translate.instant('app.logout.title'),
        'error',
      );
    }
    (document.activeElement as HTMLElement)?.blur();
  }

  get userInitials(): string {
    return this.buildAvatarInitials(this.userInfo);
  }

  private buildAvatarInitials(user?: DashboardUserInfo): string {
    const firstInitial = this.firstLetter(user?.given_name);
    const lastInitial = this.firstLetter(user?.family_name);
    if (firstInitial && lastInitial) {
      return `${firstInitial}${lastInitial}`.toUpperCase();
    }

    return 'TT';
  }

  private firstLetter(value?: string): string {
    return value?.trim()?.charAt(0) ?? '';
  }

  private isOnManualTokenLoginRoute(): boolean {
    const path = this.router.url.split('?')[0] ?? '';
    return path === '/manual-token-login' || path.endsWith('/manual-token-login');
  }
}

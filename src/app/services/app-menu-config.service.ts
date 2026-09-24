import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DashboardStateService } from '@eclipse-edc/dashboard-core';
import type { AppConfig } from '@eclipse-edc/dashboard-core';
import { firstValueFrom } from 'rxjs';
import { filterMenuItemsForPublisherRole } from '../utils/menu-items-by-role.util';
import { UserRolesService } from './user-roles.service';

@Injectable({
  providedIn: 'root',
})
export class AppMenuConfigService {
  private readonly http = inject(HttpClient);
  private readonly userRolesService = inject(UserRolesService);
  private readonly dashboardStateService = inject(DashboardStateService);

  private baseConfig?: AppConfig;

  async loadBaseConfig(): Promise<AppConfig> {
    if (!this.baseConfig) {
      this.baseConfig = await firstValueFrom(this.http.get<AppConfig>('config/app-config.json'));
    }
    return this.baseConfig;
  }

  buildFilteredConfig(base: AppConfig): AppConfig {
    return {
      ...base,
      menuItems: filterMenuItemsForPublisherRole(
        base.menuItems,
        this.userRolesService.hasPublisherRole(),
        this.userRolesService.hasConsumerRole(),
      ),
    };
  }

  async getFilteredAppConfig(): Promise<AppConfig> {
    const base = await this.loadBaseConfig();
    return this.buildFilteredConfig(base);
  }

  async applyFilteredMenuToDashboard(): Promise<AppConfig> {
    const filtered = await this.getFilteredAppConfig();
    this.dashboardStateService.setAppConfig(filtered);
    return filtered;
  }
}

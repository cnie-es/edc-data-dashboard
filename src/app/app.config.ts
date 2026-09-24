import {
  importProvidersFrom,
  inject,
  Injectable,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import type { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideKeycloak } from 'keycloak-angular';
import {
  DASHBOARD_CONNECTOR_PERSPECTIVE,
  DASHBOARD_EDC_BEARER_TOKEN_PROVIDER,
  DASHBOARD_RUNTIME_FEATURE_FLAGS,
  ParticipantNameService as DashboardParticipantNameService,
} from '@eclipse-edc/dashboard-core';
import { ParticipantNameService } from './services/participant-name.service';

import { routes } from './app.routes';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { APP_BASE_HREF } from '@angular/common';

import {
  KEYCLOAK_RUNTIME_CONFIG,
  resolveAuthMode,
  type KeycloakRuntimeConfig,
} from './services/keycloak-config-loader.service';

import { protectedApiAuthInterceptor } from './interceptors/protected-api-auth.interceptor';
import { GeneralTokenService } from './services/general-token.service';
import { UserRolesService } from './services/user-roles.service';

import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { resolveDashboardLang } from '@eclipse-edc/dashboard-core';

class CustomTranslateLoader implements TranslateLoader {
  constructor(private http: HttpClient) {}

  getTranslation(lang: string): Observable<Record<string, string>> {
    return this.http.get<Record<string, string>>(`/assets/i18n/${lang}.json`);
  }
}

@Injectable({
  providedIn: 'root',
})
class BaseHrefService {
  private readonly http = inject(HttpClient);
  private baseHref = '/';

  async load() {
    try {
      this.baseHref = (
        await firstValueFrom(this.http.get('config/APP_BASE_HREF.txt', { responseType: 'text' }))
      ).replace(/\n/g, '');
    } catch {
      console.debug('No base href config found. Default is "/"');
    }
  }

  get(): string {
    return this.baseHref;
  }
}

export function httpLoaderFactory(http: HttpClient) {
  return new CustomTranslateLoader(http);
}

export function createAppConfig(keycloakConfig: KeycloakRuntimeConfig): ApplicationConfig {
  const authMode = resolveAuthMode(keycloakConfig);

  const keycloakProviderOptions = {
    config: {
      url: keycloakConfig.url,
      realm: keycloakConfig.realm,
      clientId: keycloakConfig.clientId,
    },
    ...(authMode !== 'keycloak'
      ? {}
      : {
          initOptions: {
            onLoad: 'login-required' as const,
            checkLoginIframe: false,
            ...keycloakConfig.initOptions,
          },
        }),
  };

  return {
    providers: [
      provideZoneChangeDetection({ eventCoalescing: true }),
      provideRouter(routes),

      /* HTTP */
      provideHttpClient(withInterceptors([protectedApiAuthInterceptor])),

      /* Usa el ParticipantNameService del app (llama a /datadashboardApi, no al management API)
         en lugar del que trae la librería dashboard-core. */
      { provide: DashboardParticipantNameService, useExisting: ParticipantNameService },

      /* KEYCLOAK */
      provideKeycloak(keycloakProviderOptions),

      {
        provide: KEYCLOAK_RUNTIME_CONFIG,
        useValue: {
          ...keycloakConfig,
          authMode,
        } satisfies KeycloakRuntimeConfig,
      },

      {
        provide: DASHBOARD_RUNTIME_FEATURE_FLAGS,
        useValue: { authMode },
      },

      {
        provide: DASHBOARD_CONNECTOR_PERSPECTIVE,
        useFactory: (userRoles: UserRolesService) => ({
          getPerspective: () => userRoles.getConnectorPerspective(),
          getPerspectives: () => userRoles.getConnectorPerspectives(),
        }),
        deps: [UserRolesService],
      },

      {
        provide: DASHBOARD_EDC_BEARER_TOKEN_PROVIDER,
        useFactory: (generalTokenService: GeneralTokenService) => ({
          getBearerToken: async () => {
            try {
              return await generalTokenService.getValidAccessToken();
            } catch {
              return undefined;
            }
          },
        }),
        deps: [GeneralTokenService],
      },

      /* BASE HREF */
      provideAppInitializer(() => inject(BaseHrefService).load()),
      {
        provide: APP_BASE_HREF,
        useFactory: (svc: BaseHrefService) => svc.get(),
        deps: [BaseHrefService],
      },

      importProvidersFrom(
        TranslateModule.forRoot({
          defaultLanguage: 'es',
          loader: {
            provide: TranslateLoader,
            useFactory: httpLoaderFactory,
            deps: [HttpClient],
          },
        }),
      ),

      provideAppInitializer(() => {
        const translate = inject(TranslateService);

        translate.setDefaultLang('es');

        const saved = localStorage.getItem('lang');
        const browserLang = translate.getBrowserLang() ?? navigator.language;
        translate.use(resolveDashboardLang(saved ?? browserLang));

        return Promise.resolve();
      }),
    ],
  };
}

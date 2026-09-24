import { inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import type { HttpInterceptorFn } from '@angular/common/http';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { KEYCLOAK_RUNTIME_CONFIG, resolveAuthMode } from '../services/keycloak-config-loader.service';
import { GeneralTokenService } from '../services/general-token.service';

const STATIC_RESOURCE_PREFIXES = ['/assets/', '/config/'];
const STATIC_RESOURCE_FILE_EXTENSION_PATTERN =
  /\.(css|js|mjs|map|svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|txt|json)$/i;

export const resolveRequestUrl = (url: string): URL | null => {
  try {
    return new URL(url, window.location.origin);
  } catch {
    return null;
  }
};

export const isStaticResourceUrl = (url: URL): boolean => {
  const pathName = url.pathname.toLowerCase();
  if (STATIC_RESOURCE_PREFIXES.some(prefix => pathName.startsWith(prefix))) {
    return true;
  }
  return STATIC_RESOURCE_FILE_EXTENSION_PATTERN.test(pathName);
};

export const isBackendApiUrl = (url: string): boolean => {
  const parsedUrl = resolveRequestUrl(url);
  if (!parsedUrl || !/^https?:$/i.test(parsedUrl.protocol)) {
    return false;
  }

  return !isStaticResourceUrl(parsedUrl);
};

export const protectedApiAuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isBackendApiUrl(req.url)) {
    return next(req);
  }

  if (req.headers.has('Authorization')) {
    return next(req);
  }

  const runtimeConfig = inject(KEYCLOAK_RUNTIME_CONFIG);
  const authMode = resolveAuthMode(runtimeConfig);
  if (authMode === 'bypass') {
    return next(req);
  }

  const generalTokenService = inject(GeneralTokenService);

  return from(generalTokenService.getValidAccessToken()).pipe(
    switchMap(token =>
      next(
        req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ),
    ),
    catchError(error => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        void generalTokenService.handleUnauthorizedResponse();
      }
      return throwError(() => error);
    }),
  );
};

import {
  assertValidKeycloakRuntimeConfig,
  resolveAuthMode,
  type KeycloakRuntimeConfig,
} from './keycloak-config-loader.service';

describe('keycloak-config-loader service helpers', () => {
  const baseConfig: KeycloakRuntimeConfig = {
    url: 'https://keycloak.example.com',
    realm: 'example',
    clientId: 'dashboard',
    authMode: 'keycloak',
  };

  it('resolves auth mode directly from authMode when provided', () => {
    expect(resolveAuthMode({ ...baseConfig, authMode: 'manual-token' })).toBe('manual-token');
  });

  it('validates config when only authMode is provided', () => {
    expect(() => assertValidKeycloakRuntimeConfig(baseConfig)).not.toThrow();
  });

  it('throws when authMode is missing', () => {
    expect(() =>
      assertValidKeycloakRuntimeConfig({
        ...baseConfig,
        authMode: undefined,
      }),
    ).toThrowError(/Missing required field 'authMode'/);
  });

  it('throws when authMode is invalid', () => {
    expect(() =>
      assertValidKeycloakRuntimeConfig({
        ...baseConfig,
        authMode: 'unknown-mode' as never,
      }),
    ).toThrowError(/'authMode' must be one of/);
  });
});

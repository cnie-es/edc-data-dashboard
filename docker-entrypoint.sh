#!/bin/sh
set -eu

CONFIG_DIR="/app/config"
TEMPLATE_DIR="/app/config-templates"

log() {
  echo "[runtime-config] $1"
}

is_boolean() {
  case "$1" in
    true | false) return 0 ;;
    *) return 1 ;;
  esac
}

require_non_empty() {
  var_name="$1"
  var_value="$2"
  if [ -z "$var_value" ]; then
    echo "[runtime-config] Missing required env var: $var_name"
    exit 1
  fi
}

RUNTIME_CONFIG_INJECTION="${RUNTIME_CONFIG_INJECTION:-true}"
if [ "$RUNTIME_CONFIG_INJECTION" != "true" ]; then
  log "Runtime config injection disabled. Using existing /app/config files."
  exec "$@"
fi

if [ ! -d "$TEMPLATE_DIR" ]; then
  log "Template directory '$TEMPLATE_DIR' not found. Skipping runtime config generation."
  exec "$@"
fi

AUTH_MODE="${AUTH_MODE:-bypass}"
case "$AUTH_MODE" in
  keycloak | bypass | manual-token) ;;
  *)
    echo "[runtime-config] Invalid AUTH_MODE='$AUTH_MODE'. Allowed: keycloak|bypass|manual-token."
    exit 1
    ;;
esac

KEYCLOAK_URL="${KEYCLOAK_URL:-https://keycloak.invalid}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-development}"
KEYCLOAK_CLIENT_ID="${KEYCLOAK_CLIENT_ID:-data-dashboard}"
KEYCLOAK_ON_LOAD="${KEYCLOAK_ON_LOAD:-login-required}"
KEYCLOAK_CHECK_LOGIN_IFRAME="${KEYCLOAK_CHECK_LOGIN_IFRAME:-false}"

if [ "$AUTH_MODE" = "keycloak" ]; then
  require_non_empty "KEYCLOAK_URL" "$KEYCLOAK_URL"
  require_non_empty "KEYCLOAK_REALM" "$KEYCLOAK_REALM"
  require_non_empty "KEYCLOAK_CLIENT_ID" "$KEYCLOAK_CLIENT_ID"
fi

case "$KEYCLOAK_ON_LOAD" in
  login-required | check-sso) ;;
  *)
    echo "[runtime-config] Invalid KEYCLOAK_ON_LOAD='$KEYCLOAK_ON_LOAD'. Allowed: login-required|check-sso."
    exit 1
    ;;
esac

if ! is_boolean "$KEYCLOAK_CHECK_LOGIN_IFRAME"; then
  echo "[runtime-config] Invalid KEYCLOAK_CHECK_LOGIN_IFRAME='$KEYCLOAK_CHECK_LOGIN_IFRAME'. Allowed: true|false."
  exit 1
fi

EDC_CONNECTOR_NAME="${EDC_CONNECTOR_NAME:-consumer}"
EDC_MANAGEMENT_URL="${EDC_MANAGEMENT_URL:-https://localhost:8080/management}"
EDC_DEFAULT_URL="${EDC_DEFAULT_URL:-https://localhost:8080/api}"
EDC_PROTOCOL_URL="${EDC_PROTOCOL_URL:-https://localhost:8080/api/v1/dsp}"
XFSC_ADVSEARCH_BASE_URL="${XFSC_ADVSEARCH_BASE_URL:-https://localhost:8080/xfsc-advsearch-be/v1}"
CONTRACT_CONSUMPTION_API_BASE_URL="${CONTRACT_CONSUMPTION_API_BASE_URL:-https://localhost:8080/contract-consumption-api}"
CONTRACT_CONSUMPTION_API_VERSION="${CONTRACT_CONSUMPTION_API_VERSION:-v1}"
SDTOOLING_BASE_URL="${SDTOOLING_BASE_URL:-https://localhost:8080/sdtooling-api/v2}"
DASHBOARD_API_BASE_URL="${DASHBOARD_API_BASE_URL:-https://localhost:8080/datadashboardApi}"
EDC_FEDERATED_CATALOG_ENABLED="${EDC_FEDERATED_CATALOG_ENABLED:-false}"
EDC_DID="${EDC_DID:-did:web:https://localhost:8080/}"
SIGNER_BASE_URL="${SIGNER_BASE_URL:-/signer}"

if ! is_boolean "$EDC_FEDERATED_CATALOG_ENABLED"; then
  echo "[runtime-config] Invalid EDC_FEDERATED_CATALOG_ENABLED='$EDC_FEDERATED_CATALOG_ENABLED'. Allowed: true|false."
  exit 1
fi

mkdir -p "$CONFIG_DIR"
export AUTH_MODE KEYCLOAK_URL KEYCLOAK_REALM KEYCLOAK_CLIENT_ID KEYCLOAK_ON_LOAD KEYCLOAK_CHECK_LOGIN_IFRAME
export EDC_CONNECTOR_NAME EDC_MANAGEMENT_URL EDC_DEFAULT_URL EDC_PROTOCOL_URL
export XFSC_ADVSEARCH_BASE_URL CONTRACT_CONSUMPTION_API_BASE_URL CONTRACT_CONSUMPTION_API_VERSION SDTOOLING_BASE_URL DASHBOARD_API_BASE_URL EDC_FEDERATED_CATALOG_ENABLED EDC_DID SIGNER_BASE_URL

if [ -f "$TEMPLATE_DIR/keycloak-config.template.json" ]; then
  envsubst < "$TEMPLATE_DIR/keycloak-config.template.json" > "$CONFIG_DIR/keycloak-config.json"
  log "Generated '$CONFIG_DIR/keycloak-config.json'."
fi

if [ -f "$TEMPLATE_DIR/edc-connector-config.template.json" ]; then
  envsubst < "$TEMPLATE_DIR/edc-connector-config.template.json" > "$CONFIG_DIR/edc-connector-config.json"
  log "Generated '$CONFIG_DIR/edc-connector-config.json'."
fi

if [ -f "$TEMPLATE_DIR/app-config.template.json" ]; then
  cp "$TEMPLATE_DIR/app-config.template.json" "$CONFIG_DIR/app-config.json"
  log "Generated '$CONFIG_DIR/app-config.json'."
fi

APP_BASE_HREF="${APP_BASE_HREF:-/}"
printf "%s" "$APP_BASE_HREF" > "$CONFIG_DIR/APP_BASE_HREF.txt"
log "Generated '$CONFIG_DIR/APP_BASE_HREF.txt' (APP_BASE_HREF='$APP_BASE_HREF')."

exec "$@"

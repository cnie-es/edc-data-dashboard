import type { PolicyDefinition } from '@think-it-labs/edc-connector-client';
import type { TranslateService } from '@ngx-translate/core';

export type AccessPolicyAction = 'SEARCH' | 'CONSUME' | 'RESTRICTED_CONSUME';
export type ContractPolicyAction = 'CONSUME' | 'USE' | 'UNKNOWN';
export type DateConstraintKind = 'datetime_from' | 'datetime_to' | 'datetime_range';

export type PolicyListKind = 'Publicación' | 'Contratación';

export interface ParsedPolicyOdrl {
  assigner?: string;
  accessAction?: AccessPolicyAction;
  contractAction?: ContractPolicyAction;
  fromIso?: string;
  toIso?: string;
}

export interface PolicyListLabels {
  name: string;
  description: string;
}

export interface PolicyListLabelContext {
  assetDisplayName: string;
}

const ODRL_DATE_TIME = 'datetime';
const ODRL_GTEQ = 'gteq';
const ODRL_LTEQ = 'lteq';

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function readStringValue(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }
  const atValue = record['@value'];
  if (typeof atValue === 'string' && atValue.trim().length > 0) {
    return atValue.trim();
  }
  const atId = record['@id'];
  if (typeof atId === 'string' && atId.trim().length > 0) {
    return atId.trim();
  }
  return undefined;
}

function readIdUri(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }
  const atId = record['@id'];
  if (typeof atId === 'string' && atId.trim().length > 0) {
    return atId.trim();
  }
  return undefined;
}

function normalizeOdrlKey(key: string): string {
  const fragment = key.includes('/') ? (key.split('/').pop() ?? key) : key;
  return fragment.replace(/^odrl:/, '').toLowerCase();
}

function getPolicySetRecord(policyDefinition: PolicyDefinition | Record<string, unknown>): Record<string, unknown> {
  const root = policyDefinition as Record<string, unknown>;
  const policyRaw = root['policy'] ?? root['https://w3id.org/edc/v0.0.1/ns/policy'];
  if (policyRaw !== undefined) {
    if (Array.isArray(policyRaw)) {
      return asRecord(policyRaw[0]) ?? {};
    }
    const nested = asRecord(policyRaw);
    if (nested) {
      return nested;
    }
  }
  if (
    findNestedValue(root, 'permission') !== undefined ||
    findNestedValue(root, 'assigner') !== undefined ||
    root['odrl:permission'] !== undefined ||
    root['odrl:assigner'] !== undefined
  ) {
    return root;
  }
  return {};
}

function findNestedValue(record: Record<string, unknown>, keySuffix: string): unknown {
  for (const [key, value] of Object.entries(record)) {
    if (normalizeOdrlKey(key) === keySuffix) {
      return value;
    }
  }
  return undefined;
}

function readPartyUid(value: unknown): string | undefined {
  const direct = readStringValue(value);
  if (direct) {
    return direct;
  }
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }
  const uid = record['uid'];
  if (typeof uid === 'string' && uid.trim().length > 0) {
    return uid.trim();
  }
  return undefined;
}

export function readPolicyAssignerFromSet(policySet: Record<string, unknown>): string | undefined {
  const compact = policySet['odrl:assigner'];
  if (compact !== undefined) {
    return readPartyUid(compact);
  }
  const expanded = findNestedValue(policySet, 'assigner');
  if (expanded !== undefined) {
    return readPartyUid(Array.isArray(expanded) ? expanded[0] : expanded);
  }
  return undefined;
}

function getFirstPermission(policySet: Record<string, unknown>): Record<string, unknown> | undefined {
  const compact = policySet['odrl:permission'];
  if (compact !== undefined) {
    if (Array.isArray(compact)) {
      return asRecord(compact[0]);
    }
    return asRecord(compact);
  }
  const expanded = findNestedValue(policySet, 'permission');
  if (Array.isArray(expanded)) {
    return asRecord(expanded[0]);
  }
  return asRecord(expanded);
}

function readActionUri(permission: Record<string, unknown>): string | undefined {
  const actionRaw = permission['odrl:action'] ?? findNestedValue(permission, 'action');
  if (actionRaw === undefined) {
    return undefined;
  }
  if (Array.isArray(actionRaw)) {
    for (const item of actionRaw) {
      const uri = readIdUri(item);
      if (uri) {
        return uri;
      }
    }
    return undefined;
  }
  return readIdUri(actionRaw);
}

export function resolveAccessPolicyAction(actionUri: string | undefined): AccessPolicyAction | undefined {
  if (!actionUri) {
    return undefined;
  }
  const normalized = actionUri.toLowerCase();
  if (normalized.endsWith('/restrictedconsume')) {
    return 'RESTRICTED_CONSUME';
  }
  if (normalized.endsWith('/search')) {
    return 'SEARCH';
  }
  if (normalized.endsWith('/consume') && !normalized.includes('restricted')) {
    return 'CONSUME';
  }
  return undefined;
}

export function resolveContractPolicyAction(actionUri: string | undefined): ContractPolicyAction {
  if (!actionUri) {
    return 'UNKNOWN';
  }
  const normalized = actionUri.toLowerCase();
  if (normalized.endsWith('/consume')) {
    return 'CONSUME';
  }
  if (normalized.endsWith('/use') || normalized.includes('odrl:use')) {
    return 'USE';
  }
  return 'UNKNOWN';
}

function isDateTimeLeftOperand(leftOperand: unknown): boolean {
  const uri = readIdUri(leftOperand) ?? readStringValue(leftOperand) ?? '';
  return uri.toLowerCase().includes(ODRL_DATE_TIME);
}

function operatorMatches(operator: unknown, fragment: string): boolean {
  const uri = readIdUri(operator) ?? readStringValue(operator) ?? '';
  return uri.toLowerCase().includes(fragment);
}

function readConstraints(permission: Record<string, unknown>): Record<string, unknown>[] {
  const raw = permission['odrl:constraint'] ?? findNestedValue(permission, 'constraint');
  if (!raw) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.map(c => asRecord(c)).filter((c): c is Record<string, unknown> => c !== undefined);
  }
  const single = asRecord(raw);
  return single ? [single] : [];
}

export function parsePolicyOdrl(policyDefinition: PolicyDefinition | Record<string, unknown>): ParsedPolicyOdrl {
  const policySet = getPolicySetRecord(policyDefinition);
  const assigner = readPolicyAssignerFromSet(policySet);
  const permission = getFirstPermission(policySet);
  const actionUri = permission ? readActionUri(permission) : undefined;

  let fromIso: string | undefined;
  let toIso: string | undefined;

  if (permission) {
    for (const constraint of readConstraints(permission)) {
      const leftRaw = constraint['odrl:leftOperand'] ?? findNestedValue(constraint, 'leftoperand');
      const left = Array.isArray(leftRaw) ? leftRaw[0] : leftRaw;
      if (!isDateTimeLeftOperand(left)) {
        continue;
      }
      const operatorRaw = constraint['odrl:operator'] ?? findNestedValue(constraint, 'operator');
      const operator = Array.isArray(operatorRaw) ? operatorRaw[0] : operatorRaw;
      const rightRaw = constraint['odrl:rightOperand'] ?? findNestedValue(constraint, 'rightoperand');
      const right = readStringValue(Array.isArray(rightRaw) ? rightRaw[0] : rightRaw);
      if (!right) {
        continue;
      }
      if (operatorMatches(operator, ODRL_GTEQ)) {
        fromIso = right;
      } else if (operatorMatches(operator, ODRL_LTEQ)) {
        toIso = right;
      }
    }
  }

  return {
    assigner,
    accessAction: resolveAccessPolicyAction(actionUri),
    contractAction: resolveContractPolicyAction(actionUri),
    fromIso,
    toIso,
  };
}

export function resolveDateConstraintKind(fromIso?: string, toIso?: string): DateConstraintKind | null {
  if (fromIso && toIso) {
    return 'datetime_range';
  }
  if (fromIso) {
    return 'datetime_from';
  }
  if (toIso) {
    return 'datetime_to';
  }
  return null;
}

/** Maps ngx-translate lang codes to BCP 47 locales for `Intl.DateTimeFormat`. */
export function resolveIntlLocale(lang: string): string {
  const normalized = lang.trim().toLowerCase().split('-')[0];
  switch (normalized) {
    case 'eu':
      return 'eu';
    case 'es':
      return 'es-ES';
    case 'en':
      return 'en-GB';
    case 'ca':
      return 'ca';
    case 'va':
      return 'ca';
    case 'gl':
      return 'gl';
    default:
      return lang;
  }
}

export function formatPolicyDate(iso: string, locale = 'es-ES'): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

function accessActionKey(action: AccessPolicyAction | undefined): string {
  switch (action) {
    case 'SEARCH':
      return 'policy.access.action.search';
    case 'CONSUME':
      return 'policy.access.action.consume';
    case 'RESTRICTED_CONSUME':
      return 'policy.access.action.restrictedConsume';
    default:
      return 'policy.access.action.unknown';
  }
}

function contractActionKey(action: ContractPolicyAction): string {
  switch (action) {
    case 'CONSUME':
      return 'policy.contract.action.consume';
    case 'USE':
      return 'policy.contract.action.use';
    default:
      return 'policy.contract.action.unknown';
  }
}

function buildConstraintPhrase(parsed: ParsedPolicyOdrl, translate: TranslateService): string {
  const kind = resolveDateConstraintKind(parsed.fromIso, parsed.toIso);
  const dateLocale = resolveIntlLocale(translate.currentLang || translate.defaultLang || 'es');
  if (!kind) {
    return translate.instant('policy.constraint.openEnded');
  }
  const from = parsed.fromIso ? formatPolicyDate(parsed.fromIso, dateLocale) : '';
  const to = parsed.toIso ? formatPolicyDate(parsed.toIso, dateLocale) : '';
  switch (kind) {
    case 'datetime_from':
      return translate.instant('policy.constraint.validFrom', { from });
    case 'datetime_to':
      return translate.instant('policy.constraint.validTo', { to });
    case 'datetime_range':
      return translate.instant('policy.constraint.validRange', { from, to });
    default:
      return '';
  }
}

export function buildPolicyListLabels(
  parsed: ParsedPolicyOdrl,
  kind: PolicyListKind,
  translate: TranslateService,
  context: PolicyListLabelContext,
): PolicyListLabels {
  const actionKey =
    kind === 'Publicación'
      ? accessActionKey(parsed.accessAction)
      : contractActionKey(parsed.contractAction ?? 'UNKNOWN');
  const actionLabel = translate.instant(actionKey);
  const assigner = parsed.assigner?.trim() ?? '';
  const constraint = buildConstraintPhrase(parsed, translate);
  const assetName = context.assetDisplayName.trim();

  const name = assigner
    ? translate.instant('policies.list.name', { assetName, action: actionLabel, assigner })
    : translate.instant('policies.list.nameNoAssigner', { assetName, action: actionLabel });

  const description = translate.instant('policies.list.description', {
    action: actionLabel,
    constraint,
  });

  return { name, description };
}

export function buildPolicyLoadErrorLabels(
  policyDefinitionId: string,
  translate: TranslateService,
  context: PolicyListLabelContext,
): PolicyListLabels {
  const assetName = context.assetDisplayName.trim() || policyDefinitionId;
  return {
    name: assetName,
    description: translate.instant('policies.list.loadError'),
  };
}

/** Builds Contratación list labels from a `simpl:usage-policy` JSON-LD string embedded in a self-description. */
export function buildContractPolicyLabelsFromUsagePolicyJson(
  usagePolicyRaw: string,
  assetDisplayName: string,
  translate: TranslateService,
): PolicyListLabels | undefined {
  const trimmed = usagePolicyRaw.trim();
  if (!trimmed) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const odrlParsed = parsePolicyOdrl(parsed);
    return buildPolicyListLabels(odrlParsed, 'Contratación', translate, { assetDisplayName });
  } catch {
    return undefined;
  }
}

import type { PolicyDefinition } from '@think-it-labs/edc-connector-client';

/*
 * ODRL policy parsing shared by the policies views and the offer detail layouts. Accepts compact (`odrl:`),
 * expanded (IRI keys) and plain JSON (`simpl:access-policy` / `simpl:usage-policy`) shapes.
 */

export type AccessPolicyAction = 'SEARCH' | 'CONSUME' | 'RESTRICTED_CONSUME';
export type ContractPolicyAction = 'CONSUME' | 'USE' | 'UNKNOWN';

/** One ODRL permission in the terms of the offer form policy cards (sdtooling). */
export interface ParsedPolicyPermission {
  actionUri?: string;
  accessAction?: AccessPolicyAction;
  contractAction: ContractPolicyAction;
  /** Usage assignee (contract policies) or identity attribute (access policies). */
  assignee?: string;
  fromIso?: string;
  toIso?: string;
  /** From an `odrl:count` constraint. */
  maxUseCount?: number;
  /** From an `odrl:deletion` constraint, a `delete` duty on the permission or a `delete` obligation on the policy. */
  deleteAfterUse: boolean;
}

const ODRL_DATE_TIME = 'datetime';
const ODRL_GTEQ = 'gteq';
const ODRL_LTEQ = 'lteq';
const ODRL_LT = 'lt';
const ODRL_EQ = 'eq';
const ODRL_LOGICAL_CONSTRAINT_KEYS = ['and', 'or', 'xone', 'andsequence'];

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
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }
  const atValue = record['@value'];
  if (typeof atValue === 'string' && atValue.trim().length > 0) {
    return atValue.trim();
  }
  if (typeof atValue === 'number' && Number.isFinite(atValue)) {
    return String(atValue);
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

function toRecordList(raw: unknown): Record<string, unknown>[] {
  if (raw === undefined || raw === null) {
    return [];
  }
  const items = Array.isArray(raw) ? raw : [raw];
  return items.map(item => asRecord(item)).filter((item): item is Record<string, unknown> => item !== undefined);
}

function readRules(record: Record<string, unknown>, rule: string): Record<string, unknown>[] {
  return toRecordList(record[`odrl:${rule}`] ?? findNestedValue(record, rule));
}

function getPermissions(policySet: Record<string, unknown>): Record<string, unknown>[] {
  return readRules(policySet, 'permission');
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

function leftOperandIs(leftOperand: unknown, name: string): boolean {
  const uri = (readIdUri(leftOperand) ?? readStringValue(leftOperand) ?? '').toLowerCase();
  return uri === name || uri.endsWith(`:${name}`) || uri.endsWith(`/${name}`);
}

function operatorFragment(operator: unknown): string {
  const uri = (readIdUri(operator) ?? readStringValue(operator) ?? '').toLowerCase();
  return uri.split(/[/:#]/).pop() ?? '';
}

/** Constraints of a permission, with logical constraints (`odrl:and`, `odrl:or`…) flattened. */
function readConstraints(permission: Record<string, unknown>): Record<string, unknown>[] {
  const flatten = (constraint: Record<string, unknown>): Record<string, unknown>[] => {
    for (const [key, value] of Object.entries(constraint)) {
      if (ODRL_LOGICAL_CONSTRAINT_KEYS.includes(normalizeOdrlKey(key))) {
        const operands = toRecordList(value);
        // JSON-LD may wrap the operand list as `{ "@list": [...] }`.
        const listed = operands.length === 1 && operands[0]['@list'] ? toRecordList(operands[0]['@list']) : operands;
        return listed.flatMap(flatten);
      }
    }
    return [constraint];
  };
  return readRules(permission, 'constraint').flatMap(flatten);
}

function readConstraintPart(constraint: Record<string, unknown>, part: string): unknown {
  const raw = constraint[`odrl:${part}`] ?? findNestedValue(constraint, part.toLowerCase());
  return Array.isArray(raw) ? raw[0] : raw;
}

function readPermissionAssignee(permission: Record<string, unknown>): string | undefined {
  const raw = permission['odrl:assignee'] ?? findNestedValue(permission, 'assignee');
  return readPartyUid(Array.isArray(raw) ? raw[0] : raw);
}

function isDeleteRule(rule: Record<string, unknown>): boolean {
  return (readActionUri(rule) ?? '').toLowerCase().includes('delete');
}

function parsePermission(
  permission: Record<string, unknown>,
  policyObligations: Record<string, unknown>[],
): ParsedPolicyPermission {
  const actionUri = readActionUri(permission);
  let fromIso: string | undefined;
  let toIso: string | undefined;
  let maxUseCount: number | undefined;
  let deleteAfterUse = readRules(permission, 'duty').some(isDeleteRule) || policyObligations.some(isDeleteRule);

  for (const constraint of readConstraints(permission)) {
    const left = readConstraintPart(constraint, 'leftOperand');
    const operator = operatorFragment(readConstraintPart(constraint, 'operator'));
    const right = readStringValue(readConstraintPart(constraint, 'rightOperand'));
    if (!right) {
      continue;
    }
    if (isDateTimeLeftOperand(left)) {
      if (operator === ODRL_GTEQ) {
        fromIso = right;
      } else if (operator === ODRL_LTEQ) {
        toIso = right;
      }
    } else if (leftOperandIs(left, 'deletion')) {
      deleteAfterUse = true;
    } else if (leftOperandIs(left, 'count')) {
      const count = Number.parseInt(right, 10);
      if (Number.isNaN(count)) {
        continue;
      }
      if (operator === ODRL_LTEQ || operator === ODRL_EQ) {
        maxUseCount = count;
      } else if (operator === ODRL_LT) {
        maxUseCount = count - 1;
      }
    }
  }

  return {
    actionUri,
    accessAction: resolveAccessPolicyAction(actionUri),
    contractAction: resolveContractPolicyAction(actionUri),
    assignee: readPermissionAssignee(permission),
    fromIso,
    toIso,
    maxUseCount,
    deleteAfterUse,
  };
}

/** Every permission of the policy, in the terms of the offer form policy cards. */
export function parsePolicyPermissions(
  policyDefinition: PolicyDefinition | Record<string, unknown>,
): ParsedPolicyPermission[] {
  const policySet = getPolicySetRecord(policyDefinition);
  const obligations = readRules(policySet, 'obligation');
  return getPermissions(policySet).map(permission => parsePermission(permission, obligations));
}

/** `odrl:assigner` of the policy (participant that publishes it). */
export function readPolicyAssigner(policyDefinition: PolicyDefinition | Record<string, unknown>): string | undefined {
  return readPolicyAssignerFromSet(getPolicySetRecord(policyDefinition));
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

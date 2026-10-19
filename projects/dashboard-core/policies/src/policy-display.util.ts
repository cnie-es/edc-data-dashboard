import type { PolicyDefinition } from '@think-it-labs/edc-connector-client';
import type { TranslateService } from '@ngx-translate/core';
import {
  formatPolicyDate,
  parsePolicyPermissions,
  readPolicyAssigner,
  resolveIntlLocale,
  type AccessPolicyAction,
  type ContractPolicyAction,
} from '@eclipse-edc/dashboard-core';

// The ODRL parsing lives in the core lib so the offer detail layouts can use it too.
export {
  formatPolicyDate,
  parsePolicyPermissions,
  readPolicyAssigner,
  readPolicyAssignerFromSet,
  resolveAccessPolicyAction,
  resolveContractPolicyAction,
  resolveIntlLocale,
} from '@eclipse-edc/dashboard-core';
export type { AccessPolicyAction, ContractPolicyAction, ParsedPolicyPermission } from '@eclipse-edc/dashboard-core';

export type DateConstraintKind = 'datetime_from' | 'datetime_to' | 'datetime_range';

export type PolicyListKind = 'Publicación' | 'Contratación';

export interface ParsedPolicyOdrl {
  assigner?: string;
  accessAction?: AccessPolicyAction;
  contractAction?: ContractPolicyAction;
  fromIso?: string;
  toIso?: string;
  /** Fields below come from the first permission, like the action and dates above. */
  assignee?: string;
  maxUseCount?: number;
  deleteAfterUse?: boolean;
}

export interface PolicyListLabels {
  name: string;
  description: string;
}

export interface PolicyListLabelContext {
  assetDisplayName: string;
}

export function parsePolicyOdrl(policyDefinition: PolicyDefinition | Record<string, unknown>): ParsedPolicyOdrl {
  const [first] = parsePolicyPermissions(policyDefinition);

  return {
    assigner: readPolicyAssigner(policyDefinition),
    accessAction: first?.accessAction,
    contractAction: first?.contractAction ?? 'UNKNOWN',
    fromIso: first?.fromIso,
    toIso: first?.toIso,
    assignee: first?.assignee,
    maxUseCount: first?.maxUseCount,
    deleteAfterUse: first?.deleteAfterUse,
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

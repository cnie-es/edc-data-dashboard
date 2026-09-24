import type { SdAccessPoliciesDTO, SdUsagePoliciesDTO } from '../../sdtooling.service';
import { asOptionalString, asRecord, asString } from '../sdtooling-record.util';

export const normalizeUsagePolicyAction = (action: string): string => {
  const trimmed = action.trim();
  if (trimmed === 'USE' || trimmed === 'DO_NOT_USE_THIS_TYPE') {
    return trimmed;
  }
  if (trimmed === 'http://www.w3.org/ns/odrl/2/use' || trimmed.toLowerCase() === 'use') {
    return 'USE';
  }
  return trimmed;
};

export const readJsonLdString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object' && '@value' in value) {
    const objectValue = (value as Record<string, unknown>)['@value'];
    return typeof objectValue === 'string' ? objectValue : undefined;
  }
  return undefined;
};

export const normalizePolicyDateTime = (value: unknown): string | undefined => {
  const raw = asOptionalString(value);
  if (!raw) {
    return undefined;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) {
    return `${raw}:00Z`;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(raw)) {
    return `${raw}Z`;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString().replace(/\.\d{3}Z$/, 'Z');
};

export const parsePolicyPermissions = (
  policyJson: string,
  fieldName: 'simpl:access-policy' | 'simpl:usage-policy',
): Record<string, unknown>[] => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(policyJson);
  } catch {
    throw new Error(`Invalid JSON for ${fieldName}.`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Invalid policy payload for ${fieldName}: expected an array.`);
  }

  return parsed.filter(item => !!asRecord(item)) as Record<string, unknown>[];
};

export const toAccessPermissions = (items: Record<string, unknown>[]): SdAccessPoliciesDTO['permissions'] => {
  const result: SdAccessPoliciesDTO['permissions'] = [];
  for (const item of items) {
    const assignee = asString(item['assignee']);
    const action = asString(item['action']);
    if (!assignee || !action) {
      continue;
    }
    result.push({
      assignee,
      action,
      fromDatetime: normalizePolicyDateTime(item['fromDatetime']),
      toDatetime: normalizePolicyDateTime(item['toDatetime']),
    });
  }
  return result;
};

export const toUsagePermissions = (items: Record<string, unknown>[]): SdUsagePoliciesDTO['permissions'] => {
  const result: SdUsagePoliciesDTO['permissions'] = [];
  for (const item of items) {
    const assignee = asString(item['assignee']);
    const action = asString(item['action']);
    const constraintsRaw = item['constraints'];
    if (!assignee || !action || !Array.isArray(constraintsRaw)) {
      continue;
    }

    const constraints: SdUsagePoliciesDTO['permissions'][number]['constraints'] = [];
    for (const constraint of constraintsRaw) {
      if (!constraint || typeof constraint !== 'object') {
        continue;
      }
      const node = constraint as Record<string, unknown>;
      const type = asString(node['type']);
      const constraintAssignee = asString(node['assignee']);
      if (!type || !constraintAssignee) {
        continue;
      }
      if (type !== 'Deletion' && type !== 'RestrictedDuration' && type !== 'RestrictedNumber') {
        continue;
      }

      constraints.push({
        type,
        assignee: constraintAssignee,
        afterUse: typeof node['afterUse'] === 'boolean' ? node['afterUse'] : undefined,
        maxCount: typeof node['maxCount'] === 'number' ? node['maxCount'] : undefined,
        fromDatetime: normalizePolicyDateTime(node['fromDatetime']),
        toDatetime: normalizePolicyDateTime(node['toDatetime']),
      });
    }

    if (constraints.length === 0) {
      continue;
    }

    result.push({
      assignee,
      action: normalizeUsagePolicyAction(action),
      constraints,
    });
  }
  return result;
};

export interface PolicyTransformApi {
  accessPolicyJsonLd: (payload: SdAccessPoliciesDTO) => import('rxjs').Observable<unknown>;
  usagePolicyJsonLd: (payload: SdUsagePoliciesDTO) => import('rxjs').Observable<unknown>;
}

export const transformServicePolicyInPlace = async (
  selfDescriptionJsonLd: Record<string, unknown>,
  api: PolicyTransformApi,
  firstValueFrom: <T>(source: import('rxjs').Observable<T>) => Promise<T>,
): Promise<void> => {
  const servicePolicyData = selfDescriptionJsonLd['simpl:servicePolicy'] as Record<string, unknown> | undefined;
  if (!servicePolicyData) {
    return;
  }

  const resourceUri = (selfDescriptionJsonLd['@id'] as string | undefined) ?? '';
  if (!resourceUri) {
    return;
  }

  const accessPolicyString = readJsonLdString(servicePolicyData['simpl:access-policy']);
  if (accessPolicyString) {
    const permissions = parsePolicyPermissions(accessPolicyString, 'simpl:access-policy');
    const payload: SdAccessPoliciesDTO = {
      resourceUri,
      permissions: toAccessPermissions(permissions),
    };
    const accessResponse = await firstValueFrom(api.accessPolicyJsonLd(payload));
    servicePolicyData['simpl:access-policy'] = JSON.stringify(accessResponse);
  }

  const usagePolicyString = readJsonLdString(servicePolicyData['simpl:usage-policy']);
  if (usagePolicyString) {
    const permissions = parsePolicyPermissions(usagePolicyString, 'simpl:usage-policy');
    const payload: SdUsagePoliciesDTO = {
      resourceUri,
      permissions: toUsagePermissions(permissions),
    };
    const usageResponse = await firstValueFrom(api.usagePolicyJsonLd(payload));
    servicePolicyData['simpl:usage-policy'] = JSON.stringify(usageResponse);
  }
};

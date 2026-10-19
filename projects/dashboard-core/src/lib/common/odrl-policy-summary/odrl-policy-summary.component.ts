import { Component, computed, inject, input } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  formatPolicyDate,
  parsePolicyPermissions,
  readPolicyAssigner,
  resolveIntlLocale,
  type ParsedPolicyPermission,
} from '../../utils/odrl-policy.util';

/** Access policies are shown like the offer form access policy cards, usage ones like the usage policy cards. */
export type OdrlPolicySummaryVariant = 'access' | 'usage';

/** i18n namespace of the identity attributes offered by the offer form (`identityAttribute.<value>`). */
const IDENTITY_ATTRIBUTE_I18N_NAMESPACE = 'identityAttribute';
/** i18n namespace of the access actions offered by the offer form (`policyAction.<value>`). */
const POLICY_ACTION_I18N_NAMESPACE = 'policyAction';

/** Read-only view of every permission of an ODRL policy, laid out like the offer form (sdtooling) policy cards. */
@Component({
  selector: 'lib-odrl-policy-summary',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './odrl-policy-summary.component.html',
})
export class OdrlPolicySummaryComponent {
  private readonly translate = inject(TranslateService);

  readonly policy = input.required<Record<string, unknown>>();
  /** When unset, it is inferred from the actions: access actions (search / consume) mean an access policy. */
  readonly variant = input<OdrlPolicySummaryVariant | undefined>(undefined);
  readonly showAssigner = input(true);

  readonly assigner = computed(() => readPolicyAssigner(this.policy()) ?? '');
  readonly permissions = computed<ParsedPolicyPermission[]>(() => parsePolicyPermissions(this.policy()));

  readonly isAccess = computed(() => {
    const variant = this.variant();
    if (variant) {
      return variant === 'access';
    }
    const permissions = this.permissions();
    return (
      permissions.length > 0 && permissions.every(p => p.contractAction !== 'USE' && p.accessAction !== undefined)
    );
  });

  /** Identity attributes and usage assignees use the same labels as the offer form, raw value otherwise. */
  assigneeLabel(permission: ParsedPolicyPermission): string {
    return this.translateOrRaw(IDENTITY_ATTRIBUTE_I18N_NAMESPACE, permission.assignee);
  }

  accessActionLabel(permission: ParsedPolicyPermission): string {
    if (permission.accessAction) {
      return this.translateOrRaw(POLICY_ACTION_I18N_NAMESPACE, permission.accessAction);
    }
    return permission.actionUri ?? '-';
  }

  usageTypeKey(permission: ParsedPolicyPermission): string | null {
    if (permission.deleteAfterUse) {
      return 'sdtooling.usageDeletionAfter';
    }
    if (permission.maxUseCount !== undefined) {
      return 'sdtooling.usageRestrictedNumber';
    }
    if (permission.fromIso || permission.toIso) {
      return 'sdtooling.usageRestrictedDuration';
    }
    return null;
  }

  formatDate(iso: string): string {
    const lang = this.translate.currentLang || this.translate.defaultLang || 'es';
    return formatPolicyDate(iso, resolveIntlLocale(lang));
  }

  private translateOrRaw(namespace: string, value: string | undefined): string {
    if (!value) {
      return '-';
    }
    const key = `${namespace}.${value}`;
    const translated = this.translate.instant(key);
    return typeof translated === 'string' && translated && translated !== key ? translated : value;
  }
}

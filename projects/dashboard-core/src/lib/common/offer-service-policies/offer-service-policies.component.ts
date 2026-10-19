import { Component, computed, input, signal, type ElementRef, viewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import {
  OdrlPolicySummaryComponent,
  type OdrlPolicySummaryVariant,
} from '../odrl-policy-summary/odrl-policy-summary.component';

export interface OfferServicePolicyVm {
  variant: OdrlPolicySummaryVariant;
  titleKey: string;
  icon: string;
  iconClass: string;
  /** `null` when the embedded JSON cannot be parsed; the ODRL button still shows the raw text. */
  policy: Record<string, unknown> | null;
  odrlText: string;
}

function toPolicyVm(
  raw: string,
  variant: OdrlPolicySummaryVariant,
  titleKey: string,
  icon: string,
  iconClass: string,
): OfferServicePolicyVm | null {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(trimmed);
    const policy =
      typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    return { variant, titleKey, icon, iconClass, policy, odrlText: JSON.stringify(parsed, null, 2) };
  } catch {
    return { variant, titleKey, icon, iconClass, policy: null, odrlText: trimmed };
  }
}

/**
 * Access and usage policies embedded in an offer self-description (`simpl:access-policy` / `simpl:usage-policy`):
 * every permission, plus a button that shows the ODRL of each policy.
 */
@Component({
  selector: 'lib-offer-service-policies',
  standalone: true,
  imports: [TranslateModule, OdrlPolicySummaryComponent],
  templateUrl: './offer-service-policies.component.html',
})
export class OfferServicePoliciesComponent {
  readonly accessPolicyRaw = input<string>('');
  readonly usagePolicyRaw = input<string>('');

  private readonly odrlDialog = viewChild<ElementRef<HTMLDialogElement>>('odrlDialog');

  readonly policies = computed(() =>
    [
      toPolicyVm(this.accessPolicyRaw(), 'access', 'sdDetails.detail.accessPolicy', 'lock_open', 'text-blue-600'),
      toPolicyVm(this.usagePolicyRaw(), 'usage', 'sdDetails.detail.usagePolicy', 'assignment', 'text-green-600'),
    ].filter((policy): policy is OfferServicePolicyVm => policy !== null),
  );

  readonly selectedPolicy = signal<OfferServicePolicyVm | null>(null);

  openOdrl(policy: OfferServicePolicyVm): void {
    this.selectedPolicy.set(policy);
    this.odrlDialog()?.nativeElement.showModal();
  }

  closeOdrl(): void {
    this.odrlDialog()?.nativeElement.close();
  }
}

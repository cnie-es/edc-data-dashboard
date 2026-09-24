import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BreadcrumbsComponent, SdDisplayMapper, type BreadcrumbItem } from '@eclipse-edc/dashboard-core';
import { regionFlagEmoji } from './sd-details.mapper';

import {
  AccessPolicyRow,
  CorpusOfferingLanguageRow,
  OfferSelfDescriptionDetailViewModel,
  UsagePolicyRow,
} from 'dist/@eclipse-edc/dashboard-core';

@Component({
  selector: 'lib-sd-detail-view-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, BreadcrumbsComponent],
  templateUrl: './sd-detail-view-layout.component.html',
  styleUrls: ['./sd-detail-view-layout.component.css'],
})
export class SdDetailViewLayoutComponent {
  private readonly translate = inject(TranslateService);
  private readonly display = new SdDisplayMapper(this.translate);

  readonly vm = input<OfferSelfDescriptionDetailViewModel | undefined>(undefined);
  readonly loading = input(false);
  readonly errorMessageKey = input<string | undefined>(undefined);
  readonly breadcrumbItemsTranslated = input<BreadcrumbItem[]>([]);
  readonly backRoute = input('/catalog');
  readonly backLabelKey = input('offers.detail.backToList');
  readonly listDateDisplay = input('');
  readonly contractPolicyId = input('');
  readonly contractPolicyName = input('');
  readonly publicationPolicyId = input('');
  readonly publicationPolicyName = input('');
  readonly sortedAccessPolicyRows = input<AccessPolicyRow[]>([]);
  readonly sortedUsagePolicyRows = input<UsagePolicyRow[]>([]);

  readonly viewPolicy = output<void>();
  readonly viewPublicationPolicy = output<void>();

  readonly canViewPolicy = computed(() => {
    const policyId = this.contractPolicyId().trim();
    const licenseUrl = this.vm()?.licenseUrl?.trim() ?? '';
    return policyId.length > 0 || licenseUrl.length > 0;
  });

  readonly canViewPublicationPolicy = computed(() => {
    const policyId = this.publicationPolicyId().trim();
    const licenseUrl = this.vm()?.licenseUrl?.trim() ?? '';
    return policyId.length > 0 || licenseUrl.length > 0;
  });

  regionFlag(regionCode?: string): string {
    return regionFlagEmoji(regionCode);
  }

  getFlag(regionRaw?: string): string {
    const flags: Record<string, string> = {
      ES: '🇪🇸',
      US: '🇺🇸',
      DE: '🇩🇪',
      FR: '🇫🇷',
    };
    if (!regionRaw) return '🌍';
    const match = regionRaw.match(/ES|US|DE|FR/i);
    const code = match?.[0]?.toUpperCase();
    return flags[code ?? ''] ?? '🌍';
  }

  formatBoolean(value?: string | null): string {
    const code = value?.toLowerCase() ?? '';
    if (code.startsWith('yes')) return 'yes';
    if (code.startsWith('no')) return 'no';
    if (code.includes('unknown') || code === 'unk') return 'unknown';
    return code;
  }

  dpLabel(flag: string): string {
    const key = `offers.detail.dp.${flag}`;
    const translated = this.translate.instant(key);
    return translated !== key ? translated : flag;
  }

  formatLanguage(varietyLine?: string, regionRaw?: string): string {
    return this.display.languageWithRegion(varietyLine, regionRaw);
  }

  formatRegion(regionRaw?: string): string {
    return this.display.region(regionRaw);
  }

  formatDisplayLabel(value?: string | null): string {
    return value?.trim() || '';
  }

  formatFileFormat(value?: string): string {
    return this.formatDisplayLabel(value);
  }

  hasLanguageContent(languages: CorpusOfferingLanguageRow[]): boolean {
    return languages.some(row => row.hasDisplayContent);
  }

  isEuroCurrency(currency?: string | null): boolean {
    const normalized = (currency ?? '').trim().toUpperCase();
    return normalized === 'EUR' || normalized === '€' || normalized === 'EURO';
  }

  formatOfferPriceLine(amount?: string | null, currency?: string | null): string {
    const key = this.isEuroCurrency(currency) ? 'offers.detail.priceLineWithVat' : 'offers.detail.priceLine';
    return this.translate.instant(key, {
      amount: amount ?? '',
      currency: currency ?? '',
    });
  }

  getAssetTypeKey(title: string): string {
    if (!title) return title;

    const lower = title.trim().toLowerCase();

    const patterns: { pattern: string; key: string }[] = [
      { pattern: 'corpus', key: 'filters.assetType.corpus' },
      { pattern: 'model', key: 'filters.assetType.mlmodel' },
      { pattern: 'api', key: 'filters.assetType.api' },
      { pattern: 'lexical', key: 'filters.assetType.lexicalconceptualresource' },
      { pattern: 'lcr', key: 'filters.assetType.lexicalconceptualresource' },
    ];

    for (const p of patterns) {
      if (lower.includes(p.pattern)) {
        return p.key;
      }
    }

    return title;
  }
}

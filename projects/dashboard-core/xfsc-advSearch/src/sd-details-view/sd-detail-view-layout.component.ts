import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  BreadcrumbsComponent,
  currencySymbol,
  OfferServicePoliciesComponent,
  SdDisplayMapper,
  type BreadcrumbItem,
} from '@eclipse-edc/dashboard-core';
import { regionFlagEmoji } from './sd-details.mapper';

import { CorpusOfferingLanguageRow, OfferSelfDescriptionDetailViewModel } from 'dist/@eclipse-edc/dashboard-core';

@Component({
  selector: 'lib-sd-detail-view-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, BreadcrumbsComponent, OfferServicePoliciesComponent],
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

  formatMediaType(value?: string): string {
    return this.display.mediaType(value);
  }

  formatLingualityType(value?: string): string {
    return this.display.lingualityType(value);
  }

  formatFileFormat(value?: string): string {
    return this.formatDisplayLabel(value);
  }

  hasLanguageContent(languages: CorpusOfferingLanguageRow[]): boolean {
    return languages.some(row => row.hasDisplayContent);
  }

  formatOfferPriceLine(amount?: string | null, currency?: string | null): string {
    return this.translate.instant('offers.detail.priceLine', {
      amount: amount ?? '',
      currency: currencySymbol(currency),
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

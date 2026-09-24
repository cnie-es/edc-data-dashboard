import { CommonModule } from '@angular/common';
import { Component, inject, input, output, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BreadcrumbsComponent, type BreadcrumbItem } from '../breadcrumbs/breadcrumbs.component';
import type {
  CorpusOfferingLanguageRow,
  OfferSelfDescriptionDetailViewModel,
  ProvenanceBlockKind,
} from '../../sd/corpus-offering-self-description.mapper';
import { regionFlagEmoji } from '../../sd/language-bcp47.util';
import { SdDisplayMapper } from '../../sd/sd-display.mapper';

export type CorpusSelfDescriptionLayoutMode = 'asset' | 'offer';

@Component({
  selector: 'lib-corpus-self-description-detail-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, BreadcrumbsComponent],
  templateUrl: './corpus-self-description-detail-layout.component.html',
  styleUrl: './corpus-self-description-detail-layout.component.css',
})
export class CorpusSelfDescriptionDetailLayoutComponent {
  private readonly translate = inject(TranslateService);
  private readonly display = new SdDisplayMapper(this.translate);

  readonly vm = input<OfferSelfDescriptionDetailViewModel | undefined>(undefined);
  readonly loading = input(false);
  readonly errorMessageKey = input<string | undefined>(undefined);
  readonly breadcrumbItemsTranslated = input<BreadcrumbItem[]>([]);
  readonly backRoute = input<string>('/home');
  readonly backLabelKey = input<string>('offers.detail.backToList');
  readonly layoutMode = input<CorpusSelfDescriptionLayoutMode>('offer');
  readonly listDateDisplay = input<string>('');
  readonly hasLinkedOffers = input(false);
  readonly showDeleteOffer = input(false);
  readonly deleteOfferDisabled = input(false);
  readonly embeddedInModal = input(false);
  readonly contractPolicyId = input('');
  readonly contractPolicyName = input('');
  readonly contractPolicyNameLoading = input(false);
  readonly publicationPolicyId = input('');
  readonly publicationPolicyName = input('');
  readonly publicationPolicyNameLoading = input(false);

  readonly deleteOffer = output<void>();
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

  // En el archivo .ts del componente

  // Si usas signals (como `vm` que es una señal)
  get sourceLanguagesDisplay(): string {
    const vm = this.vm();
    if (!vm) return '';
    return vm.sourceLanguages.map(l => l.varietyLine).join(', ');
  }

  get targetLanguagesDisplay(): string {
    const vm = this.vm();
    if (!vm) return '';
    return vm.targetLanguages.map(l => l.varietyLine).join(', ');
  }

  get pivotLanguagesDisplay(): string {
    const vm = this.vm();
    if (!vm) return '';
    return vm.pivotLanguages.map(l => l.varietyLine).join(', ');
  }
  getFlag(regionRaw?: string): string {
    const flags: Record<string, string> = {
      ES: '🇪🇸',
      US: '🇺🇸',
      DE: '🇩🇪',
      FR: '🇫🇷',
    };

    if (!regionRaw) {
      return '🌍';
    }

    const match = regionRaw.match(/ES|US|DE|FR/i);
    const code = match?.[0]?.toUpperCase();
    return flags[code ?? ''] ?? '🌍';
  }

  formatBoolean(value?: string | null): string {
    const code = value?.toLowerCase() ?? '';

    if (code.startsWith('yes')) {
      return 'yes';
    }
    if (code.startsWith('no')) {
      return 'no';
    }
    if (code.includes('unknown') || code === 'unk') {
      return 'unknown';
    }

    return code;
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
  /**
   * Convierte el título del esquema (dct:title) a una clave de traducción
   * para el tipo de activo (assetType.*) usando coincidencia parcial (includes).
   */
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

    // Si no coincide, devolvemos el título original (sin traducir) como fallback
    return title;
  }
  formatFileFormat(value?: string): string {
    return this.formatDisplayLabel(value);
  }

  regionFlag(regionCode?: string): string {
    return regionFlagEmoji(regionCode);
  }

  hasLanguageContent(languages: CorpusOfferingLanguageRow[]): boolean {
    return languages.some(row => row.hasDisplayContent);
  }

  dpLabel(flag: string): string {
    const key = `offers.detail.dp.${flag}`;
    const translated = this.translate.instant(key);
    return translated !== key ? translated : flag;
  }

  provenanceKindLabel(kind: ProvenanceBlockKind): string {
    return this.translate.instant(
      kind === 'originalSource' ? 'assets.detail.provenanceOriginalSource' : 'assets.detail.provenanceIpHolder',
    );
  }

  provenanceIcon(kind: ProvenanceBlockKind): string {
    return kind === 'originalSource' ? 'link' : 'key';
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
}

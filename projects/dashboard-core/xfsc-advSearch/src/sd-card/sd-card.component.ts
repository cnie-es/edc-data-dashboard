import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { stripCuriePrefix } from '@eclipse-edc/dashboard-core';
import type { SelfDescriptorModel } from '../models/self-descriptor.model';
import type { OnChanges } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

export interface SelfDescriptorInterface {
  selfDescriptionId: string;
  claimsGraphUri0: string[];
  offeringType?: string;
  name: string;
  description: string;
  inLanguage: string;
  serviceAccessPoint?: string;
  text: string | undefined;
}

export class SelfDescriptor implements SelfDescriptorInterface {
  selfDescriptionId = 'did:web:registry.gaia-x.eu:DataOffering:fMw2UtNCDW-ydI83YKscqCKa-n75jJ0qY7v1';
  claimsGraphUri0 = ['did:web:registry.gaia-x.eu:DataOffering:fMw2UtNCDW-ydI83YKscqCKa-n75jJ0qY7v1'];
  name = 'aefafname assssssssssssdddddddddddsssssss wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww';
  description =
    'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?';
  inLanguage = 'en';
  offeringType?: string = 'data';
  serviceAccessPoint?: string = 'https://creation.com';
  text: string | undefined;

  constructor(
    selfDescriptionId: string,
    claimsGraphUri0: string[],
    name: string,
    description: string,
    inLanguage: string,
    text: string | undefined,
    offeringType?: string,
    serviceAccessPoint?: string,
  ) {
    this.selfDescriptionId = selfDescriptionId;
    this.claimsGraphUri0 = claimsGraphUri0;
    this.name = name;
    this.description = description;
    this.inLanguage = inLanguage;
    this.text = text;
    this.offeringType = offeringType;
    this.serviceAccessPoint = serviceAccessPoint;
  }
}

@Component({
  selector: 'lib-sd-card',
  imports: [UpperCasePipe, TranslateModule],
  templateUrl: './sd-card.component.html',
  styleUrl: './sd-card.component.css',
})
export class SdCardComponent implements OnChanges {
  @Input() sd?: SelfDescriptorModel;
  @Input() showButtons = true;
  @Input() showDetailsButton = false;
  @Input() detailsActionEnabled = false;
  @Input() active = false;

  @Output() detailsEvent = new EventEmitter<SelfDescriptorModel>();
  @Output() editEvent = new EventEmitter<SelfDescriptorModel>();
  @Output() deleteEvent = new EventEmitter<SelfDescriptorModel>();
  private readonly translate = inject(TranslateService);
  name?: string;
  type?: string;
  contentType?: string;

  ngOnChanges() {
    //this.name = this.sd?.properties.optionalValue('edc', 'name');
    //this.contentType = this.sd?.properties.optionalValue('edc', 'contenttype');
    //this.type = this.sd?.dataAddress.mandatoryValue('edc', 'type');
    return 0;
  }

  formatOfferingType(value: string | undefined): string {
    if (!value?.trim()) {
      return '';
    }
    return stripCuriePrefix(value).toLowerCase();
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

    // Si no coincide, devolvemos el título original (sin traducir) como fallback
    return title;
  }
  private triggerDetails(): void {
    if (this.sd && this.showDetailsButton && this.detailsActionEnabled) {
      this.detailsEvent.emit(this.sd);
    }
  }

  onCardClick(event: MouseEvent): void {
    // Ignore clicks inside buttons so they emit only their own events
    const target = event.target as HTMLElement | null;
    if (target?.closest('button')) {
      return;
    }
    this.triggerDetails();
  }

  onCardKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); // Prevent page scroll for Space
      this.triggerDetails();
    }
  }
}

/*
 *  Copyright (c) 2025 Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V.
 *
 *  This program and the accompanying materials are made available under the
 *  terms of the Apache License, Version 2.0 which is available at
 *  https://www.apache.org/licenses/LICENSE-2.0
 *
 *  SPDX-License-Identifier: Apache-2.0
 *
 *  Contributors:
 *       Fraunhofer-Gesellschaft zur Förderung der angewandten Forschung e.V. - initial API and implementation
 *
 */

import { Component, EventEmitter, Input, type OnChanges, Output, type SimpleChanges } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import type { CatalogDataset } from '../catalog-dataset';

@Component({
  selector: 'lib-catalog-card',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './catalog-card.component.html',
  styleUrl: './catalog-card.component.css',
})
export class CatalogCardComponent implements OnChanges {
  @Input() catalogDataset?: CatalogDataset;
  @Input() showButtons = true;

  @Output() detailsEvent = new EventEmitter<CatalogDataset>();
  @Output() negotiateEvent = new EventEmitter<CatalogDataset>();

  name = '';
  sourceLine = '';
  categoryKey = 'catalog.categoryDataset';
  description = '';
  dateLabel = '';
  private version = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['catalogDataset']) {
      this.populateFromDataset();
    }
  }

  private populateFromDataset(): void {
    if (!this.catalogDataset) {
      this.name = '';
      this.sourceLine = '';
      this.description = '';
      this.dateLabel = '';
      this.version = '';
      this.categoryKey = 'catalog.categoryDataset';
      return;
    }

    const d = this.catalogDataset;
    const dataset = d.dataset as unknown as Record<string, unknown>;

    this.name = d.assetId || '';
    this.sourceLine = this.formatSource(d);
    this.version = this.readVersion(d);
    const contentType = this.readContentType(d, dataset);
    this.categoryKey = this.resolveCategoryKey(contentType);
    this.description = this.buildDescription(dataset, d, contentType);
    this.dateLabel = this.extractModifiedDate(dataset);
  }

  private formatSource(d: CatalogDataset): string {
    const originator = (d.originator || '').trim();
    const participant = (d.participantId || '').trim();
    if (originator && originator !== participant) {
      return originator;
    }
    return participant || originator;
  }

  private readVersion(d: CatalogDataset): string {
    const raw = d.dataset?.['asset:prop:version'];
    if (Array.isArray(raw) && raw[0] && typeof raw[0] === 'object' && '@value' in raw[0]) {
      return String((raw[0] as { '@value': unknown })['@value'] ?? '').trim();
    }
    if (typeof raw === 'string') {
      return raw.trim();
    }
    return '';
  }

  private readContentType(d: CatalogDataset, dataset: Record<string, unknown>): string {
    try {
      return d.dataset.mandatoryValue('edc', 'contenttype') || '';
    } catch {
      return readJsonLdString(dataset['contenttype']) || readJsonLdString(dataset['edc:contenttype']) || '';
    }
  }

  private resolveCategoryKey(contentType: string): string {
    const lower = contentType.toLowerCase();
    if (!lower) {
      return 'catalog.categoryOther';
    }
    if (lower.startsWith('text/') || lower.includes('tei') || lower.includes('tcf') || lower.includes('conllu')) {
      return 'catalog.categoryCorpus';
    }
    if (
      lower.includes('onnx') ||
      lower.includes('torch') ||
      lower.includes('pickle') ||
      lower.includes('safetensors') ||
      lower.includes('keras') ||
      lower.includes('mlmodel') ||
      lower.includes('huggingface')
    ) {
      return 'catalog.categoryModel';
    }
    if (lower.includes('json') || lower.includes('parquet') || lower.includes('csv') || lower.includes('spreadsheet')) {
      return 'catalog.categoryDataset';
    }
    return 'catalog.categoryDataset';
  }

  private buildDescription(dataset: Record<string, unknown>, d: CatalogDataset, contentType: string): string {
    const fromMeta =
      readJsonLdString(dataset['dct:description']) ||
      readJsonLdString(dataset['http://purl.org/dc/terms/description']) ||
      readJsonLdString(dataset['description']) ||
      readJsonLdString(dataset['name']);

    if (fromMeta) {
      return fromMeta;
    }

    const parts: string[] = [];
    if (this.version) {
      parts.push(`v${this.version}`);
    }
    if (contentType) {
      parts.push(contentType);
    }
    if (parts.length) {
      return parts.join(' · ');
    }

    return d.assetId;
  }

  private extractModifiedDate(dataset: Record<string, unknown>): string {
    const raw =
      readJsonLdString(dataset['dct:modified']) ||
      readJsonLdString(dataset['http://purl.org/dc/terms/modified']) ||
      readJsonLdString(dataset['modified']);

    if (!raw) {
      return '';
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
    return raw;
  }
}

function readJsonLdString(val: unknown): string {
  if (typeof val === 'string' && val.trim()) {
    return val.trim();
  }
  if (Array.isArray(val)) {
    for (const item of val) {
      if (item && typeof item === 'object' && '@value' in (item as object)) {
        const s = String((item as { '@value': unknown })['@value']).trim();
        if (s) {
          return s;
        }
      }
      if (typeof item === 'string' && item.trim()) {
        return item.trim();
      }
    }
  }
  return '';
}

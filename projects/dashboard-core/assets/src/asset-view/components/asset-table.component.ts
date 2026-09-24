import { AsyncPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ListLoadingStateComponent, PaginationComponent } from '@eclipse-edc/dashboard-core';
import { Observable, of } from 'rxjs';
import { AssetTableRow } from '../asset-table-row.model';
import { TranslateModule } from '@ngx-translate/core';

type RdfType = string | undefined | null;

@Component({
  selector: 'lib-asset-table',
  standalone: true,
  imports: [AsyncPipe, ListLoadingStateComponent, PaginationComponent, TranslateModule],
  templateUrl: './asset-table.component.html',
})
export class AssetTableComponent {
  @Input({ required: true }) pageRows$: Observable<AssetTableRow[]> = of([]);
  @Input({ required: true }) rows$: Observable<AssetTableRow[]> = of([]);
  @Input({ required: true }) filteredRows$: Observable<AssetTableRow[]> = of([]);
  @Input({ required: true }) fetched = false;
  @Input({ required: true }) pageItemCount = 5;

  @Output() openDetails = new EventEmitter<AssetTableRow>();
  @Output() pageItemsChanged = new EventEmitter<AssetTableRow[]>();

  private readonly TYPE_MAP: Record<string, string> = {
    'ms:Corpus': 'Corpus',
    'ms:Asset': 'Asset',
    'ms:Dataset': 'Dataset',
  };

  formatType(type: RdfType): string {
    if (!type) return '';
    return this.TYPE_MAP[type] ?? this.stripPrefix(type);
  }

  private stripPrefix(value: string): string {
    return value.replace(/^[a-zA-Z0-9]+:/, '');
  }
}

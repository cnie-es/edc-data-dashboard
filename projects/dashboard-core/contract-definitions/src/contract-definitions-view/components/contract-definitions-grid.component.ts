import { AsyncPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { Observable } from 'rxjs';
import { of } from 'rxjs';
import { ListLoadingStateComponent, PaginationComponent } from '@eclipse-edc/dashboard-core';
import { ContractDefinitionCardComponent } from '../../contract-definition-card/contract-definition-card.component';
import type { OfferCardViewModel } from '../../offer-card-view-model';

@Component({
  selector: 'lib-contract-definitions-grid',
  standalone: true,
  imports: [
    AsyncPipe,
    PaginationComponent,
    ListLoadingStateComponent,
    ContractDefinitionCardComponent,
    TranslateModule,
  ],
  templateUrl: './contract-definitions-grid.component.html',
})
export class ContractDefinitionsGridComponent {
  @Input({ required: true }) pageContractDefinitions$: Observable<OfferCardViewModel[]> = of([]);
  @Input({ required: true }) contractDefinitions$: Observable<OfferCardViewModel[]> = of([]);
  @Input({ required: true }) filteredContractDefinitions$: Observable<OfferCardViewModel[]> = of([]);
  @Input({ required: true }) fetched = false;
  @Input({ required: true }) pageItemCount = 6;
  @Input() disableOpenDetails = false;
  @Input() isSearchActive = false;

  @Output() openDetails = new EventEmitter<OfferCardViewModel>();
  @Output() pageItemsChanged = new EventEmitter<OfferCardViewModel[]>();
}

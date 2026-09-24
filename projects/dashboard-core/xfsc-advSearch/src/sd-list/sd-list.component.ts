import { Component, Input, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { SdCardComponent } from '../sd-card/sd-card.component';
import { Subscription } from 'rxjs';
import { AdvancedSearchStateService } from '../advanced-search-state.service';
import { FilterInputComponent, ListLoadingStateComponent } from '@eclipse-edc/dashboard-core';
import { Router } from '@angular/router';
import type { OnDestroy, OnInit } from '@angular/core';
import type { SelfDescriptorModel } from '../models/self-descriptor.model';

@Component({
  selector: 'lib-sd-list',
  imports: [SdCardComponent, FilterInputComponent, ListLoadingStateComponent, TranslateModule],
  templateUrl: './sd-list.component.html',
  styleUrl: './sd-list.component.css',
})
export class SdListComponent implements OnInit, OnDestroy {
  private readonly searchState = inject(AdvancedSearchStateService);
  private readonly router = inject(Router);

  @Input() simpleSearch = true;
  @Input() showSimpleSearchBar = true;
  @Input() enableDetailsAction = true;
  selfDescriptors: SelfDescriptorModel[] = [];

  loading = false;
  errorMessage: string | undefined;
  pendingSimpleQuery = '';
  hasCompletedSearch = false;

  private readonly subscriptions = new Subscription();

  ngOnInit(): void {
    this.subscriptions.add(
      this.searchState.results$.subscribe(results => {
        this.selfDescriptors = results;
      }),
    );

    this.subscriptions.add(
      this.searchState.loading$.subscribe(isLoading => {
        this.loading = isLoading;
      }),
    );

    this.subscriptions.add(
      this.searchState.error$.subscribe(error => {
        this.errorMessage = error;
      }),
    );

    this.subscriptions.add(
      this.searchState.hasCompletedSearch$.subscribe(completed => {
        this.hasCompletedSearch = completed;
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  updateSimpleQuery(event: string): void {
    this.pendingSimpleQuery = event;
  }

  executeSimpleSearch(): void {
    this.searchState.searchSimple(this.pendingSimpleQuery);
  }

  openDetails(sd: SelfDescriptorModel): void {
    this.router.navigate(['/xfsc-advsearch', 'self-descriptions', sd.selfDescriptionId], {
      state: { sd },
    });
  }
}

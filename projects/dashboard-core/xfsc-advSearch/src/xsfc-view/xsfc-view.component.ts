import { Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { SdListComponent } from '../sd-list/sd-list.component';
import { AdvSearchComponent } from '../adv-search/adv-search.component';
import { AdvancedSearchStateService } from '../advanced-search-state.service';

type XfscViewMode = 'simple-search' | 'advanced-search';

@Component({
  selector: 'lib-xfsc-view',
  imports: [SdListComponent, AdvSearchComponent, TranslateModule],
  templateUrl: './xsfc-view.component.html',
  styleUrl: './xsfc-view.component.css',
})
export class XfscViewComponent {
  private readonly searchState = inject(AdvancedSearchStateService);

  activeViewMode: XfscViewMode = 'simple-search';

  changeView(mode: XfscViewMode): void {
    this.activeViewMode = mode;
    if (mode === 'advanced-search') {
      this.searchState.clearResults();
    }
  }
}

// Backward compatible alias for existing imports.
export { XfscViewComponent as XsfcViewComponent };

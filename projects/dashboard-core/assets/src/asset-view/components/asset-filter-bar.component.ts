import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FilterInputComponent } from '@eclipse-edc/dashboard-core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'lib-asset-filter-bar',
  standalone: true,
  imports: [FilterInputComponent, TranslateModule],
  templateUrl: './asset-filter-bar.component.html',
})
export class AssetFilterBarComponent {
  @Input({ required: true }) selectedSort = 'newest';

  @Output() searchChanged = new EventEmitter<string>();
  @Output() sortChanged = new EventEmitter<string>();
}

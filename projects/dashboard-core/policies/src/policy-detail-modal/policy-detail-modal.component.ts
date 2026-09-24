import { Component, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { PolicyDetailPanelComponent } from '../policy-detail-panel/policy-detail-panel.component';

@Component({
  selector: 'lib-policy-detail-modal',
  standalone: true,
  imports: [TranslateModule, PolicyDetailPanelComponent],
  templateUrl: './policy-detail-modal.component.html',
})
export class PolicyDetailModalComponent {
  readonly policyId = input<string>('');
  readonly policyName = input<string>('');
  readonly licenseUrl = input<string | undefined>(undefined);

  readonly closed = output<void>();
}

import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { CreateAssetRow, CreatePolicyRow } from '../create-page.types';

@Component({
  selector: 'lib-create-step-review-publish',
  standalone: true,
  templateUrl: './create-step-review-publish.component.html',
})
export class CreateStepReviewPublishComponent {
  @Input() showInPublicCatalog = false;
  @Input() publishFeedbackVisible = false;
  @Input() selectedAssetRow?: CreateAssetRow;
  @Input() selectedContractPolicyRow?: CreatePolicyRow;
  @Input() selectedPublicationPolicyRow?: CreatePolicyRow;
  @Input() canPublishOffer = false;

  @Output() togglePublicCatalog = new EventEmitter<void>();
  @Output() previous = new EventEmitter<void>();
  @Output() publish = new EventEmitter<void>();
}

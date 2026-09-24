// ejemplo: policy-create-contratacion.component.ts
import { Component, signal } from '@angular/core';

@Component({
  selector: 'lib-policy-create-contratacion',
  standalone: true,
  templateUrl: './policy-create-contratacion.component.html',
  imports: [],
})
export class PolicyCreateContratacionComponent {
  currentStep() {
    throw new Error('Method not implemented.');
  }
}

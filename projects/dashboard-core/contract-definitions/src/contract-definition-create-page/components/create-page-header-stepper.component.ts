import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BreadcrumbsComponent, type BreadcrumbItem } from '@eclipse-edc/dashboard-core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'lib-create-page-header-stepper',
  standalone: true,
  imports: [BreadcrumbsComponent, TranslateModule, CommonModule],
  templateUrl: './create-page-header-stepper.component.html',
})
export class CreatePageHeaderStepperComponent {
  @Input({ required: true }) currentStep = 1;
  @Output() goHome = new EventEmitter<void>();
  @Output() goBack = new EventEmitter<void>();

  readonly breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Inicio', route: '/home' },
    { label: 'Mis ofertas', route: '/contract-definitions' },
    { label: 'Crear nueva oferta' },
  ];
}

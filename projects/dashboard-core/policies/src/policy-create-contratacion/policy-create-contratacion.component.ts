import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { BreadcrumbsComponent, type BreadcrumbItem } from '@eclipse-edc/dashboard-core';

@Component({
  selector: 'lib-policy-create-contratacion',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSlideToggleModule, BreadcrumbsComponent],
  templateUrl: './policy-create-contratacion.component.html',
  styleUrls: ['./policy-create-contratacion.component.css'],
})
export class PolicyCreateContratacionComponent {
  readonly breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Inicio', route: '/home' },
    { label: 'Mis políticas', route: '/policies' },
    { label: 'Crear nueva política' },
  ];

  currentStep = 1;

  policyName = '';
  policyDescription = '';
  legalText = '';

  policyType: 'contratacion' | 'publicacion' | 'lda' = 'contratacion';

  obligaciones = [
    {
      titulo: 'Obligación de atribución',
      descripcion: 'El consumidor debe dar crédito al titular de los derechos de autor y/o al creador del activo',
      activo: false,
    },
    {
      titulo: 'Obligación de adjuntar política',
      descripcion:
        'El consumidor debe adjuntar las políticas de derechos de autor y licencia cuando distribuya el activo a terceros',
      activo: false,
    },
    {
      titulo: 'Derivados no permitidos',
      descripcion: 'El consumidor no está autorizado a distribuir obras derivadas del bien',
      activo: false,
    },
    {
      titulo: 'Tecnologías derivadas no permitidas',
      descripcion: 'El consumidor no está autorizado a distribuir tecnologías derivadas del activo',
      activo: false,
    },
    {
      titulo: 'Derivados compartidos en mismas condiciones',
      descripcion:
        'El consumidor debe distribuir las obras derivadas únicamente bajo mismas condiciones de licencia o compatibles con las de la obra original',
      activo: false,
    },
  ];

  restricciones = [
    {
      titulo: 'Restricción de uso temporal',
      descripcion:
        'El consumidor puede utilizar el activo durante un periodo de tiempo determinado tras su adquisición',
      activo: false,
      expand: false,
      customValue: '',
      unit: 'meses',
    },
    {
      titulo: 'Restricción de intervalo de tiempo',
      descripcion: 'El consumidor tiene acceso al activo durante un rango temporal especificado',
      activo: false,
      expand: false,
      startDate: '',
      endDate: '',
    },
    {
      titulo: 'Restricción de connector',
      descripcion: 'Sólo determinados conectores tienen acceso al activo',
      activo: false,
    },
    {
      titulo: 'Restricción de la ubicación del connector',
      descripcion: 'Sólo los conectores ubicados en lugares específicos tienen acceso al activo',
      activo: false,
    },
    {
      titulo: 'Restricción de tipo de uso',
      descripcion:
        'Se puede utilizar el activo sólo para fines específicos (por ejemplo, investigación, modelos de formación, etc.)',
      activo: false,
    },
  ];

  get stepLabels(): string[] {
    switch (this.policyType) {
      case 'contratacion':
        return ['Información básica', 'Obligaciones y permisos', 'Restricciones', 'Revisar y guardar'];
      case 'publicacion':
        return ['Información básica', 'Restricciones', 'Revisar y guardar'];
      case 'lda':
        return ['Texto Licencia', 'Restricciones', 'Tarifas y monetizacion', 'Revisar y guardar'];
      default:
        return [];
    }
  }

  onStepChange(step: number) {
    this.currentStep = step;
  }

  canGoNextStep(): boolean {
    switch (this.currentStep) {
      case 1:
        return !!this.policyName && !!this.policyDescription;
      case 2:
        return this.hasSelectedObligation();
      case 3:
        return this.hasSelectedRestriction();
      default:
        return true;
    }
  }

  hasSelectedObligation(): boolean {
    return this.obligaciones.some(item => item.activo);
  }

  hasSelectedRestriction(): boolean {
    return this.restricciones.some(item => item.activo);
  }

  next() {
    if (this.currentStep < this.stepLabels.length) this.currentStep++;
  }

  prev() {
    if (this.currentStep > 1) this.currentStep--;
  }

  get obligacionesActivas() {
    return this.obligaciones.filter(o => o.activo);
  }

  get restriccionesActivas() {
    return this.restricciones.filter(r => r.activo);
  }
}

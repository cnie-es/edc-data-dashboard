import type { FormGroup } from '@angular/forms';
import type { DynamicSection } from '@eclipse-edc/dashboard-core/shacl-schema';
import { isAssetPropertiesSection } from '../template/sdtooling-asset-properties.section';
import { getActiveSectionAtStep, isSummaryStepIndex } from './sdtooling-wizard.steps';

export interface WizardValidationContext {
  sections: DynamicSection[];
  currentStepIndex: number;
  dynamicForm: FormGroup;
  templateForm: FormGroup;
  templateSections: DynamicSection[];
  selectedSharingMethod: string;
  selectedTemplateId: string;
  loadingTemplates: boolean;
  loadingTemplateDetails: boolean;
  loadingSchemaDetails: boolean;
}

// Función auxiliar para validar una sección (reutilizable)
const isSectionControlsValid = (section: DynamicSection, form: FormGroup): boolean => {
  for (const field of section.fields) {
    const control = form.get(field.controlName);
    if (!control || control.invalid) {
      return false;
    }
  }
  return true;
};

// Valida si una sección es completable (incluye condiciones de asset properties)
const isSectionCompletable = (
  section: DynamicSection,
  ctx: Pick<
    WizardValidationContext,
    | 'dynamicForm'
    | 'selectedSharingMethod'
    | 'selectedTemplateId'
    | 'loadingTemplates'
    | 'loadingTemplateDetails'
    | 'templateSections'
    | 'templateForm'
  >,
): boolean => {
  if (!isSectionControlsValid(section, ctx.dynamicForm)) {
    return false;
  }
  if (isAssetPropertiesSection(section)) {
    if (!ctx.selectedSharingMethod || !ctx.selectedTemplateId) {
      return false;
    }
    if (ctx.loadingTemplates || ctx.loadingTemplateDetails) {
      return false;
    }
    if (ctx.templateSections.length > 0 && !ctx.templateForm.valid) {
      return false;
    }
  }
  return true;
};

// Verifica si un paso (por índice) es completable
const isStepCompletable = (ctx: WizardValidationContext, index: number): boolean => {
  if (index < 0 || index >= ctx.sections.length) {
    return false; // el summary no es completable para avanzar
  }
  const section = ctx.sections[index];
  return section ? isSectionCompletable(section, ctx) : false;
};

// Función original (ahora reutiliza la lógica)
export const canMoveForwardFromCurrentStep = (ctx: WizardValidationContext): boolean => {
  if (!ctx.sections.length || isSummaryStepIndex(ctx.sections.length, ctx.currentStepIndex)) {
    return false;
  }
  const section = getActiveSectionAtStep(ctx.sections, ctx.currentStepIndex);
  if (!section) {
    return false;
  }
  return isSectionCompletable(section, ctx);
};

// Nueva versión de canOpenStep que permite saltos a pasos futuros completos
export const canOpenStep = (ctx: WizardValidationContext, index: number): boolean => {
  // Pasos anteriores o actual siempre accesibles
  if (index <= ctx.currentStepIndex) {
    return true;
  }

  // Si es el paso de resumen, deben estar completos TODOS los pasos
  if (index === ctx.sections.length) {
    for (let i = 0; i < ctx.sections.length; i++) {
      if (!isStepCompletable(ctx, i)) {
        return false;
      }
    }
    return true;
  }

  // Para pasos intermedios, verificar que todos los pasos desde el actual hasta index-1 estén completos
  for (let i = ctx.currentStepIndex; i < index; i++) {
    if (!isStepCompletable(ctx, i)) {
      return false;
    }
  }
  return true;
};

export interface NextStepBlockReasonLabels {
  selectSchema: string;
  waitSchemaDetails: string;
  completeSection: (section: string) => string;
  selectSharingMethod: string;
  selectTemplate: string;
  waitTemplateDetails: string;
  completeTemplateFields: string;
}

export const getNextStepBlockReason = (ctx: WizardValidationContext, labels: NextStepBlockReasonLabels): string => {
  if (!ctx.sections.length) {
    return labels.selectSchema;
  }

  if (ctx.loadingSchemaDetails) {
    return labels.waitSchemaDetails;
  }

  const section = getActiveSectionAtStep(ctx.sections, ctx.currentStepIndex);
  if (!section) {
    return '';
  }

  if (!isSectionControlsValid(section, ctx.dynamicForm)) {
    return labels.completeSection(section.label);
  }

  if (isAssetPropertiesSection(section)) {
    if (!ctx.selectedSharingMethod) {
      return labels.selectSharingMethod;
    }
    if (!ctx.selectedTemplateId) {
      return labels.selectTemplate;
    }
    if (ctx.loadingTemplates || ctx.loadingTemplateDetails) {
      return labels.waitTemplateDetails;
    }
    if (ctx.templateSections.length > 0 && !ctx.templateForm.valid) {
      return labels.completeTemplateFields;
    }
  }

  return '';
};

export const markActiveStepAsTouched = (ctx: WizardValidationContext): void => {
  const section = getActiveSectionAtStep(ctx.sections, ctx.currentStepIndex);
  if (!section) {
    return;
  }

  for (const field of section.fields) {
    const control = ctx.dynamicForm.get(field.controlName);
    if (control) {
      control.markAsTouched();
      control.updateValueAndValidity();
    }
  }

  if (isAssetPropertiesSection(section)) {
    ctx.templateForm.markAllAsTouched();
    ctx.templateForm.updateValueAndValidity();
  }
};

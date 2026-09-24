import { inject, Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import type { Observable } from 'rxjs';
import type { DynamicSection } from '@eclipse-edc/dashboard-core/shacl-schema';
import { SdToolingService } from '../sdtooling.service';
import type {
  SdPolicyOptionsResult,
  SdResourceAddressTemplateSchemaResult,
  SdResourceAddressTemplateUiSchemaResult,
  SdResourceAddressTemplatesResult,
  SdSharingMethodsResult,
} from '../sdtooling.service';
import type { SchemaLoadOutcome } from './schema/sdtooling-schema-load.coordinator';
import { SdToolingSchemaLoadCoordinator } from './schema/sdtooling-schema-load.coordinator';
import {
  applyTemplateSchemaDefaults,
  applyTemplateUiSchemaToForm,
  buildTemplateFormFromSchema,
} from './template/sdtooling-template-form.builder';
import { toSharingMethodOptions, toTemplateOptions } from './template/sdtooling-template-options.mapper';
import type { SharingMethodSelectOption, TemplateSelectOption, TemplateUiControlConfig } from './sdtooling-view.types';

export interface TemplateDetailsLoaded {
  templateSchemaResult: SdResourceAddressTemplateSchemaResult;
  templateSections: DynamicSection[];
  templateForm: FormGroup;
  templateUiControlsByFieldKey: Record<string, TemplateUiControlConfig>;
}

@Injectable({ providedIn: 'root' })
export class SdToolingViewOrchestrator {
  private readonly service = inject(SdToolingService);
  private readonly schemaLoadCoordinator = inject(SdToolingSchemaLoadCoordinator);

  loadSchemaContent(schemaId: string): Observable<SchemaLoadOutcome> {
    return this.schemaLoadCoordinator.loadSchemaContent(schemaId);
  }

  loadSharingMethods(offeringType: string): Observable<SdSharingMethodsResult> {
    return this.service.sharingMethodsForOfferingType(offeringType);
  }

  loadTemplates(sharingMethodId: string, offeringType: string): Observable<SdResourceAddressTemplatesResult> {
    return this.service.resourceAddressTemplates(sharingMethodId, offeringType);
  }

  loadPolicyActions(): Observable<SdPolicyOptionsResult> {
    return this.service.accessPolicyActions();
  }

  loadIdentityAttributes(): Observable<SdPolicyOptionsResult> {
    return this.service.identityAttributes();
  }

  buildTemplateFromSchemaResult(
    result: SdResourceAddressTemplateSchemaResult,
    assetPropertiesTitle: string,
    existingUiSchema?: SdResourceAddressTemplateUiSchemaResult,
  ): TemplateDetailsLoaded {
    const built = buildTemplateFormFromSchema(result.schema, assetPropertiesTitle);
    applyTemplateSchemaDefaults(result.schema, built.sections, built.form);
    let templateSections = built.sections;
    let templateUiControlsByFieldKey: Record<string, TemplateUiControlConfig> = {};
    if (existingUiSchema) {
      const applied = applyTemplateUiSchemaToForm(existingUiSchema.uiSchema, templateSections, built.form);
      templateSections = applied.sections;
      templateUiControlsByFieldKey = applied.uiControlsByFieldKey;
    }
    return {
      templateSchemaResult: result,
      templateSections,
      templateForm: built.form,
      templateUiControlsByFieldKey,
    };
  }

  applyTemplateUiSchema(
    uiSchemaResult: SdResourceAddressTemplateUiSchemaResult,
    templateSections: DynamicSection[],
    templateForm: FormGroup,
  ): { sections: DynamicSection[]; uiControlsByFieldKey: Record<string, TemplateUiControlConfig> } {
    return applyTemplateUiSchemaToForm(uiSchemaResult.uiSchema, templateSections, templateForm);
  }

  mapSharingMethodOptions(result: SdSharingMethodsResult): SharingMethodSelectOption[] {
    return toSharingMethodOptions(result);
  }

  mapTemplateOptions(result: SdResourceAddressTemplatesResult): TemplateSelectOption[] {
    return toTemplateOptions(result);
  }
}

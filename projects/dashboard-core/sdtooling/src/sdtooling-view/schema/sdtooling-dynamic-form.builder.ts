import { FormGroup } from '@angular/forms';
import { buildDynamicSectionsFromSchema, createDynamicFormGroup } from '@eclipse-edc/dashboard-core/shacl-schema';
import type { DynamicSection } from '@eclipse-edc/dashboard-core/shacl-schema';
import { isAssetPropertiesSection } from '../template/sdtooling-asset-properties.section';

export interface DynamicFormBuildResult {
  sections: DynamicSection[];
  form: FormGroup;
  unsupported: boolean;
}

export const buildDynamicFormFromSchemaContent = (schemaContent: unknown): DynamicFormBuildResult => {
  const sections = buildDynamicSectionsFromSchema(schemaContent).map(section => {
    if (!isAssetPropertiesSection(section)) {
      return section;
    }

    const filteredFields = section.fields.filter(
      field => field.key !== 'simpl:providerDataAddress' && field.key !== 'simpl:sharingMethodId',
    );
    return {
      ...section,
      fields: filteredFields,
    };
  });

  if (!sections.length) {
    return {
      sections: [],
      form: new FormGroup({}),
      unsupported: true,
    };
  }

  return {
    sections,
    form: createDynamicFormGroup(sections),
    unsupported: false,
  };
};

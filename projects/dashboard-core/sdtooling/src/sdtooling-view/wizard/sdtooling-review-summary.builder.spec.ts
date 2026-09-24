import { FormControl, FormGroup } from '@angular/forms';
import type { DynamicSection } from '@eclipse-edc/dashboard-core/shacl-schema';
import { buildReviewSummarySections } from './sdtooling-review-summary.builder';

describe('buildReviewSummarySections', () => {
  it('includes subsection labels from SHACL property groups', () => {
    const section: DynamicSection = {
      key: 'edval:corpusAsset',
      label: 'Corpus asset',
      description: '',
      rdfType: '',
      fields: [
        {
          key: 'dct:title',
          controlName: 'edval_corpusAsset_dct_title',
          label: 'título',
          description: '',
          type: 'string',
          controlType: 'text',
          enumOptions: [],
          required: false,
          schema: {},
          groupKey: 'gax:BasicGroup',
        },
      ],
      subsections: [
        {
          key: 'gax:BasicGroup',
          label: 'Información básica',
          order: 1,
          fields: [
            {
              key: 'dct:title',
              controlName: 'edval_corpusAsset_dct_title',
              label: 'título',
              description: '',
              type: 'string',
              controlType: 'text',
              enumOptions: [],
              required: false,
              schema: {},
            },
          ],
        },
      ],
    };

    const form = new FormGroup({
      edval_corpusAsset_dct_title: new FormControl('Corpus ES'),
    });

    const sections = buildReviewSummarySections({
      sections: [section],
      dynamicForm: form,
      templateSections: [],
      templateForm: new FormGroup({}),
      policyActionOptions: [],
      policyAttributeOptions: [],
      usageTypeOptions: [],
      yesLabel: 'Yes',
      noLabel: 'No',
      resolveTemplateFieldLabel: field => field.label,
    });

    expect(sections[0].subsections?.[0].label).toBe('Información básica');
    expect(sections[0].subsections?.[0].fields[0].values).toContain('Corpus ES');
  });
});

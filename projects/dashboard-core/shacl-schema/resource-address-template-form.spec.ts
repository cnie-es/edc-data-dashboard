import { FormControl, FormGroup } from '@angular/forms';
import {
  buildResourceAddressPayload,
  buildTemplateFormFromSchema,
  wrapTemplateSchemaAsRoot,
} from './resource-address-template-form';

describe('resource-address-template-form', () => {
  it('should wrap template schema as root shape', () => {
    const wrapped = wrapTemplateSchemaAsRoot({
      title: 'Destination',
      properties: {
        baseUrl: { type: 'string' },
      },
      required: ['baseUrl'],
    }) as { root: Record<string, unknown> };

    expect(wrapped.root['simpl:TemplateShape']).toBeDefined();
  });

  it('should build form and payload from template schema', () => {
    const schema = {
      title: 'HttpData destination',
      properties: {
        type: { type: 'string', const: 'HttpData' },
        baseUrl: { type: 'string' },
      },
      required: ['baseUrl'],
    };

    const built = buildTemplateFormFromSchema(schema);
    const baseUrlField = built.sections.flatMap(section => section.fields).find(field => field.key === 'baseUrl');
    expect(baseUrlField).toBeDefined();

    built.formGroup.get(baseUrlField!.controlName)?.setValue('https://consumer.example/receive');
    const payload = buildResourceAddressPayload(built.sections, built.formGroup);
    expect(payload['baseUrl']).toBe('https://consumer.example/receive');
  });

  it('should return empty payload when form has no values', () => {
    const payload = buildResourceAddressPayload([], new FormGroup({ empty: new FormControl('') }));
    expect(payload).toEqual({});
  });
});

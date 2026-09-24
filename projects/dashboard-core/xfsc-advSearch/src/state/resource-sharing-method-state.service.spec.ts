import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { ContractConsumptionService } from '../services/contract-consumption.service';
import { ResourceSharingMethodStateService } from './resource-sharing-method-state.service';

describe('ResourceSharingMethodStateService', () => {
  let service: ResourceSharingMethodStateService;
  let contractConsumption: jasmine.SpyObj<ContractConsumptionService>;

  const eligibleDocument = {
    credentialSubject: {
      'simpl:generalServiceProperties': {
        'simpl:sharingMethodId': 'HttpData',
        'simpl:offeringType': 'DATA',
      },
    },
  };

  const templateSchema = {
    title: 'HttpData destination',
    properties: {
      type: { type: 'string', const: 'HttpData' },
      baseUrl: { type: 'string' },
    },
    required: ['baseUrl'],
  };

  const templateUiSchema = {
    type: 'VerticalLayout',
    elements: [
      { type: 'Control', scope: '#/properties/baseUrl', label: 'Base URL' },
      { type: 'Control', scope: '#/properties/type', label: 'Type', options: { readonly: true } },
    ],
  };

  beforeEach(() => {
    contractConsumption = jasmine.createSpyObj<ContractConsumptionService>('ContractConsumptionService', [
      'resourceAddressTemplates',
      'resourceAddressTemplateSchema',
      'resourceAddressTemplateUiSchema',
    ]);

    TestBed.configureTestingModule({
      providers: [
        ResourceSharingMethodStateService,
        { provide: ContractConsumptionService, useValue: contractConsumption },
      ],
    });

    service = TestBed.inject(ResourceSharingMethodStateService);
  });

  it('should not be ready before template form is validated', fakeAsync(() => {
    contractConsumption.resourceAddressTemplates.and.returnValue(
      of([{ value: 'HttpData-PUSH', label: 'HttpData-PUSH' }]),
    );

    service.initialize(eligibleDocument);
    tick();
    expect(service.isResourceAddressReady).toBeFalse();
    expect(service.sharingMethodId).toBe('HttpData');
    expect(service.offeringType).toBe('DATA');
  }));

  it('should become ready when template schema form is valid', fakeAsync(() => {
    contractConsumption.resourceAddressTemplates.and.returnValue(
      of([{ value: 'HttpData-PUSH', label: 'HttpData-PUSH' }]),
    );
    contractConsumption.resourceAddressTemplateSchema.and.returnValue(of(templateSchema));
    contractConsumption.resourceAddressTemplateUiSchema.and.returnValue(of(templateUiSchema));

    service.initialize(eligibleDocument);
    tick();
    service.selectTemplate('HttpData-PUSH');
    tick();

    const baseUrlField = service.templateSections
      .flatMap(section => section.fields)
      .find(field => field.key === 'baseUrl');
    expect(baseUrlField).toBeDefined();
    service.templateForm.get(baseUrlField!.controlName)?.setValue('https://consumer.example/receive');
    service.templateForm.get(baseUrlField!.controlName)?.markAsDirty();
    service.templateForm.updateValueAndValidity();

    expect(service.isResourceAddressReady).toBeTrue();
    expect(service.resourceAddress).toEqual(
      jasmine.objectContaining({
        baseUrl: 'https://consumer.example/receive',
      }),
    );
  }));

  it('should use template schema const for type instead of sharingMethodId from SD', fakeAsync(() => {
    const minioDocument = {
      credentialSubject: {
        'simpl:generalServiceProperties': {
          'simpl:sharingMethodId': 'MINIO_S3',
          'simpl:offeringType': 'DATA',
        },
      },
    };
    const minioTemplateSchema = {
      title: 'Minio destination',
      properties: {
        type: { type: 'string', const: 'MinioS3' },
        endpoint: { type: 'string' },
        bucketName: { type: 'string' },
        objectName: { type: 'string' },
      },
      required: ['endpoint', 'bucketName', 'objectName'],
    };

    contractConsumption.resourceAddressTemplates.and.returnValue(of([{ value: '5', label: 'Data Template MinioS3' }]));
    contractConsumption.resourceAddressTemplateSchema.and.returnValue(of(minioTemplateSchema));
    contractConsumption.resourceAddressTemplateUiSchema.and.returnValue(of(templateUiSchema));

    service.initialize(minioDocument);
    tick();
    service.selectTemplate('5');
    tick();

    const typeField = service.templateSections.flatMap(section => section.fields).find(field => field.key === 'type');
    expect(typeField).toBeDefined();
    expect(service.templateForm.get(typeField!.controlName)?.value).toBe('MinioS3');

    for (const key of ['endpoint', 'bucketName', 'objectName'] as const) {
      const field = service.templateSections.flatMap(section => section.fields).find(f => f.key === key);
      service.templateForm.get(field!.controlName)?.setValue(`value-${key}`);
    }
    service.templateForm.updateValueAndValidity();

    expect(service.resourceAddress?.['type']).toBe('MinioS3');
    expect(service.resourceAddress?.['type']).not.toBe('MINIO_S3');
  }));

  it('should set templates error when sharing parameters are missing', () => {
    service.initialize({ credentialSubject: {} });
    expect(service.templatesError).toBeTruthy();
    expect(service.templateOptions).toEqual([]);
  });
});

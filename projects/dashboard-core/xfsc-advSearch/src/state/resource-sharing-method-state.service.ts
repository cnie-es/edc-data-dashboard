import { Injectable, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { forkJoin, Subject, Subscription } from 'rxjs';
import {
  buildResourceAddressPayload,
  buildTemplateFormFromSchema,
  type DynamicSection,
  type TemplateUiControlConfig,
} from '@eclipse-edc/dashboard-core/shacl-schema';
import { ContractConsumptionService } from '../services/contract-consumption.service';
import { getResourceSharingParams } from '../services/resource-sharing.util';
import type { UiError } from '../types/contract-negotiation.model';

export interface TemplateSelectOption {
  value: string;
  label: string;
}

@Injectable({
  providedIn: 'root',
})
export class ResourceSharingMethodStateService {
  private readonly contractConsumption = inject(ContractConsumptionService);
  private subscriptions = new Subscription();
  private loadRequestId = 0;
  private readonly refreshSubject = new Subject<void>();
  readonly refresh$ = this.refreshSubject.asObservable();

  sharingMethodId = '';
  offeringType = '';
  templateOptions: TemplateSelectOption[] = [];
  isTemplatesLoading = false;
  templatesError: UiError | null = null;

  selectedTemplate = '';
  isSchemasLoading = false;
  schemaError: UiError | null = null;
  hasSchemaLoaded = false;
  hasUiSchemaLoaded = false;

  templateSections: DynamicSection[] = [];
  templateForm = new FormGroup({});
  templateUiControlsByFieldKey: Record<string, TemplateUiControlConfig> = {};

  isFormValidated = false;
  private _resourceAddress: Record<string, unknown> | null = null;

  get resourceAddress(): Record<string, unknown> | null {
    return this._resourceAddress;
  }

  get isResourceAddressFormValid(): boolean {
    return this.templateForm.valid;
  }

  // Modificar get isResourceAddressReady:
  get isResourceAddressReady(): boolean {
    return (
      this.isFormValidated &&
      this.hasSchemaLoaded &&
      this.hasUiSchemaLoaded &&
      !!this.selectedTemplate &&
      this._resourceAddress !== null && // 🔁 Solo que no sea null
      this.isResourceAddressFormValid
    );
  }

  initialize(resourceDescriptionDocument: unknown): void {
    this.resetResourceSharingMethodState();
    const params = getResourceSharingParams(resourceDescriptionDocument);
    if (!params) {
      this.templatesError = {
        title: 'Missing parameters from resource description',
        description:
          'The following parameters are missing from the resource description: sharingMethodId, offeringType',
      };
      this.emitRefresh();
      return;
    }

    this.sharingMethodId = params.sharingMethodId;
    this.offeringType = params.offeringType;
    this.loadTemplates();
  }

  selectTemplate(templateId: string): void {
    this.selectedTemplate = templateId;
    this.isFormValidated = false;
    this._resourceAddress = null;
    this.clearTemplateForm();

    if (!templateId) {
      return;
    }

    const requestId = ++this.loadRequestId;
    this.isSchemasLoading = true;
    this.schemaError = null;
    this.hasSchemaLoaded = false;
    this.hasUiSchemaLoaded = false;

    const schema$ = this.contractConsumption.resourceAddressTemplateSchema(templateId);
    const uiSchema$ = this.contractConsumption.resourceAddressTemplateUiSchema(templateId);

    this.subscriptions.add(
      forkJoin({ schema: schema$, uiSchema: uiSchema$ }).subscribe({
        next: ({ schema, uiSchema }) => {
          if (requestId !== this.loadRequestId) {
            return;
          }
          this.hasSchemaLoaded = true;
          this.hasUiSchemaLoaded = true;
          const built = buildTemplateFormFromSchema(schema, uiSchema);
          this.templateSections = built.sections;
          this.templateForm = built.formGroup;
          this.templateUiControlsByFieldKey = built.uiControlsByFieldKey;

          this.templateForm.updateValueAndValidity({ emitEvent: false });
          this.isFormValidated = true;
          this.updateResourceAddressFromForm(); // llama a emitRefresh

          this.bindFormValidation();
          this.isSchemasLoading = false;
          this.emitRefresh();
        },
        error: () => {
          if (requestId !== this.loadRequestId) {
            return;
          }
          this.schemaError = {
            title: 'Template schema error',
            description: "We couldn't load template schema details.",
          };
          this.isSchemasLoading = false;
          this.emitRefresh();
        },
      }),
    );
  }

  getTemplateFieldLabel(fieldKey: string, fallback: string): string {
    return this.templateUiControlsByFieldKey[fieldKey]?.label ?? fallback;
  }

  isTemplateFieldReadonly(fieldKey: string): boolean {
    return this.templateUiControlsByFieldKey[fieldKey]?.readonly === true;
  }

  getTemplateFieldInputType(fieldKey: string): string {
    return this.templateUiControlsByFieldKey[fieldKey]?.inputType === 'password' ? 'password' : 'text';
  }

  resetResourceSharingMethodState(): void {
    this.loadRequestId++;
    this.subscriptions.unsubscribe();
    this.subscriptions = new Subscription();

    this.sharingMethodId = '';
    this.offeringType = '';
    this.templateOptions = [];
    this.isTemplatesLoading = false;
    this.templatesError = null;

    this.selectedTemplate = '';
    this.isSchemasLoading = false;
    this.schemaError = null;
    this.hasSchemaLoaded = false;
    this.hasUiSchemaLoaded = false;

    this.clearTemplateForm();
    this.isFormValidated = false;
    this._resourceAddress = null;
  }

  private loadTemplates(): void {
    if (!this.sharingMethodId || !this.offeringType) {
      return;
    }

    const requestId = ++this.loadRequestId;
    this.isTemplatesLoading = true;
    this.templatesError = null;
    this.templateOptions = [];

    this.subscriptions.add(
      this.contractConsumption.resourceAddressTemplates(this.sharingMethodId, this.offeringType).subscribe({
        next: templateOptions => {
          if (requestId !== this.loadRequestId) {
            return;
          }
          this.templateOptions = templateOptions;
          this.isTemplatesLoading = false;
          if (templateOptions.length === 1) {
            this.selectTemplate(templateOptions[0].value);
          }
          this.emitRefresh();
        },
        error: () => {
          if (requestId !== this.loadRequestId) {
            return;
          }
          this.templatesError = {
            title: 'Templates error',
            description: "We couldn't load templates for this sharing method.",
          };
          this.isTemplatesLoading = false;
          this.emitRefresh();
        },
      }),
    );
  }

  private emitRefresh(): void {
    this.refreshSubject.next();
  }

  private bindFormValidation(): void {
    this.subscriptions.add(
      this.templateForm.valueChanges.subscribe(() => {
        this.isFormValidated = true;
        this.updateResourceAddressFromForm();
      }),
    );
    this.subscriptions.add(
      this.templateForm.statusChanges.subscribe(() => {
        this.isFormValidated = true;
        this.updateResourceAddressFromForm();
      }),
    );
  }

  private updateResourceAddressFromForm(): void {
    if (!this.templateForm.valid) {
      this._resourceAddress = null;
      return;
    }
    const payload = buildResourceAddressPayload(this.templateSections, this.templateForm);
    this._resourceAddress = Object.keys(payload).length > 0 ? payload : {};
    this.emitRefresh();
  }

  private clearTemplateForm(): void {
    this.templateSections = [];
    this.templateUiControlsByFieldKey = {};
    this.templateForm = new FormGroup({});
  }
}

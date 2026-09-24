import { NgClass } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, firstValueFrom, take } from 'rxjs';
import {
  BreadcrumbsComponent,
  type BreadcrumbItem,
  DASHBOARD_RUNTIME_FEATURE_FLAGS,
  DashboardStateService,
  ModalAndAlertService,
  OFFER_CREATION_PENDING_SCHEMA_STORAGE_KEY,
  offerCreateUnavailableToastKey,
  remapOfferCreateSchemaId,
  resolveDashboardLang,
  SdMatchedAssetsWarmupService,
  useSdWarmupMock,
  type DashboardLang,
  type EdcConfig,
} from '@eclipse-edc/dashboard-core';
import {
  createEmptyPolicyCard,
  hasPolicyCardFieldError,
  isAccessPolicyField,
  isUsagePolicyField,
  resolveDynamicFieldError,
} from '@eclipse-edc/dashboard-core/shacl-schema';
import type {
  DynamicField,
  DynamicSection,
  NestedFieldError,
  PolicyCardErrorKey,
  PolicyCardValue,
} from '@eclipse-edc/dashboard-core/shacl-schema';
import { SdToolingService } from '../sdtooling.service';
import type {
  SdPolicyOptionsResult,
  SdResourceAddressTemplateSchemaResult,
  SdResourceAddressTemplateUiSchemaResult,
  SdSchemaContentResult,
  SdSharingMethodsResult,
} from '../sdtooling.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  addArrayTokenValue,
  addPolicyCardValue,
  getPolicyCardTitle,
  getPolicyCardsValue,
  parseArrayTokens,
  removeArrayTokenValue,
  removePolicyCardValue,
  updatePolicyCardValue,
} from './form-state/sdtooling-view.form-state';
import { applyArrayTokensToControl, applyControlValue } from './form-state/sdtooling-form-control.mutations';
import { SdtoolingObjectArrayItemFieldsComponent } from './form-state/sdtooling-object-array-item-fields.component';
import {
  addObjectArrayItemForField,
  canRemoveObjectArrayItem,
  getArrayMaxItems,
  getObjectArrayItemsFromValue,
  hasReachedObjectArrayMax,
  removeObjectArrayItemAt,
  replaceObjectArrayItemAt,
} from './form-state/sdtooling-object-array.state';
import { applyOfferPendingSchemaSelection } from './offer-flow/sdtooling-offer-pending-schema';
import {
  buildServiceSchemaOptions,
  resolveSelectedOfferingType,
  resolveSelectedSchemaOption,
} from './schema/sdtooling-schema-options.mapper';
import { SdToolingViewOrchestrator } from './sdtooling-view.orchestrator';
import { formatSubmissionError } from './submit/sdtooling-publication.mapper';
import { SdToolingSubmissionPipeline } from './submit/sdtooling-submission.pipeline';
import { hasAssetPropertiesSection, isAssetPropertiesSection } from './template/sdtooling-asset-properties.section';
import { buildTemplatePayloadForSubmission } from './template/sdtooling-template-form.builder';
import {
  getTemplateFieldInputType,
  getTemplateFieldLabel,
  isTemplateFieldReadonly,
} from './template/sdtooling-template-ui-schema';
import { buildReviewSummarySections } from './wizard/sdtooling-review-summary.builder';
import { getDisplaySubsections } from './wizard/sdtooling-section-display';
import { buildWizardSteps, getActiveSectionAtStep, isSummaryStepIndex } from './wizard/sdtooling-wizard.steps';
import {
  canMoveForwardFromCurrentStep,
  canOpenStep,
  getNextStepBlockReason,
  markActiveStepAsTouched,
  type WizardValidationContext,
} from './wizard/sdtooling-wizard.validation';
import type { ExtendedJsonSchema4 } from '../util/formatDataToJsonLd';
import {
  OFFER_PAGE_TITLE_KEY_BY_SCHEMA_ID,
  USAGE_TYPE_DELETION_AFTER_USAGE,
  USAGE_TYPE_RESTRICTED_DURATION,
  USAGE_TYPE_RESTRICTED_NUMBER,
  type PolicySelectOption,
  type ServiceSchemaOption,
  type SharingMethodSelectOption,
  type TemplateSelectOption,
  type TemplateUiControlConfig,
  type WizardStep,
} from './sdtooling-view.types';

@Component({
  selector: 'lib-sdtooling-view',
  standalone: true,
  imports: [
    NgClass,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    BreadcrumbsComponent,
    SdtoolingObjectArrayItemFieldsComponent,
  ],
  templateUrl: './sdtooling-view.component.html',
  styleUrl: './sdtooling-view.component.css',
})
export class SdToolingViewComponent {
  readonly getDisplaySubsections = getDisplaySubsections;

  readonly breadcrumbItems: BreadcrumbItem[] = [
    { label: 'menu.home', route: '/home' },
    { label: 'menu.offers', route: '/contract-definitions' },
    { label: 'offers.create' },
  ];

  private readonly service = inject(SdToolingService);
  private readonly orchestrator = inject(SdToolingViewOrchestrator);
  private readonly submissionPipeline = inject(SdToolingSubmissionPipeline);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly runtimeFlags = inject(DASHBOARD_RUNTIME_FEATURE_FLAGS);
  private readonly modalAndAlert = inject(ModalAndAlertService);
  private readonly sdMatchedAssetsWarmup = inject(SdMatchedAssetsWarmupService);
  private readonly dashboardState = inject(DashboardStateService);
  private readonly translate = inject(TranslateService);
  serviceSchemaOptions: ServiceSchemaOption[] = [];
  authMode = this.runtimeFlags.authMode;
  selectedSchema = '';
  private selectedSchemaOption?: ServiceSchemaOption;
  loadingSchemas = true;
  loadingSchemaDetails = false;
  schemasError = '';
  detailsError = '';
  schemaContentResult?: SdSchemaContentResult;
  sharingMethodsResult?: SdSharingMethodsResult;
  selectedSharingMethod = '';
  selectedTemplateId = '';
  sharingMethodOptions: SharingMethodSelectOption[] = [];
  templateOptions: TemplateSelectOption[] = [];
  loadingTemplates = false;
  templateError = '';
  loadingTemplateDetails = false;
  templateSchemaResult?: SdResourceAddressTemplateSchemaResult;
  templateUiSchemaResult?: SdResourceAddressTemplateUiSchemaResult;
  templateSections: DynamicSection[] = [];
  templateUiControlsByFieldKey: Record<string, TemplateUiControlConfig> = {};
  templateForm = new FormGroup({});
  dynamicForm = new FormGroup({});
  sections: DynamicSection[] = [];
  arrayDraftByControl: Record<string, string> = {};
  policyActionOptions: PolicySelectOption[] = [];
  policyAttributeOptions: PolicySelectOption[] = [];
  usageTypeOptions: PolicySelectOption[] = [];
  policyActionsResult?: SdPolicyOptionsResult;
  policyAttributesResult?: SdPolicyOptionsResult;

  submitLoading = false;
  submissionError = '';
  submissionPublishedId = '';
  currentStepIndex = 0;
  /** Label from offer-type selection (sessionStorage), kept after storage is cleared. */
  private pendingOfferLabel = '';
  private readonly TEMPLATE_FORM_STATE_STORAGE_KEY = 'sdtooling-template-form-state';
  private lastLoadedTemplateId = '';

  private currentFormSchema?: ExtendedJsonSchema4;
  private currentSchemaPrefixes: Record<string, string> = {};
  private schemaRequestId = 0;

  constructor() {
    (window as unknown as { debugDynamicForm: FormGroup }).debugDynamicForm = this.dynamicForm;
    this.usageTypeOptions = [
      { label: this.translate.instant('sdtooling.usageDeletionAfter'), value: USAGE_TYPE_DELETION_AFTER_USAGE },
      { label: this.translate.instant('sdtooling.usageRestrictedNumber'), value: USAGE_TYPE_RESTRICTED_NUMBER },
      { label: this.translate.instant('sdtooling.usageRestrictedDuration'), value: USAGE_TYPE_RESTRICTED_DURATION },
    ];

    this.service
      .allSchemas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: schemas => {
          this.serviceSchemaOptions = buildServiceSchemaOptions(schemas.Service ?? []);
          this.loadingSchemas = false;
          const schemaId = this.route.snapshot.queryParamMap.get('schemaId')?.trim();
          if (!schemaId) {
            void this.router.navigate(['/contract-definitions/new']);
            return;
          }
          this.applyPendingSchemaSelectionFromRoute();
        },
        error: () => {
          this.loadingSchemas = false;
          this.schemasError = this.translate.instant('sdtooling.errors.schemasLoad');
        },
      });

    this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
      this.syncOfferSchemaToLang(resolveDashboardLang(event.lang));
    });
  }

  get breadcrumbItemsTranslated(): BreadcrumbItem[] {
    return this.breadcrumbItems.map(item => ({
      ...item,
      label: this.translate.instant(item.label),
    }));
  }

  /** Corpus, lexical resource, model, or service label for the selected offer schema. */
  get offerTypeLabel(): string {
    const schemaId = this.selectedSchema.trim() || this.route.snapshot.queryParamMap.get('schemaId')?.trim() || '';
    const titleKey = OFFER_PAGE_TITLE_KEY_BY_SCHEMA_ID[schemaId];
    if (titleKey) {
      return this.translate.instant(titleKey);
    }
    const schemaLabel = this.getSelectedSchemaLabel().trim();
    if (schemaLabel.length > 0) {
      return schemaLabel;
    }
    if (this.pendingOfferLabel.length > 0) {
      return this.pendingOfferLabel;
    }
    return this.translate.instant('offers.create');
  }

  get offerTypeHeading(): string {
    return this.translate.instant('sdtooling.offerTypeHeading', { type: this.offerTypeLabel });
  }
  private debugSelectField(field: DynamicField): void {
    const controlName = field.controlName;
    const control = this.dynamicForm.get(controlName);
    if (!control) return;

    // Log inicial
    // console.log(`[SELECT DEBUG] Campo: ${controlName}, Label: ${field.label}`);
    // console.log(`  - Valor actual del control:`, control.value);
    // console.log(`  - enumOptions:`, field.enumOptions);
    // console.log(
    //   `  - ¿Opción seleccionada está incluida?`,
    //   field.enumOptions?.some(opt => String(opt) === String(control.value)),
    // );

    // Suscribirse a cambios futuros
  }
  compareSelectValues(optionValue: unknown, controlValue: unknown): boolean {
    // Convierte ambos valores a string para una comparación flexible
    return String(optionValue) === String(controlValue);
  }

  isStepCircleReached(index: number): boolean {
    return index <= this.currentStepIndex;
  }

  onSchemaSelected(): void {
    const requestId = ++this.schemaRequestId;
    this.resetFormState();

    if (!this.selectedSchema) {
      this.selectedSchemaOption = undefined;
      return;
    }

    this.selectedSchemaOption = resolveSelectedSchemaOption(this.serviceSchemaOptions, this.selectedSchema);
    if (!this.selectedSchemaOption) {
      this.detailsError = this.translate.instant('sdtooling.errors.invalidResourceType');
      return;
    }
    this.loadingSchemaDetails = true;
    this.loadSchemaContent(requestId);
    this.loadSharingMethods(requestId);
    this.loadPolicyActions(requestId);
    this.loadIdentityAttributes(requestId);
  }

  get steps(): WizardStep[] {
    return buildWizardSteps(this.sections, {
      summary: this.translate.instant('sdtooling.stepSummary'),
      summaryDesc: this.translate.instant('sdtooling.stepSummaryDesc'),
      fillSection: section => this.translate.instant('sdtooling.stepFillSection', { section }),
    });
  }

  goToStep(index: number): void {
    if (Number.isNaN(index)) {
      return;
    }
    const clamped = Math.max(0, Math.min(index, this.steps.length - 1));
    if (clamped > this.currentStepIndex && !canOpenStep(this.wizardContext, clamped)) {
      markActiveStepAsTouched(this.wizardContext);
      return;
    }
    const previousIndex = this.currentStepIndex;
    if (previousIndex !== clamped) {
      this.saveTemplateFormState();
    }
    this.currentStepIndex = clamped;
    if (previousIndex !== clamped) {
      this.restoreTemplateFormState();
      this.scrollToActiveStepContent();
    }
  }

  nextStep(): void {
    if (!this.canGoNextStep()) {
      markActiveStepAsTouched(this.wizardContext);
      return;
    }
    this.goToStep(this.currentStepIndex + 1);
  }

  previousStep(): void {
    this.goToStep(this.currentStepIndex - 1);
  }

  isStepActive(index: number): boolean {
    return this.currentStepIndex === index;
  }

  isStepCompleted(index: number): boolean {
    return index < this.currentStepIndex;
  }

  isSummaryStep(): boolean {
    return isSummaryStepIndex(this.sections.length, this.currentStepIndex);
  }

  getActiveSection(): DynamicSection | undefined {
    return getActiveSectionAtStep(this.sections, this.currentStepIndex);
  }

  canGoNextStep(): boolean {
    return this.currentStepIndex < this.steps.length - 1 && canMoveForwardFromCurrentStep(this.wizardContext);
  }

  isStepButtonDisabled(index: number): boolean {
    return index > this.currentStepIndex && !canOpenStep(this.wizardContext, index);
  }

  getNextStepBlockReason(): string {
    return getNextStepBlockReason(this.wizardContext, {
      selectSchema: this.translate.instant('sdtooling.blockReason.selectSchema'),
      waitSchemaDetails: this.translate.instant('sdtooling.blockReason.waitSchemaDetails'),
      completeSection: section => this.translate.instant('sdtooling.blockReason.completeSection', { section }),
      selectSharingMethod: this.translate.instant('sdtooling.blockReason.selectSharingMethod'),
      selectTemplate: this.translate.instant('sdtooling.blockReason.selectTemplate'),
      waitTemplateDetails: this.translate.instant('sdtooling.blockReason.waitTemplateDetails'),
      completeTemplateFields: this.translate.instant('sdtooling.blockReason.completeTemplateFields'),
    });
  }

  getSelectedSchemaLabel(): string {
    const selected =
      this.selectedSchemaOption ?? resolveSelectedSchemaOption(this.serviceSchemaOptions, this.selectedSchema);
    return selected?.label ?? this.selectedSchema;
  }

  getSelectedSharingMethodLabel(): string {
    const selected = this.sharingMethodOptions.find(option => option.value === this.selectedSharingMethod);
    return selected?.label ?? this.selectedSharingMethod;
  }

  getSelectedTemplateLabel(): string {
    const selected = this.templateOptions.find(option => option.value === this.selectedTemplateId);
    return selected?.label ?? this.selectedTemplateId;
  }

  getReviewSummarySections() {
    return buildReviewSummarySections({
      sections: this.sections,
      dynamicForm: this.dynamicForm,
      templateSections: this.templateSections,
      templateForm: this.templateForm,
      policyActionOptions: this.policyActionOptions,
      policyAttributeOptions: this.policyAttributeOptions,
      usageTypeOptions: this.usageTypeOptions,
      yesLabel: this.translate.instant('sdtooling.yes'),
      noLabel: this.translate.instant('sdtooling.no'),
      resolveTemplateFieldLabel: field => this.getTemplateFieldLabel(field),
    });
  }

  isFieldInvalid(field: DynamicField): boolean {
    const control = this.dynamicForm.get(field.controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  isTemplateFieldInvalid(field: DynamicField): boolean {
    const control = this.templateForm.get(field.controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  getFieldError(field: DynamicField): string {
    return resolveDynamicFieldError(field, this.dynamicForm.get(field.controlName)?.errors ?? null, this.translate);
  }

  onDynamicFieldValueChange(field: DynamicField, value: unknown): void {
    applyControlValue(this.dynamicForm, field.controlName, value);
    this.enforceKnownSparqlUiConstraints();
  }

  getFieldEnumOptions(field: DynamicField): string[] {
    if (this.fieldKeyMatches(field, 'ms:sensitiveDataIncluded') && this.isPersonalDataNoOrUnknown()) {
      return field.enumOptions.filter(option => this.localName(option) !== 'yesS');
    }
    return field.enumOptions;
  }

  isSelectMultipleField(field: DynamicField): boolean {
    return this.getFieldControlType(field) === 'select-multiple';
  }

  isMultiSelectOptionSelected(field: DynamicField, option: string, form: FormGroup): boolean {
    const value = form.get(field.controlName)?.value;
    if (!Array.isArray(value)) {
      return false;
    }
    return value.some(item => String(item) === String(option));
  }

  onMultiSelectOptionChange(field: DynamicField, option: string, checked: boolean, form: FormGroup): void {
    const currentValues = Array.isArray(form.get(field.controlName)?.value) ? form.get(field.controlName)?.value : [];
    const nextValues = checked
      ? [...new Set([...(currentValues as string[]), option])]
      : (currentValues as string[]).filter(item => String(item) !== String(option));

    applyControlValue(form, field.controlName, nextValues);
    if (form === this.dynamicForm) {
      this.enforceKnownSparqlUiConstraints();
    }
  }

  private getFieldControlType(field: DynamicField): string {
    return (field as DynamicField & { controlType: string }).controlType;
  }

  isDynamicFieldDisabled(field: DynamicField): boolean {
    return (
      this.isPersonalDataNoOrUnknown() &&
      (this.fieldKeyMatches(field, 'dpv:hasTechnicalOrganisationalMeasure') ||
        this.fieldKeyMatches(field, 'ms:dataProtectionPrincipleApplied'))
    );
  }

  shouldShowObjectArrayErrors(field: DynamicField): boolean {
    const control = this.dynamicForm.get(field.controlName);
    return !!control && (control.dirty || control.touched);
  }

  getObjectArrayNestedFieldErrors(field: DynamicField): NestedFieldError[] {
    const errors = this.dynamicForm.get(field.controlName)?.errors;
    if (!errors || !Array.isArray(errors['nestedFieldErrors'])) {
      return [];
    }
    return errors['nestedFieldErrors'] as NestedFieldError[];
  }

  getTemplateFieldError(field: DynamicField): string {
    return resolveDynamicFieldError(field, this.templateForm.get(field.controlName)?.errors ?? null, this.translate);
  }

  isPolicyCardField(field: DynamicField): boolean {
    return (field as DynamicField & { controlType: string }).controlType === 'policy-card-array';
  }

  isUsagePolicyCardField(field: DynamicField): boolean {
    return isUsagePolicyField(field.key);
  }

  isAccessPolicyCardField(field: DynamicField): boolean {
    return isAccessPolicyField(field.key);
  }

  isRestrictedNumberUsage(card: PolicyCardValue): boolean {
    return card.usageType === USAGE_TYPE_RESTRICTED_NUMBER;
  }

  isRestrictedDurationUsage(card: PolicyCardValue): boolean {
    return card.usageType === USAGE_TYPE_RESTRICTED_DURATION;
  }

  getPolicyCards(field: DynamicField): PolicyCardValue[] {
    return getPolicyCardsValue(this.dynamicForm.get(field.controlName)?.value, createEmptyPolicyCard);
  }

  addPolicyCard(field: DynamicField): void {
    const value = this.dynamicForm.get(field.controlName)?.value;
    applyControlValue(this.dynamicForm, field.controlName, addPolicyCardValue(value, createEmptyPolicyCard));
  }

  removePolicyCard(field: DynamicField, index: number): void {
    const value = this.dynamicForm.get(field.controlName)?.value;
    applyControlValue(this.dynamicForm, field.controlName, removePolicyCardValue(value, index, createEmptyPolicyCard));
  }

  canRemovePolicyCard(field: DynamicField): boolean {
    return this.getPolicyCards(field).length > 1;
  }

  onPolicyCardValueChange(field: DynamicField, index: number, key: keyof PolicyCardValue, value: string): void {
    const rawValue = this.dynamicForm.get(field.controlName)?.value;
    applyControlValue(
      this.dynamicForm,
      field.controlName,
      updatePolicyCardValue(rawValue, index, key, value, createEmptyPolicyCard, this.isUsagePolicyCardField(field)),
    );
  }

  getPolicyCardTitle(index: number): string {
    return getPolicyCardTitle(index);
  }

  hasPolicyCardFieldError(field: DynamicField, index: number, key: PolicyCardErrorKey): boolean {
    if (!this.isFieldInvalid(field)) {
      return false;
    }
    return hasPolicyCardFieldError(this.dynamicForm.get(field.controlName)?.errors ?? null, index, key);
  }

  getArrayTokens(field: DynamicField): string[] {
    return parseArrayTokens(this.dynamicForm.get(field.controlName)?.value);
  }

  getArrayDraft(field: DynamicField): string {
    return this.arrayDraftByControl[field.controlName] ?? '';
  }

  setArrayDraft(field: DynamicField, value: string): void {
    this.arrayDraftByControl[field.controlName] = value;
  }

  addArrayToken(field: DynamicField): void {
    if (this.isDynamicFieldDisabled(field) || this.hasReachedArrayMax(field)) {
      return;
    }
    const rawValue = this.dynamicForm.get(field.controlName)?.value;
    const tokens = addArrayTokenValue(rawValue, this.getArrayDraft(field));
    if (tokens.length === this.getArrayTokens(field).length) {
      return;
    }
    applyArrayTokensToControl(this.dynamicForm, field.controlName, tokens);
    this.arrayDraftByControl[field.controlName] = '';
  }

  removeArrayToken(field: DynamicField, index: number): void {
    const rawValue = this.dynamicForm.get(field.controlName)?.value;
    applyArrayTokensToControl(this.dynamicForm, field.controlName, removeArrayTokenValue(rawValue, index));
  }

  getObjectArrayItems(field: DynamicField): Record<string, unknown>[] {
    return getObjectArrayItemsFromValue(this.dynamicForm.get(field.controlName)?.value);
  }

  addObjectArrayItem(field: DynamicField): void {
    const items = this.getObjectArrayItems(field);
    if (this.isDynamicFieldDisabled(field) || this.hasReachedObjectArrayMax(field)) {
      return;
    }
    applyControlValue(this.dynamicForm, field.controlName, addObjectArrayItemForField(items, field));
  }

  removeObjectArrayItem(field: DynamicField, index: number): void {
    applyControlValue(
      this.dynamicForm,
      field.controlName,
      removeObjectArrayItemAt(this.getObjectArrayItems(field), index),
    );
  }

  onObjectArrayRowChange(field: DynamicField, index: number, row: Record<string, unknown>): void {
    applyControlValue(
      this.dynamicForm,
      field.controlName,
      replaceObjectArrayItemAt(this.getObjectArrayItems(field), index, row),
    );
  }

  hasReachedObjectArrayMax(field: DynamicField): boolean {
    if (this.fieldKeyMatches(field, 'ms:language') && this.isLingualityType('monolingual')) {
      return this.getObjectArrayItems(field).length >= 1;
    }
    return hasReachedObjectArrayMax(this.getObjectArrayItems(field), field);
  }

  canRemoveObjectArrayItem(field: DynamicField): boolean {
    return canRemoveObjectArrayItem(this.getObjectArrayItems(field), field);
  }

  onArrayDraftKeydown(event: KeyboardEvent, field: DynamicField): void {
    if (event.key !== 'Enter' && event.key !== ',') {
      return;
    }
    event.preventDefault();
    this.addArrayToken(field);
  }

  hasReachedArrayMax(field: DynamicField): boolean {
    if (this.fieldKeyMatches(field, 'ms:language') && this.isLingualityType('monolingual')) {
      return this.getArrayTokens(field).length >= 1;
    }
    const maxItems = getArrayMaxItems(field);
    if (maxItems === undefined) {
      return false;
    }
    return this.getArrayTokens(field).length >= maxItems;
  }

  private enforceKnownSparqlUiConstraints(): void {
    const languageField = this.findDynamicField('ms:language');
    if (languageField && this.isLingualityType('monolingual')) {
      if (languageField.controlType === 'object-array') {
        const items = this.getObjectArrayItems(languageField);
        if (items.length > 1) {
          applyControlValue(this.dynamicForm, languageField.controlName, items.slice(0, 1));
        }
      } else if (languageField.controlType === 'array') {
        const tokens = this.getArrayTokens(languageField);
        if (tokens.length > 1) {
          applyArrayTokensToControl(this.dynamicForm, languageField.controlName, tokens.slice(0, 1));
        }
      }
    }

    const sensitiveField = this.findDynamicField('ms:sensitiveDataIncluded');
    if (sensitiveField && this.isPersonalDataNoOrUnknown()) {
      const value = this.dynamicForm.get(sensitiveField.controlName)?.value;
      if (this.localName(String(value ?? '')) === 'yesS') {
        applyControlValue(this.dynamicForm, sensitiveField.controlName, '');
      }
    }

    if (this.isPersonalDataNoOrUnknown()) {
      this.clearFieldIfPresent('dpv:hasTechnicalOrganisationalMeasure');
      this.clearFieldIfPresent('ms:dataProtectionPrincipleApplied');
    }

    this.dynamicForm.updateValueAndValidity({ emitEvent: false });
  }

  private clearFieldIfPresent(fieldKey: string): void {
    const field = this.findDynamicField(fieldKey);
    if (!field) {
      return;
    }
    const control = this.dynamicForm.get(field.controlName);
    if (!control || this.isEmptyUiValue(control.value)) {
      return;
    }
    applyControlValue(this.dynamicForm, field.controlName, field.controlType === 'object-array' ? [] : '');
  }

  private isPersonalDataNoOrUnknown(): boolean {
    const value = this.getDynamicFieldValue('ms:personalDataIncluded');
    const localValue = this.localName(String(value ?? ''));
    return localValue === 'noP' || localValue === 'unknownP';
  }

  private isLingualityType(expectedLocalName: string): boolean {
    const value = this.getDynamicFieldValue('ms:lingualityType');
    return this.localName(String(value ?? '')) === expectedLocalName;
  }

  private getDynamicFieldValue(fieldKey: string): unknown {
    const field = this.findDynamicField(fieldKey);
    return field ? this.dynamicForm.get(field.controlName)?.value : undefined;
  }

  private findDynamicField(fieldKey: string): DynamicField | undefined {
    return this.sections.flatMap(section => section.fields).find(field => this.fieldKeyMatches(field, fieldKey));
  }

  private fieldKeyMatches(field: DynamicField, fieldKey: string): boolean {
    return field.key === fieldKey || this.localName(field.key) === this.localName(fieldKey);
  }

  private localName(value: string): string {
    const hashIndex = value.lastIndexOf('#');
    const slashIndex = value.lastIndexOf('/');
    const colonIndex = value.lastIndexOf(':');
    const index = Math.max(hashIndex, slashIndex, colonIndex);
    return index >= 0 ? value.substring(index + 1) : value;
  }

  private isEmptyUiValue(value: unknown): boolean {
    if (value === null || value === undefined) {
      return true;
    }
    if (typeof value === 'string') {
      return value.trim().length === 0;
    }
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    return false;
  }

  onSharingMethodChanged(): void {
    this.templateError = '';
    this.selectedTemplateId = '';
    this.lastLoadedTemplateId = '';
    this.templateOptions = [];
    this.clearTemplateDetails();

    if (!this.selectedSharingMethod || !this.sharingMethodsResult?.offeringType) {
      return;
    }
    this.loadTemplatesForSharingMethod(this.selectedSharingMethod, this.sharingMethodsResult.offeringType);
  }

  onTemplateChanged(): void {
    this.templateError = '';
    if (!this.selectedTemplateId) {
      this.clearTemplateDetails();
      return;
    }
    if (this.selectedTemplateId === this.lastLoadedTemplateId && this.templateSections.length > 0) {
      return;
    }
    this.clearTemplateDetails();
    this.lastLoadedTemplateId = this.selectedTemplateId;
    this.loadTemplateDetails(this.selectedTemplateId);
  }

  isAssetPropertiesSection(section: DynamicSection): boolean {
    return isAssetPropertiesSection(section);
  }

  hasAssetPropertiesSection(): boolean {
    return hasAssetPropertiesSection(this.sections);
  }

  getTemplateFieldLabel(field: DynamicField): string {
    return getTemplateFieldLabel(field, this.templateUiControlsByFieldKey);
  }

  isTemplateFieldReadonly(field: DynamicField): boolean {
    return isTemplateFieldReadonly(field, this.templateUiControlsByFieldKey);
  }

  getTemplateFieldInputType(field: DynamicField): string {
    return getTemplateFieldInputType(field, this.templateUiControlsByFieldKey);
  }

  private saveTemplateFormState(): void {
    if (!this.selectedTemplateId || !this.templateSections.length) {
      return;
    }

    try {
      sessionStorage.setItem(
        this.TEMPLATE_FORM_STATE_STORAGE_KEY,
        JSON.stringify({
          templateId: this.selectedTemplateId,
          values: this.templateForm.value,
        }),
      );
    } catch {
      /* ignore */
    }
  }

  private restoreTemplateFormState(): void {
    if (!this.selectedTemplateId || !this.templateSections.length) {
      return;
    }

    try {
      const stored = sessionStorage.getItem(this.TEMPLATE_FORM_STATE_STORAGE_KEY);
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as { templateId?: string; values?: Record<string, unknown> } | null;
      if (!parsed || parsed.templateId !== this.selectedTemplateId || !parsed.values) {
        return;
      }

      this.templateForm.patchValue(parsed.values);
    } catch {
      /* ignore */
    }
  }

  async submitCreateSelfDescription(): Promise<void> {
    this.submissionError = '';
    this.submissionPublishedId = '';
    if (this.sections.length > 0) {
      this.currentStepIndex = this.sections.length;
    }

    if (!this.selectedSchema || !this.currentFormSchema) {
      this.submissionError = this.translate.instant('sdtooling.errors.missingContext');
      return;
    }

    if (!this.sections.length) {
      this.submissionError = this.translate.instant('sdtooling.errors.dynamicFormUnsupported');
      return;
    }

    if (this.hasAssetPropertiesSection() && !this.selectedSharingMethod) {
      this.submissionError = this.translate.instant('sdtooling.errors.selectSharingMethodSubmit');
      return;
    }

    if (this.hasAssetPropertiesSection() && !this.selectedTemplateId) {
      this.submissionError = this.translate.instant('sdtooling.errors.selectTemplateSubmit');
      return;
    }

    this.submitLoading = true;

    try {
      const templatePayload = buildTemplatePayloadForSubmission(this.templateSections, this.templateForm);
      const { publishedId } = await this.submissionPipeline.submit({
        selectedSchema: this.selectedSchema,
        selectedTemplateId: this.selectedTemplateId,
        sections: this.sections,
        dynamicForm: this.dynamicForm,
        templatePayload,
        currentFormSchema: this.currentFormSchema,
        currentSchemaPrefixes: this.currentSchemaPrefixes,
        hasAssetPropertiesSection: this.hasAssetPropertiesSection(),
      });

      const toastMessage = publishedId
        ? this.translate.instant('sdtooling.assetCreatedSuccessWithId', { id: publishedId })
        : this.translate.instant('sdtooling.assetCreatedSuccess');
      try {
        this.modalAndAlert.showAlert(toastMessage, undefined, 'success', 6);
      } catch {
        /* No alert outlet (e.g. isolated tests without dashboard shell). */
      }
      this.selectedSchema = '';
      this.resetFormState();
      this.submissionPublishedId = '';

      const config = await firstValueFrom(
        this.dashboardState.currentEdcConfig$.pipe(
          filter((c): c is EdcConfig => c !== undefined && c !== null),
          take(1),
        ),
      ).catch(() => undefined);
      if (!useSdWarmupMock(config)) {
        try {
          // The warmup fetches all assets, filters to the SD-matched subset, and force-refreshes the
          // shared `assets/request` cache. Calling refreshAssetsCache() first would fill that same cache
          // with every connector asset, so the offers list shows all of them if the warmup then fails.
          await this.sdMatchedAssetsWarmup.run({ trigger: 'sd-publish' });
        } catch (warmupError: unknown) {
          console.error('[SdToolingViewComponent] assets cache warmup failed after publish', warmupError);
        }
      }
    } catch (error: unknown) {
      this.submissionError = formatSubmissionError(error);
      if (this.sections.length > 0) {
        this.currentStepIndex = this.sections.length;
      }
    } finally {
      this.submitLoading = false;
    }
  }

  private get wizardContext(): WizardValidationContext {
    return {
      sections: this.sections,
      currentStepIndex: this.currentStepIndex,
      dynamicForm: this.dynamicForm,
      templateForm: this.templateForm,
      templateSections: this.templateSections,
      selectedSharingMethod: this.selectedSharingMethod,
      selectedTemplateId: this.selectedTemplateId,
      loadingTemplates: this.loadingTemplates,
      loadingTemplateDetails: this.loadingTemplateDetails,
      loadingSchemaDetails: this.loadingSchemaDetails,
    };
  }

  private resetFormState(): void {
    this.detailsError = '';
    this.submissionError = '';
    this.submissionPublishedId = '';
    this.submitLoading = false;
    this.schemaContentResult = undefined;
    this.sharingMethodsResult = undefined;
    this.selectedSharingMethod = '';
    this.selectedTemplateId = '';
    this.templateOptions = [];
    this.sharingMethodOptions = [];
    this.loadingTemplates = false;
    this.templateError = '';
    this.loadingTemplateDetails = false;
    this.templateSchemaResult = undefined;
    this.templateUiSchemaResult = undefined;
    this.templateSections = [];
    this.templateForm = new FormGroup({});
    this.policyActionsResult = undefined;
    this.policyAttributesResult = undefined;
    this.policyActionOptions = [];
    this.policyAttributeOptions = [];
    this.arrayDraftByControl = {};
    this.sections = [];
    this.dynamicForm = new FormGroup({});
    this.templateUiControlsByFieldKey = {};
    this.currentFormSchema = undefined;
    this.currentSchemaPrefixes = {};
    this.currentStepIndex = 0;
    this.selectedSchemaOption = undefined;
    this.lastLoadedTemplateId = '';
    try {
      sessionStorage.removeItem(this.TEMPLATE_FORM_STATE_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  private loadSchemaContent(requestId: number): void {
    this.orchestrator
      .loadSchemaContent(this.selectedSchema)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: outcome => {
          if (!this.isCurrentRequest(requestId)) {
            return;
          }
          if (outcome.kind === 'error') {
            this.detailsError = this.translate.instant(outcome.errorKey);
            this.loadingSchemaDetails = false;
            return;
          }
          this.schemaContentResult = outcome.schemaContentResult;
          if (outcome.formattingContext) {
            this.currentFormSchema = outcome.formattingContext.formSchema;
            this.currentSchemaPrefixes = outcome.formattingContext.prefixes;
          }
          this.sections = outcome.sections;
          this.dynamicForm = outcome.form;
          this.detailsError = '';
          this.loadingSchemaDetails = false;
          // Dentro de loadSchemaContent, después de this.sections = outcome.sections; this.dynamicForm = outcome.form;
          this.sections.forEach(section => {
            section.fields.forEach(field => {
              if (field.controlType === 'select') {
                this.debugSelectField(field);
              }
            });
          });
        },
      });
  }

  private loadSharingMethods(requestId: number): void {
    const offeringType = resolveSelectedOfferingType(this.selectedSchemaOption?.resourceType);
    if (!offeringType) {
      return;
    }
    this.orchestrator
      .loadSharingMethods(offeringType)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          if (!this.isCurrentRequest(requestId)) {
            return;
          }
          this.sharingMethodsResult = result;
          this.sharingMethodOptions = this.orchestrator.mapSharingMethodOptions(result);
          this.templateError = '';
          this.selectedSharingMethod = '';
          this.selectedTemplateId = '';
          this.templateOptions = [];
          this.clearTemplateDetails();
        },
        error: () => {
          this.detailsError = this.detailsError || this.translate.instant('sdtooling.errors.sharingMethodsLoad');
        },
      });
  }

  private loadTemplatesForSharingMethod(sharingMethodId: string, offeringType: string, requestId?: number): void {
    this.loadingTemplates = true;
    this.orchestrator
      .loadTemplates(sharingMethodId, offeringType)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          if (typeof requestId === 'number' && !this.isCurrentRequest(requestId)) {
            return;
          }
          this.templateOptions = this.orchestrator.mapTemplateOptions(result);
          this.selectedTemplateId = '';
          this.loadingTemplates = false;
        },
        error: () => {
          if (typeof requestId === 'number' && !this.isCurrentRequest(requestId)) {
            return;
          }
          this.templateError = this.translate.instant('sdtooling.errors.templatesLoad');
          this.loadingTemplates = false;
        },
      });
  }

  private loadTemplateDetails(templateId: string, requestId?: number): void {
    this.loadingTemplateDetails = true;
    this.service
      .resourceAddressTemplateSchema(templateId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          if (typeof requestId === 'number' && !this.isCurrentRequest(requestId)) {
            return;
          }
          const loaded = this.orchestrator.buildTemplateFromSchemaResult(
            result,
            this.translate.instant('sdtooling.assetPropertiesTitle'),
            this.templateUiSchemaResult,
          );
          this.templateSchemaResult = loaded.templateSchemaResult;
          this.templateSections = loaded.templateSections;
          this.templateForm = loaded.templateForm;
          this.templateUiControlsByFieldKey = loaded.templateUiControlsByFieldKey;
          this.loadingTemplateDetails = false;
        },
        error: () => {
          if (typeof requestId === 'number' && !this.isCurrentRequest(requestId)) {
            return;
          }
          this.templateError = this.translate.instant('sdtooling.errors.templateDetailsLoad');
          this.loadingTemplateDetails = false;
        },
      });

    this.service
      .resourceAddressTemplateUiSchema(templateId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          if (typeof requestId === 'number' && !this.isCurrentRequest(requestId)) {
            return;
          }
          this.templateUiSchemaResult = result;
          const applied = this.orchestrator.applyTemplateUiSchema(result, this.templateSections, this.templateForm);
          this.templateSections = applied.sections;
          this.templateUiControlsByFieldKey = applied.uiControlsByFieldKey;
        },
        error: () => {
          if (typeof requestId === 'number' && !this.isCurrentRequest(requestId)) {
            return;
          }
          this.templateUiSchemaResult = undefined;
        },
      });
  }

  private loadPolicyActions(requestId: number): void {
    this.orchestrator
      .loadPolicyActions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          if (!this.isCurrentRequest(requestId)) {
            return;
          }
          this.policyActionsResult = result;
          this.policyActionOptions = result.options;
        },
        error: () => {
          this.detailsError = this.detailsError || this.translate.instant('sdtooling.errors.policyActionsLoad');
        },
      });
  }

  private loadIdentityAttributes(requestId: number): void {
    this.orchestrator
      .loadIdentityAttributes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          if (!this.isCurrentRequest(requestId)) {
            return;
          }
          this.policyAttributesResult = result;
          this.policyAttributeOptions = result.options;
        },
        error: () => {
          this.detailsError = this.detailsError || this.translate.instant('sdtooling.errors.policyAttributesLoad');
        },
      });
  }

  private syncOfferSchemaToLang(targetLang: DashboardLang): void {
    if (this.loadingSchemas || !this.selectedSchema.trim()) {
      return;
    }

    const remap = remapOfferCreateSchemaId(this.selectedSchema, targetLang);
    if (!remap) {
      return;
    }

    const listed = this.serviceSchemaOptions.some(option => option.value === remap.nextSchemaId);
    if (!listed) {
      const msg = this.translate.instant(offerCreateUnavailableToastKey(remap.kind));
      try {
        this.modalAndAlert.showAlert(msg, undefined, 'error', 6);
      } catch {
        /* No alert outlet (e.g. isolated tests without dashboard shell). */
      }
      return;
    }

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { schemaId: remap.nextSchemaId },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.selectedSchema = remap.nextSchemaId;
    this.onSchemaSelected();
  }

  private applyPendingSchemaSelectionFromRoute(): void {
    const schemaId = this.route.snapshot.queryParamMap.get('schemaId')?.trim();
    if (!schemaId) {
      return;
    }

    let storageRaw: string | null = null;
    this.pendingOfferLabel = '';
    try {
      storageRaw = sessionStorage.getItem(OFFER_CREATION_PENDING_SCHEMA_STORAGE_KEY);
      if (storageRaw) {
        this.pendingOfferLabel = this.readPendingOfferLabel(storageRaw, schemaId);
        sessionStorage.removeItem(OFFER_CREATION_PENDING_SCHEMA_STORAGE_KEY);
      }
    } catch {
      try {
        sessionStorage.removeItem(OFFER_CREATION_PENDING_SCHEMA_STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }

    const result = applyOfferPendingSchemaSelection({
      schemaId,
      serviceOptions: this.serviceSchemaOptions,
      storageRaw,
    });

    this.serviceSchemaOptions = result.serviceOptions;
    if (result.errorKey) {
      this.detailsError = this.translate.instant(result.errorKey);
      return;
    }
    if (result.shouldSelectSchema) {
      this.selectedSchema = result.selectedSchema;
      this.onSchemaSelected();
    }
  }

  private clearTemplateDetails(): void {
    this.templateSchemaResult = undefined;
    this.templateUiSchemaResult = undefined;
    this.templateSections = [];
    this.templateUiControlsByFieldKey = {};
    this.templateForm = new FormGroup({});
    this.loadingTemplateDetails = false;
  }

  private isCurrentRequest(requestId: number): boolean {
    return requestId === this.schemaRequestId;
  }

  private scrollToActiveStepContent(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const anchor = document.getElementById('offer-wizard-step-content');
        if (!anchor) {
          return;
        }
        const scrollParent = document.getElementById('router-content');
        if (scrollParent) {
          const targetTop =
            scrollParent.scrollTop + anchor.getBoundingClientRect().top - scrollParent.getBoundingClientRect().top - 16;
          scrollParent.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
          return;
        }
        anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  private readPendingOfferLabel(storageRaw: string, schemaId: string): string {
    try {
      const parsed: unknown = JSON.parse(storageRaw);
      if (
        parsed &&
        typeof parsed === 'object' &&
        typeof (parsed as { id?: string }).id === 'string' &&
        (parsed as { id: string }).id === schemaId &&
        typeof (parsed as { label?: string }).label === 'string'
      ) {
        return (parsed as { label: string }).label.trim();
      }
    } catch {
      /* ignore */
    }
    return '';
  }
}

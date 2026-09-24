import { Component, DestroyRef, inject } from '@angular/core';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DASHBOARD_RUNTIME_FEATURE_FLAGS } from '@eclipse-edc/dashboard-core';
import { SimplAdvancedSearchService } from '../advanced-search.service';
import { AdvancedSearchStateService } from '../advanced-search-state.service';
import { SdListComponent } from '../sd-list/sd-list.component';
import {
  buildDynamicSectionsFromSchema,
  createDynamicFormGroup,
  getDisplaySubsections,
  isValueEmpty,
  parseTtlToSchema,
  resolveDynamicFieldError,
} from '@eclipse-edc/dashboard-core/shacl-schema';
import { buildAdvancedSearchPayload } from './advanced-search-payload.builder';
import type { DynamicField, DynamicSection } from '@eclipse-edc/dashboard-core/shacl-schema';

@Component({
  selector: 'lib-adv-search',
  imports: [FormsModule, ReactiveFormsModule, SdListComponent, TranslateModule],
  templateUrl: './adv-search.component.html',
  styleUrl: './adv-search.component.css',
})
export class AdvSearchComponent {
  /** When true, fields are grouped under SHACL PropertyGroup headings (rdfs:label from TTL). */
  showPropertyGroupHeadings = true;

  getAdvSearchSubsections(section: DynamicSection): ReturnType<typeof getDisplaySubsections> {
    return this.showPropertyGroupHeadings
      ? getDisplaySubsections(section)
      : [{ key: '__flat__', label: '', order: 0, fields: section.fields }];
  }

  private readonly service = inject(SimplAdvancedSearchService);
  private readonly searchState = inject(AdvancedSearchStateService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly runtimeFlags = inject(DASHBOARD_RUNTIME_FEATURE_FLAGS);

  dynamicForm = new FormGroup({});
  sections: DynamicSection[] = [];
  ttlOptions: string[] = [];
  selectedTtl = '';
  loadingOptions = true;
  loadingSchemaContent = false;
  schemaContentRaw = '';
  schemaContentError = '';
  infoMessage = '';
  searchPayloadPreview = '';
  requestEndpointPreview = '';
  requestCurlPreview = '';
  requestPreviewMessage = '';
  authMode = this.runtimeFlags.authMode;
  private lastSubmittedPayloadSignature = '';
  private lastSubmittedAt = 0;
  private schemaRequestId = 0;

  constructor() {
    this.searchState.info$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(info => {
      this.infoMessage = info ?? '';
    });

    this.service
      .allSchemas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: content => {
          this.ttlOptions = content.Service ?? [];
          this.loadingOptions = false;
        },
        error: () => {
          this.ttlOptions = [];
          this.loadingOptions = false;
        },
      });
  }

  onSchemaChange(): void {
    const requestId = ++this.schemaRequestId;
    this.resetSearchState();

    if (!this.selectedTtl) {
      return;
    }

    this.loadingSchemaContent = true;
    this.loadSchemaContent(requestId);
  }

  private loadSchemaContent(requestId: number): void {
    this.service
      .schemaContent(this.selectedTtl, 'advancedSearch')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: rawContent => {
          if (!this.isCurrentRequest(requestId)) {
            return;
          }
          this.loadingSchemaContent = false;
          this.schemaContentRaw = this.prettyJsonOrRaw(rawContent);
          const parsedJson = this.safeParseJson(rawContent);
          if (parsedJson) {
            this.buildDynamicFormFromSchema(parsedJson);
            return;
          }
          void this.parseAndBuildFromTtl(rawContent, requestId);
        },
        error: () => {
          if (!this.isCurrentRequest(requestId)) {
            return;
          }
          this.loadingSchemaContent = false;
          this.schemaContentError = this.translate.instant('xfsc.errors.schemaLoad');
        },
      });
  }

  private prettyJsonOrRaw(content: string): string {
    try {
      return JSON.stringify(JSON.parse(content), null, 2);
    } catch {
      return content;
    }
  }

  private async parseAndBuildFromTtl(rawContent: string, requestId: number): Promise<void> {
    try {
      const parsedSchema = await parseTtlToSchema(rawContent, 'advancedSearch');
      if (requestId !== this.schemaRequestId) {
        return;
      }
      this.buildDynamicFormFromSchema(parsedSchema);
    } catch {
      if (requestId !== this.schemaRequestId) {
        return;
      }
      this.schemaContentError = this.translate.instant('xfsc.errors.schemaFormatUnsupported');
    }
  }

  isFieldInvalid(field: DynamicField): boolean {
    const control = this.dynamicForm.get(field.controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  getFieldError(field: DynamicField): string {
    return resolveDynamicFieldError(field, this.dynamicForm.get(field.controlName)?.errors ?? null, this.translate);
  }

  clearAll(): void {
    for (const controlName of Object.keys(this.dynamicForm.controls)) {
      const control = this.dynamicForm.get(controlName);
      if (!control) {
        continue;
      }
      control.setValue('');
      control.markAsPristine();
      control.markAsUntouched();
    }
    this.searchPayloadPreview = '';
    this.requestEndpointPreview = '';
    this.requestCurlPreview = '';
    this.requestPreviewMessage = '';
    this.searchState.clearResults();
    this.lastSubmittedPayloadSignature = '';
    this.lastSubmittedAt = 0;
  }

  isFormEmpty(): boolean {
    return this.sections.every(section =>
      section.fields.every(field => {
        const value = this.dynamicForm.get(field.controlName)?.value;
        return isValueEmpty(value);
      }),
    );
  }

  canSearch(): boolean {
    if (this.dynamicForm.invalid) {
      return false;
    }
    if (!this.hasAnyRequiredField()) {
      return !this.isFormEmpty();
    }
    return true;
  }

  onSearch(): void {
    this.dynamicForm.markAllAsTouched();
    if (!this.canSearch()) {
      return;
    }
    const { payload, signature } = buildAdvancedSearchPayload(this.sections, this.dynamicForm);
    if (Object.keys(payload).length === 0) {
      return;
    }
    const now = Date.now();
    if (signature === this.lastSubmittedPayloadSignature && now - this.lastSubmittedAt < 1500) {
      return;
    }
    this.lastSubmittedPayloadSignature = signature;
    this.lastSubmittedAt = now;
    this.searchPayloadPreview = JSON.stringify(payload, null, 2);
    this.updateRequestPreview(payload);
    this.searchState.searchAdvanced(payload);
  }

  async copyCurlPreview(): Promise<void> {
    await this.copyToClipboard(this.requestCurlPreview, this.translate.instant('xfsc.copiedCurl'));
  }

  async copyPayloadPreview(): Promise<void> {
    await this.copyToClipboard(this.searchPayloadPreview, this.translate.instant('xfsc.copiedPayload'));
  }

  private hasAnyRequiredField(): boolean {
    return this.sections.some(section => section.fields.some(field => field.required));
  }

  private resetSearchState(): void {
    this.schemaContentRaw = '';
    this.schemaContentError = '';
    this.searchPayloadPreview = '';
    this.requestEndpointPreview = '';
    this.requestCurlPreview = '';
    this.requestPreviewMessage = '';
    this.sections = [];
    this.dynamicForm = new FormGroup({});
    this.searchState.clearResults();
    this.lastSubmittedPayloadSignature = '';
    this.lastSubmittedAt = 0;
  }

  private buildDynamicFormFromSchema(schemaContent: unknown): void {
    const sections = buildDynamicSectionsFromSchema(schemaContent);
    if (!sections.length) {
      this.sections = [];
      this.dynamicForm = new FormGroup({});
      this.schemaContentError = this.translate.instant('xfsc.errors.dynamicFormUnsupported');
      return;
    }
    this.schemaContentError = '';
    this.sections = sections;
    this.dynamicForm = createDynamicFormGroup(sections);
  }

  private safeParseJson(content: string): unknown {
    try {
      return JSON.parse(content);
    } catch {
      return undefined;
    }
  }

  private isCurrentRequest(requestId: number): boolean {
    return requestId === this.schemaRequestId;
  }

  private updateRequestPreview(payload: Record<string, unknown>): void {
    if (this.authMode !== 'bypass') {
      this.requestEndpointPreview = '';
      this.requestCurlPreview = '';
      return;
    }

    const endpoint = `${this.service.getBaseUrl()}/selfDescriptions/advanced`;
    this.requestEndpointPreview = endpoint;
    this.requestCurlPreview = this.toCurlCommand(endpoint, payload);
  }

  private toCurlCommand(endpoint: string, payload: Record<string, unknown>): string {
    const payloadJson = JSON.stringify(payload, null, 2);
    const escapedPayload = payloadJson.replace(/'/g, `'"'"'`);
    return [
      `curl -X POST "${endpoint}" \\`,
      '  -H "Content-Type: application/json" \\',
      '  -H "Authorization: Bearer <not-required-in-bypass-mode>" \\',
      `  -d '${escapedPayload}'`,
    ].join('\n');
  }

  private async copyToClipboard(content: string, successMessage: string): Promise<void> {
    if (!content) {
      this.requestPreviewMessage = 'Nothing to copy yet.';
      return;
    }

    if (!navigator?.clipboard?.writeText) {
      this.requestPreviewMessage = 'Clipboard API is not available in this browser.';
      return;
    }

    try {
      await navigator.clipboard.writeText(content);
      this.requestPreviewMessage = successMessage;
    } catch {
      this.requestPreviewMessage = 'Could not copy to clipboard. Please copy manually.';
    }
  }
}

import { Component, EventEmitter, forwardRef, inject, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type {
  DynamicObjectArrayItemField,
  DynamicObjectArrayItemObjectArrayField,
  DynamicObjectArrayItemScalarField,
  DynamicObjectArrayItemSubsection,
} from '@eclipse-edc/dashboard-core/shacl-schema';
import {
  findNestedFieldError,
  isObjectArrayArrayItemField,
  isObjectGroupArrayItemField,
  isScalarObjectArrayItemField,
  resolveObjectArrayItemFieldError,
} from '@eclipse-edc/dashboard-core/shacl-schema';
import type { NestedFieldError } from '@eclipse-edc/dashboard-core/shacl-schema';
import {
  addNestedObjectArrayItem,
  canRemoveNestedObjectArrayItem,
  getObjectArrayItemsFromRow,
  hasReachedNestedObjectArrayMax,
  removeNestedObjectArrayItemAt,
  replaceObjectArrayItemAt,
} from './sdtooling-object-array.state';

export interface ObjectArrayRowChangeEvent {
  row: Record<string, unknown>;
}

@Component({
  selector: 'lib-sdtooling-object-array-item-fields',
  standalone: true,
  imports: [FormsModule, TranslateModule, forwardRef(() => SdtoolingObjectArrayItemFieldsComponent)],
  templateUrl: './sdtooling-object-array-item-fields.component.html',
})
export class SdtoolingObjectArrayItemFieldsComponent {
  private readonly translate = inject(TranslateService);

  @Input({ required: true }) itemFields!: DynamicObjectArrayItemField[];
  @Input() itemSubsections?: DynamicObjectArrayItemSubsection[];
  @Input({ required: true }) row!: Record<string, unknown>;
  @Input() depth = 0;
  @Input() showErrors = false;
  @Input() rowIndex = 0;
  @Input() errorPathPrefix: string[] = [];
  @Input() nestedFieldErrors: NestedFieldError[] = [];

  get displaySubsections(): DynamicObjectArrayItemSubsection[] {
    if (this.itemSubsections?.length) {
      return this.itemSubsections;
    }
    return [
      {
        key: '__flat__',
        label: '',
        order: 0,
        fields: this.itemFields,
      },
    ];
  }

  @Output() rowChange = new EventEmitter<ObjectArrayRowChangeEvent>();

  protected readonly isScalarObjectArrayItemField = isScalarObjectArrayItemField;
  protected readonly isObjectGroupArrayItemField = isObjectGroupArrayItemField;
  protected readonly isObjectArrayArrayItemField = isObjectArrayArrayItemField;

  asScalarField(field: DynamicObjectArrayItemField): DynamicObjectArrayItemScalarField {
    return field as DynamicObjectArrayItemScalarField;
  }

  asObjectArrayField(field: DynamicObjectArrayItemField): DynamicObjectArrayItemObjectArrayField {
    return field as DynamicObjectArrayItemObjectArrayField;
  }

  getGroupRow(itemField: DynamicObjectArrayItemField): Record<string, unknown> {
    const value = this.row[itemField.key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  getNestedItems(nestedField: DynamicObjectArrayItemObjectArrayField): Record<string, unknown>[] {
    return getObjectArrayItemsFromRow(this.row, nestedField.key);
  }

  buildFieldPath(itemFieldKey: string): string[] {
    return [...this.errorPathPrefix, itemFieldKey];
  }

  buildNestedItemPath(itemFieldKey: string, nestedIndex: number): string[] {
    return [...this.buildFieldPath(itemFieldKey), String(nestedIndex)];
  }

  hasItemFieldError(itemField: DynamicObjectArrayItemScalarField): boolean {
    return this.getItemFieldErrors(itemField) !== null;
  }

  getItemFieldErrorMessage(itemField: DynamicObjectArrayItemScalarField): string {
    const errors = this.getItemFieldErrors(itemField);
    return resolveObjectArrayItemFieldError(itemField, errors, this.translate);
  }

  hasNestedArrayFieldError(itemField: DynamicObjectArrayItemObjectArrayField): boolean {
    return this.getNestedArrayFieldErrors(itemField) !== null;
  }

  getNestedArrayFieldErrorMessage(itemField: DynamicObjectArrayItemObjectArrayField): string {
    const errors = this.getNestedArrayFieldErrors(itemField);
    return resolveObjectArrayItemFieldError(
      {
        kind: 'scalar',
        key: itemField.key,
        label: itemField.label,
        description: itemField.description,
        type: 'string',
        required: itemField.required,
        enumOptions: [],
        schema: itemField.schema,
      },
      errors,
      this.translate,
    );
  }

  onScalarChange(key: string, value: unknown): void {
    this.rowChange.emit({ row: { ...this.row, [key]: value } });
  }

  onGroupRowChange(itemFieldKey: string, groupRow: Record<string, unknown>): void {
    this.rowChange.emit({ row: { ...this.row, [itemFieldKey]: groupRow } });
  }

  onNestedAdd(nestedField: DynamicObjectArrayItemObjectArrayField): void {
    this.rowChange.emit({ row: addNestedObjectArrayItem(this.row, nestedField) });
  }

  onNestedRemove(nestedField: DynamicObjectArrayItemObjectArrayField, nestedIndex: number): void {
    this.rowChange.emit({ row: removeNestedObjectArrayItemAt(this.row, nestedField.key, nestedIndex) });
  }

  onNestedRowReplace(
    nestedField: DynamicObjectArrayItemObjectArrayField,
    nestedIndex: number,
    updatedRow: Record<string, unknown>,
  ): void {
    const nestedItems = getObjectArrayItemsFromRow(this.row, nestedField.key);
    this.rowChange.emit({
      row: {
        ...this.row,
        [nestedField.key]: replaceObjectArrayItemAt(nestedItems, nestedIndex, updatedRow),
      },
    });
  }

  canRemoveNested(nestedField: DynamicObjectArrayItemObjectArrayField): boolean {
    return canRemoveNestedObjectArrayItem(this.row, nestedField);
  }

  hasReachedNestedMax(nestedField: DynamicObjectArrayItemObjectArrayField): boolean {
    return hasReachedNestedObjectArrayMax(this.row, nestedField);
  }

  getScalarEnumOptions(itemField: DynamicObjectArrayItemScalarField): string[] {
    return Array.isArray(itemField.enumOptions) ? itemField.enumOptions : [];
  }

  private getItemFieldErrors(itemField: DynamicObjectArrayItemScalarField) {
    return findNestedFieldError(
      { nestedFieldErrors: this.nestedFieldErrors },
      this.rowIndex,
      this.buildFieldPath(itemField.key),
    );
  }

  private getNestedArrayFieldErrors(itemField: DynamicObjectArrayItemObjectArrayField) {
    return findNestedFieldError(
      { nestedFieldErrors: this.nestedFieldErrors },
      this.rowIndex,
      this.buildFieldPath(itemField.key),
    );
  }
}

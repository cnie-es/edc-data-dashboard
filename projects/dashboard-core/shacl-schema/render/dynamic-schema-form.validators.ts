import { Validators } from '@angular/forms';
import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import type {
  DynamicField,
  DynamicObjectArrayItemField,
  DynamicObjectArrayScalarType,
} from './dynamic-schema-form.types';
import { asNumber, asRecord, asString, toArrayValues } from './dynamic-schema-form.normalizers';
import {
  getObjectArrayMaxItemsFromSchema,
  getObjectArrayMinItemsFromSchema,
  isObjectArrayArrayItemField,
  isObjectGroupArrayItemField,
  isScalarObjectArrayItemField,
  isTokenArrayObjectArrayItemField,
} from './dynamic-schema-form.object-array';
import { isPolicyCardArrayField, validatePolicyCardsValue } from './dynamic-schema-form.policy';

export interface NestedFieldError {
  rowIndex: number;
  path: string[];
  errors: ValidationErrors;
}

const URI_REGEX = /^https?:\/\/\S+$/i;

export const createFieldValidators = (field: DynamicField): ValidatorFn[] => {
  const validators: ValidatorFn[] = [];
  if (isPolicyCardArrayField(field)) {
    validators.push(policyCardArrayValidator(field));
    return validators;
  }
  if (field.controlType === 'object-array') {
    const minItems = asNumber(field.schema['minItems']);
    if (minItems !== undefined) {
      validators.push(minObjectItemsValidator(minItems));
    }
    const maxItems = asNumber(field.schema['maxItems']);
    if (maxItems !== undefined) {
      validators.push(maxObjectItemsValidator(maxItems));
    }
    validators.push(objectArrayItemFieldsValidator(field));
    return validators;
  }

  validators.push(...createScalarValidators(field.schema, field.required, field.type));

  if (field.type === 'array') {
    const minItems = asNumber(field.schema['minItems']);
    if (minItems !== undefined) {
      validators.push(minItemsValidator(minItems));
    }
    const maxItems = asNumber(field.schema['maxItems']);
    if (maxItems !== undefined) {
      validators.push(maxItemsValidator(maxItems));
    }
    const items = asRecord(field.schema['items']);
    const itemMinLength = asNumber(items?.['minLength']);
    if (itemMinLength !== undefined) {
      validators.push(itemMinLengthValidator(itemMinLength));
    }
  }
  return validators;
};

export const createScalarValidators = (
  schema: Record<string, unknown>,
  required: boolean,
  type: DynamicObjectArrayScalarType | DynamicField['type'],
): ValidatorFn[] => {
  const validators: ValidatorFn[] = [];
  if (required && type !== 'boolean') {
    validators.push(Validators.required);
  }
  const minLength = asNumber(schema['minLength']);
  if (minLength !== undefined) {
    validators.push(Validators.minLength(minLength));
  }
  const maxLength = asNumber(schema['maxLength']);
  if (maxLength !== undefined) {
    validators.push(Validators.maxLength(maxLength));
  }
  const minimum = asNumber(schema['minimum']);
  if (minimum !== undefined) {
    validators.push(Validators.min(minimum));
  }
  const maximum = asNumber(schema['maximum']);
  if (maximum !== undefined) {
    validators.push(Validators.max(maximum));
  }
  const pattern = asString(schema['pattern']);
  if (pattern) {
    validators.push(Validators.pattern(pattern));
  } else if (asString(schema['format']) === 'uri') {
    validators.push(uriValidator());
  }
  return validators;
};

export const validateScalarValue = (
  schema: Record<string, unknown>,
  required: boolean,
  type: DynamicObjectArrayScalarType,
  value: unknown,
): ValidationErrors | null => {
  if (type === 'boolean') {
    if (required && value !== true) {
      return { required: true };
    }
    return null;
  }

  const validators = createScalarValidators(schema, required, type);
  const control = { value } as AbstractControl;
  for (const validator of validators) {
    const result = validator(control);
    if (result) {
      return result;
    }
  }
  return null;
};

export const validateObjectArrayItemField = (
  itemField: DynamicObjectArrayItemField,
  value: unknown,
  rowIndex: number,
  pathPrefix: string[] = [],
): NestedFieldError[] => {
  if (isScalarObjectArrayItemField(itemField)) {
    const errors = validateScalarValue(itemField.schema, itemField.required, itemField.type, value);
    if (!errors) {
      return [];
    }
    return [{ rowIndex, path: [...pathPrefix, itemField.key], errors }];
  }

  if (isObjectGroupArrayItemField(itemField)) {
    const groupRow =
      value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
    return validateObjectArrayRow(itemField.fields, groupRow, rowIndex, [...pathPrefix, itemField.key]);
  }

  if (isObjectArrayArrayItemField(itemField)) {
    const nestedErrors: NestedFieldError[] = [];
    const arr = Array.isArray(value) ? value : [];
    const fieldPath = [...pathPrefix, itemField.key];
    const minItems = getObjectArrayMinItemsFromSchema(itemField.schema);
    if (minItems !== undefined && arr.length < minItems) {
      nestedErrors.push({
        rowIndex,
        path: fieldPath,
        errors: { minItems: { min: minItems, actual: arr.length } },
      });
    }
    const maxItems = getObjectArrayMaxItemsFromSchema(itemField.schema);
    if (maxItems !== undefined && arr.length > maxItems) {
      nestedErrors.push({
        rowIndex,
        path: fieldPath,
        errors: { maxItems: { max: maxItems, actual: arr.length } },
      });
    }
    arr.forEach((nestedRow, nestedIndex) => {
      nestedErrors.push(
        ...validateObjectArrayRow(itemField.itemFields, nestedRow, rowIndex, [...fieldPath, String(nestedIndex)]),
      );
    });
    if (itemField.required && arr.length === 0 && minItems === undefined) {
      nestedErrors.push({ rowIndex, path: fieldPath, errors: { required: true } });
    }
    return nestedErrors;
  }

  if (isTokenArrayObjectArrayItemField(itemField)) {
    const fieldPath = [...pathPrefix, itemField.key];
    if (!Array.isArray(value) || value.length === 0) {
      if (itemField.required) {
        return [{ rowIndex, path: fieldPath, errors: { required: true } }];
      }
      return [];
    }
    const items = asRecord(itemField.schema['items']);
    const itemMinLength = asNumber(items?.['minLength']);
    if (itemMinLength !== undefined) {
      const hasShortItem = value.some(token => String(token).trim().length < itemMinLength);
      if (hasShortItem) {
        return [{ rowIndex, path: fieldPath, errors: { itemMinLength: { min: itemMinLength } } }];
      }
    }
    if (itemField.required && value.every(token => String(token).trim().length === 0)) {
      return [{ rowIndex, path: fieldPath, errors: { required: true } }];
    }
  }

  return [];
};

export const validateObjectArrayRow = (
  itemFields: DynamicObjectArrayItemField[],
  row: unknown,
  rowIndex: number,
  pathPrefix: string[] = [],
): NestedFieldError[] => {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return itemFields
      .filter(itemField => itemField.required)
      .map(itemField => ({
        rowIndex,
        path: [...pathPrefix, itemField.key],
        errors: { required: true },
      }));
  }
  const rowRecord = row as Record<string, unknown>;
  return itemFields.flatMap(itemField =>
    validateObjectArrayItemField(itemField, rowRecord[itemField.key], rowIndex, pathPrefix),
  );
};

const policyCardArrayValidator = (field: DynamicField): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    return validatePolicyCardsValue(field.key, field.required, control.value);
  };
};

const objectArrayItemFieldsValidator = (field: DynamicField): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    if (field.controlType !== 'object-array') {
      return null;
    }
    const itemFieldDefinitions = Array.isArray(field.objectArrayFields) ? field.objectArrayFields : [];
    if (itemFieldDefinitions.length === 0) {
      return null;
    }
    const value = control.value;
    if (!Array.isArray(value)) {
      return null;
    }

    const nestedFieldErrors = value.flatMap((row, rowIndex) =>
      validateObjectArrayRow(itemFieldDefinitions, row, rowIndex),
    );

    if (nestedFieldErrors.length > 0) {
      return { nestedFieldErrors };
    }
    return null;
  };
};

const maxItemsValidator = (max: number): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    const values = toArrayValues(control.value);
    return values.length <= max ? null : { maxItems: { max, actual: values.length } };
  };
};

const maxObjectItemsValidator = (max: number): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    const values = Array.isArray(control.value) ? control.value : [];
    return values.length <= max ? null : { maxItems: { max, actual: values.length } };
  };
};

const minItemsValidator = (min: number): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    const values = toArrayValues(control.value);
    return values.length >= min ? null : { minItems: { min, actual: values.length } };
  };
};

const minObjectItemsValidator = (min: number): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    const values = Array.isArray(control.value) ? control.value : [];
    return values.length >= min ? null : { minItems: { min, actual: values.length } };
  };
};

const itemMinLengthValidator = (min: number): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    const values = toArrayValues(control.value);
    return values.some(item => item.length < min) ? { itemMinLength: { min } } : null;
  };
};

const uriValidator = (): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = asString(control.value);
    if (!value) {
      return null;
    }
    return URI_REGEX.test(value) ? null : { uri: true };
  };
};

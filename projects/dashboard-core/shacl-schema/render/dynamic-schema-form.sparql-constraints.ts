import type { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';
import type { DynamicField, DynamicSection, DynamicSparqlConstraint } from './dynamic-schema-form.types';
import { isValueEmpty, toArrayValues } from './dynamic-schema-form.normalizers';

const SPARQL_CONSTRAINT_ERROR = 'sparqlConstraint';

const MESSAGES = {
  monolingualLanguage: "Only one 'ms:language' is allowed when 'ms:lingualityType' is 'monolingual'.",
  sensitiveRequired: "'ms:sensitiveDataIncluded' is required because 'ms:personalDataIncluded' is 'yesP'.",
  sensitiveNoP: "'ms:sensitiveDataIncluded' cannot be 'yesS' because 'ms:personalDataIncluded' is 'noP'.",
  sensitiveUnknownP: "'ms:sensitiveDataIncluded' cannot be 'yesS' because 'ms:personalDataIncluded' is 'unknownP'.",
  technicalNoP: "'dpv:hasTechnicalOrganisationalMeasure' is not applicable because 'ms:personalDataIncluded' is 'noP'.",
  technicalUnknownP:
    "'dpv:hasTechnicalOrganisationalMeasure' is not applicable because 'ms:personalDataIncluded' is 'unknownP'.",
  dataProtectionRequired:
    "'ms:dataProtectionPrincipleApplied' is required because 'ms:personalDataIncluded' is 'yesP'.",
  dataProtectionNoP:
    "'ms:dataProtectionPrincipleApplied' is not applicable because 'ms:personalDataIncluded' is 'noP'.",
  dataProtectionUnknownP:
    "'ms:dataProtectionPrincipleApplied' is not applicable because 'ms:personalDataIncluded' is 'unknownP'.",
} as const;

type KnownSparqlConstraint =
  | {
      kind: 'maxOneWhen';
      message: string;
      targetFieldKey: string;
      whenFieldKey: string;
      whenValueLocalName: string;
    }
  | {
      kind: 'requiredWhen';
      message: string;
      targetFieldKey: string;
      whenFieldKey: string;
      whenValueLocalName: string;
    }
  | {
      kind: 'forbiddenValueWhen';
      message: string;
      targetFieldKey: string;
      forbiddenValueLocalName: string;
      whenFieldKey: string;
      whenValueLocalName: string;
    }
  | {
      kind: 'emptyWhen';
      message: string;
      targetFieldKey: string;
      whenFieldKey: string;
      whenValueLocalName: string;
    };

export const createKnownSparqlConstraintValidator = (sections: DynamicSection[]): ValidatorFn | undefined => {
  const constraints = resolveKnownConstraints(sections);
  if (constraints.length === 0) {
    return undefined;
  }
  const fields = flattenFields(sections);

  return (control: AbstractControl): ValidationErrors | null => {
    if (!isFormGroup(control)) {
      return null;
    }

    const invalidMessages: string[] = [];
    for (const constraint of constraints) {
      const target = findControlForField(fields, control, constraint.targetFieldKey);
      if (!target) {
        continue;
      }
      const error = evaluateConstraint(constraint, fields, control);
      setSparqlConstraintError(target, error);
      if (error) {
        invalidMessages.push(error.message);
      }
    }

    return invalidMessages.length > 0 ? { sparqlConstraints: invalidMessages } : null;
  };
};

export const applyKnownSparqlConstraintAutoCorrections = (form: FormGroup, sections: DynamicSection[]): void => {
  const constraints = resolveKnownConstraints(sections);
  if (constraints.length === 0) {
    return;
  }
  const fields = flattenFields(sections);
  const correct = () => {
    let changed = false;
    for (const constraint of constraints) {
      changed = applyAutoCorrection(constraint, fields, form) || changed;
    }
    if (changed) {
      form.updateValueAndValidity({ emitEvent: false });
    }
  };

  correct();
  form.valueChanges.subscribe(correct);
};

const resolveKnownConstraints = (sections: DynamicSection[]): KnownSparqlConstraint[] => {
  const rawConstraints = sections.flatMap(section => section.sparqlConstraints ?? []);
  const byMessage = new Map<string, DynamicSparqlConstraint>();
  rawConstraints.forEach(constraint => byMessage.set(constraint.message, constraint));

  return Array.from(byMessage.keys())
    .map(mapKnownConstraint)
    .filter((constraint): constraint is KnownSparqlConstraint => !!constraint);
};

const mapKnownConstraint = (message: string): KnownSparqlConstraint | undefined => {
  switch (message) {
    case MESSAGES.monolingualLanguage:
      return {
        kind: 'maxOneWhen',
        message,
        targetFieldKey: 'ms:language',
        whenFieldKey: 'ms:lingualityType',
        whenValueLocalName: 'monolingual',
      };
    case MESSAGES.sensitiveRequired:
      return {
        kind: 'requiredWhen',
        message,
        targetFieldKey: 'ms:sensitiveDataIncluded',
        whenFieldKey: 'ms:personalDataIncluded',
        whenValueLocalName: 'yesP',
      };
    case MESSAGES.sensitiveNoP:
      return sensitiveForbiddenWhen(message, 'noP');
    case MESSAGES.sensitiveUnknownP:
      return sensitiveForbiddenWhen(message, 'unknownP');
    case MESSAGES.technicalNoP:
      return emptyWhen(message, 'dpv:hasTechnicalOrganisationalMeasure', 'noP');
    case MESSAGES.technicalUnknownP:
      return emptyWhen(message, 'dpv:hasTechnicalOrganisationalMeasure', 'unknownP');
    case MESSAGES.dataProtectionRequired:
      return {
        kind: 'requiredWhen',
        message,
        targetFieldKey: 'ms:dataProtectionPrincipleApplied',
        whenFieldKey: 'ms:personalDataIncluded',
        whenValueLocalName: 'yesP',
      };
    case MESSAGES.dataProtectionNoP:
      return emptyWhen(message, 'ms:dataProtectionPrincipleApplied', 'noP');
    case MESSAGES.dataProtectionUnknownP:
      return emptyWhen(message, 'ms:dataProtectionPrincipleApplied', 'unknownP');
    default:
      return undefined;
  }
};

const sensitiveForbiddenWhen = (message: string, whenValueLocalName: string): KnownSparqlConstraint => ({
  kind: 'forbiddenValueWhen',
  message,
  targetFieldKey: 'ms:sensitiveDataIncluded',
  forbiddenValueLocalName: 'yesS',
  whenFieldKey: 'ms:personalDataIncluded',
  whenValueLocalName,
});

const emptyWhen = (message: string, targetFieldKey: string, whenValueLocalName: string): KnownSparqlConstraint => ({
  kind: 'emptyWhen',
  message,
  targetFieldKey,
  whenFieldKey: 'ms:personalDataIncluded',
  whenValueLocalName,
});

const evaluateConstraint = (
  constraint: KnownSparqlConstraint,
  fields: DynamicField[],
  form: FormGroup,
): { message: string } | null => {
  const target = findControlForField(fields, form, constraint.targetFieldKey);
  const whenControl = findControlForField(fields, form, constraint.whenFieldKey);
  if (!target || !whenControl || !valueMatchesLocalName(whenControl.value, constraint.whenValueLocalName)) {
    return null;
  }

  if (constraint.kind === 'maxOneWhen') {
    return valueCount(target.value) > 1 ? { message: constraint.message } : null;
  }
  if (constraint.kind === 'requiredWhen') {
    return isValueEmpty(target.value) ? { message: constraint.message } : null;
  }
  if (constraint.kind === 'forbiddenValueWhen') {
    return valueMatchesLocalName(target.value, constraint.forbiddenValueLocalName)
      ? { message: constraint.message }
      : null;
  }
  return isValueEmpty(target.value) ? null : { message: constraint.message };
};

const applyAutoCorrection = (constraint: KnownSparqlConstraint, fields: DynamicField[], form: FormGroup): boolean => {
  const target = findControlForField(fields, form, constraint.targetFieldKey);
  const whenControl = findControlForField(fields, form, constraint.whenFieldKey);
  if (!target || !whenControl || !valueMatchesLocalName(whenControl.value, constraint.whenValueLocalName)) {
    return false;
  }

  if (constraint.kind === 'maxOneWhen') {
    const values = valueItems(target.value);
    if (values.length <= 1) {
      return false;
    }
    target.setValue(Array.isArray(target.value) ? values.slice(0, 1) : values[0], { emitEvent: false });
    target.markAsDirty();
    return true;
  }

  if (
    constraint.kind === 'forbiddenValueWhen' &&
    valueMatchesLocalName(target.value, constraint.forbiddenValueLocalName)
  ) {
    target.setValue('', { emitEvent: false });
    target.markAsDirty();
    return true;
  }

  if (constraint.kind === 'emptyWhen' && !isValueEmpty(target.value)) {
    target.setValue('', { emitEvent: false });
    target.markAsDirty();
    return true;
  }

  return false;
};

const flattenFields = (sections: DynamicSection[]): DynamicField[] => sections.flatMap(section => section.fields);

const findControlForField = (
  fields: DynamicField[],
  form: FormGroup,
  fieldKey: string,
): AbstractControl | undefined => {
  const field = fields.find(candidate => keysMatch(candidate.key, fieldKey));
  return field ? (form.get(field.controlName) ?? undefined) : undefined;
};

const keysMatch = (left: string, right: string): boolean => left === right || localName(left) === localName(right);

const localName = (value: string): string => {
  const hashIndex = value.lastIndexOf('#');
  const slashIndex = value.lastIndexOf('/');
  const colonIndex = value.lastIndexOf(':');
  const index = Math.max(hashIndex, slashIndex, colonIndex);
  return index >= 0 ? value.substring(index + 1) : value;
};

const valueMatchesLocalName = (value: unknown, expectedLocalName: string): boolean => {
  return typeof value === 'string' && localName(value.trim()) === expectedLocalName;
};

const valueItems = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }
  return toArrayValues(value);
};

const valueCount = (value: unknown): number => valueItems(value).length;

const isFormGroup = (control: AbstractControl): control is FormGroup => {
  return typeof (control as FormGroup).get === 'function';
};

const setSparqlConstraintError = (control: AbstractControl, error: { message: string } | null): void => {
  const currentErrors = control.errors ?? {};
  if (error) {
    control.setErrors({ ...currentErrors, [SPARQL_CONSTRAINT_ERROR]: error });
    return;
  }

  if (!currentErrors[SPARQL_CONSTRAINT_ERROR]) {
    return;
  }
  const remainingErrors = { ...currentErrors };
  delete remainingErrors[SPARQL_CONSTRAINT_ERROR];
  control.setErrors(Object.keys(remainingErrors).length > 0 ? remainingErrors : null);
};

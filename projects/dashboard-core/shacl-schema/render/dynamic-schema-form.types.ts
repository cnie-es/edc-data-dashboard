export type DynamicFieldType = 'string' | 'number' | 'integer' | 'boolean' | 'array';

export type DynamicControlType =
  | 'text'
  | 'number'
  | 'checkbox'
  | 'select'
  | 'select-multiple'
  | 'array'
  | 'object-array'
  | 'policy-card-array';
export type UsagePolicyType = 'deletion-after-usage' | 'restricted-number-of-usages' | 'restricted-duration-of-usage';

export interface DynamicSubsection {
  key: string;
  label: string;
  order: number;
  fields: DynamicField[];
}

export interface DynamicSection {
  key: string;
  label: string;
  description: string;
  rdfType: string;
  fields: DynamicField[];
  subsections?: DynamicSubsection[];
  sparqlConstraints?: DynamicSparqlConstraint[];
}

export interface DynamicSparqlConstraint {
  message: string;
  select: string;
}

export interface DynamicField {
  key: string;
  controlName: string;
  label: string;
  description: string;
  type: DynamicFieldType;
  controlType: DynamicControlType;
  enumOptions: string[];
  enumOptionLabels?: Record<string, string>;
  required: boolean;
  schema: Record<string, unknown>;
  objectArrayFields?: DynamicObjectArrayItemField[];
  objectArrayItemSubsections?: DynamicObjectArrayItemSubsection[];
  groupKey?: string;
  order?: number;
}

export interface DynamicObjectArrayItemFieldBase {
  groupKey?: string;
  order?: number;
}

export interface DynamicObjectArrayItemSubsection {
  key: string;
  label: string;
  order: number;
  fields: DynamicObjectArrayItemField[];
}

export type DynamicObjectArrayScalarType = Exclude<DynamicFieldType, 'array'>;

export interface DynamicObjectArrayItemScalarField extends DynamicObjectArrayItemFieldBase {
  kind: 'scalar';
  key: string;
  label: string;
  description: string;
  type: DynamicObjectArrayScalarType;
  required: boolean;
  enumOptions: string[];
  enumOptionLabels?: Record<string, string>;
  schema: Record<string, unknown>;
}

export interface DynamicObjectArrayItemObjectGroupField extends DynamicObjectArrayItemFieldBase {
  kind: 'object-group';
  key: string;
  label: string;
  description: string;
  required: boolean;
  schema: Record<string, unknown>;
  fields: DynamicObjectArrayItemField[];
}

export interface DynamicObjectArrayItemObjectArrayField extends DynamicObjectArrayItemFieldBase {
  kind: 'object-array';
  key: string;
  label: string;
  description: string;
  required: boolean;
  schema: Record<string, unknown>;
  itemFields: DynamicObjectArrayItemField[];
}

export interface DynamicObjectArrayItemTokenArrayField extends DynamicObjectArrayItemFieldBase {
  kind: 'token-array';
  key: string;
  label: string;
  description: string;
  required: boolean;
  schema: Record<string, unknown>;
}

export type DynamicObjectArrayItemField =
  | DynamicObjectArrayItemScalarField
  | DynamicObjectArrayItemObjectGroupField
  | DynamicObjectArrayItemObjectArrayField
  | DynamicObjectArrayItemTokenArrayField;

export interface PolicyCardValue {
  action: string;
  attribute: string;
  usageAssignee: string;
  usageType: UsagePolicyType;
  numberOfUsages: string;
  from: string;
  to: string;
}

import type { FormGroup } from '@angular/forms';
import {
  createEmptyPolicyCard,
  isAccessPolicyField,
  isUsagePolicyField,
  isValueEmpty,
} from '@eclipse-edc/dashboard-core/shacl-schema';
import {
  isObjectArrayArrayItemField,
  isObjectGroupArrayItemField,
  isScalarObjectArrayItemField,
  type DynamicField,
  type DynamicObjectArrayItemField,
  type DynamicSection,
  type PolicyCardValue,
} from '@eclipse-edc/dashboard-core/shacl-schema';
import { getPolicyCardsValue, parseArrayTokens } from '../form-state/sdtooling-view.form-state';
import type {
  PolicySelectOption,
  ReviewSummaryField,
  ReviewSummarySection,
  ReviewSummarySubsection,
} from '../sdtooling-view.types';
import { getDisplaySubsections } from './sdtooling-section-display';
import { USAGE_TYPE_RESTRICTED_DURATION, USAGE_TYPE_RESTRICTED_NUMBER } from '../sdtooling-view.types';

export interface ReviewSummaryContext {
  sections: DynamicSection[];
  dynamicForm: FormGroup;
  templateSections: DynamicSection[];
  templateForm: FormGroup;
  policyActionOptions: PolicySelectOption[];
  policyAttributeOptions: PolicySelectOption[];
  usageTypeOptions: PolicySelectOption[];
  yesLabel: string;
  noLabel: string;
  resolveTemplateFieldLabel: (field: DynamicField) => string;
}

const resolveOptionLabel = (value: string, options: PolicySelectOption[]): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return '-';
  }
  const selected = options.find(option => option.value === trimmed);
  return selected?.label ?? trimmed;
};

const formatPolicyCardSummary = (field: DynamicField, card: PolicyCardValue, ctx: ReviewSummaryContext): string => {
  if (isUsagePolicyField(field.key)) {
    const usageAssignee = resolveOptionLabel(card.usageAssignee, ctx.policyAttributeOptions);
    const usageType = resolveOptionLabel(card.usageType, ctx.usageTypeOptions);
    const parts = [`Assignee: ${usageAssignee}`, `Usage type: ${usageType}`];

    if (card.usageType === USAGE_TYPE_RESTRICTED_NUMBER && card.numberOfUsages.trim()) {
      parts.push(`Number of usages: ${card.numberOfUsages.trim()}`);
    }

    if (card.usageType === USAGE_TYPE_RESTRICTED_DURATION) {
      const from = card.from.trim();
      const to = card.to.trim();
      if (from) {
        parts.push(`From: ${from}`);
      }
      if (to) {
        parts.push(`To: ${to}`);
      }
    }

    return parts.join(' | ');
  }

  if (isAccessPolicyField(field.key)) {
    const action = resolveOptionLabel(card.action, ctx.policyActionOptions);
    const attribute = resolveOptionLabel(card.attribute, ctx.policyAttributeOptions);
    const parts = [`Action: ${action}`, `Attribute: ${attribute}`];

    const from = card.from.trim();
    const to = card.to.trim();
    if (from) {
      parts.push(`From: ${from}`);
    }
    if (to) {
      parts.push(`To: ${to}`);
    }

    return parts.join(' | ');
  }

  return '';
};

const isPolicyCardField = (field: DynamicField): boolean => {
  return (field as DynamicField & { controlType: string }).controlType === 'policy-card-array';
};

const formatObjectArrayRowSummary = (
  itemFields: DynamicObjectArrayItemField[],
  row: Record<string, unknown>,
): string => {
  const parts: string[] = [];
  for (const itemField of itemFields) {
    const rawValue = row[itemField.key];
    if (isValueEmpty(rawValue)) {
      continue;
    }
    if (isScalarObjectArrayItemField(itemField)) {
      parts.push(`${itemField.key}: ${String(rawValue)}`);
      continue;
    }
    if (isObjectGroupArrayItemField(itemField)) {
      const nestedSummary = formatObjectArrayRowSummary(itemField.fields, rawValue as Record<string, unknown>);
      if (nestedSummary) {
        parts.push(`${itemField.key} { ${nestedSummary} }`);
      }
      continue;
    }
    if (isObjectArrayArrayItemField(itemField) && Array.isArray(rawValue)) {
      const nestedSummaries = rawValue
        .filter(item => item && typeof item === 'object')
        .map(item => formatObjectArrayRowSummary(itemField.itemFields, item as Record<string, unknown>))
        .filter(summary => summary.length > 0);
      if (nestedSummaries.length > 0) {
        parts.push(`${itemField.key} [ ${nestedSummaries.join('; ')} ]`);
      }
    }
  }
  return parts.join(' | ');
};

const resolveReviewSummaryValues = (field: DynamicField, value: unknown, ctx: ReviewSummaryContext): string[] => {
  if (isValueEmpty(value)) {
    return [];
  }

  if (field.controlType === 'array') {
    return parseArrayTokens(value);
  }
  if (field.controlType === 'object-array') {
    if (!Array.isArray(value)) {
      return [];
    }
    const itemFields = field.objectArrayFields ?? [];
    return value
      .filter(item => item && typeof item === 'object')
      .map(item => formatObjectArrayRowSummary(itemFields, item as Record<string, unknown>))
      .filter(summary => summary.length > 0);
  }

  if (isPolicyCardField(field)) {
    const cards = getPolicyCardsValue(value, createEmptyPolicyCard);
    return cards.map(card => formatPolicyCardSummary(field, card, ctx)).filter(summary => summary.length > 0);
  }

  if (field.controlType === 'checkbox') {
    if (typeof value === 'boolean') {
      return [value ? ctx.yesLabel : ctx.noLabel];
    }
    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'true' || normalized === 'false') {
      return [normalized === 'true' ? ctx.yesLabel : ctx.noLabel];
    }
    return [];
  }

  if (field.controlType === 'number') {
    const asNumber = typeof value === 'number' ? value : Number.parseFloat(String(value));
    return Number.isFinite(asNumber) ? [String(asNumber)] : [];
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  if (Array.isArray(value)) {
    return value.map(item => (typeof item === 'string' ? item.trim() : String(item))).filter(item => item.length > 0);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)];
  }

  return [];
};

const buildReviewSummaryFields = (
  fields: DynamicField[],
  formGroup: FormGroup,
  labelResolver: (field: DynamicField) => string,
  ctx: ReviewSummaryContext,
): ReviewSummaryField[] => {
  const fieldSummaries: ReviewSummaryField[] = [];

  for (const field of fields) {
    const rawValue = formGroup.get(field.controlName)?.value;
    const values = resolveReviewSummaryValues(field, rawValue, ctx);
    if (values.length === 0) {
      continue;
    }
    fieldSummaries.push({
      label: labelResolver(field),
      values,
    });
  }

  return fieldSummaries;
};

const buildReviewSummarySubsections = (
  section: DynamicSection,
  formGroup: FormGroup,
  labelResolver: (field: DynamicField) => string,
  ctx: ReviewSummaryContext,
): ReviewSummarySubsection[] | undefined => {
  const displaySubsections = getDisplaySubsections(section);
  if (!section.subsections?.length) {
    return undefined;
  }

  const subsections: ReviewSummarySubsection[] = [];
  for (const subsection of displaySubsections) {
    const fields = buildReviewSummaryFields(subsection.fields, formGroup, labelResolver, ctx);
    if (fields.length > 0) {
      subsections.push({
        key: subsection.key,
        label: subsection.label,
        fields,
      });
    }
  }
  return subsections.length > 0 ? subsections : undefined;
};

const appendReviewSummarySection = (
  sections: ReviewSummarySection[],
  section: DynamicSection,
  formGroup: FormGroup,
  labelResolver: (field: DynamicField) => string,
  ctx: ReviewSummaryContext,
): void => {
  const subsections = buildReviewSummarySubsections(section, formGroup, labelResolver, ctx);
  const fieldSummaries = buildReviewSummaryFields(section.fields, formGroup, labelResolver, ctx);
  if (fieldSummaries.length === 0) {
    return;
  }
  sections.push({
    key: section.key,
    label: section.label,
    fields: fieldSummaries,
    subsections,
  });
};

export const buildReviewSummarySections = (ctx: ReviewSummaryContext): ReviewSummarySection[] => {
  const sections: ReviewSummarySection[] = [];

  for (const section of ctx.sections) {
    appendReviewSummarySection(sections, section, ctx.dynamicForm, field => field.label, ctx);
  }

  for (const section of ctx.templateSections) {
    appendReviewSummarySection(sections, section, ctx.templateForm, field => ctx.resolveTemplateFieldLabel(field), ctx);
  }

  return sections;
};

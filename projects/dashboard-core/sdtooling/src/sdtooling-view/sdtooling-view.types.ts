import {
  resolveOfferCreateSchemaId,
  SUPPORTED_DASHBOARD_LANGS,
  type OfferCreateKind,
} from '@eclipse-edc/dashboard-core';
import type { ExtendedJsonSchema4 } from '../util/formatDataToJsonLd';

export interface ServiceSchemaOption {
  value: string;
  label: string;
  resourceType: string;
}

export interface PolicySelectOption {
  label: string;
  value: string;
}

export interface TemplateSelectOption {
  value: string;
  label: string;
}

export interface SharingMethodSelectOption {
  value: string;
  label: string;
}

export interface TemplateUiControlConfig {
  label?: string;
  readonly?: boolean;
  inputType?: 'text' | 'password';
}

export interface ParsedSchemaContent {
  root?: Record<string, ExtendedJsonSchema4>;
  prefixes?: Record<string, string>;
}

export interface SchemaFormattingContext {
  formSchema: ExtendedJsonSchema4;
  prefixes: Record<string, string>;
}

export interface WizardStep {
  key: string;
  label: string;
  description: string;
}

export interface ReviewSummaryField {
  label: string;
  values: string[];
}

export interface ReviewSummarySubsection {
  key: string;
  label: string;
  fields: ReviewSummaryField[];
}

export interface ReviewSummarySection {
  key: string;
  label: string;
  fields: ReviewSummaryField[];
  subsections?: ReviewSummarySubsection[];
}

export const USAGE_TYPE_DELETION_AFTER_USAGE = 'deletion-after-usage';
export const USAGE_TYPE_RESTRICTED_NUMBER = 'restricted-number-of-usages';
export const USAGE_TYPE_RESTRICTED_DURATION = 'restricted-duration-of-usage';
export const TOP_LEVEL_PRIMITIVE_SECTION_KEY = '__top_level__';

const OFFER_TITLE_KEY_BY_KIND: Record<OfferCreateKind, string> = {
  corpus: 'offers.createPage.corpus.title',
  lcr: 'offers.createPage.lexical.title',
  model: 'offers.createPage.model.title',
  api: 'offers.createPage.service.title',
};

const OFFER_CREATE_KINDS: OfferCreateKind[] = ['corpus', 'lcr', 'model', 'api'];

/** Maps SD Tooling `schemaId` query values to offer-creation page title i18n keys. */
export const OFFER_PAGE_TITLE_KEY_BY_SCHEMA_ID: Record<string, string> = Object.fromEntries(
  OFFER_CREATE_KINDS.flatMap(kind =>
    SUPPORTED_DASHBOARD_LANGS.map(lang => [resolveOfferCreateSchemaId(kind, lang), OFFER_TITLE_KEY_BY_KIND[kind]]),
  ),
);

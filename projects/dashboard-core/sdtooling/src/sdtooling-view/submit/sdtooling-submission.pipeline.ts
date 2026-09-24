import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { ExtendedJsonSchema4 } from '../../util/formatDataToJsonLd';
import { formatDataToJsonLd } from '../../util/formatDataToJsonLd';
import { SdToolingService } from '../../sdtooling.service';
import type { DynamicSection } from '@eclipse-edc/dashboard-core/shacl-schema';
import { buildSdToolingFormPayload } from './sdtooling-form-payload.builder';
import {
  buildAssetPropertiesFromTemplate,
  extractPublishedId,
  extractSignedCredential,
  normalizeForPublication,
  validateSelfDescriptionStructure,
} from './sdtooling-publication.mapper';
import { transformServicePolicyInPlace } from './sdtooling-policy-transform';

export interface SubmissionPipelineInput {
  selectedSchema: string;
  selectedTemplateId: string;
  sections: DynamicSection[];
  dynamicForm: import('@angular/forms').FormGroup;
  templatePayload: Record<string, unknown>;
  currentFormSchema: ExtendedJsonSchema4;
  currentSchemaPrefixes: Record<string, string>;
  hasAssetPropertiesSection: boolean;
}

export interface SubmissionPipelineResult {
  publishedId: string;
}

@Injectable({ providedIn: 'root' })
export class SdToolingSubmissionPipeline {
  private readonly service = inject(SdToolingService);

  async submit(input: SubmissionPipelineInput): Promise<SubmissionPipelineResult> {
    const formData = buildSdToolingFormPayload(input.sections, input.dynamicForm);
    const selfDescriptionJsonLd = await formatDataToJsonLd(
      formData,
      input.currentFormSchema,
      input.currentSchemaPrefixes,
    );

    if (Object.keys(input.templatePayload).length > 0) {
      selfDescriptionJsonLd['resourceAddress'] = input.templatePayload;

      const assetProperties = buildAssetPropertiesFromTemplate(input.templatePayload);
      if (assetProperties) {
        selfDescriptionJsonLd['simpl:assetProperties'] = assetProperties;
      }
    }

    validateSelfDescriptionStructure(selfDescriptionJsonLd, {
      currentFormSchema: input.currentFormSchema,
      hasAssetPropertiesSection: input.hasAssetPropertiesSection,
    });

    await transformServicePolicyInPlace(selfDescriptionJsonLd, this.service, firstValueFrom);

    const enrichedAndValidated = await firstValueFrom(
      this.service.enrichAndValidateSchema(input.selectedSchema, input.selectedTemplateId, selfDescriptionJsonLd),
    );
    const publicationPayload = normalizeForPublication(enrichedAndValidated as Record<string, unknown>);
    const signedPayload = (await firstValueFrom(this.service.signSelfDescription(publicationPayload))) as Record<
      string,
      unknown
    >;
    const signedCredential = extractSignedCredential(signedPayload);
    const published = await firstValueFrom(this.service.publishSelfDescriptionToCatalogue(signedCredential));

    return { publishedId: extractPublishedId(published) };
  }
}

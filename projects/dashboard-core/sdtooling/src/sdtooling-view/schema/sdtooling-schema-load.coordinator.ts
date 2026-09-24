import { Injectable, inject } from '@angular/core';
import { parseTtlToSchema } from '@eclipse-edc/dashboard-core/shacl-schema';
import { Observable, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { SdToolingService } from '../../sdtooling.service';
import type { SdSchemaContentResult } from '../../sdtooling.service';
import { safeParseJson } from '../sdtooling-record.util';
import type { SchemaFormattingContext } from '../sdtooling-view.types';
import { buildDynamicFormFromSchemaContent } from './sdtooling-dynamic-form.builder';
import { resolveSchemaFormattingContext } from './sdtooling-schema-formatting.context';

export interface SchemaLoadSuccess {
  kind: 'success';
  schemaContentResult: SdSchemaContentResult;
  formattingContext?: SchemaFormattingContext;
  sections: import('@eclipse-edc/dashboard-core/shacl-schema').DynamicSection[];
  form: import('@angular/forms').FormGroup;
}

export interface SchemaLoadError {
  kind: 'error';
  errorKey:
    | 'sdtooling.errors.schemaContentLoad'
    | 'sdtooling.errors.schemaFormatUnsupported'
    | 'sdtooling.errors.dynamicFormUnsupported';
}

export type SchemaLoadOutcome = SchemaLoadSuccess | SchemaLoadError;

@Injectable({ providedIn: 'root' })
export class SdToolingSchemaLoadCoordinator {
  private readonly service = inject(SdToolingService);

  loadSchemaContent(schemaId: string): Observable<SchemaLoadOutcome> {
    return this.service.schemaContent(schemaId, 'sdCreation').pipe(
      switchMap(result => this.processSchemaContent(result)),
      catchError(() => of<SchemaLoadOutcome>({ kind: 'error', errorKey: 'sdtooling.errors.schemaContentLoad' })),
    );
  }

  private processSchemaContent(result: SdSchemaContentResult): Observable<SchemaLoadOutcome> {
    const parsedJson = safeParseJson(result.content);
    if (parsedJson) {
      return of(this.buildOutcomeFromParsed(result, parsedJson));
    }

    return new Observable(observer => {
      void parseTtlToSchema(result.content, 'sdCreation')
        .then(parsed => {
          observer.next(this.buildOutcomeFromParsed(result, parsed));
          observer.complete();
        })
        .catch(() => {
          observer.next({ kind: 'error', errorKey: 'sdtooling.errors.schemaFormatUnsupported' });
          observer.complete();
        });
    });
  }

  private buildOutcomeFromParsed(result: SdSchemaContentResult, parsed: unknown): SchemaLoadOutcome {
    const formattingContext = resolveSchemaFormattingContext(parsed);
    const built = buildDynamicFormFromSchemaContent(parsed);
    if (built.unsupported) {
      return { kind: 'error', errorKey: 'sdtooling.errors.dynamicFormUnsupported' };
    }
    return {
      kind: 'success',
      schemaContentResult: result,
      formattingContext,
      sections: built.sections,
      form: built.form,
    };
  }
}

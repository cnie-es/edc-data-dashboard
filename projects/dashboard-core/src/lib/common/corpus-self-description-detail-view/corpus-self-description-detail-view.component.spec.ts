import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { DashboardStateService } from '../../services/dashboard-state.service';
import { EdcClientService } from '../../services/edc-client.service';
import { ParticipantNameService } from '../../services/participant-name.service';
import type { CorpusSelfDescriptionDetailFetcher } from '../../sd/corpus-self-description-detail.loader';
import { CorpusSelfDescriptionDetailViewComponent } from './corpus-self-description-detail-view.component';

const DATA_OFFERING_SD_ID = 'did:web:registry.gaia-x.eu:DataOffering:80a2cf34-dd07-4647-98a4-58eecb56d2b4';

/** VerifiableCredential-shaped fixture matching XFSC detailedSearchSD responses. */
const dataOfferingVcFixture: Record<string, unknown> = {
  '@id': DATA_OFFERING_SD_ID,
  credentialSubject: {
    '@type': 'edval:CorpusOffering',
    'dct:conformsTo': {
      'dct:schemaName': 'CorpusOfferingShape',
      'dct:hasVersion': '1.0.0',
    },
    'edval:corpusAsset': {
      'dcat:keyword': [
        { '@language': 'es', '@value': 'nlp' },
        { '@language': 'es', '@value': 'corpus' },
      ],
      'dct:description': { '@language': 'es', '@value': 'Corpus body description' },
      'dct:title': { '@language': 'en', '@value': 'Data offering title' },
      'ms:lingualityType': { '@id': 'ms:monolingual' },
      'ms:mediaType': { '@id': 'ms:text' },
    },
    'edval:isPublicOffering': { '@type': 'xsd:boolean', '@value': true },
    'simpl:generalServiceProperties': {
      'simpl:name': 'Data offering title',
      'simpl:description': 'General service description',
      'simpl:offeringType': 'data',
    },
    'simpl:offeringPrice': {
      'simpl:currency': 'EUR',
      'simpl:license': { '@type': 'xsd:anyURI', '@value': 'https://license.example.com' },
      'simpl:price': { '@type': 'xsd:decimal', '@value': 0 },
      'simpl:priceType': 'free',
    },
    'simpl:providerInformation': {
      'simpl:providedBy': 'devrioja',
    },
  },
};

describe('CorpusSelfDescriptionDetailViewComponent', () => {
  let fixture: ComponentFixture<CorpusSelfDescriptionDetailViewComponent>;
  let component: CorpusSelfDescriptionDetailViewComponent;
  let xfsc: jasmine.SpyObj<CorpusSelfDescriptionDetailFetcher>;

  beforeEach(async () => {
    xfsc = jasmine.createSpyObj<CorpusSelfDescriptionDetailFetcher>('CorpusSelfDescriptionDetailFetcher', [
      'detailedSearchSD',
    ]);
    xfsc.detailedSearchSD.and.returnValue(of(dataOfferingVcFixture));

    await TestBed.configureTestingModule({
      imports: [CorpusSelfDescriptionDetailViewComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: DashboardStateService,
          useValue: { currentEdcConfig$: of({ dashboardMocksEnabled: false }) },
        },
        {
          provide: EdcClientService,
          useValue: {},
        },
        {
          provide: ParticipantNameService,
          useValue: { getName: (id: string) => Promise.resolve(id) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CorpusSelfDescriptionDetailViewComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('xfsc', xfsc);
    fixture.componentRef.setInput('selfDescriptionId', DATA_OFFERING_SD_ID);
    fixture.componentRef.setInput('layoutMode', 'offer');
    fixture.componentRef.setInput('embeddedInModal', true);
  });

  it('maps detailedSearchSD response into vm with categories (Mis ofertas parity)', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(xfsc.detailedSearchSD).toHaveBeenCalledWith(DATA_OFFERING_SD_ID);
    expect(component.loading).toBeFalse();
    expect(component.vm).toBeDefined();
    expect(component.vm!.title).toBe('Data offering title');
    expect(component.vm!.description).toContain('General service description');
    expect(component.vm!.keywords).toEqual(['nlp', 'corpus']);
    expect(component.vm!.mediaTypeLabels).toEqual(['text']);
    expect(component.vm!.lingualityLabel).toBe('monolingual');
    expect(component.vm!.offeringTypeLabel).toBe('corpus');
  });

  it('applies provider override only when corpus provider is blank or UUID-like', async () => {
    fixture.componentRef.setInput('providerLabelOverride', 'counterparty-label');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.vm!.providerLabel).toBe('devrioja');
  });

  it('does not replace mapped title with titleOverride', async () => {
    fixture.componentRef.setInput('titleOverride', 'negotiation row name');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.vm!.title).toBe('Data offering title');
  });
});

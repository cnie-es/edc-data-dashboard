// Karma for this library only runs specs under projects/dashboard-core/src/.
import { TransferHistoryTableComponent } from '../../../transfer/src/transfer-history-table/transfer-history-table.component';
import { TransferProcess, TransferProcessStates } from '@think-it-labs/edc-connector-client';
import { TranslateService } from '@ngx-translate/core';

describe('TransferHistoryTableComponent helpers', () => {
  function stubTranslate(): TranslateService {
    return {
      instant: (key: string) => {
        if (key === 'transferProcess.assetPending') {
          return 'ASSET_PENDING_I18N';
        }
        if (key === 'transferProcess.connectorPending') {
          return 'CONNECTOR_PENDING_I18N';
        }
        if (key === 'transferProcess.stateUnknown') {
          return 'UNKNOWN_STATE';
        }
        if (key === 'transferProcess.state.COMPLETED') {
          return 'Completada ES';
        }
        if (key === 'transferProcess.state.WEIRD') {
          return key;
        }
        return key;
      },
    } as TranslateService;
  }

  function minimalProcess(
    partial: Partial<TransferProcess> & Pick<TransferProcess, 'state' | 'type'>,
  ): TransferProcess {
    return {
      createdAt: 0,
      ...partial,
    } as unknown as TransferProcess;
  }

  function createTable(): TransferHistoryTableComponent {
    const c = Object.create(TransferHistoryTableComponent.prototype) as TransferHistoryTableComponent;
    (c as unknown as { translate: TranslateService }).translate = stubTranslate();
    (c as unknown as { assetDisplayByAssetId: Map<string, string> | null }).assetDisplayByAssetId = new Map();
    (c as unknown as { connectorLabelByContractId: Map<string, string> | null }).connectorLabelByContractId = new Map();
    return c;
  }

  it('maps transfer status badge classes from full process', () => {
    const c = createTable();
    expect(
      c.transferStatusBadgeClass(minimalProcess({ state: TransferProcessStates.COMPLETED, type: 'CONSUMER' })),
    ).toBe('badge-success');
    expect(
      c.transferStatusBadgeClass(minimalProcess({ state: TransferProcessStates.TERMINATED, type: 'CONSUMER' })),
    ).toBe('badge-error');
    expect(
      c.transferStatusBadgeClass(minimalProcess({ state: TransferProcessStates.DEPROVISIONED, type: 'PROVIDER' })),
    ).toBe('badge-error');
    expect(
      c.transferStatusBadgeClass(minimalProcess({ state: TransferProcessStates.SUSPENDED, type: 'CONSUMER' })),
    ).toBe('badge-error');
    expect(
      c.transferStatusBadgeClass(
        minimalProcess({
          state: TransferProcessStates.STARTED,
          type: 'CONSUMER',
          transferType: 'HttpData-PUSH',
        }),
      ),
    ).toBe('badge-info');
    expect(
      c.transferStatusBadgeClass(
        minimalProcess({
          state: TransferProcessStates.STARTED,
          type: 'CONSUMER',
          transferType: 'HttpData-PULL',
        }),
      ),
    ).toBe('badge-success');
    expect(
      c.transferStatusBadgeClass(minimalProcess({ state: TransferProcessStates.REQUESTED, type: 'CONSUMER' })),
    ).toBe('badge-info');
    expect(c.transferStatusBadgeClass(minimalProcess({ state: TransferProcessStates.INITIAL, type: 'CONSUMER' }))).toBe(
      'badge-warning',
    );
    expect(
      c.transferStatusBadgeClass(minimalProcess({ state: TransferProcessStates.PROVISIONED, type: 'CONSUMER' })),
    ).toBe('badge-warning');
  });

  it('translates transfer state labels with fallback', () => {
    const c = createTable();
    expect(c.transferStateLabel('COMPLETED')).toBe('Completada ES');
    expect(c.transferStateLabel('WEIRD')).toBe('UNKNOWN_STATE (WEIRD)');
    expect(c.transferStateLabel(undefined)).toBe('-');
  });

  it('resolves asset display from catalog map', () => {
    const c = createTable();
    (c as unknown as { assetDisplayByAssetId: Map<string, string> }).assetDisplayByAssetId = new Map([
      ['aid-1', 'Nombre catálogo'],
    ]);
    expect(c.assetDisplay({ assetId: 'aid-1', id: 't1' } as unknown as TransferProcess)).toBe('Nombre catálogo');
    expect(c.assetDisplay({ assetId: 'unknown', id: 't2' } as unknown as TransferProcess)).toBe('ASSET_PENDING_I18N');
    expect(c.assetDisplay({ assetId: 'no-map', id: 't3' } as unknown as TransferProcess)).toBe('no-map');
  });

  it('detects pending asset display during enrichment', () => {
    const c = createTable();
    const process = { assetId: 'no-map', id: 't3' } as unknown as TransferProcess;
    expect(c.isAssetDisplayPending(process)).toBeFalse();
    (c as unknown as { assetEnrichmentInProgress: boolean }).assetEnrichmentInProgress = true;
    expect(c.isAssetDisplayPending(process)).toBeTrue();
    (c as unknown as { assetDisplayByAssetId: Map<string, string> }).assetDisplayByAssetId = new Map([
      ['no-map', 'Resolved'],
    ]);
    expect(c.isAssetDisplayPending(process)).toBeFalse();
  });

  it('uses reduced colspan when provider view hides archivo recibido column', () => {
    const c = createTable();
    expect(c.tableColspan).toBe(6);
    (c as unknown as { isProviderView: boolean }).isProviderView = true;
    expect(c.tableColspan).toBe(5);
  });

  it('shows prepared transfer link only for consumer pull before started', () => {
    const c = createTable();
    expect(
      c.canShowPreparedTransferIcon(
        minimalProcess({
          state: TransferProcessStates.PROVISIONED,
          type: 'CONSUMER',
          transferType: 'HttpData-PULL',
        }),
      ),
    ).toBe(true);
    expect(
      c.canShowPreparedTransferIcon(
        minimalProcess({
          state: TransferProcessStates.REQUESTED,
          type: 'CONSUMER',
          transferType: 'HttpData-PULL',
        }),
      ),
    ).toBe(true);
    expect(
      c.canShowPreparedTransferIcon(
        minimalProcess({
          state: TransferProcessStates.COMPLETED,
          type: 'CONSUMER',
          transferType: 'HttpData-PULL',
        }),
      ),
    ).toBe(false);
    expect(
      c.canShowPreparedTransferIcon(
        minimalProcess({
          state: TransferProcessStates.PROVISIONED,
          type: 'PROVIDER',
          transferType: 'HttpData-PULL',
        }),
      ),
    ).toBe(false);
    expect(
      c.canShowPreparedTransferIcon(
        minimalProcess({
          state: TransferProcessStates.PROVISIONED,
          type: 'CONSUMER',
          transferType: 'HttpData-PUSH',
        }),
      ),
    ).toBe(false);
  });

  it('hides file column icons for non-pull transfers', () => {
    const c = createTable();
    expect(
      c.canShowArchivoRecibido(
        minimalProcess({
          state: TransferProcessStates.COMPLETED,
          type: 'CONSUMER',
          transferType: 'HttpData-PUSH',
        }),
      ),
    ).toBeFalse();
    expect(
      c.canShowPullExecuteIcon(
        minimalProcess({
          state: TransferProcessStates.STARTED,
          type: 'CONSUMER',
          transferType: 'HttpData-PUSH',
        }),
      ),
    ).toBeFalse();
  });

  it('shows pull execute icon only for consumer pull in started state', () => {
    const c = createTable();
    expect(
      c.canShowPullExecuteIcon(
        minimalProcess({
          state: TransferProcessStates.STARTED,
          type: 'CONSUMER',
          transferType: 'HttpData-PULL',
        }),
      ),
    ).toBe(true);
    expect(
      c.canShowPullExecuteIcon(
        minimalProcess({
          state: TransferProcessStates.COMPLETED,
          type: 'CONSUMER',
          transferType: 'HttpData-PULL',
        }),
      ),
    ).toBe(false);
    expect(
      c.canShowPullExecuteIcon(
        minimalProcess({
          state: TransferProcessStates.STARTED,
          type: 'PROVIDER',
          transferType: 'HttpData-PULL',
        }),
      ),
    ).toBe(false);
    expect(
      c.canShowPullExecuteIcon(
        minimalProcess({
          state: TransferProcessStates.STARTED,
          type: 'CONSUMER',
          transferType: 'HttpData-PUSH',
        }),
      ),
    ).toBe(false);
    expect(
      c.canShowPullExecuteIcon(
        minimalProcess({
          state: TransferProcessStates.PROVISIONED,
          type: 'CONSUMER',
          transferType: 'HttpData-PULL',
        }),
      ),
    ).toBe(false);
    expect(
      c.canShowPreparedTransferIcon(
        minimalProcess({
          state: TransferProcessStates.STARTED,
          type: 'CONSUMER',
          transferType: 'HttpData-PULL',
        }),
      ),
    ).toBe(false);
  });

  it('shows archivo recibido only for completed consumer pull', () => {
    const c = createTable();
    expect(
      c.canShowArchivoRecibido(
        minimalProcess({
          state: TransferProcessStates.COMPLETED,
          type: 'CONSUMER',
          transferType: 'HttpData-PULL',
        }),
      ),
    ).toBeTrue();
    expect(
      c.canShowArchivoRecibido(
        minimalProcess({
          state: TransferProcessStates.COMPLETED,
          type: 'CONSUMER',
          transferType: 'HttpData-PUSH',
        }),
      ),
    ).toBeFalse();
  });
});

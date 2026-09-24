import type { MenuItem } from '@eclipse-edc/dashboard-core';
import { CONNECTOR_GROUP_TEXT_KEY } from '../constants/roles.constants';
import { filterMenuItemsForPublisherRole } from './menu-items-by-role.util';

function sampleMenuItems(): MenuItem[] {
  return [
    { textKey: 'menu.home', materialSymbol: 'Home', routerPath: 'home' },
    { textKey: 'menu.catalog', materialSymbol: 'star', routerPath: 'catalog' },
    { textKey: CONNECTOR_GROUP_TEXT_KEY, materialSymbol: '', routerPath: '', isGroupTitle: true },
    { textKey: 'menu.assets', materialSymbol: 'Content_Paste', routerPath: 'assets' },
    { textKey: 'menu.policies', materialSymbol: 'Verified_User', routerPath: 'policies' },
    { textKey: 'menu.offers', materialSymbol: 'star', routerPath: 'contract-definitions' },
  ];
}

describe('filterMenuItemsForPublisherRole', () => {
  it('removes catalog for publishers', () => {
    const filtered = filterMenuItemsForPublisherRole(sampleMenuItems(), true);

    expect(filtered.some(i => i.routerPath === 'catalog')).toBeFalse();
    expect(filtered.some(i => i.routerPath === 'assets')).toBeTrue();
    expect(filtered.some(i => i.routerPath === 'contract-definitions')).toBeTrue();
  });

  it('removes connector group and publisher routes for non-publishers', () => {
    const filtered = filterMenuItemsForPublisherRole(sampleMenuItems(), false);

    expect(filtered.map(i => i.textKey)).toEqual(['menu.home', 'menu.catalog']);
    expect(filtered.some(i => i.routerPath === 'assets')).toBeFalse();
    expect(filtered.some(i => i.routerPath === 'catalog')).toBeTrue();
    expect(filtered.some(i => i.textKey === CONNECTOR_GROUP_TEXT_KEY)).toBeFalse();
  });

  it('keeps every item for a user with both publisher and consumer roles', () => {
    const filtered = filterMenuItemsForPublisherRole(sampleMenuItems(), true, true);

    expect(filtered).toEqual(sampleMenuItems());
  });
});

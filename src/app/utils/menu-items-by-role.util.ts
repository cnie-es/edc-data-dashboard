import type { MenuItem } from '@eclipse-edc/dashboard-core';
import {
  CONNECTOR_GROUP_TEXT_KEY,
  CONSUMER_MENU_ROUTER_PATHS,
  PUBLISHER_MENU_ROUTER_PATHS,
} from '../constants/roles.constants';

const PUBLISHER_PATHS = new Set<string>(PUBLISHER_MENU_ROUTER_PATHS);
const CONSUMER_PATHS = new Set<string>(CONSUMER_MENU_ROUTER_PATHS);

export function filterMenuItemsForPublisherRole(
  menuItems: MenuItem[],
  isPublisher: boolean,
  isConsumer = !isPublisher,
): MenuItem[] {
  // A user with both roles (hybrid participant) keeps the full menu rather
  // than having either role's items stripped.
  if (isPublisher && isConsumer) {
    return menuItems;
  }

  if (isPublisher) {
    return menuItems.filter(item => !(item.routerPath && CONSUMER_PATHS.has(item.routerPath)));
  }

  return menuItems.filter(item => {
    if (item.isGroupTitle && item.textKey === CONNECTOR_GROUP_TEXT_KEY) {
      return false;
    }
    if (item.routerPath && PUBLISHER_PATHS.has(item.routerPath)) {
      return false;
    }
    return true;
  });
}

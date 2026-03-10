import type { ShoppingList, ShoppingListItem } from '../api/shoppingLists';
import type { ShoppingListSummaryViewModel, StatusTagType } from '../viewmodels/uiMigration';

function flattenItems(list: ShoppingList): ShoppingListItem[] {
  return Object.values(list.items || {}).flat();
}

export function getShoppingItemStatus(item: ShoppingListItem): StatusTagType {
  if (item.checked) return 'pantry-covered';
  if (item.source === 'both') return 'few-missing';
  return 'on-shopping-list';
}

export function mapShoppingListToSummary(list: ShoppingList | null): ShoppingListSummaryViewModel | null {
  if (!list) return null;
  const items = flattenItems(list);
  const totalItems = list.total_items ?? items.length;
  const uncheckedItems = list.unchecked_items ?? items.filter(item => !item.checked).length;
  const coveredCount = list.inventory_summary?.covered_count ?? items.filter(item => item.checked).length;
  const missingCount = list.inventory_summary?.missing_count ?? Math.max(uncheckedItems, 0);
  const pantryCoverageRatio = totalItems > 0 ? coveredCount / totalItems : 0;

  return {
    listId: list.id,
    totalItems,
    uncheckedItems,
    coveredCount,
    missingCount,
    pantryCoverageRatio,
    itemStatuses: items.slice(0, 6).map(item => ({
      name: item.name,
      status: getShoppingItemStatus(item),
      detail: item.amount,
    })),
  };
}

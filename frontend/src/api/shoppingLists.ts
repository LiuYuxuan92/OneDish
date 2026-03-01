import { apiClient } from './client';

export const V2_CATEGORIES = [
  'produce',
  'protein',
  'staple',
  'seasoning',
  'snack_dairy',
  'household',
  'other',
] as const;

export type ShoppingCategory = typeof V2_CATEGORIES[number];

const normalizeCategory = (category?: string): ShoppingCategory => {
  const key = (category || '').trim().toLowerCase();

  const aliasMap: Record<string, ShoppingCategory> = {
    // v2
    produce: 'produce',
    protein: 'protein',
    staple: 'staple',
    seasoning: 'seasoning',
    snack_dairy: 'snack_dairy',
    snackdairy: 'snack_dairy',
    household: 'household',
    other: 'other',

    // legacy area -> v2
    '蔬果区': 'produce',
    '超市区': 'other',
    '调料区': 'seasoning',
    '其他': 'other',

    // common aliases
    supermarket: 'other',
    market: 'other',
    grocery: 'other',
    vegetable: 'produce',
    fruit: 'produce',
    spice: 'seasoning',
    condiment: 'seasoning',
    misc: 'other',
    miscellaneous: 'other',
  };

  return aliasMap[key] || aliasMap[category || ''] || 'other';
};

const normalizeItems = (items?: Record<string, ShoppingListItem[]>): Record<ShoppingCategory, ShoppingListItem[]> => {
  const normalized: Record<ShoppingCategory, ShoppingListItem[]> = {
    produce: [],
    protein: [],
    staple: [],
    seasoning: [],
    snack_dairy: [],
    household: [],
    other: [],
  };

  if (!items || typeof items !== 'object') {
    return normalized;
  }

  Object.entries(items).forEach(([category, categoryItems]) => {
    const target = normalizeCategory(category);
    const list = Array.isArray(categoryItems) ? categoryItems : [];
    normalized[target].push(...list);
  });

  return normalized;
};

const normalizeShoppingList = (list: ShoppingList): ShoppingList => ({
  ...list,
  items: normalizeItems(list?.items),
});

export interface ShoppingListItem {
  ingredient_id?: string;
  name: string;
  amount: string;
  estimated_price?: number;
  checked: boolean;
  note?: string;
  recipes?: string[];
  source?: 'adult' | 'baby' | 'both';
  amount_adult?: string;
  amount_baby?: string;
  category?: ShoppingCategory;
}

export interface ShoppingListShareMember {
  user_id: string;
  display_name?: string;
  avatar_url?: string | null;
}

export interface ShoppingList {
  id: string;
  user_id: string;
  list_date: string;
  items: Record<ShoppingCategory, ShoppingListItem[]>;
  total_estimated_cost: number;
  total_items?: number;
  unchecked_items?: number;
  is_completed: boolean;
  created_at: string;
  share?: {
    share_id: string;
    role: 'owner' | 'member';
    owner_id: string;
    invite_code: string;
    share_link: string;
    members: ShoppingListShareMember[];
  } | null;
}

export interface ShoppingListShare {
  id: string;
  list_id: string;
  owner_id: string;
  invite_code: string;
  share_link: string;
}

export interface ShoppingListsResponse {
  items: ShoppingList[];
}

export interface GenerateShoppingListParams {
  date: string;
  meal_types?: string[];
  servings?: number;
}

export const shoppingListsApi = {
  generate: async (data: GenerateShoppingListParams) => {
    const res = await apiClient.post<ShoppingList>('/shopping-lists/generate', data);
    return { ...res, data: normalizeShoppingList(res.data) };
  },
  addRecipe: async (data: { recipe_id: string; list_date?: string; servings?: number }) => {
    const res = await apiClient.post<ShoppingList>('/shopping-lists/add-recipe', data);
    return { ...res, data: normalizeShoppingList(res.data) };
  },
  getAll: async (params?: { start_date?: string; end_date?: string }) => {
    const res = await apiClient.get<ShoppingListsResponse>('/shopping-lists', { params });
    return { ...res, data: { ...res.data, items: (res.data?.items || []).map(normalizeShoppingList) } };
  },
  getById: async (listId: string) => {
    const res = await apiClient.get<ShoppingList>(`/shopping-lists/${listId}`);
    return { ...res, data: normalizeShoppingList(res.data) };
  },
  updateItem: async (listId: string, data: { area: string; ingredient_id: string; checked: boolean }) => {
    const res = await apiClient.put<ShoppingList>(`/shopping-lists/${listId}/items`, data);
    return { ...res, data: normalizeShoppingList(res.data) };
  },
  removeItem: async (listId: string, data: { area: string; item_name: string }) => {
    const res = await apiClient.delete<ShoppingList>(`/shopping-lists/${listId}/items`, { data });
    return { ...res, data: normalizeShoppingList(res.data) };
  },
  addItem: async (listId: string, data: { item_name: string; amount: string; area?: string }) => {
    const res = await apiClient.post<ShoppingList>(`/shopping-lists/${listId}/items`, data);
    return { ...res, data: normalizeShoppingList(res.data) };
  },
  toggleAll: async (listId: string, data: { checked: boolean }) => {
    const res = await apiClient.put<ShoppingList>(`/shopping-lists/${listId}/toggle-all`, data);
    return { ...res, data: normalizeShoppingList(res.data) };
  },
  markComplete: (listId: string) => apiClient.put(`/shopping-lists/${listId}/complete`),
  createShare: (listId: string) => apiClient.post<ShoppingListShare>(`/shopping-lists/${listId}/share`),
  joinShare: (invite_code: string) => apiClient.post<{ share_id: string; list_id: string; role: 'owner' | 'member' }>(`/shopping-lists/share/join`, { invite_code }),
  regenerateShareInvite: (listId: string) => apiClient.post<ShoppingListShare & { old_invite_code: string }>(`/shopping-lists/${listId}/share/regenerate`),
  removeShareMember: (listId: string, memberId: string) => apiClient.delete(`/shopping-lists/${listId}/share/members/${memberId}`),
};

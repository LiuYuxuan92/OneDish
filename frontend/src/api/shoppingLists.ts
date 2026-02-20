import { apiClient } from './client';

export interface ShoppingListItem {
  ingredient_id?: string;
  name: string;
  amount: string;
  estimated_price?: number;
  checked: boolean;
  note?: string;
  recipes?: string[];
  source?: 'adult' | 'baby' | 'both'; // 食材来源：大人版/宝宝版/共用
  amount_adult?: string; // 大人版数量（共用食材时）
  amount_baby?: string; // 宝宝版数量（共用食材时）
}

export interface ShoppingList {
  id: string;
  user_id: string;
  list_date: string;
  items: Record<string, ShoppingListItem[]>;
  total_estimated_cost: number;
  total_items?: number;
  unchecked_items?: number;
  is_completed: boolean;
  created_at: string;
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
  // 生成购物清单
  generate: (data: GenerateShoppingListParams) =>
    apiClient.post<ShoppingList>('/shopping-lists/generate', data),

  // 将单个菜谱加入购物清单
  addRecipe: (data: {
    recipe_id: string;
    list_date?: string;
    servings?: number;
  }) =>
    apiClient.post<ShoppingList>('/shopping-lists/add-recipe', data),

  // 获取历史购物清单
  getAll: (params?: { start_date?: string; end_date?: string }) =>
    apiClient.get<ShoppingListsResponse>('/shopping-lists', { params }),

  // 获取单个购物清单详情
  getById: (listId: string) =>
    apiClient.get<ShoppingList>(`/shopping-lists/${listId}`),

  // 更新购物清单项状态
  updateItem: (listId: string, data: {
    area: string;
    ingredient_id: string;
    checked: boolean;
  }) =>
    apiClient.put<ShoppingList>(`/shopping-lists/${listId}/items`, data),

  // 删除购物清单项
  removeItem: (listId: string, data: {
    area: string;
    item_name: string;
  }) =>
    apiClient.delete<ShoppingList>(`/shopping-lists/${listId}/items`, { data }),

  // 手动添加购物清单项
  addItem: (listId: string, data: {
    item_name: string;
    amount: string;
    area?: string;
  }) =>
    apiClient.post<ShoppingList>(`/shopping-lists/${listId}/items`, data),

  // 全选/取消全选
  toggleAll: (listId: string, data: { checked: boolean }) =>
    apiClient.put<ShoppingList>(`/shopping-lists/${listId}/toggle-all`, data),

  // 标记清单为完成
  markComplete: (listId: string) =>
    apiClient.put(`/shopping-lists/${listId}/complete`),
};

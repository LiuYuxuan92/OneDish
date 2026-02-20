import { apiClient } from './client';

// ============================================
// 类型定义
// ============================================

export interface IngredientInventory {
  id: string;
  user_id: string;
  ingredient_id: string | null;
  ingredient_name: string;
  quantity: number;
  unit: string;
  expiry_date: string | null;
  purchase_date: string | null;
  location: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryStats {
  total: number;
  expiring: number;
  expired: number;
}

export interface InventoryResponse {
  inventory: IngredientInventory[];
  stats: InventoryStats;
}

export interface AddInventoryParams {
  ingredient_id?: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  expiry_date?: string;
  purchase_date?: string;
  location?: string;
  notes?: string;
}

export interface UpdateInventoryParams {
  quantity?: number;
  unit?: string;
  expiry_date?: string;
  location?: string;
  notes?: string;
  is_active?: boolean;
}

// ============================================
// API 函数
// ============================================

export const ingredientInventoryApi = {
  // 获取用户食材库存
  getInventory: () => {
    return apiClient.get<InventoryResponse>('/ingredient-inventory');
  },

  // 添加食材到库存
  addInventory: (params: AddInventoryParams) => {
    return apiClient.post<IngredientInventory>('/ingredient-inventory', params);
  },

  // 更新食材库存
  updateInventory: (id: string, params: UpdateInventoryParams) => {
    return apiClient.put<IngredientInventory>(`/ingredient-inventory/${id}`, params);
  },

  // 删除食材库存
  deleteInventory: (id: string) => {
    return apiClient.delete(`/ingredient-inventory/${id}`);
  },

  // 批量删除食材库存
  batchDeleteInventory: (ids: string[]) => {
    return apiClient.post('/ingredient-inventory/batch-delete', { ids });
  },

  // 获取即将过期的食材
  getExpiringItems: (days: number = 3) => {
    return apiClient.get<IngredientInventory[]>('/ingredient-inventory/expiring', {
      params: { days },
    });
  },
};

export default ingredientInventoryApi;

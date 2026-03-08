import { Knex } from 'knex';
import { db } from '../../config/database';

export interface InventoryCoverageItem {
  name: string;
  required_amount: string;
  inventory_amount: string;
  covered_amount?: string;
  missing_amount?: string;
  unit: string;
  fully_covered: boolean;
  coverage_ratio: number;
  inventory_matches: Array<{
    inventory_id: string;
    quantity: number;
    unit: string;
    expiry_date?: string | null;
  }>;
  source?: string;
  source_date?: string;
  source_meal_type?: string;
  source_recipe_id?: string;
  servings?: number;
  category?: string;
}

export interface ShoppingCoverageSummary {
  covered_items: InventoryCoverageItem[];
  missing_items: InventoryCoverageItem[];
  expiring_items: Array<{
    inventory_id: string;
    ingredient_name: string;
    quantity: number;
    unit: string;
    expiry_date?: string | null;
    category?: string;
  }>;
  total_required_items: number;
  covered_count: number;
  missing_count: number;
}

export class ShoppingListInventoryService {
  private readonly DEFAULT_EXPIRING_DAYS = 3;

  async buildCoverageSummary(userId: string, itemsByCategory: Record<string, any[]>): Promise<ShoppingCoverageSummary> {
    const flatItems = Object.entries(itemsByCategory || {}).flatMap(([category, items]) =>
      (Array.isArray(items) ? items : []).map((item: any) => ({ ...item, category: item?.category || category }))
    );

    const ingredientNames = Array.from(new Set(flatItems.map((item) => item?.name).filter(Boolean)));
    const inventoryRows = ingredientNames.length > 0
      ? await db('ingredient_inventory')
        .where('user_id', userId)
        .where('quantity', '>', 0)
        .whereIn('ingredient_name', ingredientNames)
        .orderByRaw('CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END ASC')
        .orderBy('expiry_date', 'asc')
        .orderBy('id', 'asc')
      : [];

    const inventoryMap = new Map<string, any[]>();
    inventoryRows.forEach((row: any) => {
      const key = this.normalizeIngredientName(row.ingredient_name);
      const list = inventoryMap.get(key) || [];
      list.push(row);
      inventoryMap.set(key, list);
    });

    const coveredItems: InventoryCoverageItem[] = [];
    const missingItems: InventoryCoverageItem[] = [];

    for (const item of flatItems) {
      const coverage = this.evaluateCoverage(item, inventoryMap.get(this.normalizeIngredientName(item.name)) || []);
      if (coverage.fully_covered) {
        coveredItems.push(coverage);
      } else {
        missingItems.push(coverage);
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiringDate = new Date(today);
    expiringDate.setDate(expiringDate.getDate() + this.DEFAULT_EXPIRING_DAYS);

    const expiringItems = inventoryRows.filter((row: any) => {
      if (!row.expiry_date) return false;
      const expiry = new Date(row.expiry_date);
      return expiry >= today && expiry <= expiringDate;
    }).map((row: any) => ({
      inventory_id: row.id,
      ingredient_name: row.ingredient_name,
      quantity: Number(row.quantity || 0),
      unit: row.unit || '',
      expiry_date: row.expiry_date || null,
      category: this.inferCategory(row.ingredient_name),
    }));

    return {
      covered_items: coveredItems,
      missing_items: missingItems,
      expiring_items: expiringItems,
      total_required_items: flatItems.length,
      covered_count: coveredItems.length,
      missing_count: missingItems.length,
    };
  }

  async consumeIngredientsForRecipe(userId: string, ingredients: any[], trx?: Knex.Transaction): Promise<void> {
    const runner = trx || db;

    for (const ingredient of ingredients || []) {
      const name = ingredient?.name;
      if (!name) continue;

      const required = this.parseAmount(ingredient.amount || '1');
      const normalizedName = this.normalizeIngredientName(name);

      const inventoryItems = await runner('ingredient_inventory')
        .where('user_id', userId)
        .where('ingredient_name', name)
        .where('quantity', '>', 0)
        .orderByRaw('CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END ASC')
        .orderBy('expiry_date', 'asc')
        .orderBy('id', 'asc')
        .select('*');

      if (!inventoryItems.length) {
        continue;
      }

      let remaining = required.value > 0 ? required.value : 1;
      let consumedAny = false;

      for (const item of inventoryItems) {
        if (remaining <= 0) break;

        if (this.normalizeIngredientName(item.ingredient_name) !== normalizedName) {
          continue;
        }

        const availableQty = Number(item.quantity || 0);
        if (availableQty <= 0) continue;

        if (required.unit && item.unit && !this.areUnitsCompatible(required.unit, item.unit)) {
          continue;
        }

        const inventoryUnit = item.unit || required.unit || '';
        const requiredInInventoryUnit = required.unit && inventoryUnit
          ? this.convertValue(required.value, required.unit, inventoryUnit)
          : remaining;

        const remainingNeeded = required.unit && inventoryUnit
          ? this.convertValue(remaining, required.unit, inventoryUnit)
          : remaining;

        const consumeQty = Math.min(availableQty, remainingNeeded > 0 ? remainingNeeded : 1);
        if (consumeQty <= 0) continue;

        consumedAny = true;
        const nextQty = Number((availableQty - consumeQty).toFixed(4));

        if (nextQty <= 0.0001) {
          await runner('ingredient_inventory').where('id', item.id).delete();
        } else {
          await runner('ingredient_inventory').where('id', item.id).update({ quantity: nextQty });
        }

        remaining = Math.max(0, remaining - (required.unit && inventoryUnit
          ? this.convertValue(consumeQty, inventoryUnit, required.unit)
          : consumeQty));
      }

      if (!consumedAny) {
        const fallback = inventoryItems[0];
        const nextQty = Math.max(0, Number(fallback.quantity || 0) - 1);
        if (nextQty <= 0.0001) {
          await runner('ingredient_inventory').where('id', fallback.id).delete();
        } else {
          await runner('ingredient_inventory').where('id', fallback.id).update({ quantity: nextQty });
        }
      }
    }
  }

  async restockCheckedShoppingItems(userId: string, itemsByCategory: Record<string, any[]>, trx?: Knex.Transaction): Promise<void> {
    const runner = trx || db;

    for (const items of Object.values(itemsByCategory || {})) {
      for (const item of Array.isArray(items) ? items : []) {
        if (!item?.checked || !item?.name) continue;

        const parsedAmount = this.parseAmount(item.amount || '1');
        const quantity = parsedAmount.value > 0 ? parsedAmount.value : 1;
        const unit = parsedAmount.unit || '份';

        const ingredient = await runner('ingredients').where('name', item.name).first();
        const shelfLifeDays = ingredient?.shelf_life || 7;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + shelfLifeDays);

        await runner('ingredient_inventory').insert({
          user_id: userId,
          ingredient_name: item.name,
          quantity,
          unit,
          location: ingredient?.storage_area === '冷藏' ? '冷藏' : '常温',
          purchase_date: new Date().toISOString().split('T')[0],
          expiry_date: expiryDate.toISOString().split('T')[0],
          notes: item.source_recipe_id ? `购物清单回写:${item.source_recipe_id}` : null,
        });
      }
    }
  }

  private evaluateCoverage(item: any, inventoryRows: any[]): InventoryCoverageItem {
    const required = this.parseAmount(item?.amount || '1');
    const unit = required.unit || inventoryRows[0]?.unit || '';
    const requiredValue = required.value > 0 ? required.value : 1;

    let availableValue = 0;
    const matches = inventoryRows.filter((row: any) => {
      if (!unit || !row.unit) return true;
      return this.areUnitsCompatible(unit, row.unit);
    });

    matches.forEach((row: any) => {
      const qty = Number(row.quantity || 0);
      if (qty <= 0) return;
      availableValue += unit && row.unit
        ? this.convertValue(qty, row.unit, unit)
        : qty;
    });

    const coveredValue = Math.min(requiredValue, availableValue);
    const missingValue = Math.max(0, requiredValue - availableValue);
    const fullyCovered = missingValue <= 0.0001;

    return {
      name: item.name,
      required_amount: item.amount || '1',
      inventory_amount: this.formatAmount(availableValue, unit),
      covered_amount: this.formatAmount(coveredValue, unit),
      missing_amount: fullyCovered ? undefined : this.formatAmount(missingValue, unit),
      unit,
      fully_covered: fullyCovered,
      coverage_ratio: requiredValue > 0 ? Math.min(1, Number((coveredValue / requiredValue).toFixed(4))) : 0,
      inventory_matches: matches.map((row: any) => ({
        inventory_id: row.id,
        quantity: Number(row.quantity || 0),
        unit: row.unit || '',
        expiry_date: row.expiry_date || null,
      })),
      source: item.source,
      source_date: item.source_date,
      source_meal_type: item.source_meal_type,
      source_recipe_id: item.source_recipe_id,
      servings: item.servings,
      category: item.category,
    };
  }

  private parseAmount(amount: string): { value: number; unit: string } {
    if (!amount) return { value: 0, unit: '' };
    const match = String(amount).trim().match(/^([\d.]+)\s*(.*)$/);
    if (!match) return { value: 0, unit: String(amount).trim() };
    return {
      value: Number.parseFloat(match[1]) || 0,
      unit: (match[2] || '').trim(),
    };
  }

  private formatAmount(value: number, unit: string): string {
    const normalized = Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
    return `${normalized}${unit || ''}`;
  }

  private normalizeIngredientName(name: string): string {
    return String(name || '').trim().toLowerCase();
  }

  private areUnitsCompatible(unit1: string, unit2: string): boolean {
    const a = this.normalizeUnit(unit1);
    const b = this.normalizeUnit(unit2);
    if (!a || !b) return true;
    if (a === b) return true;

    const groups = [
      ['g', 'kg', 'jin', 'liang'],
      ['ml', 'l', 'tbsp', 'tsp', 'cup'],
      ['个', '只', '枚', '片', '块', '根', '把'],
    ];

    return groups.some((group) => group.includes(a) && group.includes(b));
  }

  private convertValue(value: number, fromUnit: string, toUnit: string): number {
    const from = this.normalizeUnit(fromUnit);
    const to = this.normalizeUnit(toUnit);
    if (!from || !to || from === to) return value;

    const weightToG: Record<string, number> = { g: 1, kg: 1000, jin: 500, liang: 50 };
    const volumeToMl: Record<string, number> = { ml: 1, l: 1000, tbsp: 15, tsp: 5, cup: 240 };

    if (weightToG[from] && weightToG[to]) {
      return (value * weightToG[from]) / weightToG[to];
    }

    if (volumeToMl[from] && volumeToMl[to]) {
      return (value * volumeToMl[from]) / volumeToMl[to];
    }

    return value;
  }

  private normalizeUnit(unit: string): string {
    const map: Record<string, string> = {
      '克': 'g',
      '千克': 'kg',
      '斤': 'jin',
      '两': 'liang',
      '毫升': 'ml',
      '升': 'l',
      '汤匙': 'tbsp',
      '茶匙': 'tsp',
      '杯': 'cup',
    };
    return map[String(unit || '').trim()] || String(unit || '').trim();
  }

  private inferCategory(name: string): string {
    const lowered = this.normalizeIngredientName(name);
    if (/菜|瓜|果|葱|姜|蒜|椒|茄|豆苗|土豆|红薯|玉米|番茄/.test(lowered)) return 'produce';
    if (/肉|鸡|鸭|鱼|虾|牛|猪|蛋|豆腐|豆干|丸/.test(lowered)) return 'protein';
    if (/米|面|粉|馒头|面包|饺子|馄饨|挂面|燕麦/.test(lowered)) return 'staple';
    if (/油|盐|酱|醋|糖|料酒|胡椒|孜然|蚝油|芝麻酱/.test(lowered)) return 'seasoning';
    return 'other';
  }
}

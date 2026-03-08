describe('shopping list closed loop helpers', () => {
  it('accepts only safe merges for same name/category/unit semantics', () => {
    const service: any = new (require('../shoppingList/shoppingListGeneration.service').ShoppingListGenerationService)();
    expect(service.canSafelyMergeItems(
      { name: '鸡蛋', amount: '2个', category: 'protein' },
      { name: '鸡蛋', amount: '3个', category: 'protein' }
    )).toBe(true);
    expect(service.canSafelyMergeItems(
      { name: '鸡蛋', amount: '2个', category: 'protein' },
      { name: '鸡蛋', amount: '300g', category: 'protein' }
    )).toBe(false);
    expect(service.canSafelyMergeItems(
      { name: '鸡蛋', amount: '2个', category: 'protein' },
      { name: '鸡蛋', amount: '2个', category: 'produce' }
    )).toBe(false);
  });

  it('prefers earliest expiry when consuming inventory', async () => {
    const inventoryService: any = new (require('../shoppingList/shoppingListInventory.service').ShoppingListInventoryService)();
    const rows = [
      { id: 'a', ingredient_name: '鸡蛋', quantity: 1, unit: '个', expiry_date: '2026-03-09' },
      { id: 'b', ingredient_name: '鸡蛋', quantity: 3, unit: '个', expiry_date: '2026-03-12' },
    ];
    const touched: string[] = [];
    const runner = ((table: string) => ({
      where: (...args: any[]) => {
        if (table === 'ingredient_inventory' && args[0] === 'user_id') {
          return {
            where: () => ({
              where: () => ({
                orderByRaw: () => ({
                  orderBy: () => ({
                    orderBy: () => ({
                      select: async () => rows,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          delete: async () => { touched.push(`${table}:delete:${args[1]}`); },
          update: async (payload: any) => { touched.push(`${table}:update:${args[1]}:${payload.quantity}`); },
        };
      },
    })) as any;

    await inventoryService.consumeIngredientsForRecipe('u1', [{ name: '鸡蛋', amount: '2个' }], runner);
    expect(touched[0]).toContain('delete:a');
  });
});

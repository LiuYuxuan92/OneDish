import type { Knex } from 'knex';

// UUID 生成函数
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function seed(knex: Knex): Promise<void> {
  // 清空现有数据
  await knex('ingredients').del();

  // 插入食材数据
  const ingredients = [
    // 肉类
    { id: generateUUID(), name: '鸡翅中', name_en: 'Chicken wings mid', category: '肉类', unit: '个', average_price: 25, price_unit: '500g', storage_area: '超市区' },
    { id: generateUUID(), name: '鸡腿肉', name_en: 'Chicken thigh', category: '肉类', unit: 'g', average_price: 20, price_unit: '500g', storage_area: '超市区' },
    { id: generateUUID(), name: '猪排骨', name_en: 'Pork ribs', category: '肉类', unit: 'g', average_price: 35, price_unit: '500g', storage_area: '超市区' },
    { id: generateUUID(), name: '鲈鱼', name_en: 'Sea bass', category: '肉类', unit: '条', average_price: 30, price_unit: '1条', storage_area: '超市区' },
    { id: generateUUID(), name: '三文鱼', name_en: 'Salmon', category: '肉类', unit: 'g', average_price: 50, price_unit: '200g', storage_area: '超市区' },
    { id: generateUUID(), name: '牛肉', name_en: 'Beef', category: '肉类', unit: 'g', average_price: 45, price_unit: '300g', storage_area: '超市区' },
    { id: generateUUID(), name: '猪肉末', name_en: 'Ground pork', category: '肉类', unit: 'g', average_price: 20, price_unit: '300g', storage_area: '超市区' },

    // 蔬菜类
    { id: generateUUID(), name: '胡萝卜', name_en: 'Carrot', category: '蔬菜', unit: '根', average_price: 3, price_unit: '1根', storage_area: '蔬果区' },
    { id: generateUUID(), name: '西兰花', name_en: 'Broccoli', category: '蔬菜', unit: '颗', average_price: 8, price_unit: '1颗', storage_area: '蔬果区' },
    { id: generateUUID(), name: '番茄', name_en: 'Tomato', category: '蔬菜', unit: '个', average_price: 5, price_unit: '2个', storage_area: '蔬果区' },
    { id: generateUUID(), name: '菠菜', name_en: 'Spinach', category: '蔬菜', unit: 'g', average_price: 4, price_unit: '300g', storage_area: '蔬果区' },
    { id: generateUUID(), name: '南瓜', name_en: 'Pumpkin', category: '蔬菜', unit: 'g', average_price: 6, price_unit: '500g', storage_area: '蔬果区' },
    { id: generateUUID(), name: '生姜', name_en: 'Ginger', category: '蔬菜', unit: '块', average_price: 5, price_unit: '1块', storage_area: '蔬果区' },
    { id: generateUUID(), name: '大葱', name_en: 'Green onion', category: '蔬菜', unit: '根', average_price: 3, price_unit: '3根', storage_area: '蔬果区' },
    { id: generateUUID(), name: '洋葱', name_en: 'Onion', category: '蔬菜', unit: '个', average_price: 3, price_unit: '1个', storage_area: '蔬果区' },

    // 主食类
    { id: generateUUID(), name: '大米', name_en: 'Rice', category: '主食', unit: 'g', average_price: 8, price_unit: '500g', storage_area: '超市区' },
    { id: generateUUID(), name: '面条', name_en: 'Noodles', category: '主食', unit: 'g', average_price: 6, price_unit: '400g', storage_area: '超市区' },
    { id: generateUUID(), name: '鸡蛋', name_en: 'Eggs', category: '主食', unit: '个', average_price: 10, price_unit: '10个', storage_area: '超市区' },

    // 调料类
    { id: generateUUID(), name: '酱油', name_en: 'Soy sauce', category: '调料', unit: '瓶', average_price: 15, price_unit: '500ml', storage_area: '调料区' },
    { id: generateUUID(), name: '料酒', name_en: 'Cooking wine', category: '调料', unit: '瓶', average_price: 12, price_unit: '500ml', storage_area: '调料区' },
    { id: generateUUID(), name: '盐', name_en: 'Salt', category: '调料', unit: '袋', average_price: 3, price_unit: '400g', storage_area: '调料区' },
    { id: generateUUID(), name: '食用油', name_en: 'Cooking oil', category: '调料', unit: '桶', average_price: 25, price_unit: '1.8L', storage_area: '调料区' },
    { id: generateUUID(), name: '醋', name_en: 'Vinegar', category: '调料', unit: '瓶', average_price: 10, price_unit: '500ml', storage_area: '调料区' },
    { id: generateUUID(), name: '白糖', name_en: 'Sugar', category: '调料', unit: '袋', average_price: 8, price_unit: '400g', storage_area: '调料区' },

    // 水果类
    { id: generateUUID(), name: '苹果', name_en: 'Apple', category: '水果', unit: '个', average_price: 5, price_unit: '1个', storage_area: '蔬果区' },
    { id: generateUUID(), name: '香蕉', name_en: 'Banana', category: '水果', unit: '根', average_price: 3, price_unit: '1根', storage_area: '蔬果区' },
  ];

  await knex('ingredients').insert(ingredients);
}

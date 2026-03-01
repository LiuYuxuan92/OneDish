import { Router } from 'express';
import { ShoppingListController } from '../controllers/shoppingList.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const shoppingListController = new ShoppingListController();

// 所有路由需要认证
router.use(authenticate);

// 生成购物清单
router.post('/generate', shoppingListController.generateShoppingList);

// 将单个菜谱加入购物清单
router.post('/add-recipe', shoppingListController.addRecipeToShoppingList);

// 获取历史购物清单
router.get('/', shoppingListController.getShoppingLists);

// 获取单个购物清单详情
router.get('/:listId', shoppingListController.getShoppingListById);

// 生成共享链接
router.post('/:listId/share', shoppingListController.createShareLink);

// 通过邀请码加入共享清单
router.post('/share/join', shoppingListController.joinByInviteCode);

// 失效并重置邀请码
router.post('/:listId/share/regenerate', shoppingListController.regenerateShareInvite);

// owner 移除成员
router.delete('/:listId/share/members/:memberId', shoppingListController.removeShareMember);

// 更新购物清单项状态
router.put('/:listId/items', shoppingListController.updateListItem);

// 删除购物清单项
router.delete('/:listId/items', shoppingListController.removeListItem);

// 手动添加购物清单项
router.post('/:listId/items', shoppingListController.addListItem);

// 全选/取消全选
router.put('/:listId/toggle-all', shoppingListController.toggleAllItems);

// 标记清单为完成
router.put('/:listId/complete', shoppingListController.markComplete);

export default router;

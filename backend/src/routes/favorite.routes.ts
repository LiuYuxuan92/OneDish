import { Router } from 'express';
import { FavoriteController } from '../controllers/favorite.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const favoriteController = new FavoriteController();

// 所有路由需要认证
router.use(authenticate);

// 添加收藏
router.post('/', favoriteController.addFavorite);

// 取消收藏
router.delete('/:recipeId', favoriteController.removeFavorite);

// 获取收藏列表
router.get('/', favoriteController.getFavorites);

// 检查是否已收藏
router.get('/check/:recipeId', favoriteController.checkFavorite);

export default router;

import { Router } from 'express';
import { BabyStageController } from '../controllers/baby-stage.controller';

const router = Router();
const controller = new BabyStageController();

router.get('/', controller.getAll);
router.get('/by-age/:months', controller.getByAge);
router.get('/:stage', controller.getByStage);
router.get('/:stage/recipes', controller.getRecipes);

export default router;

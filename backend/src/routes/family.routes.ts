import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { FamilyController } from '../controllers/family.controller';

const router = Router();
const controller = new FamilyController();

router.use(authenticate);
router.get('/me', controller.getMyFamily);
router.post('/', controller.createFamily);
router.post('/join', controller.joinFamily);
router.post('/:familyId/regenerate', controller.regenerateInvite);
router.delete('/:familyId/members/:memberId', controller.removeMember);

export default router;

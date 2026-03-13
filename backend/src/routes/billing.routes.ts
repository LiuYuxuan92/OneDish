import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { billingController } from '../controllers/billing.controller';

const router = Router();

router.get('/products', billingController.getProducts);
router.get('/feature-matrix', billingController.getFeatureMatrix);

router.use(authenticate);

router.get('/me/summary', billingController.getMySummary);
router.post('/orders', billingController.createOrder);
router.post('/orders/:orderId/dev-confirm-paid', billingController.devConfirmPaid);
router.post('/dev/grant-product', billingController.devGrantProduct);
router.post('/dev/reset-quotas', billingController.devResetQuotas);
router.post('/dev/clear-benefits', billingController.devClearBenefits);

export default router;

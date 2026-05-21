import { Router } from 'express';
import { listPayments, initiatePayment, confirmPayment, adminUpdatePayment, getPaymentSummary } from '../controllers/payments.controller';
import { authenticate } from '../middleware/auth';
import { isAdmin, isAnyRole } from '../middleware/roles';

const router = Router();

router.get('/', authenticate, isAnyRole, listPayments);
router.get('/summary', authenticate, isAdmin, getPaymentSummary);
router.post('/initiate', authenticate, isAnyRole, initiatePayment);
router.post('/confirm', authenticate, isAnyRole, confirmPayment);
router.patch('/:id/status', authenticate, isAdmin, adminUpdatePayment);

export default router;

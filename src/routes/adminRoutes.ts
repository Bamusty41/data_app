import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { PricingController } from '../admin/controllers/pricingController';
import { TransactionAdminController } from '../admin/controllers/transactionController';
import { UserAdminController } from '../admin/controllers/userAdminController';

const router = Router();

// Overview & Health Check
router.get('/overview', AdminController.getOverview);
router.get('/provider-balances', AdminController.getProviderBalances);
router.get('/provider-config', AdminController.getProviderConfig);
router.patch('/provider-config', AdminController.setProviderConfig);

// Pricing Manager
router.get('/pricing', PricingController.list);
router.post('/pricing', PricingController.create);
router.patch('/pricing/:id', PricingController.update);
router.delete('/pricing/:id', PricingController.delete);

// Transaction Monitor
router.get('/transactions', TransactionAdminController.list);
router.post('/transactions/:transactionId/retry', TransactionAdminController.retry);
router.post('/transactions/:transactionId/refund', TransactionAdminController.refund);

// User Management
router.get('/users', UserAdminController.search);
router.get('/users/:userId', UserAdminController.detail);
router.post('/users/:userId/adjust-balance', UserAdminController.adjustBalance);
router.patch('/users/:userId/status', UserAdminController.updateStatus);

export default router;

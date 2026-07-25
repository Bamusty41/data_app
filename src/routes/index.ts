import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { WalletController } from '../controllers/walletController';
import { VTUController } from '../controllers/vtuController';

const router = Router();

// User Routes
router.post('/users/register', UserController.register);
router.get('/users/:id', UserController.getUser);
router.patch('/users/:id/status', UserController.updateStatus);

// Wallet Routes
router.get('/wallets/:userId', WalletController.getBalance);
router.post('/wallets/fund', WalletController.fundWallet);
router.get('/wallets/:walletId/ledger', WalletController.getLedgerHistory);

// VTU & Transaction Routes
router.post('/vtu/purchase', VTUController.purchaseAirtimeOrData);
router.get('/transactions/reference/:reference', VTUController.getTransaction);
router.get('/transactions/user/:userId', VTUController.getUserHistory);

export default router;

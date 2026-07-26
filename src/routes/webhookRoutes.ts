import { Router } from 'express';
import { WebhookController } from '../controllers/webhookController';
import { webhookAuth } from '../middleware/webhookAuth';

const webhookRouter = Router();

// Strowallet Automated Bank Transfer Webhook Endpoint
webhookRouter.post('/strowallet', webhookAuth, WebhookController.handleStrowalletWebhook);

export default webhookRouter;

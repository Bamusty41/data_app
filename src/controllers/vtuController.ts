import { Request, Response } from 'express';
import { VtuService } from '../services/vtu/vtuService';
import { ServiceType, Network } from '../types/enums';

export class VTUController {
  /**
   * POST /api/v1/vtu/purchase
   * Resilient purchase endpoint with Primary → Fallback → Refund pipeline.
   */
  static async purchaseAirtimeOrData(req: Request, res: Response) {
    try {
      const {
        userId,
        transactionPin,
        reference,
        serviceType,
        network,
        phoneNumber,
        planId,
        amount,
      } = req.body;

      if (!userId || !transactionPin || !reference || !serviceType || !network || !phoneNumber || !amount) {
        return res.status(400).json({ error: 'Missing required parameters for VTU purchase' });
      }

      if (!Object.values(ServiceType).includes(serviceType)) {
        return res.status(400).json({ error: 'Invalid serviceType. Must be AIRTIME or DATA' });
      }

      if (!Object.values(Network).includes(network)) {
        return res.status(400).json({ error: 'Invalid network. Must be MTN, AIRTEL, GLO, or NINE_MOBILE' });
      }

      const result = await VtuService.processPurchase({
        userId,
        transactionPin,
        reference,
        serviceType: serviceType as ServiceType,
        network: network as Network,
        phoneNumber,
        planId,
        amount: Number(amount),
      });

      const statusCode = result.success ? 200 : 400;
      return res.status(statusCode).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/vtu/balances
   * Fetches API wallet balances from all registered providers.
   */
  static async getProviderBalances(req: Request, res: Response) {
    try {
      const balances = await VtuService.checkProviderBalances();
      return res.json({ data: balances });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/transactions/reference/:reference
   */
  static async getTransaction(req: Request, res: Response) {
    try {
      const { reference } = req.params;
      const transaction = await (await import('../db/prisma')).default.transaction.findUnique({
        where: { reference },
        include: { user: { select: { id: true, full_name: true, email: true, phone: true } } },
      });
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction reference not found' });
      }
      return res.json({ data: transaction });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/transactions/user/:userId
   */
  static async getUserHistory(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const limit = Number(req.query.limit) || 50;
      const offset = Number(req.query.offset) || 0;

      const history = await (await import('../db/prisma')).default.transaction.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      });
      return res.json({ data: history });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}

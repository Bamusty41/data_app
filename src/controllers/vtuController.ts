import { Request, Response } from 'express';
import { TransactionService } from '../services/transactionService';
import { ServiceType, Network, Provider } from '../types/enums';

export class VTUController {
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
        preferredProvider,
        allowFailover,
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

      if (preferredProvider && !Object.values(Provider).includes(preferredProvider)) {
        return res.status(400).json({ error: 'Invalid provider. Must be INLOMAX or HUSMODATA' });
      }

      const result = await TransactionService.processTopUp({
        userId,
        transactionPin,
        reference,
        serviceType: serviceType as ServiceType,
        network: network as Network,
        phoneNumber,
        planId,
        amount: Number(amount),
        preferredProvider: preferredProvider as Provider | undefined,
        allowFailover: allowFailover !== false,
      });

      const statusCode = result.success ? 200 : 400;
      return res.status(statusCode).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async getTransaction(req: Request, res: Response) {
    try {
      const { reference } = req.params;
      const transaction = await TransactionService.getTransactionByReference(reference);
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction reference not found' });
      }
      return res.json({ data: transaction });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getUserHistory(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const limit = Number(req.query.limit) || 50;
      const offset = Number(req.query.offset) || 0;

      const history = await TransactionService.getUserTransactions(userId, limit, offset);
      return res.json({ data: history });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}

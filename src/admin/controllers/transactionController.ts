import { Request, Response } from 'express';
import { AdminService } from '../../services/adminService';
import { TransactionStatus } from '../../types/enums';

export const TransactionAdminController = {
  async list(req: Request, res: Response) {
    try {
      const filter = {
        status: req.query.status as TransactionStatus | undefined,
        phoneNumber: req.query.phoneNumber as string | undefined,
        reference: req.query.reference as string | undefined,
        limit: Number(req.query.limit) || 50,
        offset: Number(req.query.offset) || 0,
      };
      const result = await AdminService.listTransactions(filter);
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  },

  async retry(req: Request, res: Response) {
    try {
      const { transactionId } = req.params;
      const result = await AdminService.retryTransaction(transactionId);
      return res.json({ message: 'Transaction retry initiated', data: result });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  },

  async refund(req: Request, res: Response) {
    try {
      const { transactionId } = req.params;
      const { reason } = req.body;
      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({ error: 'Compulsory refund reason is required' });
      }
      const result = await AdminService.forceRefund(transactionId, reason);
      return res.json({ message: 'Refund processed successfully', data: result });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  },
};

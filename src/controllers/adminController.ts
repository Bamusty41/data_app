import { Request, Response } from 'express';
import { AdminService } from '../services/adminService';
import { UserStatus, Provider, Network, TransactionStatus } from '../types/enums';

export class AdminController {
  static async getOverview(req: Request, res: Response) {
    try {
      const overview = await AdminService.getOverview();
      return res.json({ data: overview });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getProviderBalances(req: Request, res: Response) {
    try {
      const balances = await AdminService.getProviderBalances();
      return res.json({ data: balances });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getProviderConfig(req: Request, res: Response) {
    try {
      const config = AdminService.getProviderConfig();
      return res.json({ data: config });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async setProviderConfig(req: Request, res: Response) {
    try {
      const { mode, primary } = req.body;
      const config = AdminService.setProviderConfig({ mode, primary });
      return res.json({ message: 'Provider configuration updated', data: config });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async getPricing(req: Request, res: Response) {
    try {
      const pricing = AdminService.getPricing();
      return res.json({ data: pricing });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async updatePricing(req: Request, res: Response) {
    try {
      const { provider, network, planId, providerCost, sellPrice } = req.body;
      const updated = AdminService.updatePricing({
        provider,
        network,
        planId,
        providerCost: Number(providerCost),
        sellPrice: Number(sellPrice),
        markup: 0,
      });
      return res.json({ message: 'Pricing updated successfully', data: updated });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async listTransactions(req: Request, res: Response) {
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
  }

  static async retryTransaction(req: Request, res: Response) {
    try {
      const { transactionId } = req.params;
      const result = await AdminService.retryTransaction(transactionId);
      return res.json({ message: 'Transaction retry initiated', data: result });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async forceRefund(req: Request, res: Response) {
    try {
      const { transactionId } = req.params;
      const { reason } = req.body;
      const result = await AdminService.forceRefund(transactionId, reason);
      return res.json({ message: 'Refund processed', data: result });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async searchUsers(req: Request, res: Response) {
    try {
      const filter = {
        search: req.query.search as string | undefined,
        status: req.query.status as UserStatus | undefined,
        limit: Number(req.query.limit) || 50,
        offset: Number(req.query.offset) || 0,
      };
      const result = await AdminService.searchUsers(filter);
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async getUserDetail(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const result = await AdminService.getUserDetail(userId);
      return res.json({ data: result });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async adjustUserBalance(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { type, amount, reason } = req.body;
      if (!['CREDIT', 'DEBIT'].includes(type)) {
        throw new Error('type must be CREDIT or DEBIT');
      }
      const result = await AdminService.adjustUserBalance(userId, type, Number(amount), reason);
      return res.json({ message: 'User balance adjusted', data: result });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async updateUserStatus(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { status } = req.body;
      const result = await AdminService.updateUserStatus(userId, status as UserStatus);
      return res.json({ message: 'User status updated', data: result });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}

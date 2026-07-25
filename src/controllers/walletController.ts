import { Request, Response } from 'express';
import { WalletService } from '../services/walletService';

export class WalletController {
  static async getBalance(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const wallet = await WalletService.getWalletByUserId(userId);
      return res.json({ data: wallet });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async fundWallet(req: Request, res: Response) {
    try {
      const { userId, amount, reference, description } = req.body;

      if (!userId || !amount || !reference) {
        return res.status(400).json({ error: 'userId, amount, and reference are required' });
      }

      const result = await WalletService.creditWallet({
        userId,
        amount: Number(amount),
        reference,
        description: description || 'Wallet Funding / Top-up',
      });

      return res.json({
        message: 'Wallet funded successfully',
        data: result,
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async getLedgerHistory(req: Request, res: Response) {
    try {
      const { walletId } = req.params;
      const limit = Number(req.query.limit) || 50;
      const offset = Number(req.query.offset) || 0;

      const entries = await WalletService.getLedgerEntries(walletId, limit, offset);
      return res.json({ data: entries });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}

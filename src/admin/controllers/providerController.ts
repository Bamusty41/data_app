import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import { Provider } from '../../types/enums';
import { VtuService } from '../../services/vtu/vtuService';

/**
 * ProviderController – health checks and live balance queries for each VTU provider.
 */
export const ProviderController = {
  async healthCheck(req: Request, res: Response) {
    try {
      const balances = await VtuService.checkProviderBalances();
      const health = balances.map((b) => ({ provider: b.provider, status: b.balance > 0 ? 'UP' : 'DOWN', balance: b.balance }));
      res.json({ health });
    } catch (err: any) {
      console.error('Provider health check error', err);
      res.status(500).json({ error: err.message });
    }
  },

  async getBalance(req: Request, res: Response) {
    const { provider } = req.params; // expect 'INLOMAX' or 'HUSMODATA'
    try {
      const balances = await VtuService.checkProviderBalances();
      const entry = balances.find((b) => b.provider === provider);
      if (!entry) return res.status(404).json({ error: 'Provider not found' });
      res.json(entry);
    } catch (err: any) {
      console.error('Get balance error', err);
      res.status(500).json({ error: err.message });
    }
  },
};

import { Request, Response } from 'express';
import { AdminService } from '../../services/adminService';

/**
 * PricingController – manages plan markup settings via AdminService.
 */
export const PricingController = {
  async list(req: Request, res: Response) {
    try {
      const pricing = AdminService.getPricing();
      res.json({ data: pricing });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  },

  async create(req: Request, res: Response) {
    const { provider, network, planId, providerCost, sellPrice } = req.body;
    if (!provider || !network || !planId || providerCost == null || sellPrice == null) {
      return res.status(400).json({ error: 'Missing required fields: provider, network, planId, providerCost, sellPrice' });
    }
    try {
      const entry = AdminService.updatePricing({
        provider,
        network,
        planId,
        providerCost: Number(providerCost),
        sellPrice: Number(sellPrice),
        markup: 0,
      });
      res.status(201).json({ data: entry });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  },

  async update(req: Request, res: Response) {
    const { provider, network, planId, providerCost, sellPrice } = req.body;
    if (!provider || !network || !planId || providerCost == null || sellPrice == null) {
      return res.status(400).json({ error: 'Missing required fields: provider, network, planId, providerCost, sellPrice' });
    }
    try {
      const entry = AdminService.updatePricing({
        provider,
        network,
        planId,
        providerCost: Number(providerCost),
        sellPrice: Number(sellPrice),
        markup: 0,
      });
      res.json({ data: entry });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  },

  async delete(req: Request, res: Response) {
    res.status(204).send();
  },
};

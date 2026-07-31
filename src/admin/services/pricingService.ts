import { AdminService } from '../../services/adminService';

/**
 * Business logic for pricing markup backed by AdminService.
 */
export const PricingService = {
  async getAll() {
    return AdminService.getPricing();
  },

  async create(entry: { provider: any; network: any; planId: string; providerCost: number; sellPrice: number }) {
    return AdminService.updatePricing({ ...entry, markup: 0 });
  },

  async update(entry: { provider: any; network: any; planId: string; providerCost: number; sellPrice: number }) {
    return AdminService.updatePricing({ ...entry, markup: 0 });
  },

  async calculateSellingPrice(providerCost: number, markupPct: number) {
    const final = providerCost * (1 + markupPct / 100);
    return Number(final.toFixed(2));
  },
};

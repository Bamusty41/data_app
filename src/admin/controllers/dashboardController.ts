import { Request, Response } from 'express';
import prisma from '../../db/prisma';
import { TransactionStatus } from '../../types/enums';
import { subDays } from 'date-fns';

/**
 * Admin Dashboard controller – aggregates key metrics.
 */
export const DashboardController = {
  async getOverview(req: Request, res: Response) {
    try {
      // Total wallet balance across all users
      const totalBalanceResult = await prisma.wallet.aggregate({
        _sum: { balance: true },
      });
      const totalBalance = totalBalanceResult._sum.balance ?? 0;

      // Total daily sales (successful transactions of today)
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const dailySalesResult = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          status: TransactionStatus.SUCCESS,
          created_at: { gte: startOfDay },
        },
      });
      const dailySales = dailySalesResult._sum.amount ?? 0;

      // Total profit margin – assuming we store cost in provider response, we approximate profit as amount - cost.
      // For demo, we calculate profit = sum(amount) - sum(providerReferenceCost) (mocked as 0.9 * amount).
      const profitMargin = Number(dailySales) * 0.1; // 10% margin placeholder

      // Provider health – fetch latest transaction statuses for each provider
      const providerHealth = await Promise.all([
        prisma.transaction.findFirst({
          where: { provider_used: 'INLOMAX' },
          orderBy: { created_at: 'desc' },
        }),
        prisma.transaction.findFirst({
          where: { provider_used: 'HUSMODATA' },
          orderBy: { created_at: 'desc' },
        }),
      ]);

      res.json({
        totalBalance: Number(totalBalance),
        dailySales: Number(dailySales),
        profitMargin,
        providerHealth: providerHealth.map((t) => ({
          provider: t?.provider_used,
          lastStatus: t?.status,
          lastRef: t?.reference,
        })),
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  },
};

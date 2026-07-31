import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../db/prisma';
import { Provider, TransactionStatus, UserStatus, Network, ServiceType } from '../types/enums';
import { UserService } from './userService';
import { WalletService } from './walletService';
import { VtuService } from './vtu/vtuService';

export type ProviderMode = 'AUTOMATIC' | 'MANUAL';

export interface ProviderConfig {
  mode: ProviderMode;
  primary: Provider;
}

export interface PricingPlan {
  provider: Provider;
  network: Network;
  planId: string;
  providerCost: number;
  sellPrice: number;
  markup: number;
}

export interface TransactionFilter {
  status?: TransactionStatus;
  phoneNumber?: string;
  reference?: string;
  limit?: number;
  offset?: number;
}

export interface UserSearchFilter {
  search?: string;
  status?: UserStatus;
  limit?: number;
  offset?: number;
}

const providerConfig: ProviderConfig = {
  mode: 'AUTOMATIC',
  primary: Provider.INLOMAX,
};

const pricingStore = new Map<string, PricingPlan>();

function pricingKey(provider: Provider, network: Network, planId: string) {
  return `${provider}:${network}:${planId}`;
}

function ensurePricingEntry(plan: PricingPlan) {
  const key = pricingKey(plan.provider, plan.network, plan.planId);
  pricingStore.set(key, plan);
}

function getPricingEntry(provider: Provider, network: Network, planId: string) {
  return pricingStore.get(pricingKey(provider, network, planId));
}

function computeMarkup(providerCost: number, sellPrice: number) {
  if (providerCost <= 0) return 0;
  return Number((((sellPrice - providerCost) / providerCost) * 100).toFixed(2));
}

// Seed default pricing data for common plans
[Provider.INLOMAX, Provider.HUSMODATA].forEach((provider) => {
  ['MTN', 'AIRTEL', 'GLO', 'NINE_MOBILE'].forEach((network) => {
    const defaultPlans = ['1.5GB', '3.5GB', '5GB'];
    defaultPlans.forEach((planId, index) => {
      const providerCost = 1000 + index * 900;
      const sellPrice = providerCost * 1.23;
      ensurePricingEntry({
        provider,
        network: network as Network,
        planId,
        providerCost,
        sellPrice,
        markup: computeMarkup(providerCost, sellPrice),
      });
    });
  });
});

export class AdminService {
  static getProviderConfig(): ProviderConfig {
    return { ...providerConfig };
  }

  static setProviderConfig(config: ProviderConfig) {
    if (!Object.values(Provider).includes(config.primary)) {
      throw new Error('Invalid provider selected');
    }
    providerConfig.mode = config.mode;
    providerConfig.primary = config.primary;
    return AdminService.getProviderConfig();
  }

  static async getOverview() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [walletAggregate, dailySalesAggregate, transactionRows, providerBalances] = await Promise.all([
      prisma.wallet.aggregate({ _sum: { balance: true } }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          status: TransactionStatus.SUCCESS,
          created_at: { gte: today },
        },
      }),
      prisma.transaction.findMany({
        where: { status: TransactionStatus.SUCCESS },
        select: { amount: true, plan_id: true, network: true },
      }),
      VtuService.checkProviderBalances(),
    ]);

    const totalBalance = Number(walletAggregate._sum.balance ?? 0);
    const totalDailySales = Number(dailySalesAggregate._sum.amount ?? 0);

    const totalProfit = transactionRows.reduce((acc, tx) => {
      if (!tx.plan_id) {
        return acc + Number(tx.amount) * 0.12;
      }
      const plan = getPricingEntry(Provider.INLOMAX, tx.network as Network, tx.plan_id);
      if (!plan) {
        return acc + Number(tx.amount) * 0.12;
      }
      return acc + (plan.sellPrice - plan.providerCost);
    }, 0);

    const marginPercent = totalDailySales > 0 ? Number(((totalProfit / totalDailySales) * 100).toFixed(2)) : 0;

    const providerStatus = providerBalances.map((balance) => ({
      provider: balance.provider,
      status: balance.error ? 'UNAVAILABLE' : balance.balance > 2500 ? 'OK' : 'LOW',
      balance: balance.balance,
      currency: balance.currency,
      error: balance.error || null,
    }));

    return {
      totalBalance,
      totalDailySales,
      totalProfit: Number(totalProfit.toFixed(2)),
      profitMargin: marginPercent,
      providerStatus,
    };
  }

  static async getProviderBalances() {
    return VtuService.checkProviderBalances();
  }

  static getPricing() {
    return Array.from(pricingStore.values()).sort((a, b) => {
      if (a.provider !== b.provider) return a.provider.localeCompare(b.provider);
      if (a.network !== b.network) return a.network.localeCompare(b.network);
      return a.planId.localeCompare(b.planId);
    });
  }

  static updatePricing(entry: PricingPlan) {
    if (!entry.provider || !entry.network || !entry.planId || entry.providerCost <= 0 || entry.sellPrice <= 0) {
      throw new Error('provider, network, planId, providerCost and sellPrice are required');
    }
    entry.markup = computeMarkup(entry.providerCost, entry.sellPrice);
    ensurePricingEntry(entry);
    return entry;
  }

  static async searchUsers(filter: UserSearchFilter) {
    const where: any = {};
    if (filter.search) {
      where.OR = [
        { full_name: { contains: filter.search, mode: 'insensitive' } },
        { email: { contains: filter.search, mode: 'insensitive' } },
        { phone: { contains: filter.search, mode: 'insensitive' } },
      ];
    }
    if (filter.status) {
      where.status = filter.status;
    }

    const users = await prisma.user.findMany({
      where,
      take: filter.limit ?? 50,
      skip: filter.offset ?? 0,
      orderBy: { created_at: 'desc' },
      include: { wallet: true },
    });

    const total = await prisma.user.count({ where });
    return { total, users };
  }

  static async getUserDetail(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
        transactions: { orderBy: { created_at: 'desc' }, take: 50 },
      },
    });
    if (!user) throw new Error('User not found');
    const ledger = await WalletService.getLedgerEntries(user.wallet?.id ?? '');
    return { ...user, ledger };
  }

  static async adjustUserBalance(userId: string, type: 'CREDIT' | 'DEBIT', amount: number, reason: string, reference?: string) {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Admin reason is required for manual adjustments');
    }
    if (amount <= 0) {
      throw new Error('Amount must be greater than zero');
    }

    const uniqueReference = reference || `ADMIN-${type}-${crypto.randomUUID()}`;
    const description = `ADMIN ${type}: ${reason}`;

    if (type === 'CREDIT') {
      return WalletService.creditWallet({ userId, amount, reference: uniqueReference, description });
    }
    return WalletService.debitWallet({ userId, amount, reference: uniqueReference, description });
  }

  static async updateUserStatus(userId: string, status: UserStatus) {
    return UserService.updateUserStatus(userId, status);
  }

  static async listTransactions(filter: TransactionFilter) {
    const where: any = {};
    if (filter.status) where.status = filter.status;
    if (filter.phoneNumber) where.phone_number = { contains: filter.phoneNumber, mode: 'insensitive' };
    if (filter.reference) where.reference = { contains: filter.reference, mode: 'insensitive' };

    const [total, transactions] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        take: filter.limit ?? 50,
        skip: filter.offset ?? 0,
        orderBy: { created_at: 'desc' },
      }),
    ]);

    return { total, transactions };
  }

  static async retryTransaction(transactionId: string) {
    const original = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!original) throw new Error('Transaction not found');

    const status = original.status as unknown as TransactionStatus;
    if (![TransactionStatus.FAILED, TransactionStatus.PENDING].includes(status)) {
      throw new Error('Only FAILED or PENDING transactions may be retried');
    }

    const retryReference = `${original.reference}-ADMIN-RETRY-${Date.now()}`;
    return VtuService.processPurchase({
      userId: original.user_id,
      transactionPin: 'ADMIN-BYPASS',
      reference: retryReference,
      serviceType: original.service_type as unknown as ServiceType,
      network: original.network as unknown as Network,
      phoneNumber: original.phone_number,
      planId: original.plan_id ?? undefined,
      amount: Number(original.amount),
      preferredProvider: providerConfig.mode === 'MANUAL' ? providerConfig.primary : undefined,
      allowFailover: providerConfig.mode === 'AUTOMATIC',
      bypassPin: true,
    });
  }

  static async forceRefund(transactionId: string, reason: string) {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Refund reason is required');
    }

    const original = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!original) throw new Error('Transaction not found');
    if (original.status === TransactionStatus.FAILED) {
      throw new Error('Transaction is already marked as failed');
    }

    const refundReference = `${original.reference}-ADMIN-REFUND-${crypto.randomUUID()}`;
    await WalletService.creditWallet({
      userId: original.user_id,
      amount: Number(original.amount),
      reference: refundReference,
      description: `ADMIN REFUND: ${reason}`,
    });

    const updated = await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: TransactionStatus.FAILED, provider_reference: refundReference },
    });
    return updated;
  }
}

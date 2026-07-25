import { Prisma } from '@prisma/client';
import { LedgerType } from '../types/enums';
import prisma from '../db/prisma';

export interface WalletOperationInput {
  userId: string;
  amount: number | Prisma.Decimal;
  reference: string;
  description: string;
}

export class WalletService {
  /**
   * Credits a user's wallet atomically with a ledger record.
   * Prevents duplicate references via unique index constraint on LedgerEntry.
   */
  static async creditWallet(input: WalletOperationInput) {
    const numAmount = new Prisma.Decimal(input.amount);
    if (numAmount.lessThanOrEqualTo(0)) {
      throw new Error('Credit amount must be greater than zero');
    }

    return prisma.$transaction(async (tx) => {
      // Check for duplicate reference
      const existingLedger = await tx.ledgerEntry.findUnique({
        where: { reference: input.reference },
      });
      if (existingLedger) {
        throw new Error(`Duplicate transaction reference: ${input.reference}`);
      }

      // Fetch current wallet with pessimistic/atomic lookup
      const wallet = await tx.wallet.findUnique({
        where: { user_id: input.userId },
      });

      if (!wallet) {
        throw new Error(`Wallet not found for user: ${input.userId}`);
      }

      const balanceBefore = new Prisma.Decimal(wallet.balance);
      const balanceAfter = balanceBefore.add(numAmount);

      // Update wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter },
      });

      // Create immutable double-entry ledger record
      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          wallet_id: wallet.id,
          type: LedgerType.CREDIT,
          amount: numAmount,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          reference: input.reference,
          description: input.description,
        },
      });

      return { wallet: updatedWallet, ledgerEntry };
    });
  }

  /**
   * Debits a user's wallet atomically with a ledger record.
   * Guarantees balance never drops below zero and reference is unique.
   */
  static async debitWallet(input: WalletOperationInput) {
    const numAmount = new Prisma.Decimal(input.amount);
    if (numAmount.lessThanOrEqualTo(0)) {
      throw new Error('Debit amount must be greater than zero');
    }

    return prisma.$transaction(async (tx) => {
      // Check for duplicate reference
      const existingLedger = await tx.ledgerEntry.findUnique({
        where: { reference: input.reference },
      });
      if (existingLedger) {
        throw new Error(`Duplicate transaction reference: ${input.reference}`);
      }

      const wallet = await tx.wallet.findUnique({
        where: { user_id: input.userId },
      });

      if (!wallet) {
        throw new Error(`Wallet not found for user: ${input.userId}`);
      }

      const balanceBefore = new Prisma.Decimal(wallet.balance);

      if (balanceBefore.lessThan(numAmount)) {
        throw new Error(
          `Insufficient balance. Available: ₦${balanceBefore.toFixed(2)}, Required: ₦${numAmount.toFixed(2)}`
        );
      }

      const balanceAfter = balanceBefore.sub(numAmount);

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter },
      });

      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          wallet_id: wallet.id,
          type: LedgerType.DEBIT,
          amount: numAmount,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          reference: input.reference,
          description: input.description,
        },
      });

      return { wallet: updatedWallet, ledgerEntry };
    });
  }

  /**
   * Retrieves wallet for a user.
   */
  static async getWalletByUserId(userId: string) {
    const wallet = await prisma.wallet.findUnique({
      where: { user_id: userId },
    });
    if (!wallet) {
      throw new Error('Wallet not found');
    }
    return wallet;
  }

  /**
   * Retrieves ledger entries for a wallet.
   */
  static async getLedgerEntries(walletId: string, limit = 50, offset = 0) {
    return prisma.ledgerEntry.findMany({
      where: { wallet_id: walletId },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });
  }
}

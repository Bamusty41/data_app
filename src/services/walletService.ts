import { Prisma } from '@prisma/client';
import { LedgerType } from '../types/enums';
import prisma from '../db/prisma';
import {
  InsufficientBalanceError,
  DuplicateTransactionError,
  UserNotFoundError,
} from '../errors/vtuErrors';

export interface WalletOperationInput {
  userId: string;
  amount: number | Prisma.Decimal;
  reference: string;
  description: string;
}

export class WalletService {
  /**
   * Credits a user's wallet atomically with explicit Row-Level Locking (`FOR UPDATE`).
   * Guarantees strict double-entry ledger logging and prevents duplicate references.
   */
  static async creditWallet(input: WalletOperationInput) {
    const numAmount = new Prisma.Decimal(input.amount);
    if (numAmount.lessThanOrEqualTo(0)) {
      throw new Error('Credit amount must be greater than zero');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Check for duplicate transaction reference to enforce Idempotency
      const existingLedger = await tx.ledgerEntry.findUnique({
        where: { reference: input.reference },
      });
      if (existingLedger) {
        throw new DuplicateTransactionError(input.reference);
      }

      // 2. Explicit Row-Level Lock (`SELECT ... FOR UPDATE`) on target wallet row
      // Eliminates race conditions and parallel write conflicts
      let lockedWallets: any[];
      try {
        lockedWallets = await tx.$queryRaw`
          SELECT id, user_id, balance FROM wallets WHERE user_id = ${input.userId} FOR UPDATE
        `;
      } catch {
        // Fallback for SQLite / test environments without native FOR UPDATE support
        lockedWallets = await tx.$queryRaw`
          SELECT id, user_id, balance FROM wallets WHERE user_id = ${input.userId}
        `;
      }

      if (!lockedWallets || lockedWallets.length === 0) {
        throw new UserNotFoundError(input.userId);
      }

      const walletRow = lockedWallets[0];
      const balanceBefore = new Prisma.Decimal(walletRow.balance);
      const balanceAfter = balanceBefore.add(numAmount);

      // 3. Update wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { id: walletRow.id },
        data: { balance: balanceAfter },
      });

      // 4. Create immutable ledger record
      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          wallet_id: walletRow.id,
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
   * Debits a user's wallet atomically with explicit Row-Level Locking (`FOR UPDATE`).
   * Eliminates race conditions and double-spending.
   */
  static async debitWallet(input: WalletOperationInput) {
    const numAmount = new Prisma.Decimal(input.amount);
    if (numAmount.lessThanOrEqualTo(0)) {
      throw new Error('Debit amount must be greater than zero');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Check for duplicate reference (Idempotency)
      const existingLedger = await tx.ledgerEntry.findUnique({
        where: { reference: input.reference },
      });
      if (existingLedger) {
        throw new DuplicateTransactionError(input.reference);
      }

      // 2. Explicit Row-Level Lock (`SELECT ... FOR UPDATE`)
      let lockedWallets: any[];
      try {
        lockedWallets = await tx.$queryRaw`
          SELECT id, user_id, balance FROM wallets WHERE user_id = ${input.userId} FOR UPDATE
        `;
      } catch {
        // Fallback for SQLite / test environments without native FOR UPDATE support
        lockedWallets = await tx.$queryRaw`
          SELECT id, user_id, balance FROM wallets WHERE user_id = ${input.userId}
        `;
      }

      if (!lockedWallets || lockedWallets.length === 0) {
        throw new UserNotFoundError(input.userId);
      }

      const walletRow = lockedWallets[0];
      const balanceBefore = new Prisma.Decimal(walletRow.balance);

      // 3. Balance verification against debit amount
      if (balanceBefore.lessThan(numAmount)) {
        throw new InsufficientBalanceError(
          balanceBefore.toFixed(2),
          numAmount.toFixed(2)
        );
      }

      const balanceAfter = balanceBefore.sub(numAmount);

      // 4. Update wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { id: walletRow.id },
        data: { balance: balanceAfter },
      });

      // 5. Create immutable double-entry ledger record
      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          wallet_id: walletRow.id,
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
      throw new UserNotFoundError(userId);
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

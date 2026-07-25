import { Prisma } from '@prisma/client';
import {
  ServiceType,
  Network,
  Provider,
  TransactionStatus,
} from '../types/enums';
import prisma from '../db/prisma';
import { UserService } from './userService';
import { WalletService } from './walletService';
import { VTUServiceFactory } from './vtu/vtuServiceFactory';
import { VTUPurchaseResponse } from './vtu/vtuProvider.interface';

export interface InitiateTopUpInput {
  userId: string;
  transactionPin: string;
  reference: string;
  serviceType: ServiceType;
  network: Network;
  phoneNumber: string;
  planId?: string;
  amount: number;
  preferredProvider?: Provider;
  allowFailover?: boolean;
}

export class TransactionService {
  private static MAX_RETRIES = 2;

  /**
   * Executes a complete VTU Top-Up transaction (Airtime or Data)
   * with atomic balance debiting, provider dispatch, retry/failover,
   * and automatic wallet refund on ultimate failure.
   */
  static async processTopUp(input: InitiateTopUpInput) {
    const {
      userId,
      transactionPin,
      reference,
      serviceType,
      network,
      phoneNumber,
      planId,
      amount,
      preferredProvider = Provider.INLOMAX,
      allowFailover = true,
    } = input;

    // 1. Verify User PIN and Status
    const isPinValid = await UserService.verifyTransactionPin(userId, transactionPin);
    if (!isPinValid) {
      throw new Error('Invalid transaction PIN');
    }

    // Check duplicate transaction reference early
    const existingTx = await prisma.transaction.findUnique({
      where: { reference },
    });
    if (existingTx) {
      throw new Error(`Transaction reference '${reference}' has already been processed`);
    }

    // 2. Reserve Funds (Debit Wallet & create Ledger record)
    const debitDescription = `VTU ${serviceType} purchase (${network}) for ${phoneNumber}`;
    await WalletService.debitWallet({
      userId,
      amount,
      reference,
      description: debitDescription,
    });

    // 3. Log initial PENDING Transaction record
    let transaction = await prisma.transaction.create({
      data: {
        user_id: userId,
        reference,
        service_type: serviceType,
        network,
        phone_number: phoneNumber,
        plan_id: planId || null,
        amount: new Prisma.Decimal(amount),
        provider_used: preferredProvider,
        status: TransactionStatus.PENDING,
        retries_count: 0,
      },
    });

    // 4. Dispatch to Provider with Retry & Failover Strategy
    let currentProvider = preferredProvider;
    let providerResponse: VTUPurchaseResponse | null = null;
    let retriesCount = 0;
    let success = false;

    const requestPayload = {
      reference,
      network,
      phoneNumber,
      amount,
      planId,
    };

    // Primary Provider Execution with Retries
    while (retriesCount <= this.MAX_RETRIES && !success) {
      try {
        const providerInstance = VTUServiceFactory.getProvider(currentProvider);

        if (serviceType === ServiceType.AIRTIME) {
          providerResponse = await providerInstance.purchaseAirtime(requestPayload);
        } else {
          providerResponse = await providerInstance.purchaseData(requestPayload);
        }

        if (providerResponse.success) {
          success = true;
          break;
        }
      } catch (error: any) {
        console.error(`Provider ${currentProvider} error on attempt ${retriesCount + 1}:`, error.message);
      }

      retriesCount++;
    }

    // Optional Failover to secondary provider if primary failed
    if (!success && allowFailover) {
      try {
        const fallbackProviderInstance = VTUServiceFactory.getFallbackProvider(currentProvider);
        currentProvider = fallbackProviderInstance.name;
        console.log(`[VTU Service] Failing over to provider: ${currentProvider}`);

        if (serviceType === ServiceType.AIRTIME) {
          providerResponse = await fallbackProviderInstance.purchaseAirtime(requestPayload);
        } else {
          providerResponse = await fallbackProviderInstance.purchaseData(requestPayload);
        }

        if (providerResponse?.success) {
          success = true;
        }
      } catch (error: any) {
        console.error(`Fallback Provider ${currentProvider} error:`, error.message);
      }
    }

    // 5. Finalize Transaction & Handle Refund if Failed
    if (success && providerResponse) {
      // Mark SUCCESS
      transaction = await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.SUCCESS,
          provider_used: currentProvider,
          provider_reference: providerResponse.providerReference,
          retries_count: retriesCount,
        },
      });

      return {
        success: true,
        message: 'VTU transaction completed successfully',
        transaction,
      };
    } else {
      // Mark FAILED and Refund User Wallet
      const refundRef = `${reference}-REFUND`;
      const refundDescription = `Refund for failed VTU ${serviceType} (${reference})`;

      await WalletService.creditWallet({
        userId,
        amount,
        reference: refundRef,
        description: refundDescription,
      });

      transaction = await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.FAILED,
          provider_used: currentProvider,
          provider_reference: providerResponse?.providerReference || null,
          retries_count: retriesCount,
        },
      });

      return {
        success: false,
        message: providerResponse?.message || 'VTU transaction failed after retries. Wallet has been refunded.',
        transaction,
      };
    }
  }

  /**
   * Retrieves transaction by reference.
   */
  static async getTransactionByReference(reference: string) {
    return prisma.transaction.findUnique({
      where: { reference },
      include: { user: { select: { id: true, full_name: true, email: true, phone: true } } },
    });
  }

  /**
   * Retrieves transaction history for a user.
   */
  static async getUserTransactions(userId: string, limit = 50, offset = 0) {
    return prisma.transaction.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });
  }
}

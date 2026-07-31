import { Provider, Network, ServiceType, TransactionStatus } from '../../types/enums';
import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import { UserService } from '../userService';
import { WalletService } from '../walletService';
import { IVtuProvider, VtuProviderResponse } from './IVtuProvider';
import { InlomaxProvider } from './inlomaxProvider';
import { HusmodataProvider } from './husmodataProvider';
import { PendingTransactionQueue } from './queueService';
import { normalizeNigeriaPhoneNumber } from '../../utils/phone';
import { isPlanValid } from '../planService';
import { normalizeProviderResponse } from './providerResponseValidator';
import { DuplicateTransactionError } from '../../errors/vtuErrors';

// ─── Provider Registry ──────────────────────────────────────────────────────────
const providers: Map<Provider, IVtuProvider> = new Map<Provider, IVtuProvider>([
  [Provider.INLOMAX, new InlomaxProvider()],
  [Provider.HUSMODATA, new HusmodataProvider()],
]);

function getProvider(name: Provider): IVtuProvider {
  const p = providers.get(name);
  if (!p) throw new Error(`Unsupported provider: ${name}`);
  return p;
}

function getFallbackProvider(current: Provider): IVtuProvider {
  return getProvider(current === Provider.INLOMAX ? Provider.HUSMODATA : Provider.INLOMAX);
}

// ─── Public API ─────────────────────────────────────────────────────────────────

export interface ProcessPurchaseInput {
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
  bypassPin?: boolean;
}

export interface ProcessPurchaseResult {
  success: boolean;
  status: TransactionStatus;
  message: string;
  transaction: any;
  refunded: boolean;
}

export class VtuService {
  /**
   * Resilient Purchase Engine.
   *
   * 1. Validate PIN
   * 2. Lock & debit wallet  (row-level `FOR UPDATE`)
   * 3. Attempt Primary (Inlomax)
   * 4. On network/timeout/API error → automatic fallback (Husmodata)
   * 5. Both fail → immediate atomic refund, status = FAILED
   * 6. Provider returns PENDING → enqueue background status check
   */
  static async processPurchase(input: ProcessPurchaseInput): Promise<ProcessPurchaseResult> {
    const {
      userId,
      transactionPin,
      reference,
      serviceType,
      network,
      phoneNumber,
      planId,
      amount,
    } = input;

    const preferredProvider = input.preferredProvider;
    const allowFailover = input.allowFailover;
    const bypassPin = input.bypassPin ?? false;

    // Normalize phone number before provider submission
    const normalizedPhone = normalizeNigeriaPhoneNumber(phoneNumber);

    // ── Step 1: Validate PIN & user status ──────────────────────────────────
    if (!bypassPin) {
      const isPinValid = await UserService.verifyTransactionPin(userId, transactionPin);
      if (!isPinValid) throw new Error('Invalid transaction PIN');
    }

    // Duplicate reference guard
    const existing = await prisma.transaction.findUnique({ where: { reference } });
    if (existing) throw new Error(`Transaction reference '${reference}' already processed`);

    // ── Step 2: Atomically lock & debit wallet ──────────────────────────────
    const debitDesc = `VTU ${serviceType} (${network}) for ${normalizedPhone}`;
    await WalletService.debitWallet({ userId, amount, reference, description: debitDesc });

    // Create PENDING transaction record
    let transaction;
    try {
      transaction = await prisma.transaction.create({
        data: {
          user_id: userId,
          reference,
          service_type: serviceType,
          network,
          phone_number: normalizedPhone,
          plan_id: planId || null,
          amount: new Prisma.Decimal(amount),
          provider_used: preferredProvider || Provider.INLOMAX,
          status: TransactionStatus.PENDING,
          retries_count: 0,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002' && err?.meta?.target?.includes('reference')) {
        throw new DuplicateTransactionError(reference);
      }
      throw err;
    }

    // ── Step 3: Resolve provider selection ──────────────────────────────────
    const primary = preferredProvider || Provider.INLOMAX;
    const allowFailoverFlag = allowFailover ?? true;

    let providerResponse: VtuProviderResponse | null = null;
    let activeProvider: Provider = primary;
    let usedFallback = false;

    // Validate plan availability before submitting the request
    if (serviceType === ServiceType.DATA && planId && !isPlanValid(network, planId)) {
      throw new Error(`Plan ${planId} is no longer valid for ${network}. Please refresh available plans.`);
    }

    try {
      providerResponse = normalizeProviderResponse(
        await dispatchToProvider(
          getProvider(primary),
          serviceType,
          network,
          normalizedPhone,
          amount,
          planId,
          reference,
        ),
      );
    } catch (err: any) {
      console.warn(`[VtuService] Primary (${primary}) threw: ${err.message}`);
    }

    // ── Step 4: Optional failover to secondary provider ────────────────────
    if ((!providerResponse || (!providerResponse.success && providerResponse.status === 'FAILED')) && allowFailoverFlag) {
      const fallback = getFallbackProvider(primary);
      activeProvider = fallback.name;
      usedFallback = true;
      console.log(`[VtuService] Failing over to ${activeProvider}...`);

      try {
        providerResponse = normalizeProviderResponse(
          await dispatchToProvider(
            fallback,
            serviceType,
            network,
            normalizedPhone,
            amount,
            planId,
            reference,
          ),
        );
      } catch (err: any) {
        console.warn(`[VtuService] Fallback (${activeProvider}) threw: ${err.message}`);
        providerResponse = null;
      }
    }

    // ── Step 5: Both providers failed → REFUND ──────────────────────────────
    if (!providerResponse || (!providerResponse.success && providerResponse.status === 'FAILED')) {
      const refundRef = `${reference}-REFUND`;
      const refundDesc = `Auto-refund: Failed VTU ${serviceType} (${reference})`;

      await WalletService.creditWallet({ userId, amount, reference: refundRef, description: refundDesc });

      transaction = await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.FAILED,
          provider_used: activeProvider,
          provider_reference: providerResponse?.providerReference || null,
          retries_count: usedFallback ? 2 : 1,
        },
      });

      return {
        success: false,
        status: TransactionStatus.FAILED,
        message: providerResponse?.message || 'Both providers failed. Wallet has been refunded.',
        transaction,
        refunded: true,
      };
    }

    // ── Step 6: Handle PENDING → enqueue background check ───────────────────
    if (providerResponse.status === 'PENDING') {
      transaction = await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.PENDING,
          provider_used: activeProvider,
          provider_reference: providerResponse.providerReference,
          retries_count: usedFallback ? 2 : 1,
        },
      });

      // Enqueue a background job to poll provider after 30 seconds
      PendingTransactionQueue.enqueue({
        transactionId: transaction.id,
        userId,
        provider: activeProvider,
        providerReference: providerResponse.providerReference,
        reference,
        amount,
        serviceType,
        delayMs: 30_000,
      });

      return {
        success: true,
        status: TransactionStatus.PENDING,
        message: 'Transaction is being processed. You will be notified upon completion.',
        transaction,
        refunded: false,
      };
    }

    // ── SUCCESS ─────────────────────────────────────────────────────────────
    transaction = await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: TransactionStatus.SUCCESS,
        provider_used: activeProvider,
        provider_reference: providerResponse.providerReference,
        retries_count: usedFallback ? 2 : 1,
      },
    });

    return {
      success: true,
      status: TransactionStatus.SUCCESS,
      message: providerResponse.message,
      transaction,
      refunded: false,
    };
  }

  /**
   * Fetches API wallet balances from all registered providers.
   */
  static async checkProviderBalances() {
    const results: Array<{ provider: string; balance: number; currency: string; error?: string }> = [];

    for (const [name, provider] of providers) {
      try {
        const bal = await provider.checkBalance();
        results.push({ provider: name, balance: bal.balance, currency: bal.currency });
      } catch (err: any) {
        results.push({ provider: name, balance: 0, currency: 'NGN', error: err.message });
      }
    }

    return results;
  }
}

// ─── Helper ─────────────────────────────────────────────────────────────────────

async function dispatchToProvider(
  provider: IVtuProvider,
  serviceType: ServiceType,
  network: Network,
  phone: string,
  amount: number,
  planId: string | undefined,
  reference: string,
): Promise<VtuProviderResponse> {
  if (serviceType === ServiceType.DATA) {
    if (!planId) throw new Error(`Plan ID required for DATA purchase via ${provider.name}`);
    return provider.purchaseData(network, phone, planId, reference);
  }
  return provider.purchaseAirtime(network, phone, amount, reference);
}

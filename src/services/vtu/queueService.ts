import { Provider, ServiceType, TransactionStatus } from '../../types/enums';
import prisma from '../../db/prisma';
import { WalletService } from '../walletService';
import { InlomaxProvider } from './inlomaxProvider';
import { HusmodataProvider } from './husmodataProvider';
import { IVtuProvider } from './IVtuProvider';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface PendingJob {
  transactionId: string;
  userId: string;
  provider: Provider;
  providerReference: string;
  reference: string;
  amount: number;
  serviceType: ServiceType;
  delayMs: number;
}

// ─── Provider Instances (for status checks) ─────────────────────────────────────

const providerInstances: Record<Provider, IVtuProvider> = {
  [Provider.INLOMAX]: new InlomaxProvider(),
  [Provider.HUSMODATA]: new HusmodataProvider(),
};

/**
 * Lightweight in-process queue for resolving PENDING VTU transactions.
 *
 * In production, replace with BullMQ/Redis or a dedicated message broker
 * for persistence across restarts and horizontal scaling.
 *
 * Workflow:
 *   1. After `delayMs`, poll the provider for the transaction status.
 *   2. If SUCCESS → mark transaction SUCCESS.
 *   3. If FAILED  → atomically refund wallet, mark transaction FAILED.
 *   4. If still PENDING after max retries → refund and mark FAILED.
 */
export class PendingTransactionQueue {
  private static MAX_RETRIES = 3;
  private static RETRY_INTERVAL_MS = 30_000;

  /**
   * Enqueue a PENDING transaction for background resolution.
   */
  static enqueue(job: PendingJob): void {
    if (process.env.NODE_ENV === 'test') {
      console.log(
        `[Queue] Skipping PENDING job enqueue in test mode for txn=${job.transactionId}`,
      );
      return;
    }

    console.log(
      `[Queue] Enqueued PENDING job: txn=${job.transactionId} provider=${job.provider} ref=${job.providerReference} delay=${job.delayMs}ms`,
    );

    const timeoutHandle = setTimeout(() => {
      PendingTransactionQueue.processJob(job, 1).catch((err) => {
        console.error(`[Queue] Unhandled error processing job ${job.transactionId}:`, err);
      });
    }, job.delayMs);

    if (typeof timeoutHandle.unref === 'function') {
      timeoutHandle.unref();
    }
  }

  /**
   * Process a single pending job. Retries up to MAX_RETRIES with RETRY_INTERVAL_MS spacing.
   */
  static async processJob(job: PendingJob, attempt: number): Promise<void> {
    console.log(
      `[Queue] Processing job: txn=${job.transactionId} attempt=${attempt}/${this.MAX_RETRIES}`,
    );

    try {
      const provider = providerInstances[job.provider];
      if (!provider) {
        console.error(`[Queue] Unknown provider ${job.provider} – cannot resolve txn ${job.transactionId}`);
        await PendingTransactionQueue.refundAndFail(job, 'Unknown provider – auto-refund');
        return;
      }

      const statusResponse = await provider.checkTransactionStatus(job.providerReference);

      if (statusResponse.status === 'SUCCESS') {
        // ── Resolve as SUCCESS ──────────────────────────────────────────────
        await prisma.transaction.update({
          where: { id: job.transactionId },
          data: {
            status: TransactionStatus.SUCCESS,
            provider_reference: statusResponse.providerReference,
          },
        });
        console.log(`✅ [Queue] Transaction ${job.transactionId} resolved as SUCCESS`);
        return;
      }

      if (statusResponse.status === 'FAILED') {
        // ── Resolve as FAILED + REFUND ──────────────────────────────────────
        await PendingTransactionQueue.refundAndFail(job, statusResponse.message);
        return;
      }

      // ── Still PENDING → retry or give up ────────────────────────────────
      if (attempt < this.MAX_RETRIES) {
        console.log(`[Queue] Still PENDING – retrying in ${this.RETRY_INTERVAL_MS / 1000}s (attempt ${attempt + 1})`);
        setTimeout(() => {
          PendingTransactionQueue.processJob(job, attempt + 1).catch((err) => {
            console.error(`[Queue] Retry error txn ${job.transactionId}:`, err);
          });
        }, this.RETRY_INTERVAL_MS);
      } else {
        console.warn(`[Queue] Max retries exhausted for txn ${job.transactionId} – refunding`);
        await PendingTransactionQueue.refundAndFail(job, 'Max retries exhausted – transaction still PENDING');
      }
    } catch (err: any) {
      console.error(`[Queue] Error checking status for txn ${job.transactionId}:`, err.message);
      if (attempt >= this.MAX_RETRIES) {
        await PendingTransactionQueue.refundAndFail(job, `Status check error: ${err.message}`);
      } else {
        setTimeout(() => {
          PendingTransactionQueue.processJob(job, attempt + 1).catch(console.error);
        }, this.RETRY_INTERVAL_MS);
      }
    }
  }

  /**
   * Atomically refund the user's wallet and mark the transaction as FAILED.
   */
  private static async refundAndFail(job: PendingJob, reason: string): Promise<void> {
    const refundRef = `${job.reference}-QUEUE-REFUND`;
    const refundDesc = `Queue auto-refund: ${reason} (${job.reference})`;

    try {
      await WalletService.creditWallet({
        userId: job.userId,
        amount: job.amount,
        reference: refundRef,
        description: refundDesc,
      });
    } catch (err: any) {
      // Duplicate refund reference → already refunded
      if (err.message?.includes('Duplicate')) {
        console.warn(`[Queue] Refund already processed for ${job.reference}`);
      } else {
        throw err;
      }
    }

    await prisma.transaction.update({
      where: { id: job.transactionId },
      data: { status: TransactionStatus.FAILED },
    });

    console.log(`❌ [Queue] Transaction ${job.transactionId} marked FAILED. Wallet refunded. Reason: ${reason}`);
  }
}

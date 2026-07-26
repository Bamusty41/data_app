import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { WalletService } from '../services/walletService';
import { DuplicateTransactionError } from '../errors/vtuErrors';

export class WebhookController {
  /**
   * Handles Strowallet automated bank transfer webhook events.
   * `POST /api/v1/webhooks/strowallet`
   */
  static async handleStrowalletWebhook(req: Request, res: Response) {
    const payload = req.body;
    console.log('[Strowallet Webhook Received]:', JSON.stringify(payload));

    try {
      // 1. Extract payload parameters
      const event = payload.event || 'virtual_account.credited';
      const data = payload.data || payload;

      const reference = data.reference || data.transaction_reference;
      const sessionId = data.session_id || data.sessionId;
      const accountNumber = data.account_number || data.accountNumber;
      const amount = Number(data.amount);

      if (!accountNumber || !amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Invalid webhook payload: accountNumber and valid amount required' });
      }

      // Unique reference key incorporating reference or session ID for strict idempotency
      const uniqueReference = sessionId ? `STROWALLET-SESS-${sessionId}` : `STROWALLET-REF-${reference}`;

      // 2. Find Wallet associated with the Virtual Account Number
      const wallet = await prisma.wallet.findFirst({
        where: { virtual_account_number: accountNumber },
        include: { user: true },
      });

      if (!wallet) {
        console.error(`[Strowallet Webhook] Wallet not found for virtual account number: ${accountNumber}`);
        return res.status(404).json({ error: `No wallet linked to virtual account number '${accountNumber}'` });
      }

      // 3. Atomically Credit Wallet with Row-Level Locking (`FOR UPDATE`) & Ledger Entry
      const description = `Automated Bank Transfer Credit via Strowallet (${wallet.virtual_bank_name || 'Virtual Account'}) [Session: ${sessionId || reference}]`;

      await WalletService.creditWallet({
        userId: wallet.user_id,
        amount,
        reference: uniqueReference,
        description,
      });

      console.log(`✅ [Strowallet Webhook Success] Credited ₦${amount} to User ${wallet.user_id} (${wallet.user.full_name})`);

      // 4. Return HTTP 200 Immediately
      return res.status(200).json({
        status: 'success',
        message: 'Webhook processed successfully',
        data: {
          account_number: accountNumber,
          amount_credited: amount,
          user_id: wallet.user_id,
          reference: uniqueReference,
        },
      });
    } catch (error: any) {
      if (error instanceof DuplicateTransactionError) {
        console.warn(`[Strowallet Webhook Idempotency] ${error.message}`);
        // Return 200 HTTP response for duplicate webhooks to signal acknowledgment to Strowallet gateway
        return res.status(200).json({
          status: 'success',
          message: 'Webhook already processed (Idempotent call)',
        });
      }

      console.error('[Strowallet Webhook Processing Error]:', error);
      return res.status(500).json({ error: error.message || 'Webhook processing failed' });
    }
  }
}

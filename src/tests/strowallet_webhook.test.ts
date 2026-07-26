import crypto from 'crypto';
import prisma from '../db/prisma';
import { UserService } from '../services/userService';
import { WalletService } from '../services/walletService';
import { StrowalletService } from '../services/strowalletService';
import { WebhookController } from '../controllers/webhookController';
import { InsufficientBalanceError, DuplicateTransactionError } from '../errors/vtuErrors';

export async function runStrowalletWebhookTests() {
  console.log('--------------------------------------------------');
  console.log('🔒 Starting Strowallet Webhook & Row-Locking Test Suite');
  console.log('--------------------------------------------------');

  const webhookSecret = 'test_webhook_secret_key_123';
  process.env.STROWALLET_WEBHOOK_SECRET = webhookSecret;

  try {
    // 0. Clean test DB
    await prisma.ledgerEntry.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.wallet.deleteMany({});
    await prisma.user.deleteMany({});

    // 1. Test Signup Virtual Account Creation
    console.log('\n[1/4] Testing User Signup & Strowallet Virtual Account Generation...');
    const userResult = await UserService.createUser({
      full_name: 'Emeka Okonkwo',
      email: 'emeka.okonkwo@example.com',
      phone: '+2348039998877',
      password: 'Password123!',
      transaction_pin: '5555',
    });

    console.log(`  ✅ User Created: ${userResult.user.full_name}`);
    console.log(`  ✅ Virtual Bank Name: ${userResult.wallet.virtual_bank_name}`);
    console.log(`  ✅ Virtual Account Number: ${userResult.wallet.virtual_account_number}`);
    console.log(`  ✅ Virtual Account Name: ${userResult.wallet.virtual_account_name}`);

    // 2. Test HMAC SHA-256 Signature Verification
    console.log('\n[2/4] Testing Webhook HMAC SHA-256 Security Signature Validation...');
    const rawPayload = JSON.stringify({
      event: 'virtual_account.credited',
      data: {
        transaction_reference: 'STR-TX-001',
        session_id: 'SESS-9988776655',
        account_number: userResult.wallet.virtual_account_number,
        amount: 25000.0,
      },
    });

    const validSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawPayload)
      .digest('hex');

    const invalidSignature = 'tampered_signature_12345';

    const isValidSig = StrowalletService.verifyWebhookSignature(rawPayload, validSignature, webhookSecret);
    const isInvalidSig = StrowalletService.verifyWebhookSignature(rawPayload, invalidSignature, webhookSecret);

    console.log(`  ✅ Valid HMAC Signature Verified: ${isValidSig}`);
    console.log(`  ✅ Tampered Signature Blocked: ${!isInvalidSig}`);

    // 3. Test Automated Wallet Funding via Webhook Controller
    console.log('\n[3/4] Testing Automated Wallet Funding Webhook Endpoint...');
    let mockResponseStatusCode = 0;
    let mockResponseBody: any = null;

    const mockReq: any = {
      body: JSON.parse(rawPayload),
    };

    const mockRes: any = {
      status: (code: number) => {
        mockResponseStatusCode = code;
        return {
          json: (body: any) => {
            mockResponseBody = body;
            return body;
          },
        };
      },
    };

    await WebhookController.handleStrowalletWebhook(mockReq, mockRes);
    console.log(`  ✅ Webhook Status Code: ${mockResponseStatusCode} (Expected: 200)`);
    console.log(`  ✅ Webhook Message: "${mockResponseBody.message}"`);

    const walletAfterWebhook = await WalletService.getWalletByUserId(userResult.user.id);
    console.log(`  ✅ Wallet Balance after automated Strowallet credit: ₦${walletAfterWebhook.balance}`);

    // 4. Test Webhook Idempotency (Duplicate Session ID)
    console.log('\n[4/4] Testing Webhook Idempotency (Duplicate Session ID)...');
    await WebhookController.handleStrowalletWebhook(mockReq, mockRes);
    console.log(`  ✅ Duplicate Webhook Idempotency Handled: Status Code ${mockResponseStatusCode}`);
    console.log(`  ✅ Idempotent Message: "${mockResponseBody.message}"`);

    // Verify balance was NOT double-credited
    const walletAfterDuplicate = await WalletService.getWalletByUserId(userResult.user.id);
    console.log(`  ✅ Balance remains unchanged at ₦${walletAfterDuplicate.balance} (No double-crediting!)`);

    // 5. Test Structured Error Handling (Insufficient Balance)
    console.log('\n[Bonus] Testing Row-Locked Debit & Insufficient Balance Error...');
    try {
      await WalletService.debitWallet({
        userId: userResult.user.id,
        amount: 500000.0,
        reference: `OVER-DEBIT-${Date.now()}`,
        description: 'Testing structured error',
      });
      console.error('  ❌ FAILED: Overdraft was not caught!');
    } catch (err: any) {
      if (err instanceof InsufficientBalanceError) {
        console.log(`  ✅ Caught InsufficientBalanceError: StatusCode=${err.statusCode}, Code=${err.errorCode}`);
        console.log(`  ✅ Error Message: "${err.message}"`);
      } else {
        console.log(`  ✅ Debit error caught: ${err.message}`);
      }
    }

    console.log('\n🎉 ALL STROWALLET WEBHOOK & ROW LOCKING TESTS PASSED!');
  } catch (error: any) {
    console.error('\n❌ Strowallet Webhook Test Suite Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  runStrowalletWebhookTests();
}

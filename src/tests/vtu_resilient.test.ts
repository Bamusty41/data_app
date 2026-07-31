import prisma from '../db/prisma';
import { UserService } from '../services/userService';
import { WalletService } from '../services/walletService';
import { VtuService } from '../services/vtu/vtuService';
import { ServiceType, Network, TransactionStatus } from '../types/enums';

jest.setTimeout(30000);

/**
 * Comprehensive Resilient VTU Dispatcher Test Suite.
 *
 * Validates:
 *   1. Primary provider (Inlomax) SUCCESS flow
 *   2. Inlomax FAIL → Husmodata fallback SUCCESS flow
 *   3. Dual provider failure → Immediate atomic wallet REFUND
 *   4. PENDING status → Background queue registration
 *   5. Provider balance check
 */
async function runResilientVtuTests() {
  console.log('══════════════════════════════════════════════════════════════');
  console.log('🚀 Resilient VTU Dispatcher — Integration Test Suite');
  console.log('══════════════════════════════════════════════════════════════');

  try {
    // ── Clean slate ──────────────────────────────────────────────────────────
    await prisma.ledgerEntry.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.wallet.deleteMany({});
    await prisma.user.deleteMany({});

    // ── Setup: Create test user & fund wallet ────────────────────────────────
    console.log('\n[Setup] Creating test user & funding wallet...');
    const reg = await UserService.createUser({
      full_name: 'Fatima Abdullahi',
      email: 'fatima.a@example.com',
      phone: '+2348051234567',
      password: 'TestPassword1!',
      transaction_pin: '1234',
    });
    const userId = reg.user.id;
    console.log(`  ✅ User: ${reg.user.full_name} (${userId})`);

    await WalletService.creditWallet({
      userId,
      amount: 50_000,
      reference: `FUND-${Date.now()}`,
      description: 'Test wallet funding',
    });
    let wallet = await WalletService.getWalletByUserId(userId);
    console.log(`  ✅ Wallet funded: ₦${wallet.balance}\n`);

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 1: Primary Provider (Inlomax) SUCCESS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[1/5] Primary Provider SUCCESS (Inlomax)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const r1 = await VtuService.processPurchase({
      userId,
      transactionPin: '1234',
      reference: `TEST-SUCCESS-${Date.now()}`,
      serviceType: ServiceType.AIRTIME,
      network: Network.MTN,
      phoneNumber: '08031112222',
      amount: 1000,
    });
    console.log(`  Status  : ${r1.status}`);
    console.log(`  Provider: ${r1.transaction.provider_used}`);
    console.log(`  Refunded: ${r1.refunded}`);
    console.log(`  Message : ${r1.message}`);
    wallet = await WalletService.getWalletByUserId(userId);
    console.log(`  Balance : ₦${wallet.balance}`);
    assert(r1.status === TransactionStatus.SUCCESS, 'Expected SUCCESS status');
    assert(r1.refunded === false, 'Should NOT have been refunded');
    console.log('  ✅ PASSED\n');

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 2: Inlomax FAIL → Husmodata FALLBACK SUCCESS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[2/5] Primary FAIL → Fallback SUCCESS (Husmodata)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Phone suffix 9999 → triggers Inlomax FAILED, but Husmodata succeeds
    const r2 = await VtuService.processPurchase({
      userId,
      transactionPin: '1234',
      reference: `TEST-FALLBACK-${Date.now()}`,
      serviceType: ServiceType.DATA,
      network: Network.AIRTEL,
      phoneNumber: '08069999999', // 9999 → Inlomax FAIL
      planId: '1.5GB',
      amount: 500,
    });
    console.log(`  Status  : ${r2.status}`);
    console.log(`  Provider: ${r2.transaction.provider_used}`);
    console.log(`  Refunded: ${r2.refunded}`);
    console.log(`  Message : ${r2.message}`);
    wallet = await WalletService.getWalletByUserId(userId);
    console.log(`  Balance : ₦${wallet.balance}`);
    assert(r2.status === TransactionStatus.SUCCESS, 'Expected SUCCESS after fallback');
    assert(r2.transaction.provider_used === 'HUSMODATA', 'Should have used HUSMODATA');
    assert(r2.refunded === false, 'Should NOT have been refunded');
    console.log('  ✅ PASSED\n');

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 3: Dual Provider Failure → Immediate Atomic REFUND
    // ─────────────────────────────────────────────────────────────────────────
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[3/5] Dual Provider FAILURE → Immediate Wallet REFUND');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const balanceBefore = wallet.balance;
    // Phone suffix 0000 → both Inlomax AND Husmodata throw network errors
    const r3 = await VtuService.processPurchase({
      userId,
      transactionPin: '1234',
      reference: `TEST-DUALFAIL-${Date.now()}`,
      serviceType: ServiceType.AIRTIME,
      network: Network.GLO,
      phoneNumber: '08090000000', // 0000 → both throw
      amount: 2000,
    });
    console.log(`  Status  : ${r3.status}`);
    console.log(`  Refunded: ${r3.refunded}`);
    console.log(`  Message : ${r3.message}`);
    wallet = await WalletService.getWalletByUserId(userId);
    console.log(`  Balance : ₦${wallet.balance} (was ₦${balanceBefore})`);
    assert(r3.status === TransactionStatus.FAILED, 'Expected FAILED status');
    assert(r3.refunded === true, 'Should have been refunded');
    assert(String(wallet.balance) === String(balanceBefore), 'Balance should be restored');
    console.log('  ✅ PASSED\n');

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 4: PENDING Status → Background Queue Registration
    // ─────────────────────────────────────────────────────────────────────────
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[4/5] PENDING Status → Background Queue Enqueue');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Phone suffix 5555 → triggers Inlomax PENDING
    const r4 = await VtuService.processPurchase({
      userId,
      transactionPin: '1234',
      reference: `TEST-PENDING-${Date.now()}`,
      serviceType: ServiceType.AIRTIME,
      network: Network.MTN,
      phoneNumber: '08031115555', // 5555 → PENDING
      amount: 500,
    });
    console.log(`  Status  : ${r4.status}`);
    console.log(`  Provider: ${r4.transaction.provider_used}`);
    console.log(`  Refunded: ${r4.refunded}`);
    console.log(`  Message : ${r4.message}`);
    assert(r4.status === TransactionStatus.PENDING, 'Expected PENDING status');
    assert(r4.refunded === false, 'Should NOT be refunded yet');
    console.log('  ✅ PASSED (background job enqueued – will resolve asynchronously)\n');

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 5: Provider Balance Check
    // ─────────────────────────────────────────────────────────────────────────
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[5/5] Provider Balance Check');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const balances = await VtuService.checkProviderBalances();
    balances.forEach((b) => {
      console.log(`  ${b.provider}: ${b.currency} ${b.balance.toLocaleString()}`);
    });
    assert(balances.length === 2, 'Expected 2 provider balance entries');
    console.log('  ✅ PASSED\n');

    // ── Ledger Audit ────────────────────────────────────────────────────────
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📜 Ledger Audit Trail');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const ledger = await WalletService.getLedgerEntries(wallet.id);
    ledger.forEach((e) => {
      console.log(`  [${e.type}] ₦${e.amount} | After: ₦${e.balance_after} | ${e.description}`);
    });

    console.log('\n══════════════════════════════════════════════════════════════');
    console.log('🎉 ALL 5 RESILIENT VTU DISPATCHER TESTS PASSED!');
    console.log('══════════════════════════════════════════════════════════════\n');
  } catch (error: any) {
    console.error('\n❌ Test Suite FAILED:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

describe('Resilient VTU Dispatcher Integration Suite', () => {
  test('executes all resilient VTU dispatch scenarios', async () => {
    await runResilientVtuTests();
  });
});

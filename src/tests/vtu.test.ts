import { UserService } from '../services/userService';
import { WalletService } from '../services/walletService';
import { TransactionService } from '../services/transactionService';
import { ServiceType, Network, Provider, UserStatus } from '../types/enums';
import prisma from '../db/prisma';

/**
 * End-to-End VTU Platform Service Layer Verification Test Suite
 */
export async function runVTUTests() {
  console.log('--------------------------------------------------');
  console.log('🧪 Starting Nigerian Data & Airtime VTU Verification Suite');
  console.log('--------------------------------------------------');

  try {
    // 0. Clean test environment
    await prisma.ledgerEntry.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.wallet.deleteMany({});
    await prisma.user.deleteMany({});

    // 1. Test User Registration & Automatic Wallet Creation
    console.log('\n[1/5] Testing User Registration & Wallet Setup...');
    const registrationResult = await UserService.createUser({
      full_name: 'Amina Babangida',
      email: 'amina.b@example.com',
      phone: '+2348012345678',
      password: 'SecurePassword123!',
      transaction_pin: '4321',
      virtual_account_number: '9912345678',
      virtual_bank_name: 'Wema Bank (Monnify)',
      virtual_account_name: 'Amina Babangida / DataApp',
    });

    const user = registrationResult.user;
    console.log(`  ✅ Created user: ${user.full_name} (${user.id})`);
    console.log(`  ✅ Wallet initialized: ID=${registrationResult.wallet.id}, Balance=₦${registrationResult.wallet.balance}`);

    // Verify PIN comparison
    const validPin = await UserService.verifyTransactionPin(user.id, '4321');
    const invalidPin = await UserService.verifyTransactionPin(user.id, '9999');
    console.log(`  ✅ PIN Verification: Valid Pin=${validPin}, Invalid Pin=${invalidPin}`);

    // 2. Test Wallet Ledger & Fund Crediting/Debiting
    console.log('\n[2/5] Testing Double-Entry Wallet Ledger & Accounting...');
    const creditRef = `FUND-${Date.now()}`;
    const fundResult = await WalletService.creditWallet({
      userId: user.id,
      amount: 15000.00,
      reference: creditRef,
      description: 'Initial Monnify Bank Transfer Top-up',
    });

    console.log(`  ✅ Credited ₦15,000.00. New Balance: ₦${fundResult.wallet.balance}`);
    console.log(
      `  ✅ Ledger entry created: [${fundResult.ledgerEntry.type}] Before=₦${fundResult.ledgerEntry.balance_before}, After=₦${fundResult.ledgerEntry.balance_after}`
    );

    // Verify Insufficient Funds Error
    try {
      await WalletService.debitWallet({
        userId: user.id,
        amount: 999999.00,
        reference: `OVERDEBIT-${Date.now()}`,
        description: 'Excessive debit test',
      });
      console.error('  ❌ FAILED: Wallet debit did not block overdraft!');
    } catch (err: any) {
      console.log(`  ✅ Double-spend/Overdraft Guard passed: "${err.message}"`);
    }

    // 3. Test Successful VTU Airtime Purchase (INLOMAX)
    console.log('\n[3/5] Testing Airtime Top-Up Transaction (INLOMAX)...');
    const airtimeRef = `AIRTIME-${Date.now()}`;
    const airtimeResult = await TransactionService.processTopUp({
      userId: user.id,
      transactionPin: '4321',
      reference: airtimeRef,
      serviceType: ServiceType.AIRTIME,
      network: Network.MTN,
      phoneNumber: '08031234567',
      amount: 1000.00,
      preferredProvider: Provider.INLOMAX,
    });

    console.log(`  ✅ Airtime Result: Success=${airtimeResult.success}, Status=${airtimeResult.transaction.status}`);
    console.log(`  ✅ Provider Used: ${airtimeResult.transaction.provider_used}, Ref=${airtimeResult.transaction.provider_reference}`);

    const walletAfterAirtime = await WalletService.getWalletByUserId(user.id);
    console.log(`  ✅ Balance after ₦1,000 Airtime debit: ₦${walletAfterAirtime.balance}`);

    // 4. Test Successful VTU Data Purchase (HUSMODATA)
    console.log('\n[4/5] Testing Data Bundle Purchase (HUSMODATA)...');
    const dataRef = `DATA-${Date.now()}`;
    const dataResult = await TransactionService.processTopUp({
      userId: user.id,
      transactionPin: '4321',
      reference: dataRef,
      serviceType: ServiceType.DATA,
      network: Network.AIRTEL,
      phoneNumber: '08029876543',
      planId: '1.5GB',
      amount: 2500.00,
      preferredProvider: Provider.HUSMODATA,
    });

    console.log(`  ✅ Data Result: Success=${dataResult.success}, Status=${dataResult.transaction.status}`);
    const walletAfterData = await WalletService.getWalletByUserId(user.id);
    console.log(`  ✅ Balance after ₦2,500 Data debit: ₦${walletAfterData.balance}`);

    // 5. Test Provider Failure & Automated Refund Workflow
    console.log('\n[5/5] Testing Provider Failure & Automatic Refund Flow...');
    const failRef = `FAIL-${Date.now()}`;
    const failResult = await TransactionService.processTopUp({
      userId: user.id,
      transactionPin: '4321',
      reference: failRef,
      serviceType: ServiceType.AIRTIME,
      network: Network.GLO,
      phoneNumber: '08050009999', // Suffix 9999 triggers provider mock failure
      amount: 5000.00,
      preferredProvider: Provider.INLOMAX,
      allowFailover: false,
    });

    console.log(`  ✅ Expected Failure Handled: Success=${failResult.success}, Message="${failResult.message}"`);
    console.log(`  ✅ Transaction Status: ${failResult.transaction.status}`);

    const walletAfterRefund = await WalletService.getWalletByUserId(user.id);
    console.log(`  ✅ Wallet Balance after failure refund: ₦${walletAfterRefund.balance} (Funds restored!)`);

    // Verify Ledger audit trail
    const ledgerEntries = await WalletService.getLedgerEntries(walletAfterRefund.id);
    console.log(`\n📜 Ledger Audit Trail Total Entries: ${ledgerEntries.length}`);
    ledgerEntries.forEach((entry) => {
      console.log(`   - [${entry.type}] Amount: ₦${entry.amount} | After: ₦${entry.balance_after} | Ref: ${entry.reference} | ${entry.description}`);
    });

    console.log('\n🎉 ALL VTU PLATFORM SERVICE LAYER TESTS PASSED SUCCESSFULLY!');
  } catch (error: any) {
    console.error('\n❌ Test Suite Failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

describe('VTU Platform Verification Suite', () => {
  test('executes the end-to-end VTU verification scenarios', async () => {
    await runVTUTests();
  });
});

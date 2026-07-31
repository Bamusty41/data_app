import crypto from 'crypto';
import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/db/prisma';
import { UserService } from '../services/userService';
import { WalletService } from '../services/walletService';
import { VtuService } from '../services/vtu/vtuService';
import { ServiceType, Network } from '../types/enums';
import { normalizeNigeriaPhoneNumber } from '../utils/phone';
import { normalizeProviderResponse } from '../services/vtu/providerResponseValidator';

describe('VTU Data/Airtime edge cases', () => {
  let userId: string;

  beforeAll(async () => {
    await prisma.ledgerEntry.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.wallet.deleteMany({});
    await prisma.user.deleteMany({});

    const reg = await UserService.createUser({
      full_name: 'QA Tester',
      email: 'qa.tester@example.com',
      phone: '+2348051234567',
      password: 'SecurePass1!',
      transaction_pin: '1234',
    });

    userId = reg.user.id;
    await WalletService.creditWallet({
      userId,
      amount: 100000,
      reference: `QA-FUND-${Date.now()}`,
      description: 'QA funding',
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('phone number normalization handles 0803..., +234803..., 234803...', () => {
    expect(normalizeNigeriaPhoneNumber('08031234567')).toBe('08031234567');
    expect(normalizeNigeriaPhoneNumber('+2348031234567')).toBe('08031234567');
    expect(normalizeNigeriaPhoneNumber('2348031234567')).toBe('08031234567');
  });

  test('duplicate purchase requests from rapid double-tap are idempotent', async () => {
    const reference = `QA-DUP-${Date.now()}`;
    const body = {
      userId,
      transactionPin: '1234',
      reference,
      serviceType: ServiceType.AIRTIME,
      network: Network.MTN,
      phoneNumber: '08031234567',
      amount: 2000,
    };

    const results = await Promise.all([
      request(app).post('/api/v1/vtu/purchase').send(body),
      request(app).post('/api/v1/vtu/purchase').send(body),
    ]);

    const accepted = results.filter((res) => res.status === 200);
    const rejected = results.filter((res) => res.status === 400);

    expect(accepted).toHaveLength(1);
    expect(rejected.length).toBeGreaterThanOrEqual(1);
    expect(accepted[0].body.transaction.reference).toBe(reference);
  });

  test('provider false positive 200 OK with failed payload is normalized to failure', async () => {
    const providerResponse = { success: true, status: 'FAILED', providerReference: 'XYZ-123', message: 'Failed', rawResponse: {} };
    const normalized = normalizeProviderResponse(providerResponse as any);
    expect(normalized.success).toBe(false);
    expect(normalized.status).toBe('FAILED');
  });

  test('stale plan IDs are rejected before provider submission', async () => {
    await expect(
      VtuService.processPurchase({
        userId,
        transactionPin: '1234',
        reference: `QA-STALE-${Date.now()}`,
        serviceType: ServiceType.DATA,
        network: Network.MTN,
        phoneNumber: '08031234567',
        planId: 'INVALID-PLAN',
        amount: 1500,
      }),
    ).rejects.toThrow(/no longer valid/i);
  });

  test('slow webhook arrival still credits wallet idempotently', async () => {
    const wallet = await WalletService.getWalletByUserId(userId);
    const originalBalance = Number(wallet.balance);

    const payload = {
      event: 'virtual_account.credited',
      data: {
        reference: 'WEB-REF-123',
        session_id: 'SESSION-456',
        account_number: wallet.virtual_account_number,
        amount: 2500,
      },
    };

    const rawPayload = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', process.env.STROWALLET_WEBHOOK_SECRET || 'mock_webhook_secret_key')
      .update(rawPayload)
      .digest('hex');

    const response1 = await request(app).post('/api/v1/webhooks/strowallet').set('x-strowallet-signature', signature).send(payload);
    const response2 = await request(app).post('/api/v1/webhooks/strowallet').set('x-strowallet-signature', signature).send(payload);

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
    expect(response2.body.message).toMatch(/already processed/i);

    const walletAfter = await WalletService.getWalletByUserId(userId);
    expect(Number(walletAfter.balance)).toBe(originalBalance + 2500);
  });
});

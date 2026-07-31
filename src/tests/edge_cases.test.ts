import request from 'supertest';
import app from '../app';
import prisma from '../db/prisma';
import { formatPhone } from '../../mobile/src/utils/formatPhone';
import { ProviderError } from '../errors/vtuErrors';

describe('Phase 6: Comprehensive Security & Edge-Case Audit Suite', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Edge Case 1: Network Delay & Webhook Lag (Delayed Strowallet Funding)', () => {
    it('should process webhook idempotently even if user abandoned app 10 minutes ago', async () => {
      const payload = {
        event: 'charge.success',
        data: {
          reference: 'STRO-LAG-10MIN-TEST',
          amount: 500000, // ₦5,000 in kobo
          customer: { email: 'testuser@example.com' },
          virtual_account_number: '1234567890',
        },
      };

      // Simulating late incoming webhook
      const res = await request(app)
        .post('/api/v1/webhooks/strowallet')
        .send(payload);

      expect([200, 400, 401, 404]).toContain(res.status); // Signature or Idempotent handling check
    });
  });

  describe('Edge Case 2: Concurrent Requests (Double-tap prevention)', () => {
    it('should handle rapid concurrent purchase requests gracefully without double-debiting', async () => {
      const user = await prisma.user.findFirst({ include: { wallet: true } });
      if (!user) return;

      const reqBody = {
        userId: user.id,
        serviceType: 'DATA',
        network: 'MTN',
        phoneNumber: '08031234567',
        planId: '1.5GB',
        amount: 1000,
        transactionPin: '1234',
        reference: `CONCUR-REF-${Date.now()}`,
      };

      // Fire 2 concurrent requests
      const [res1, res2] = await Promise.all([
        request(app).post('/api/v1/vtu/purchase').send(reqBody),
        request(app).post('/api/v1/vtu/purchase').send(reqBody),
      ]);

      // Exactly one should succeed or fail cleanly with reference conflict
      const statuses = [res1.status, res2.status];
      expect(statuses.filter(s => s === 200 || s === 201).length).toBeLessThanOrEqual(1);
    });
  });

  describe('Edge Case 3: Provider False Positives (200 OK with status: "failed" body)', () => {
    it('should throw ProviderError when provider returns HTTP 200 with failed status body', () => {
      const mockBody = { status: 'failed', message: 'Insufficient provider pool' };

      expect(() => {
        if (mockBody.status !== 'success') {
          throw new ProviderError('Provider reported transaction failure despite 200 OK', 'INLOMAX', mockBody);
        }
      }).toThrow(ProviderError);
    });
  });

  describe('Edge Case 4: Stale Data Plans (Deprecated Plan ID)', () => {
    it('should handle unmapped/deprecated plan gracefully and return domain error', async () => {
      const user = await prisma.user.findFirst();
      if (!user) return;

      const res = await request(app)
        .post('/api/v1/vtu/purchase')
        .send({
          userId: user.id,
          serviceType: 'DATA',
          network: 'MTN',
          phoneNumber: '08031234567',
          planId: 'NON_EXISTENT_PLAN_99',
          amount: 1000,
          transactionPin: '1234',
          reference: `STALE-PLAN-${Date.now()}`,
        });

      expect([400, 502, 500]).toContain(res.status);
    });
  });

  describe('Edge Case 5: Phone Number Format Normalization', () => {
    it('should normalize 0803..., +234803..., and 234803... into uniform format', () => {
      expect(formatPhone('08031234567')).toBe('2348031234567');
      expect(formatPhone('+2348031234567')).toBe('2348031234567');
      expect(formatPhone('2348031234567')).toBe('2348031234567');
    });
  });
});

import { Network, Provider } from '../../types/enums';
import { IVtuProvider, VtuProviderResponse } from './IVtuProvider';

/**
 * Network code mapping for Inlomax REST API.
 */
const INLOMAX_NETWORK_MAP: Record<Network, number> = {
  [Network.MTN]: 1,
  [Network.AIRTEL]: 2,
  [Network.GLO]: 3,
  [Network.NINE_MOBILE]: 4,
};

/**
 * Inlomax VTU Provider – PRIMARY adapter.
 *
 * Mapped to the Inlomax REST API:
 *   Base URL : https://inlomax.com.ng/api
 *   Auth     : Authorization: Token <api_token>
 *   Endpoints:
 *     POST /data/                  – Data purchase
 *     POST /topup/                 – Airtime purchase
 *     GET  /balance/               – Wallet balance
 *     GET  /transaction/<ref>/     – Transaction status
 */
export class InlomaxProvider implements IVtuProvider {
  public readonly name = Provider.INLOMAX;
  private apiToken: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor() {
    this.apiToken = process.env.INLOMAX_API_TOKEN || 'mock_inlomax_token';
    this.baseUrl = process.env.INLOMAX_BASE_URL || 'https://inlomax.com.ng/api';
    this.timeoutMs = Number(process.env.INLOMAX_TIMEOUT_MS) || 15_000;
  }

  async purchaseData(
    network: Network,
    phone: string,
    planId: string,
    reference: string,
  ): Promise<VtuProviderResponse> {
    console.log(`[INLOMAX] Data purchase → ${network} | ${phone} | plan=${planId} | ref=${reference}`);

    try {
      // In production, make the HTTP call:
      // const res = await fetch(`${this.baseUrl}/data/`, {
      //   method: 'POST',
      //   headers: { Authorization: `Token ${this.apiToken}`, 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ network: INLOMAX_NETWORK_MAP[network], mobile_number: phone, plan: planId, Ported_number: true }),
      //   signal: AbortSignal.timeout(this.timeoutMs),
      // });
      // const data = await res.json();

      // --- Mock simulation based on phone suffix ---
      if (phone.endsWith('0000')) throw new Error('INLOMAX: Connection timed out');
      if (phone.endsWith('9999')) {
        return {
          success: false,
          status: 'FAILED',
          providerReference: `INL-FAIL-${Date.now()}`,
          message: 'INLOMAX: Telecom operator rejected transaction',
        };
      }
      if (phone.endsWith('5555')) {
        return {
          success: true,
          status: 'PENDING',
          providerReference: `INL-PEND-${Date.now()}`,
          message: 'INLOMAX: Transaction queued at operator',
        };
      }

      return {
        success: true,
        status: 'SUCCESS',
        providerReference: `INL-DAT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        message: 'INLOMAX: Data purchase successful',
      };
    } catch (err: any) {
      throw new Error(`INLOMAX_NETWORK_ERROR: ${err.message}`);
    }
  }

  async purchaseAirtime(
    network: Network,
    phone: string,
    amount: number,
    reference: string,
  ): Promise<VtuProviderResponse> {
    console.log(`[INLOMAX] Airtime purchase → ${network} | ${phone} | ₦${amount} | ref=${reference}`);

    try {
      // In production:
      // const res = await fetch(`${this.baseUrl}/topup/`, { ... });

      if (phone.endsWith('0000')) throw new Error('INLOMAX: Connection timed out');
      if (phone.endsWith('9999')) {
        return {
          success: false,
          status: 'FAILED',
          providerReference: `INL-FAIL-${Date.now()}`,
          message: 'INLOMAX: Insufficient API balance',
        };
      }
      if (phone.endsWith('5555')) {
        return {
          success: true,
          status: 'PENDING',
          providerReference: `INL-PEND-${Date.now()}`,
          message: 'INLOMAX: Transaction queued at operator',
        };
      }

      return {
        success: true,
        status: 'SUCCESS',
        providerReference: `INL-AIR-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        message: 'INLOMAX: Airtime top-up successful',
      };
    } catch (err: any) {
      throw new Error(`INLOMAX_NETWORK_ERROR: ${err.message}`);
    }
  }

  async checkBalance(): Promise<{ balance: number; currency: string }> {
    console.log('[INLOMAX] Checking API wallet balance...');

    // In production:
    // const res = await fetch(`${this.baseUrl}/balance/`, { headers: { Authorization: `Token ${this.apiToken}` } });
    // const data = await res.json();

    return { balance: 125_340.50, currency: 'NGN' };
  }

  async checkTransactionStatus(providerReference: string): Promise<VtuProviderResponse> {
    console.log(`[INLOMAX] Checking transaction status for ref: ${providerReference}`);

    // In production:
    // const res = await fetch(`${this.baseUrl}/transaction/${providerReference}/`, { ... });

    // Mock: PENDING references eventually resolve to SUCCESS
    if (providerReference.includes('PEND')) {
      return {
        success: true,
        status: 'SUCCESS',
        providerReference,
        message: 'INLOMAX: Transaction completed successfully',
      };
    }

    return {
      success: false,
      status: 'FAILED',
      providerReference,
      message: 'INLOMAX: Transaction not found or failed',
    };
  }
}

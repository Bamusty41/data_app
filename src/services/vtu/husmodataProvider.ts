import { Network, Provider } from '../../types/enums';
import { IVtuProvider, VtuProviderResponse } from './IVtuProvider';

/**
 * Network code mapping for Husmodata REST API.
 */
const HUSMODATA_NETWORK_MAP: Record<Network, string> = {
  [Network.MTN]: 'MTN',
  [Network.AIRTEL]: 'Airtel',
  [Network.GLO]: 'Glo',
  [Network.NINE_MOBILE]: '9mobile',
};

/**
 * Husmodata VTU Provider – FALLBACK adapter.
 *
 * Mapped to the Husmodata REST API:
 *   Base URL : https://husmodata.com/api
 *   Auth     : Authorization: Token <api_token>
 *   Endpoints:
 *     POST /data/                  – Data purchase
 *     POST /topup/                 – Airtime purchase
 *     GET  /user/                  – Wallet balance
 *     GET  /transaction/<ref>/     – Transaction status
 */
export class HusmodataProvider implements IVtuProvider {
  public readonly name = Provider.HUSMODATA;
  private apiToken: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor() {
    this.apiToken = process.env.HUSMODATA_API_TOKEN || 'mock_husmodata_token';
    this.baseUrl = process.env.HUSMODATA_BASE_URL || 'https://husmodata.com/api';
    this.timeoutMs = Number(process.env.HUSMODATA_TIMEOUT_MS) || 15_000;
  }

  async purchaseData(
    network: Network,
    phone: string,
    planId: string,
    reference: string,
  ): Promise<VtuProviderResponse> {
    console.log(`[HUSMODATA] Data purchase → ${network} | ${phone} | plan=${planId} | ref=${reference}`);

    try {
      // In production:
      // const res = await fetch(`${this.baseUrl}/data/`, {
      //   method: 'POST',
      //   headers: { Authorization: `Token ${this.apiToken}`, 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ network: HUSMODATA_NETWORK_MAP[network], mobile_number: phone, plan: planId, Ported_number: true }),
      //   signal: AbortSignal.timeout(this.timeoutMs),
      // });
      // const data = await res.json();

      // --- Mock simulation ---
      if (phone.endsWith('8888')) throw new Error('HUSMODATA: Gateway timeout');
      if (phone.endsWith('7777') || phone.endsWith('0000')) {
        return {
          success: false,
          status: 'FAILED',
          providerReference: `HUS-FAIL-${Date.now()}`,
          message: 'HUSMODATA: Service temporarily unavailable',
        };
      }

      return {
        success: true,
        status: 'SUCCESS',
        providerReference: `HUS-DAT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        message: 'HUSMODATA: Data purchase successful',
      };
    } catch (err: any) {
      throw new Error(`HUSMODATA_NETWORK_ERROR: ${err.message}`);
    }
  }

  async purchaseAirtime(
    network: Network,
    phone: string,
    amount: number,
    reference: string,
  ): Promise<VtuProviderResponse> {
    console.log(`[HUSMODATA] Airtime purchase → ${network} | ${phone} | ₦${amount} | ref=${reference}`);

    try {
      // In production:
      // const res = await fetch(`${this.baseUrl}/topup/`, { ... });

      if (phone.endsWith('8888')) throw new Error('HUSMODATA: Gateway timeout');
      if (phone.endsWith('7777') || phone.endsWith('0000')) {
        return {
          success: false,
          status: 'FAILED',
          providerReference: `HUS-FAIL-${Date.now()}`,
          message: 'HUSMODATA: Insufficient provider wallet balance',
        };
      }

      return {
        success: true,
        status: 'SUCCESS',
        providerReference: `HUS-AIR-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        message: 'HUSMODATA: Airtime top-up successful',
      };
    } catch (err: any) {
      throw new Error(`HUSMODATA_NETWORK_ERROR: ${err.message}`);
    }
  }

  async checkBalance(): Promise<{ balance: number; currency: string }> {
    console.log('[HUSMODATA] Checking API wallet balance...');

    // In production:
    // const res = await fetch(`${this.baseUrl}/user/`, { headers: { Authorization: `Token ${this.apiToken}` } });

    return { balance: 89_125.00, currency: 'NGN' };
  }

  async checkTransactionStatus(providerReference: string): Promise<VtuProviderResponse> {
    console.log(`[HUSMODATA] Checking transaction status for ref: ${providerReference}`);

    // In production:
    // const res = await fetch(`${this.baseUrl}/transaction/${providerReference}/`, { ... });

    if (providerReference.includes('PEND')) {
      return {
        success: true,
        status: 'SUCCESS',
        providerReference,
        message: 'HUSMODATA: Transaction completed successfully',
      };
    }

    return {
      success: false,
      status: 'FAILED',
      providerReference,
      message: 'HUSMODATA: Transaction not found or failed',
    };
  }
}

import { Provider } from '../../types/enums';
import { IVTUProvider, VTUPurchaseRequest, VTUPurchaseResponse } from './vtuProvider.interface';

export class InlomaxProvider implements IVTUProvider {
  public name: Provider = Provider.INLOMAX;
  private apiToken: string;
  private baseUrl: string;

  constructor(apiToken?: string, baseUrl?: string) {
    this.apiToken = apiToken || process.env.INLOMAX_API_TOKEN || 'mock_inlomax_token';
    this.baseUrl = baseUrl || process.env.INLOMAX_BASE_URL || 'https://api.inlomax.com/v1';
  }

  async purchaseAirtime(request: VTUPurchaseRequest): Promise<VTUPurchaseResponse> {
    // Simulated/configurable provider API call
    console.log(`[INLOMAX] Processing Airtime request ${request.reference} for ${request.phoneNumber}`);

    // In a live environment, fetch/axios is called here:
    // const res = await fetch(`${this.baseUrl}/airtime`, { ... });

    // Mock response simulation based on phone number suffix for testing edge cases
    if (request.phoneNumber.endsWith('9999')) {
      return {
        success: false,
        providerReference: `INL-FAIL-${Date.now()}`,
        message: 'INLOMAX: Network timeout from telecom operator',
      };
    }

    return {
      success: true,
      providerReference: `INL-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      message: 'INLOMAX: Airtime top-up successful',
      rawResponse: { status: 200, code: 'SUCCESS', ref: request.reference },
    };
  }

  async purchaseData(request: VTUPurchaseRequest): Promise<VTUPurchaseResponse> {
    console.log(`[INLOMAX] Processing Data request ${request.reference} for ${request.phoneNumber}`);

    if (!request.planId) {
      throw new Error('INLOMAX: Plan ID is required for data purchases');
    }

    if (request.phoneNumber.endsWith('9999')) {
      return {
        success: false,
        providerReference: `INL-FAIL-${Date.now()}`,
        message: 'INLOMAX: Insufficient provider API balance',
      };
    }

    return {
      success: true,
      providerReference: `INL-DATA-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      message: 'INLOMAX: Data bundle purchase successful',
      rawResponse: { status: 200, code: 'SUCCESS', plan: request.planId },
    };
  }
}

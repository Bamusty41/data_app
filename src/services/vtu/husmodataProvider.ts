import { Provider } from '../../types/enums';
import { IVTUProvider, VTUPurchaseRequest, VTUPurchaseResponse } from './vtuProvider.interface';

export class HusmodataProvider implements IVTUProvider {
  public name: Provider = Provider.HUSMODATA;
  private apiToken: string;
  private baseUrl: string;

  constructor(apiToken?: string, baseUrl?: string) {
    this.apiToken = apiToken || process.env.HUSMODATA_API_TOKEN || 'mock_husmodata_token';
    this.baseUrl = baseUrl || process.env.HUSMODATA_BASE_URL || 'https://husmodata.com/api';
  }

  async purchaseAirtime(request: VTUPurchaseRequest): Promise<VTUPurchaseResponse> {
    console.log(`[HUSMODATA] Processing Airtime request ${request.reference} for ${request.phoneNumber}`);

    if (request.phoneNumber.endsWith('8888')) {
      return {
        success: false,
        providerReference: `HUS-FAIL-${Date.now()}`,
        message: 'HUSMODATA: Telecom gateway connection error',
      };
    }

    return {
      success: true,
      providerReference: `HUS-AIR-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      message: 'HUSMODATA: Airtime transaction successful',
      rawResponse: { status: 'success', trans_id: request.reference },
    };
  }

  async purchaseData(request: VTUPurchaseRequest): Promise<VTUPurchaseResponse> {
    console.log(`[HUSMODATA] Processing Data request ${request.reference} for ${request.phoneNumber}`);

    if (!request.planId) {
      throw new Error('HUSMODATA: Plan ID is required for data purchases');
    }

    if (request.phoneNumber.endsWith('8888')) {
      return {
        success: false,
        providerReference: `HUS-FAIL-${Date.now()}`,
        message: 'HUSMODATA: Provider service temporarily unavailable',
      };
    }

    return {
      success: true,
      providerReference: `HUS-DAT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      message: 'HUSMODATA: Data transaction successful',
      rawResponse: { status: 'success', plan_code: request.planId },
    };
  }
}

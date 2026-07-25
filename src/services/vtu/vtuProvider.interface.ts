import { Network, Provider } from '../../types/enums';

export interface VTUPurchaseRequest {
  reference: string;
  network: Network;
  phoneNumber: string;
  amount: number;
  planId?: string; // Optional plan ID for data packages
}

export interface VTUPurchaseResponse {
  success: boolean;
  providerReference: string;
  message: string;
  rawResponse?: any;
}

export interface IVTUProvider {
  name: Provider;
  purchaseAirtime(request: VTUPurchaseRequest): Promise<VTUPurchaseResponse>;
  purchaseData(request: VTUPurchaseRequest): Promise<VTUPurchaseResponse>;
}

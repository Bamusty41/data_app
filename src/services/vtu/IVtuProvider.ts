import { Network, Provider } from '../../types/enums';

/**
 * Standardised response shape returned by every VTU provider integration.
 */
export interface VtuProviderResponse {
  success: boolean;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  providerReference: string;
  message: string;
  rawResponse?: any;
}

/**
 * Common interface that every Nigerian VTU provider adapter MUST implement.
 * Provides a clean contract for the Resilient Purchase Engine.
 */
export interface IVtuProvider {
  /** Human-readable provider enum */
  readonly name: Provider;

  /**
   * Purchase a mobile data bundle.
   */
  purchaseData(
    network: Network,
    phone: string,
    planId: string,
    reference: string,
  ): Promise<VtuProviderResponse>;

  /**
   * Purchase airtime top-up.
   */
  purchaseAirtime(
    network: Network,
    phone: string,
    amount: number,
    reference: string,
  ): Promise<VtuProviderResponse>;

  /**
   * Query the provider's wallet balance to ensure sufficient funds
   * before dispatching purchases.
   */
  checkBalance(): Promise<{ balance: number; currency: string }>;

  /**
   * Query the status of an existing transaction by its provider reference.
   * Used by the background queue to resolve PENDING transactions.
   */
  checkTransactionStatus(
    providerReference: string,
  ): Promise<VtuProviderResponse>;
}

import { VtuProviderResponse } from './IVtuProvider';

export function normalizeProviderResponse(response: VtuProviderResponse): VtuProviderResponse {
  if (response.status === 'FAILED' && response.success) {
    return { ...response, success: false, message: response.message || 'Provider response indicates failure' };
  }

  if (response.status === 'SUCCESS' && !response.success) {
    return { ...response, success: true };
  }

  return response;
}

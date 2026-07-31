/**
 * Network prefix auto-detection for Nigerian Telecom Networks.
 */

export type NetworkName = 'MTN' | 'AIRTEL' | 'GLO' | 'NINE_MOBILE';

const PREFIX_MAP: Record<string, NetworkName> = {
  // MTN
  '0803': 'MTN', '0806': 'MTN', '0813': 'MTN', '0816': 'MTN', '0810': 'MTN', '0814': 'MTN', '0903': 'MTN', '0906': 'MTN', '0913': 'MTN', '0916': 'MTN', '0703': 'MTN', '0706': 'MTN',
  // AIRTEL
  '0802': 'AIRTEL', '0808': 'AIRTEL', '0812': 'AIRTEL', '0708': 'AIRTEL', '0701': 'AIRTEL', '0902': 'AIRTEL', '0907': 'AIRTEL', '0901': 'AIRTEL', '0912': 'AIRTEL',
  // GLO
  '0805': 'GLO', '0807': 'GLO', '0811': 'GLO', '0815': 'GLO', '0705': 'GLO', '0905': 'GLO', '0915': 'GLO',
  // 9MOBILE
  '0809': '9MOBILE', '0817': '9MOBILE', '0818': '9MOBILE', '0909': '9MOBILE', '0908': '9MOBILE',
};

export function detectNetwork(phone: string): NetworkName | null {
  const clean = phone.replace(/\D/g, '');
  let normalized = clean;
  if (clean.startsWith('234')) {
    normalized = '0' + clean.slice(3);
  }
  const prefix = normalized.slice(0, 4);
  return PREFIX_MAP[prefix] || null;
}

export function normalizeNigeriaPhoneNumber(rawPhone: string): string {
  const digits = rawPhone.replace(/[^0-9]/g, '');

  if (digits.length === 11 && digits.startsWith('0')) {
    return digits;
  }

  if (digits.length === 13 && digits.startsWith('234')) {
    return `0${digits.slice(3)}`;
  }

  if (digits.length === 10) {
    return `0${digits}`;
  }

  throw new Error(`Invalid Nigerian phone number format: ${rawPhone}`);
}

export function normalizePhoneForProvider(rawPhone: string): string {
  const normalized = normalizeNigeriaPhoneNumber(rawPhone);
  return normalized;
}

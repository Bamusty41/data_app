// mobile/src/utils/formatPhone.ts
/**
 * Normalises various phone number formats to E.164 (Nigeria) without the leading +
 * Accepted inputs: "08031234567", "+2348031234567", "2348031234567"
 */
export function formatPhone(input: string): string {
  const digits = input.replace(/[^0-9]/g, '');
  if (digits.length === 11 && digits.startsWith('0')) {
    // 0803xxxxxxx -> 234803xxxxxxx
    return '234' + digits.slice(1);
  }
  if (digits.length === 13 && digits.startsWith('234')) {
    return digits;
  }
  if (digits.length === 10 && digits.startsWith('80')) {
    // missing leading 0
    return '234' + digits;
  }
  // fallback – return as‑is to let API reject invalid numbers
  return digits;
}

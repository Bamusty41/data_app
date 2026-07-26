import crypto from 'crypto';

export interface StrowalletUser {
  id: string;
  full_name: string;
  email: string;
  phone: string;
}

export interface StrowalletVirtualAccountResponse {
  account_number: string;
  bank_name: string;
  account_name: string;
  rawResponse?: any;
}

export class StrowalletService {
  private static API_URL = process.env.STROWALLET_API_URL || 'https://api.strowallet.com/v1';
  private static PUBLIC_KEY = process.env.STROWALLET_PUBLIC_KEY || 'mock_strowallet_public_key';
  private static SECRET_KEY = process.env.STROWALLET_SECRET_KEY || 'mock_strowallet_secret_key';

  /**
   * Calls Strowallet API to generate a dedicated NGN Virtual Bank Account for a registered user.
   */
  static async createVirtualAccount(user: StrowalletUser): Promise<StrowalletVirtualAccountResponse> {
    console.log(`[Strowallet] Requesting dedicated Virtual Account for ${user.full_name} (${user.email})`);

    // In live production, make HTTP request:
    // const res = await fetch(`${this.API_URL}/virtual-account/create`, { ... });

    // Mock/Simulated Strowallet API response for testing / development
    if (user.email.includes('fail_virtual_account')) {
      throw new Error('Strowallet API error: Unable to generate virtual account at partner bank');
    }

    const mockAccountNumber = `99${Math.floor(10000000 + Math.random() * 90000000)}`;
    const mockBanks = ['Wema Bank', 'Sterling Bank', 'Moniepoint Microfinance Bank'];
    const mockBank = mockBanks[Math.floor(Math.random() * mockBanks.length)];

    return {
      account_number: mockAccountNumber,
      bank_name: mockBank,
      account_name: `${user.full_name} / DataApp`,
      rawResponse: {
        status: 'success',
        message: 'Virtual account created successfully',
        data: {
          account_number: mockAccountNumber,
          bank_name: mockBank,
          customer_name: user.full_name,
        },
      },
    };
  }

  /**
   * Verifies the HMAC SHA-256 signature of an incoming Strowallet Webhook request.
   */
  static verifyWebhookSignature(rawBody: string | Buffer, signature: string, secret?: string): boolean {
    const webhookSecret = secret || process.env.STROWALLET_WEBHOOK_SECRET || 'mock_webhook_secret_key';
    if (!signature || !rawBody) {
      return false;
    }

    const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const computedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(bodyString)
      .digest('hex');

    // Timing-safe comparison to prevent side-channel timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature.toLowerCase()),
        Buffer.from(computedSignature.toLowerCase())
      );
    } catch {
      return false;
    }
  }
}

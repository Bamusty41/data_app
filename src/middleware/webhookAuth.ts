import { Request, Response, NextFunction } from 'express';
import { StrowalletService } from '../services/strowalletService';
import { WebhookSecurityError } from '../errors/vtuErrors';

export interface WebhookRequest extends Request {
  rawBody?: string;
}

export function webhookAuth(req: WebhookRequest, res: Response, next: NextFunction) {
  try {
    // 1. IP Whitelist Verification (if configured)
    const allowedIps = (process.env.STROWALLET_IP_WHITELIST || '').split(',').map((ip) => ip.trim()).filter(Boolean);
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '';

    if (allowedIps.length > 0 && !allowedIps.includes(clientIp)) {
      console.warn(`[Webhook Auth] Blocked request from unauthorized IP: ${clientIp}`);
      throw new WebhookSecurityError('Unauthorized IP address');
    }

    // 2. Signature Verification
    const signature = (req.headers['x-strowallet-signature'] || req.headers['x-signature']) as string;
    if (!signature) {
      throw new WebhookSecurityError('Missing webhook security signature header');
    }

    // Capture raw body for HMAC verification
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const isValid = StrowalletService.verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      console.warn(`[Webhook Auth] Invalid HMAC signature detected for IP ${clientIp}`);
      throw new WebhookSecurityError('Invalid webhook signature verification');
    }

    return next();
  } catch (error: any) {
    if (error instanceof WebhookSecurityError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.errorCode,
      });
    }
    return res.status(401).json({ error: 'Webhook security authentication failed' });
  }
}

export class BaseDomainError extends Error {
  public statusCode: number;
  public errorCode: string;
  public details?: any;

  constructor(message: string, statusCode = 400, errorCode = 'DOMAIN_ERROR', details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InsufficientBalanceError extends BaseDomainError {
  constructor(available: number | string, required: number | string) {
    super(
      `Insufficient wallet balance. Available: ₦${available}, Required: ₦${required}`,
      400,
      'INSUFFICIENT_BALANCE',
      { available, required }
    );
  }
}

export class DuplicateTransactionError extends BaseDomainError {
  constructor(reference: string) {
    super(
      `Duplicate transaction reference detected: ${reference}`,
      409, // Conflict
      'DUPLICATE_TRANSACTION_REFERENCE',
      { reference }
    );
  }
}

export class WebhookSecurityError extends BaseDomainError {
  constructor(message: string) {
    super(message, 401, 'WEBHOOK_SECURITY_FAILED');
  }
}

export class UserNotFoundError extends BaseDomainError {
  constructor(userId: string) {
    super(`User with ID '${userId}' not found`, 404, 'USER_NOT_FOUND', { userId });
  }
}

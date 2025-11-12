/**
 * Custom error classes for payment-related errors in the fetch wrapper.
 */

/**
 * Base class for payment-related errors.
 */
export class PaymentError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "PaymentError";
    Object.setPrototypeOf(this, PaymentError.prototype);
  }
}

/**
 * Error thrown when a 402 Payment Required response is received.
 * 
 * This typically indicates that payment verification failed or the payment
 * was not found/validated by the provider.
 */
export class PaymentRequiredError extends PaymentError {
  constructor(details?: unknown) {
    super(
      "Payment required: Payment verification failed or payment not found",
      "PAYMENT_REQUIRED",
      details
    );
    this.name = "PaymentRequiredError";
    Object.setPrototypeOf(this, PaymentRequiredError.prototype);
  }
}

/**
 * Error thrown when payment verification fails.
 * 
 * This indicates that the payment transaction signature or other payment
 * details could not be verified by the provider.
 */
export class PaymentVerificationError extends PaymentError {
  constructor(details?: unknown) {
    super(
      "Payment verification failed: Transaction signature or payment details invalid",
      "PAYMENT_VERIFICATION_FAILED",
      details
    );
    this.name = "PaymentVerificationError";
    Object.setPrototypeOf(this, PaymentVerificationError.prototype);
  }
}

/**
 * Error thrown when the wallet has insufficient balance to complete the payment.
 */
export class InsufficientBalanceError extends PaymentError {
  constructor(details?: unknown) {
    super(
      "Insufficient balance: Wallet does not have enough funds to complete payment",
      "INSUFFICIENT_BALANCE",
      details
    );
    this.name = "InsufficientBalanceError";
    Object.setPrototypeOf(this, InsufficientBalanceError.prototype);
  }
}


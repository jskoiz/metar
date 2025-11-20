/**
 * Custom error classes for x402 payment handling
 */

/**
 * Base error class for all payment-related errors
 */
export class PaymentError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any,
    public recovery?: string
  ) {
    super(message);
    this.name = "PaymentError";
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PaymentError);
    }
  }
}

/**
 * Error thrown when a 402 Payment Required response is received
 */
export class PaymentRequiredError extends PaymentError {
  constructor(details?: any) {
    super(
      "Payment required",
      "PAYMENT_REQUIRED",
      details,
      "Execute the payment transaction and retry the request with payment proof headers."
    );
    this.name = "PaymentRequiredError";
  }
}

/**
 * Error thrown when payment verification fails
 */
export class PaymentVerificationError extends PaymentError {
  constructor(details?: any) {
    super(
      "Payment verification failed",
      "VERIFICATION_FAILED",
      details,
      "Verify the transaction signature and ensure payment headers are correctly formatted. Check that the transaction was confirmed on-chain."
    );
    this.name = "PaymentVerificationError";
  }
}

/**
 * Error thrown when wallet has insufficient balance
 */
export class InsufficientBalanceError extends PaymentError {
  constructor(details?: any) {
    super(
      "Insufficient balance",
      "INSUFFICIENT_BALANCE",
      details,
      "Ensure your wallet has sufficient USDC balance to cover the payment amount plus transaction fees."
    );
    this.name = "InsufficientBalanceError";
  }
}

/**
 * Error thrown for network-related issues
 */
export class NetworkError extends PaymentError {
  constructor(details?: any) {
    super(
      "Network error",
      "NETWORK_ERROR",
      details,
      "Check your network connection and try again. If the issue persists, verify the provider URL and Solana RPC endpoint."
    );
    this.name = "NetworkError";
  }
}

/**
 * Interface for 402 response body structure
 */
export interface PaymentRequiredResponse {
  error: "Payment Required" | string;
  route?: string;
  amount?: number;
  currency?: string;
  payTo?: string;
  mint?: string;
  chain?: string;
  message?: string;
  [key: string]: any;
}

/**
 * Parses a Response object to extract error information and throw appropriate error
 * @param response - The HTTP Response object
 * @returns Promise that rejects with an appropriate PaymentError
 */
export async function parse402Response(response: Response): Promise<never> {
  if (response.status !== 402) {
    throw new Error(`parse402Response called with non-402 status: ${response.status}`);
  }

  let paymentDetails: PaymentRequiredResponse;

  try {
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      paymentDetails = (await response.json()) as PaymentRequiredResponse;
    } else {
      // Try to parse as JSON anyway, fallback to text
      const text = await response.text();
      try {
        paymentDetails = JSON.parse(text);
      } catch {
        paymentDetails = {
          error: "Payment Required",
          message: text || "Payment required for this resource",
        };
      }
    }
  } catch (error) {
    // If we can't parse the response, create a generic payment required error
    throw new PaymentRequiredError({
      status: response.status,
      statusText: response.statusText,
      parseError: error instanceof Error ? error.message : String(error),
    });
  }

  // Check for specific error messages that indicate different error types
  const errorMessage = paymentDetails.error?.toLowerCase() || "";
  const detailsMessage = paymentDetails.message?.toLowerCase() || "";

  // Check for verification failures
  if (
    errorMessage.includes("verification") ||
    errorMessage.includes("verify") ||
    detailsMessage.includes("verification") ||
    detailsMessage.includes("verify") ||
    detailsMessage.includes("invalid payment") ||
    detailsMessage.includes("payment proof")
  ) {
    throw new PaymentVerificationError({
      ...paymentDetails,
      status: response.status,
      statusText: response.statusText,
    });
  }

  // Check for insufficient balance
  if (
    errorMessage.includes("insufficient") ||
    errorMessage.includes("balance") ||
    detailsMessage.includes("insufficient") ||
    detailsMessage.includes("balance") ||
    detailsMessage.includes("not enough")
  ) {
    throw new InsufficientBalanceError({
      ...paymentDetails,
      status: response.status,
      statusText: response.statusText,
    });
  }

  // Default to PaymentRequiredError for standard 402 responses
  throw new PaymentRequiredError({
    ...paymentDetails,
    status: response.status,
    statusText: response.statusText,
  });
}

/**
 * Parses any error (Error, Response, or unknown) and converts it to a PaymentError
 * @param error - The error to parse
 * @returns A PaymentError instance
 */
export async function parsePaymentError(error: unknown): Promise<PaymentError> {
  // If it's already a PaymentError, return it
  if (error instanceof PaymentError) {
    return error;
  }

  // If it's a Response object with 402 status, parse it
  if (error instanceof Response && error.status === 402) {
    try {
      await parse402Response(error);
      // This should never be reached, but TypeScript needs it
      return new PaymentRequiredError();
    } catch (paymentError) {
      if (paymentError instanceof PaymentError) {
        return paymentError;
      }
      // Fallback if parse402Response throws something unexpected
      return new PaymentRequiredError({ originalError: paymentError });
    }
  }

  // If it's a network/fetch error, wrap it as NetworkError
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return new NetworkError({
      originalError: error.message,
      stack: error.stack,
    });
  }

  // If it's a generic Error, check for network-related messages
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes("network") ||
      message.includes("connection") ||
      message.includes("timeout") ||
      message.includes("failed to fetch")
    ) {
      return new NetworkError({
        originalError: error.message,
        stack: error.stack,
      });
    }

    // Check for balance-related errors
    if (
      message.includes("insufficient") ||
      message.includes("balance") ||
      message.includes("not enough")
    ) {
      return new InsufficientBalanceError({
        originalError: error.message,
        stack: error.stack,
      });
    }
  }

  // Default: wrap as NetworkError for unknown errors
  return new NetworkError({
    originalError: error instanceof Error ? error.message : String(error),
    originalErrorType: error instanceof Error ? error.constructor.name : typeof error,
  });
}

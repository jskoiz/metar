export type PaymentErrorType =
  | "NETWORK_ERROR"
  | "TRANSACTION_NOT_FOUND"
  | "INVALID_RECIPIENT"
  | "INSUFFICIENT_AMOUNT"
  | "INVALID_MEMO"
  | "UNKNOWN_ERROR";

export interface PaymentError {
  type: PaymentErrorType;
  message: string;
  details?: any;
}

export interface PaymentVerificationResult {
  success: boolean;
  error?: PaymentError;
}

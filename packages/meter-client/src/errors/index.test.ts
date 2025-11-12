/**
 * Unit tests for error classes and parsing utilities
 */

import {
  PaymentError,
  PaymentRequiredError,
  PaymentVerificationError,
  InsufficientBalanceError,
  NetworkError,
  parse402Response,
  parsePaymentError,
  PaymentRequiredResponse,
} from "./index.js";

describe("PaymentError", () => {
  it("should create a PaymentError with message, code, and details", () => {
    const error = new PaymentError("Test error", "TEST_CODE", { foo: "bar" });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(PaymentError);
    expect(error.message).toBe("Test error");
    expect(error.code).toBe("TEST_CODE");
    expect(error.details).toEqual({ foo: "bar" });
    expect(error.name).toBe("PaymentError");
  });

  it("should include recovery suggestion when provided", () => {
    const recovery = "Try again later";
    const error = new PaymentError("Test error", "TEST_CODE", undefined, recovery);

    expect(error.recovery).toBe(recovery);
  });
});

describe("PaymentRequiredError", () => {
  it("should create a PaymentRequiredError with correct defaults", () => {
    const error = new PaymentRequiredError();

    expect(error).toBeInstanceOf(PaymentError);
    expect(error).toBeInstanceOf(PaymentRequiredError);
    expect(error.message).toBe("Payment required");
    expect(error.code).toBe("PAYMENT_REQUIRED");
    expect(error.name).toBe("PaymentRequiredError");
    expect(error.recovery).toContain("Execute the payment transaction");
  });

  it("should accept details", () => {
    const details = { amount: 0.03, currency: "USDC" };
    const error = new PaymentRequiredError(details);

    expect(error.details).toEqual(details);
  });
});

describe("PaymentVerificationError", () => {
  it("should create a PaymentVerificationError with correct defaults", () => {
    const error = new PaymentVerificationError();

    expect(error).toBeInstanceOf(PaymentError);
    expect(error).toBeInstanceOf(PaymentVerificationError);
    expect(error.message).toBe("Payment verification failed");
    expect(error.code).toBe("VERIFICATION_FAILED");
    expect(error.name).toBe("PaymentVerificationError");
    expect(error.recovery).toContain("Verify the transaction signature");
  });

  it("should accept details", () => {
    const details = { txSig: "abc123" };
    const error = new PaymentVerificationError(details);

    expect(error.details).toEqual(details);
  });
});

describe("InsufficientBalanceError", () => {
  it("should create an InsufficientBalanceError with correct defaults", () => {
    const error = new InsufficientBalanceError();

    expect(error).toBeInstanceOf(PaymentError);
    expect(error).toBeInstanceOf(InsufficientBalanceError);
    expect(error.message).toBe("Insufficient balance");
    expect(error.code).toBe("INSUFFICIENT_BALANCE");
    expect(error.name).toBe("InsufficientBalanceError");
    expect(error.recovery).toContain("Ensure your wallet has sufficient USDC");
  });

  it("should accept details", () => {
    const details = { required: 0.05, available: 0.02 };
    const error = new InsufficientBalanceError(details);

    expect(error.details).toEqual(details);
  });
});

describe("NetworkError", () => {
  it("should create a NetworkError with correct defaults", () => {
    const error = new NetworkError();

    expect(error).toBeInstanceOf(PaymentError);
    expect(error).toBeInstanceOf(NetworkError);
    expect(error.message).toBe("Network error");
    expect(error.code).toBe("NETWORK_ERROR");
    expect(error.name).toBe("NetworkError");
    expect(error.recovery).toContain("Check your network connection");
  });

  it("should accept details", () => {
    const details = { url: "https://api.example.com" };
    const error = new NetworkError(details);

    expect(error.details).toEqual(details);
  });
});

describe("parse402Response", () => {
  it("should throw PaymentRequiredError for standard 402 response", async () => {
    const response = new Response(
      JSON.stringify({
        error: "Payment Required",
        route: "summarize",
        amount: 0.03,
        currency: "USDC",
        payTo: "7xKXtg2CZ3Qz4qKzJqKzJqKzJqKzJqKzJqKzJqKzJqKz",
        mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        chain: "solana",
      }),
      {
        status: 402,
        headers: { "Content-Type": "application/json" },
      }
    );

    await expect(parse402Response(response)).rejects.toThrow(PaymentRequiredError);

    try {
      await parse402Response(response);
    } catch (error) {
      expect(error).toBeInstanceOf(PaymentRequiredError);
      if (error instanceof PaymentRequiredError) {
        expect(error.details).toHaveProperty("route", "summarize");
        expect(error.details).toHaveProperty("amount", 0.03);
        expect(error.details).toHaveProperty("status", 402);
      }
    }
  });

  it("should throw PaymentVerificationError for verification failures", async () => {
    const response = new Response(
      JSON.stringify({
        error: "Payment Verification Failed",
        message: "Invalid payment proof",
      }),
      {
        status: 402,
        headers: { "Content-Type": "application/json" },
      }
    );

    await expect(parse402Response(response)).rejects.toThrow(PaymentVerificationError);

    try {
      await parse402Response(response);
    } catch (error) {
      expect(error).toBeInstanceOf(PaymentVerificationError);
    }
  });

  it("should throw InsufficientBalanceError for balance errors", async () => {
    const response = new Response(
      JSON.stringify({
        error: "Payment Required",
        message: "Insufficient balance to complete payment",
      }),
      {
        status: 402,
        headers: { "Content-Type": "application/json" },
      }
    );

    await expect(parse402Response(response)).rejects.toThrow(InsufficientBalanceError);

    try {
      await parse402Response(response);
    } catch (error) {
      expect(error).toBeInstanceOf(InsufficientBalanceError);
    }
  });

  it("should handle non-JSON 402 responses", async () => {
    const response = new Response("Payment required", {
      status: 402,
      headers: { "Content-Type": "text/plain" },
    });

    await expect(parse402Response(response)).rejects.toThrow(PaymentRequiredError);

    try {
      await parse402Response(response);
    } catch (error) {
      expect(error).toBeInstanceOf(PaymentRequiredError);
      if (error instanceof PaymentRequiredError) {
        expect(error.details).toHaveProperty("message", "Payment required");
      }
    }
  });

  it("should handle malformed JSON gracefully", async () => {
    const response = new Response("not json", {
      status: 402,
      headers: { "Content-Type": "application/json" },
    });

    await expect(parse402Response(response)).rejects.toThrow(PaymentRequiredError);

    try {
      await parse402Response(response);
    } catch (error) {
      expect(error).toBeInstanceOf(PaymentRequiredError);
      if (error instanceof PaymentRequiredError) {
        expect(error.details).toHaveProperty("parseError");
      }
    }
  });

  it("should throw error if called with non-402 status", async () => {
    const response = new Response("OK", { status: 200 });

    await expect(parse402Response(response)).rejects.toThrow(
      "parse402Response called with non-402 status"
    );
  });

  it("should detect verification errors from message field", async () => {
    const response = new Response(
      JSON.stringify({
        error: "Payment Required",
        message: "Payment verification failed",
      }),
      {
        status: 402,
        headers: { "Content-Type": "application/json" },
      }
    );

    await expect(parse402Response(response)).rejects.toThrow(PaymentVerificationError);
  });

  it("should detect balance errors from error field", async () => {
    const response = new Response(
      JSON.stringify({
        error: "Insufficient balance",
      }),
      {
        status: 402,
        headers: { "Content-Type": "application/json" },
      }
    );

    await expect(parse402Response(response)).rejects.toThrow(InsufficientBalanceError);
  });
});

describe("parsePaymentError", () => {
  it("should return PaymentError if already a PaymentError", async () => {
    const error = new PaymentRequiredError();
    const result = await parsePaymentError(error);

    expect(result).toBe(error);
  });

  it("should parse 402 Response objects", async () => {
    const response = new Response(
      JSON.stringify({
        error: "Payment Required",
        route: "test",
      }),
      {
        status: 402,
        headers: { "Content-Type": "application/json" },
      }
    );

    const result = await parsePaymentError(response);

    expect(result).toBeInstanceOf(PaymentRequiredError);
  });

  it("should wrap TypeError fetch errors as NetworkError", async () => {
    const error = new TypeError("Failed to fetch");
    const result = await parsePaymentError(error);

    expect(result).toBeInstanceOf(NetworkError);
    expect(result.details).toHaveProperty("originalError", "Failed to fetch");
  });

  it("should wrap network-related Error messages as NetworkError", async () => {
    const error = new Error("Network request failed");
    const result = await parsePaymentError(error);

    expect(result).toBeInstanceOf(NetworkError);
  });

  it("should wrap connection timeout errors as NetworkError", async () => {
    const error = new Error("Connection timeout");
    const result = await parsePaymentError(error);

    expect(result).toBeInstanceOf(NetworkError);
  });

  it("should wrap balance-related errors as InsufficientBalanceError", async () => {
    const error = new Error("Insufficient balance in wallet");
    const result = await parsePaymentError(error);

    expect(result).toBeInstanceOf(InsufficientBalanceError);
  });

  it("should wrap unknown errors as NetworkError", async () => {
    const error = { some: "unknown", error: "object" };
    const result = await parsePaymentError(error);

    expect(result).toBeInstanceOf(NetworkError);
    expect(result.details).toHaveProperty("originalError");
  });

  it("should handle string errors", async () => {
    const result = await parsePaymentError("String error");

    expect(result).toBeInstanceOf(NetworkError);
    expect(result.details).toHaveProperty("originalError", "String error");
  });

  it("should handle null/undefined errors", async () => {
    const result1 = await parsePaymentError(null);
    const result2 = await parsePaymentError(undefined);

    expect(result1).toBeInstanceOf(NetworkError);
    expect(result2).toBeInstanceOf(NetworkError);
  });

  it("should not parse non-402 Response objects", async () => {
    const response = new Response("OK", { status: 200 });
    const result = await parsePaymentError(response);

    // Should wrap as NetworkError, not parse as 402
    expect(result).toBeInstanceOf(NetworkError);
  });
});

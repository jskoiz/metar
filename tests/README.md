# End-to-End Integration Tests

This directory contains end-to-end integration tests for the x402 payment protocol implementation.

## Overview

The E2E tests verify the complete payment flow from client to provider:

1. **Provider Server**: Express server with protected route (`/api/summarize`)
2. **Registry/Price Service**: Price lookup endpoint (`.meter/price`)
3. **Client**: MetarClient making paid API requests
4. **Full Flow**: getPrice → payment → request → verification
5. **Error Cases**: 402 handling, invalid payment rejection, nonce reuse rejection

## Running Tests

### Prerequisites

1. Build all packages:

   ```bash
   npm run build
   ```

2. Ensure you have a Solana devnet RPC endpoint configured (or use the default)

### Run All E2E Tests

```bash
npm run test:e2e
```

### Skip Integration Tests

Set the `SKIP_INTEGRATION_TESTS` environment variable to skip tests that require network access:

```bash
SKIP_INTEGRATION_TESTS=true npm run test:e2e
```

## Test Structure

### Test: Full Payment Flow

Tests the complete end-to-end flow:

- Starts provider server with protected route
- Starts registry/price service
- Creates MetarClient instance
- Makes paid API request
- Verifies successful response with payment info

### Test: 402 Response Handling

Tests that the provider correctly returns 402 Payment Required when:

- Request is made without payment headers
- Response includes payment details (route, amount, payTo, etc.)

### Test: Invalid Payment Rejection

Tests that the provider rejects requests with:

- Invalid transaction signatures
- Payment verification failures

### Test: Nonce Reuse Rejection

Tests that the provider prevents replay attacks by:

- Rejecting requests with reused nonces
- Properly tracking nonce consumption

## Test Configuration

Tests use the following configuration:

- **Provider Port**: 3002
- **Registry Port**: 3003
- **Route ID**: `summarize:v1`
- **Price**: 0.03 USDC
- **Network**: Solana devnet

## Notes

- Tests require Solana devnet access
- USDC funding may fail on devnet (tests handle this gracefully)
- Tests create temporary servers that are cleaned up after each test
- Each test uses unique keypairs and agent IDs to avoid conflicts

## Troubleshooting

### Tests Fail with "Insufficient Balance"

This is expected if the test accounts don't have USDC tokens. The tests will attempt to fund accounts but may fail if:

- Devnet USDC mint doesn't allow minting
- Accounts need to be pre-funded with USDC

### Port Already in Use

If you see "port already in use" errors:

- Ensure no other services are running on ports 3002 or 3003
- Kill any existing processes using those ports

### Network Timeouts

If tests timeout:

- Check your internet connection
- Verify Solana devnet RPC endpoint is accessible
- Consider using a different RPC endpoint via environment variables

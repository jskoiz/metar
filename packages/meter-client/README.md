# @meter/meter-client

Client SDK for making paid API requests using the x402 payment protocol.

## Overview

The Meter Client SDK provides client-side functionality for integrating x402 payment flows into applications. It handles wallet integration, payment orchestration, and API request management.

## Installation

```bash
npm install @meter/meter-client
```

## Dependencies

- `@solana/web3.js` - Solana blockchain interaction
- `@solana/spl-token` - SPL token operations (USDC)
- `tweetnacl` - Cryptographic signatures
- `uuid` - Unique identifier generation
- `@solana/wallet-adapter-base` (peer dependency) - Wallet adapter interface

## Package Structure

```
src/
├── wallet/      # Wallet integration utilities
├── payment/     # Payment transaction construction
├── signature/   # Cryptographic signature handling
├── fetch/       # Fetch wrapper for payment flow
└── index.ts     # Main exports
```

## Usage

```typescript
import { /* exports */ } from "@meter/meter-client";
```

## Development

Build the package:

```bash
npm run build
```

Watch mode:

```bash
npm run build:watch
```

## License

See root LICENSE file.


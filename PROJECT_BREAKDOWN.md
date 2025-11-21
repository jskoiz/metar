# Metar x402 Payment Protocol SDK - Project Breakdown

**Comprehensive Project Documentation for Web Development Agency**

---

## Executive Summary

**Metar** is a production-ready SDK that enables **pay-per-call APIs** using cryptocurrency micropayments on the Solana blockchain. While it's particularly well-suited for AI agents and autonomous software, it's a general-purpose solution for any programmatic client that needs to make paid API requests. Metar provides a complete solution that allows API providers to monetize their endpoints instantly and enables any software application to make paid API requests programmatically without traditional payment friction.

### Value Proposition

- **For API Providers**: Monetize APIs in minutes with one-line middleware—no complex billing infrastructure needed
- **For Programmatic Clients**: Automatic micropayments using USDC stablecoin—no forms, signups, or credit cards required
  - AI agents and autonomous software
  - Traditional applications and services
  - Scripts and automation tools
  - Microservices and distributed systems
  - IoT devices and edge computing
- **For Developers**: Complete SDK with TypeScript support, comprehensive tests, and production-ready code

### Market Opportunity

The project addresses multiple market segments:

- **AI Agent Economy**: AI agents need to interact with paid APIs autonomously without human intervention
- **Programmatic API Access**: Any software that needs pay-per-use API access without subscription management
- **Micropayment Use Cases**: Scenarios where per-request pricing is more suitable than subscriptions
- **Decentralized Payments**: Applications preferring blockchain-based payments over traditional payment processors

---

## Project Overview

### What is Metar?

Metar is a complete implementation of the **x402 Payment Protocol** (HTTP 402 Payment Required) built on Solana blockchain. It enables:

1. **Micropayment-protected APIs**: API providers can charge per request using USDC stablecoin
2. **Automatic payment orchestration**: Clients can make paid requests with automatic payment handling
3. **Stateless agent authentication**: Uses Visa's Trusted Agent Protocol (TAP) for cryptographic agent identity verification
4. **On-chain verification**: All payments verified against Solana blockchain for security and transparency

### Core Problem Solved

**Traditional API monetization fails for programmatic clients:**

- Credit card forms require human interaction (not suitable for automated systems)
- Subscription management is complex and doesn't scale for variable usage
- Free tiers create unsustainable economics for providers
- Programmatic clients can't complete traditional signup flows
- Per-request pricing is difficult with traditional payment methods

**Metar's solution:**

- Programmatic micropayments using cryptocurrency (USDC stablecoin)
- No forms, signups, or human intervention required
- Fast, cheap transactions on Solana (sub-second confirmation)
- Cryptographic authentication suitable for any programmatic client
- Pay-per-use model that scales with actual usage

---

## Technical Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│              CLIENT (Any Programmatic Client)                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ MetarClient SDK                                      │  │
│  │  • Price lookup                                      │  │
│  │  • USDC payment transaction creation               │  │
│  │  • TAP signature generation (Ed25519)               │  │
│  │  • Automatic payment flow orchestration              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
         ┌─────────────────────────────────┐
         │  1. GET /.meter/price           │
         │  2. Send USDC transfer (Solana) │
         │  3. POST /api/route (+ headers) │
         └─────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  PROVIDER (API Server)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ createX402Middleware (Express)                       │  │
│  │  • Parse payment headers                             │  │
│  │  • Verify timestamp (5 min max age)                  │  │
│  │  • Check nonce (prevent replay attacks)               │  │
│  │  • Verify TAP signature (Ed25519)                   │  │
│  │  • Validate payment on-chain (Solana)               │  │
│  │  • Log usage to database (SQLite)                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
         ┌─────────────────────────────────┐
         │  • Solana blockchain            │
         │  • Agent registry                │
         │  • Usage database (SQLite)       │
         └─────────────────────────────────┘
```

### Payment Flow (Step-by-Step)

1. **Price Discovery**: Client requests price from `GET /.meter/price?route=summarize:v1`
   - Returns: price (USDC), recipient address, token mint, chain identifier

2. **Payment Transaction**: Client creates and sends USDC transfer on Solana
   - Includes memo with route ID and nonce
   - Waits for blockchain confirmation

3. **TAP Signature**: Client generates HTTP Signature (RFC 9421) using Ed25519
   - Signs request-target, date, nonce, and transaction signature
   - Proves agent identity cryptographically

4. **API Request**: Client makes API request with payment headers:
   - `x-meter-tx`: Transaction signature
   - `x-meter-route`: Route identifier
   - `x-meter-amt`: Payment amount
   - `x-meter-currency`: "USDC"
   - `x-meter-nonce`: Unique nonce (UUID v7)
   - `x-meter-ts`: Timestamp (milliseconds)
   - `x-meter-agent-kid`: Agent key ID
   - `Authorization`: TAP signature

5. **Verification**: Provider middleware verifies:
   - ✅ Timestamp not expired (max 5 minutes old)
   - ✅ Nonce not reused (replay attack prevention)
   - ✅ TAP signature valid (agent authentication)
   - ✅ Payment exists on-chain and confirmed
   - ✅ Payment amount matches required price
   - ✅ Payment sent to correct recipient

6. **Processing**: Request proceeds if all verifications succeed

---

## Key Features & Capabilities

### For API Providers

✅ **One-Line Middleware**: Protect any Express route with a single function call  
✅ **Automatic Payment Verification**: On-chain validation, signature verification, replay protection  
✅ **Usage Analytics**: Built-in SQLite database for tracking payments and usage  
✅ **Flexible Pricing**: Set different prices per route  
✅ **Production Ready**: Comprehensive error handling and security features

### For API Clients

✅ **Automatic Payment Flow**: SDK handles entire payment process  
✅ **Wallet Integration**: Supports browser wallets (Phantom, etc.) and Node.js wallets  
✅ **Price Caching**: Efficient price lookup with caching  
✅ **TypeScript Support**: Full type safety and IntelliSense  
✅ **Error Handling**: Comprehensive error types for different failure scenarios

### Security Features

✅ **Replay Attack Prevention**: Nonces tracked per agent, single-use only  
✅ **Timestamp Validation**: Requests expire after 5 minutes  
✅ **Agent Authentication**: Ed25519 signatures per Trusted Agent Protocol  
✅ **On-Chain Verification**: All payments validated against Solana blockchain  
✅ **Idempotency**: Transaction signatures prevent double-spending

---

## Technology Stack

### Core Technologies

- **Runtime**: Node.js >= 18.0.0 (v22+ recommended)
- **Language**: TypeScript 5.3+
- **Blockchain**: Solana (devnet/mainnet)
- **Cryptocurrency**: USDC (USD Coin stablecoin)
- **Cryptography**: Ed25519 signatures (via tweetnacl)

### Framework & Libraries

#### Client SDK (`@metar/metar-client`)

- `@solana/web3.js`: Solana blockchain interaction
- `@solana/spl-token`: USDC token transfers
- `tweetnacl`: Ed25519 signature generation
- `uuid`: Nonce generation (UUID v7)

#### Provider Middleware (`@metar/metar-provider`)

- `express`: HTTP server middleware
- `@solana/web3.js`: Payment verification
- `@solana/spl-token`: Token account validation
- `tweetnacl`: Signature verification
- `sqlite3`: Usage tracking database
- `bs58`: Base58 encoding/decoding

#### Dashboard (`@metar/dashboard`)

- **Frontend**: React 18.2, Vite 5.0
- **Backend**: Express 4.18
- **Database**: SQLite3
- **Visualization**: Recharts (for analytics charts)

#### Build Tools

- `tsup`: TypeScript bundling (ESM + CJS outputs)
- `tsx`: TypeScript execution
- `vite`: Frontend build tool (dashboard)
- `eslint`: Code linting
- `prettier`: Code formatting

### Protocol Standards

- **x402 Protocol**: HTTP 402 Payment Required standard
- **TAP (Trusted Agent Protocol)**: Visa's specification for stateless agent authentication
- **HTTP Signature (RFC 9421)**: Signature format for TAP
- **Ed25519**: Cryptographic signature algorithm

---

## Package Structure

This is a **monorepo** using npm workspaces. All packages are located in `packages/`:

### Core Packages

#### 1. `@metar/metar-client`

**Purpose**: Client SDK for making paid API requests

**Key Exports**:

- `MetarClient`: High-level client class
- `createNodeWallet`: Node.js wallet adapter
- `createBrowserWallet`: Browser wallet adapter
- Payment flow orchestration functions

**Dependencies**: Solana web3.js, SPL token, tweetnacl, uuid

**Use Case**: Any programmatic client that needs to make paid API requests (AI agents, applications, scripts, microservices, IoT devices, etc.)

#### 2. `@metar/metar-provider`

**Purpose**: Express middleware for payment verification

**Key Exports**:

- `createX402Middleware`: Main middleware function
- Payment verification utilities
- Usage logging functions
- Nonce management

**Dependencies**: Express, Solana web3.js, SQLite3, tweetnacl

**Use Case**: API providers protecting endpoints with payment verification

#### 3. `@metar/agent-registry`

**Purpose**: Agent key registry and price service

**Key Exports**:

- `priceEndpoint`: Express route handler for price lookup
- `AgentRegistry`: Interface for agent key storage
- Price service utilities

**Dependencies**: Express

**Use Case**: Centralized agent key management and price discovery

### Supporting Packages

#### 4. `@metar/dashboard`

**Purpose**: Usage analytics UI and backend

**Components**:

- React frontend with real-time metrics
- Express backend API
- SQLite database for usage records
- Payment statistics visualization
- Route metrics and filtering

**Tech Stack**: React, Vite, Express, SQLite3, Recharts

**Use Case**: API providers monitoring usage and revenue

#### 5. `@metar/facilitator`

**Purpose**: Facilitator mode for delegated payment verification

**Use Case**: Centralized payment verification service (optional)

#### 6. `@metar/examples`

**Purpose**: Complete demo implementation

**Contents**:

- Demo provider server
- Demo client application
- Working examples of full payment flow

**Use Case**: Reference implementation, testing, onboarding

#### 7. `@metar/shared-types`

**Purpose**: Shared TypeScript types and interfaces

**Key Types**:

- `PriceResponse`: Price lookup response
- `PaymentHeaders`: Payment header structure
- `UsageRecord`: Usage tracking record
- `AgentKey`: Agent key structure
- `NonceRecord`: Nonce tracking

**Use Case**: Type safety across all packages

#### 8. `@metar/shared-config`

**Purpose**: Shared configuration constants

**Contents**:

- Solana network configurations (devnet/mainnet)
- USDC mint addresses
- Connection utilities

**Use Case**: Consistent configuration across packages

---

## User Flows & Use Cases

### Use Case 1: Programmatic Client Making Paid API Request

**Actors**: Any programmatic client including:

- AI Agents (autonomous software)
- Traditional applications and services
- Scripts and automation tools
- Microservices
- IoT devices

**Flow**:

1. Client needs to call a paid API (e.g., text summarization, image processing, data analysis)
2. Client initializes `MetarClient` with wallet and agent key
3. Client calls `client.request("summarize", {...})`
4. SDK automatically:
   - Looks up price
   - Creates USDC payment transaction
   - Signs transaction with wallet
   - Waits for confirmation
   - Generates TAP signature
   - Makes API request with payment headers
5. API provider verifies payment and processes request
6. Client receives response

**Key Benefits**:

- Zero human intervention required
- No subscription management needed
- Pay only for what you use
- Works for any type of programmatic client

### Use Case 1a: AI Agent Example

**Specific Scenario**: An AI agent needs to summarize text from multiple sources

- Agent autonomously makes multiple paid API calls
- Each call automatically handles payment
- No credit card forms or account setup required

### Use Case 1b: Traditional Application Example

**Specific Scenario**: A web application needs on-demand image processing

- Application makes paid API calls when users upload images
- No need to maintain subscription tiers
- Costs scale directly with usage

### Use Case 1c: Microservice Example

**Specific Scenario**: Microservices need to call each other with usage-based billing

- Service A calls Service B's paid endpoint
- Automatic payment handling between services
- Internal billing without complex accounting systems

### Use Case 2: API Provider Monetizing Endpoint

**Actor**: API Developer

**Flow**:

1. Developer has an Express API endpoint
2. Developer adds `createX402Middleware` to route
3. Developer configures price, wallet address, agent registry
4. Endpoint is now protected—only paid requests succeed
5. Usage automatically logged to SQLite database
6. Developer can view analytics in dashboard

**Key Benefit**: Monetization in minutes, not weeks

### Use Case 3: Monitoring Usage & Revenue

**Actor**: API Provider (Business Owner)

**Flow**:

1. Provider runs dashboard server
2. Dashboard connects to usage database
3. Provider views:
   - Total revenue (USDC)
   - Request count
   - Route-level metrics
   - Payer analytics
   - Time-series charts
4. Provider filters by route, payer, date range

**Key Benefit**: Real-time business intelligence

### Additional Use Cases

#### Use Case 4: IoT Device Making Paid API Calls

**Scenario**: Smart device needs to process sensor data via paid API

- Device has embedded wallet
- Makes periodic paid API calls for data processing
- No subscription needed, pay per analysis

#### Use Case 5: Serverless Function Using Paid APIs

**Scenario**: AWS Lambda function needs to call paid APIs

- Function uses MetarClient to make paid requests
- Costs scale with function invocations
- No upfront subscription commitments

#### Use Case 6: Batch Processing Script

**Scenario**: Script processes large datasets using paid APIs

- Script makes many paid API calls
- Each call automatically handles payment
- No manual payment processing needed

#### Use Case 7: Multi-Tenant SaaS Application

**Scenario**: SaaS app charges customers per API call made

- Each customer's usage tracked via payments
- Automatic billing through micropayments
- No complex billing infrastructure needed

---

## Development Requirements

### Prerequisites

- **Node.js**: >= 18.0.0 (v22+ recommended)
- **npm**: >= 9.0.0
- **Solana CLI**: Optional, for devnet testing
- **TypeScript**: 5.3+ (included in devDependencies)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd 402

# Install dependencies (handles all workspace packages)
npm install

# Build all packages
npm run build
```

### Development Commands

```bash
# Build all packages
npm run build

# Build specific package
cd packages/metar-client && npm run build

# Watch mode (development)
npm run build:watch

# Run tests
npm run test

# Run E2E integration tests
npm run test:e2e

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:check
```

### Running the Demo

```bash
# Terminal 1: Start demo provider
cd packages/examples
npm run demo:provider

# Terminal 2: Run demo client
cd packages/examples
npm run demo:client -- --provider http://localhost:3000 --text "Hello, world!"
```

---

## Integration Points

### For Web Development Agency: Building a Provider Website

If building a website for an API provider, you'll need to integrate:

#### 1. **Provider API Server**

- Express.js server with `createX402Middleware`
- Price endpoint (`GET /.meter/price`)
- Protected API routes
- Agent registry integration

#### 2. **Dashboard Integration**

- Embed or link to dashboard UI
- Dashboard backend API endpoints
- Usage database connection

#### 3. **Wallet Integration** (if accepting payments)

- Solana wallet connection (Phantom, etc.)
- USDC balance display
- Transaction history

#### 4. **Agent Registration UI** (if needed)

- Form for agent key registration
- Public key input/validation
- Agent key management interface

### For Web Development Agency: Building a Client Application

If building a client application that uses paid APIs:

#### 1. **Client SDK Integration**

- Install `@metar/metar-client`
- Initialize `MetarClient` with wallet
- Make paid requests using `client.request()`

#### 2. **Wallet Integration**

- Solana wallet adapter (Phantom, etc.)
- Wallet connection UI
- Balance display (SOL + USDC)

#### 3. **Payment Status UI**

- Transaction status indicators
- Payment confirmation feedback
- Error handling and retry logic

---

## Deployment Considerations

### Provider Deployment

**Requirements**:

- Node.js runtime (18.0+)
- Solana RPC endpoint (public or private)
- SQLite database (or migrate to PostgreSQL/MySQL for scale)
- HTTPS (required for production)

**Environment Variables**:

- `SOLANA_NETWORK`: "devnet" or "mainnet"
- `SOLANA_RPC_URL`: Custom RPC endpoint (optional)
- `PROVIDER_WALLET`: Wallet address receiving payments
- `DATABASE_PATH`: SQLite database file path

**Scaling Considerations**:

- SQLite suitable for small-medium scale
- For high volume: migrate to PostgreSQL/MySQL
- Consider Redis for nonce caching (distributed systems)
- Load balancer for multiple provider instances

### Client Deployment

**Browser Applications**:

- Bundle `@metar/metar-client` with application
- Ensure Solana wallet adapter is available
- Handle wallet connection/disconnection

**Node.js Applications**:

- Install `@metar/metar-client` as dependency
- Manage wallet keypairs securely
- Handle network errors and retries

### Dashboard Deployment

**Frontend**:

- Build with Vite: `npm run build:frontend`
- Deploy static files to CDN/hosting
- Configure API endpoint URL

**Backend**:

- Express server with SQLite database
- CORS configuration for frontend
- API rate limiting (if public)

**Full-Stack Deployment**:

- Deploy frontend and backend together
- Use reverse proxy (nginx) for routing
- SSL/TLS certificates required

---

## API Specifications

### Price Endpoint

**Endpoint**: `GET /.meter/price?route=<routeId>`

**Response**:

```json
{
  "price": 0.03,
  "currency": "USDC",
  "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "payTo": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "routeId": "summarize:v1",
  "chain": "solana-devnet"
}
```

### Payment Headers (Required)

All paid API requests must include:

```typescript
{
  "x-meter-tx": string;         // Solana transaction signature
  "x-meter-route": string;       // Route identifier
  "x-meter-amt": string;         // Payment amount
  "x-meter-currency": "USDC";    // Currency code
  "x-meter-nonce": string;       // Unique nonce (UUID v7)
  "x-meter-ts": string;          // Unix timestamp (milliseconds)
  "x-meter-agent-kid": string;   // Agent key ID
  "Authorization": string;       // TAP signature
  "Date": string;                // HTTP Date header
}
```

### TAP Signature Format

```
Authorization: Signature keyId="<agentKeyId>", alg="ed25519", headers="(request-target) date x-meter-nonce x-meter-tx", signature="<base64>"
```

### Error Responses

All payment errors return **402 Payment Required**:

```json
{
  "error": "Payment Required",
  "route": "summarize:v1",
  "amount": 0.03,
  "currency": "USDC",
  "payTo": "7xKXtg2...",
  "mint": "EPjFWdd5...",
  "chain": "solana-devnet",
  "message": "Payment verification failed",
  "tips": [
    "Ensure transaction is confirmed",
    "Check payment amount matches price",
    "Verify nonce is unique"
  ]
}
```

---

## Security Considerations

### For Web Development Agency

**Critical Security Requirements**:

1. **Private Key Management**
   - Never expose private keys in client-side code
   - Use secure key storage (environment variables, key management services)
   - Implement key rotation policies

2. **HTTPS Only**
   - All production endpoints must use HTTPS
   - Payment headers contain sensitive information
   - TAP signatures must be transmitted securely

3. **Nonce Management**
   - Nonces must be unique per agent
   - Implement proper nonce storage (database, Redis)
   - Prevent replay attacks with nonce tracking

4. **Rate Limiting**
   - Implement rate limiting on price endpoints
   - Protect against DDoS attacks
   - Consider IP-based throttling

5. **Input Validation**
   - Validate all payment headers
   - Sanitize route IDs and agent key IDs
   - Validate transaction signatures format

6. **Error Handling**
   - Don't expose internal errors to clients
   - Log security events (failed verifications, replay attempts)
   - Implement alerting for suspicious activity

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests**: Each package has test files
- **Integration Tests**: E2E tests in `tests/` directory
- **Demo Implementation**: Working examples for manual testing

### Testing Commands

```bash
# Run all tests
npm run test

# Run E2E tests (requires Solana devnet)
npm run test:e2e

# Skip integration tests (faster)
SKIP_INTEGRATION_TESTS=true npm run test
```

### Quality Checks

- **TypeScript**: Full type safety across all packages
- **ESLint**: Code linting with TypeScript rules
- **Prettier**: Consistent code formatting
- **Build Verification**: All packages must build successfully

---

## Documentation & Resources

### Existing Documentation

- **README.md**: Project overview and quick start
- **QUICKSTART.md**: Step-by-step tutorial
- **TECHNICAL_OVERVIEW.md**: Architecture details
- **CONTRIBUTING.md**: Development guidelines

### External Resources

- **x402 Protocol**: HTTP 402 Payment Required standard
- **Trusted Agent Protocol**: Visa's TAP specification
- **HTTP Signature (RFC 9421)**: Signature format specification
- **Solana Documentation**: Blockchain and web3.js docs

---

## Future Roadmap Considerations

### Potential Enhancements for Web Development

1. **Multi-Chain Support**
   - Extend beyond Solana
   - Support Ethereum, Polygon, etc.

2. **Advanced Analytics**
   - Revenue forecasting
   - Usage pattern analysis
   - Customer segmentation

3. **Payment Methods**
   - Credit card fallback (for non-agent clients)
   - Subscription options
   - Volume discounts

4. **Developer Tools**
   - API key management UI
   - Route configuration dashboard
   - Testing sandbox environment

5. **Enterprise Features**
   - Multi-tenant support
   - Role-based access control
   - Audit logging
   - Compliance reporting

---

## Project Status

✅ **Production Ready** - Core features complete and tested:

- ✅ Client SDK with full payment flow
- ✅ Provider middleware with comprehensive verification
- ✅ TAP signature generation and verification
- ✅ Price lookup and caching
- ✅ Usage tracking with SQLite
- ✅ Dashboard with analytics
- ✅ E2E integration tests
- ✅ Complete documentation

---

## Contact & Support

For technical questions or integration support, refer to:

- Project documentation in repository
- Example implementations in `packages/examples/`
- Test files for usage patterns

---

**Document Version**: 1.0  
**Last Updated**: 2025  
**Prepared For**: Web Development Agency

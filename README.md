# Meter Monorepo

A monorepo for the Meter x402 payment protocol implementation.

## Structure

This monorepo uses npm workspaces and contains the following packages:

- `packages/meter-client` - Client SDK for making paid API requests
- `packages/meter-provider` - Express middleware for verifying payments
- `packages/agent-registry` - Agent key registry service
- `packages/dashboard` - Dashboard UI and backend for viewing usage metrics
- `packages/facilitator` - Facilitator mode for payment verification
- `packages/examples` - Example implementations and demos
- `packages/shared-types` - Shared TypeScript types and interfaces
- `packages/shared-config` - Shared configuration constants

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
npm install
```

### Building

Build all packages:

```bash
npm run build
```

Build a specific package:

```bash
cd packages/meter-client
npm run build
```

### Development

Watch mode for all packages:

```bash
npm run build:watch
```

### Linting and Formatting

```bash
# Lint all packages
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

### Testing

```bash
npm run test
```

## Package Structure

Each package follows a consistent structure:

```
packages/<package-name>/
├── src/
│   └── index.ts
├── dist/          # Generated build output
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all packages build: `npm run build`
4. Run linting: `npm run lint`
5. Submit a pull request


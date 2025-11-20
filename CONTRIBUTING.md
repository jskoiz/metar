# Contributing to Metar

Thank you for your interest in contributing to Metar! This document will help you understand the project structure and how to contribute.

## License

Metar is released under the **MIT License**. By contributing, you agree that your contributions will be licensed under the same license.

## Project Structure

Metar is a **monorepo** using npm workspaces. All packages are located in the `packages/` directory:

```
/
├── packages/
│   ├── metar-client/        # Client SDK for making paid API requests
│   ├── metar-provider/      # Express middleware for payment verification
│   ├── agent-registry/      # Agent key registry and price service
│   ├── dashboard/           # Usage analytics UI and backend
│   ├── facilitator/         # Facilitator mode for delegated verification
│   ├── examples/            # Complete demo implementation
│   ├── shared-types/        # Shared TypeScript types
│   └── shared-config/       # Shared configuration constants
├── tests/                   # E2E integration tests
├── README.md                # Project overview
├── QUICKSTART.md            # Getting started guide
├── TECHNICAL_OVERVIEW.md    # Technical documentation
└── CONTRIBUTING.md          # This file
```

### Why a Monorepo?

- **Shared code**: Types and config are shared across packages
- **Atomic changes**: Update multiple packages in a single commit
- **Consistent tooling**: Same build, test, and lint setup across all packages
- **Easier development**: Work on client and provider together

### Package Structure

Each package follows a consistent structure:

```
packages/<package-name>/
├── src/                     # Source code
│   ├── index.ts             # Main exports
│   └── ...                  # Implementation files
├── dist/                    # Build output (generated)
├── package.json             # Package metadata and dependencies
├── tsconfig.json            # TypeScript configuration
└── tsup.config.ts           # Build configuration
```

## Development Setup

### Prerequisites

- **Node.js** >= 18.0.0 (v22+ recommended)
- **npm** >= 9.0.0

### Getting Started

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd 402
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build all packages**:
   ```bash
   npm run build
   ```

4. **Run tests**:
   ```bash
   npm run test
   ```

## Development Workflow

### Making Changes

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Write code following existing patterns
   - Add tests for new functionality
   - Update documentation as needed

3. **Build and test**:
   ```bash
   # Build all packages
   npm run build
   
   # Run tests
   npm run test
   
   # Run linting
   npm run lint
   
   # Fix linting issues
   npm run lint:fix
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

   We follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `test:` - Test changes
   - `refactor:` - Code refactoring
   - `chore:` - Maintenance tasks

5. **Push and create a pull request**:
   ```bash
   git push origin feature/your-feature-name
   ```

### Working on a Specific Package

To work on a single package:

```bash
# Navigate to the package
cd packages/metar-client

# Build just this package
npm run build

# Run tests for this package
npm run test

# Watch mode for development
npm run build:watch
```

### Running the Demo

The demo in `packages/examples/` is a great way to test your changes:

```bash
# Terminal 1: Start provider
cd packages/examples
npm run demo:provider

# Terminal 2: Run client
cd packages/examples
npm run demo:client -- --provider http://localhost:3000 --text "Test"
```

## Code Style

- **TypeScript**: We use TypeScript for type safety
- **ESLint**: Code is linted with ESLint
- **Prettier**: Code is formatted with Prettier
- **Tests**: We use Node.js built-in test runner

### Formatting

```bash
# Format all code
npm run format

# Check formatting
npm run format:check
```

### Linting

```bash
# Lint all code
npm run lint

# Fix linting issues
npm run lint:fix
```

## Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run E2E integration tests
npm run test:e2e

# Skip integration tests (faster)
SKIP_INTEGRATION_TESTS=true npm run test
```

### Writing Tests

- Tests should be co-located with source files (e.g., `file.test.ts` next to `file.ts`)
- Use descriptive test names
- Test both success and error cases
- Integration tests go in `tests/` directory

## Package Guidelines

### Adding a New Package

1. Create directory in `packages/`
2. Add `package.json` with appropriate name (`@metar/package-name`)
3. Add `tsconfig.json` (extend root config)
4. Add `tsup.config.ts` (copy from existing package)
5. Add to root `package.json` workspaces if needed
6. Update root README.md with package description

### Updating Shared Code

- **Shared types**: Add to `packages/shared-types/src/index.ts`
- **Shared config**: Add to `packages/shared-config/src/index.ts`
- **Breaking changes**: Consider versioning or deprecation path

## Pull Request Process

1. **Ensure your PR**:
   - Builds successfully (`npm run build`)
   - Passes all tests (`npm run test`)
   - Passes linting (`npm run lint`)
   - Includes tests for new features
   - Updates documentation as needed

2. **PR Description**:
   - Clearly describe what changes you made
   - Explain why you made the changes
   - Reference any related issues
   - Include screenshots/demos if applicable

3. **Review Process**:
   - Maintainers will review your PR
   - Address any feedback or requested changes
   - Once approved, your PR will be merged

## Questions?

- Check the [README.md](./README.md) for project overview
- See [QUICKSTART.md](./QUICKSTART.md) for usage examples
- Review [TECHNICAL_OVERVIEW.md](./TECHNICAL_OVERVIEW.md) for architecture details
- Open an issue for questions or discussions

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and constructive in all interactions.

---

**Thank you for contributing to Metar!** 🎉


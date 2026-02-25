/**
 * Chain configuration for metar-proxy.
 * Supports Base USDC, Ethereum USDC, and Solana USDC payment chains.
 */

export interface ChainConfig {
  /** Chain identifier */
  chain: string;
  /** Display name */
  name: string;
  /** USDC token mint / contract address */
  usdcAddress: string;
  /** Type of chain */
  type: "evm" | "solana";
}

export const CHAIN_CONFIGS: ChainConfig[] = [
  {
    chain: "base",
    name: "Base (USDC)",
    usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    type: "evm",
  },
  {
    chain: "ethereum",
    name: "Ethereum (USDC)",
    usdcAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    type: "evm",
  },
  {
    chain: "solana",
    name: "Solana (USDC)",
    usdcAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    type: "solana",
  },
  {
    chain: "solana-devnet",
    name: "Solana Devnet (USDC)",
    usdcAddress: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    type: "solana",
  },
];

/**
 * Get the primary Solana chain config based on SOLANA_NETWORK env var.
 */
export function getPrimarySolanaChain(): ChainConfig {
  const network = process.env.SOLANA_NETWORK === "mainnet" ? "solana" : "solana-devnet";
  return CHAIN_CONFIGS.find((c) => c.chain === network) as ChainConfig;
}

// Shared Config
// This package contains shared configuration constants

import { Connection, PublicKey } from "@solana/web3.js";

export const SOLANA_NETWORKS = {
  devnet: {
    rpcUrl: process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com",
    usdcMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  },
  mainnet: {
    rpcUrl: process.env.SOLANA_MAINNET_RPC_URL || "https://api.mainnet-beta.solana.com",
    usdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
} as const;

export const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

/**
 * Default timestamp validity window in milliseconds (5 minutes).
 * Requests older than this window will be rejected.
 */
export const TIMESTAMP_WINDOW_MS = 5 * 60 * 1000;

export function createConnection(network: "devnet" | "mainnet" = "devnet"): Connection {
  return new Connection(SOLANA_NETWORKS[network].rpcUrl, "confirmed");
}

export function getUSDCMint(network: "devnet" | "mainnet" = "devnet"): PublicKey {
  return new PublicKey(SOLANA_NETWORKS[network].usdcMint);
}

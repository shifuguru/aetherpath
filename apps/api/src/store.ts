import type { AdventureSession, WalletSnapshot } from "@aetherpath/shared";
import { ECONOMY } from "@aetherpath/shared";

/** In-memory store for the skeleton. Replace with Postgres/Redis later. */
const sessions = new Map<string, AdventureSession>();
const wallets = new Map<string, WalletSnapshot>();

const DEFAULT_WALLET_ID = "local-player";

export function getOrCreateWallet(walletId = DEFAULT_WALLET_ID): WalletSnapshot {
  let wallet = wallets.get(walletId);
  if (!wallet) {
    wallet = {
      tokens: ECONOMY.freeTokenGrant,
      lifetimeEarned: ECONOMY.freeTokenGrant,
      lifetimeSpent: 0,
    };
    wallets.set(walletId, wallet);
  }
  return wallet;
}

export function saveWallet(wallet: WalletSnapshot, walletId = DEFAULT_WALLET_ID) {
  wallets.set(walletId, wallet);
}

export function getSession(id: string) {
  return sessions.get(id);
}

export function saveSession(session: AdventureSession) {
  sessions.set(session.id, session);
}

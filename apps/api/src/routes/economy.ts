import { Hono } from "hono";
import {
  ECONOMY,
  TOKEN_PACKS,
  type AdRewardGrantRequest,
} from "@aetherpath/shared";
import { getOrCreateWallet, saveWallet } from "../store.js";

export const economyRoutes = new Hono();

economyRoutes.get("/wallet", (c) => {
  return c.json({ wallet: getOrCreateWallet(), packs: TOKEN_PACKS });
});

economyRoutes.get("/packs", (c) => c.json({ packs: TOKEN_PACKS }));

/**
 * Stub purchase endpoint. Wire to Stripe / store billing later.
 * For local demo, grants tokens immediately when packId is valid.
 */
economyRoutes.post("/purchase", async (c) => {
  const { packId } = (await c.req.json()) as { packId?: string };
  const pack = TOKEN_PACKS.find((p) => p.id === packId);
  if (!pack) return c.json({ error: "Unknown pack" }, 400);

  const wallet = getOrCreateWallet();
  wallet.tokens += pack.tokens;
  wallet.lifetimeEarned += pack.tokens;
  saveWallet(wallet);

  return c.json({
    wallet,
    tokensGranted: pack.tokens,
    note: "Skeleton grant — replace with real payment verification",
  });
});

/**
 * Stub rewarded-ad grant. Validate `adReceipt` with your ad network in production.
 */
economyRoutes.post("/ad-reward", async (c) => {
  const body = (await c.req.json()) as AdRewardGrantRequest;
  if (!body.adReceipt) {
    return c.json({ error: "Missing ad receipt" }, 400);
  }

  // Dev stub: accept receipts that start with "stub_"
  if (!body.adReceipt.startsWith("stub_")) {
    return c.json({ error: "Invalid ad receipt" }, 400);
  }

  const wallet = getOrCreateWallet();
  wallet.tokens += ECONOMY.adRewardTokens;
  wallet.lifetimeEarned += ECONOMY.adRewardTokens;
  saveWallet(wallet);

  return c.json({
    wallet,
    tokensGranted: ECONOMY.adRewardTokens,
  });
});

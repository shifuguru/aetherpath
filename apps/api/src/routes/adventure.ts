import { Hono } from "hono";
import { nanoid } from "nanoid";
import {
  ECONOMY,
  applyTurn,
  type ChooseActionRequest,
  type StartAdventureRequest,
} from "@aetherpath/shared";
import { createOpeningSession, generateTurn } from "../ai/storyEngine.js";
import { getOrCreateWallet, getSession, saveSession, saveWallet } from "../store.js";

export const adventureRoutes = new Hono();

adventureRoutes.post("/start", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as StartAdventureRequest;
  const wallet = getOrCreateWallet();
  const session = createOpeningSession({
    id: nanoid(12),
    seed: body.seed ?? nanoid(8),
    playerName: body.playerName?.trim() || "Wanderer",
    className: body.className?.trim() || "Spellblade",
    appearance: body.appearance,
    tokensRemaining: wallet.tokens,
  });
  saveSession(session);
  return c.json({ session });
});

adventureRoutes.get("/:sessionId", (c) => {
  const session = getSession(c.req.param("sessionId"));
  if (!session) return c.json({ error: "Session not found" }, 404);
  return c.json({ session });
});

adventureRoutes.post("/choose", async (c) => {
  const body = (await c.req.json()) as ChooseActionRequest;
  const session = getSession(body.sessionId);
  if (!session) return c.json({ error: "Session not found" }, 404);

  if (session.status === "won" || session.status === "lost") {
    return c.json({ error: "This run has ended. Start a new adventure." }, 409);
  }

  const valid = session.choices.some((choice) => choice.id === body.choiceId);
  if (!valid && !body.customPrompt) {
    return c.json({ error: "Invalid choice" }, 400);
  }

  const wallet = getOrCreateWallet();
  const cost = ECONOMY.tokensPerTurn;
  if (wallet.tokens < cost) {
    session.status = "awaiting_tokens";
    session.tokensRemaining = wallet.tokens;
    saveSession(session);
    return c.json(
      {
        error: "insufficient_tokens",
        message: "Not enough tokens. Buy a pack or watch an ad.",
        session,
        tokensRequired: cost,
      },
      402,
    );
  }

  wallet.tokens -= cost;
  wallet.lifetimeSpent += cost;
  saveWallet(wallet);

  const turn = await generateTurn(session, body.choiceId);
  const next = applyTurn(session, turn);
  next.tokensRemaining = wallet.tokens;
  saveSession(next);

  return c.json({ session: next, tokensSpent: cost });
});

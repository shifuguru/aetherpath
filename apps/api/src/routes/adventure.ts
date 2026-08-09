import { Hono } from "hono";
import { nanoid } from "nanoid";
import {
  ECONOMY,
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
  session.beats = [...session.beats, turn.beat];
  session.choices = turn.choices;
  session.holo = turn.holo;
  session.tokensRemaining = wallet.tokens;
  session.status = "active";
  saveSession(session);

  return c.json({ session, tokensSpent: cost });
});

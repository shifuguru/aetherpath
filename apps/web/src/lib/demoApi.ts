import {
  ECONOMY,
  TOKEN_PACKS,
  createOpeningSession,
  generateTurn,
  type AdventureSession,
  type AdRewardGrantResponse,
  type CharacterAppearance,
  type ChooseActionResponse,
  type StartAdventureResponse,
  type TokenPack,
  type WalletSnapshot,
} from "@aetherpath/shared";

/** In-browser demo store for GitHub Pages (no Node API). */
const sessions = new Map<string, AdventureSession>();

let wallet: WalletSnapshot = {
  tokens: ECONOMY.freeTokenGrant,
  lifetimeEarned: ECONOMY.freeTokenGrant,
  lifetimeSpent: 0,
};

function sid(length = 12): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) out += alphabet[bytes[i]! % alphabet.length];
  return out;
}

export async function getWallet(): Promise<{
  wallet: WalletSnapshot;
  packs: TokenPack[];
}> {
  return { wallet: { ...wallet }, packs: TOKEN_PACKS };
}

export async function startAdventure(body?: {
  playerName?: string;
  className?: string;
  appearance?: CharacterAppearance;
}): Promise<StartAdventureResponse> {
  const session = createOpeningSession({
    id: sid(12),
    seed: sid(8),
    playerName: body?.playerName?.trim() || "Wanderer",
    className: body?.className?.trim() || "Spellblade",
    appearance: body?.appearance,
    tokensRemaining: wallet.tokens,
  });
  sessions.set(session.id, session);
  return { session };
}

export async function chooseAction(
  sessionId: string,
  choiceId: string,
): Promise<ChooseActionResponse> {
  const session = sessions.get(sessionId);
  if (!session) {
    throw Object.assign(new Error("Session not found"), { status: 404 });
  }

  const valid = session.choices.some((choice) => choice.id === choiceId);
  if (!valid) {
    throw Object.assign(new Error("Invalid choice"), { status: 400 });
  }

  const cost = ECONOMY.tokensPerTurn;
  if (wallet.tokens < cost) {
    session.status = "awaiting_tokens";
    session.tokensRemaining = wallet.tokens;
    sessions.set(session.id, session);
    throw Object.assign(
      new Error("Not enough tokens. Buy a pack or watch an ad."),
      { status: 402, session },
    );
  }

  wallet = {
    ...wallet,
    tokens: wallet.tokens - cost,
    lifetimeSpent: wallet.lifetimeSpent + cost,
  };

  const turn = await generateTurn(session, choiceId);
  const next: AdventureSession = {
    ...session,
    beats: [...session.beats, turn.beat],
    choices: turn.choices,
    holo: turn.holo,
    player: turn.player ?? session.player,
    tokensRemaining: wallet.tokens,
    status: "active",
  };
  sessions.set(next.id, next);
  return { session: next, tokensSpent: cost };
}

export async function purchasePack(packId: string): Promise<{
  wallet: WalletSnapshot;
  tokensGranted: number;
}> {
  const pack = TOKEN_PACKS.find((p) => p.id === packId);
  if (!pack) throw Object.assign(new Error("Unknown pack"), { status: 400 });
  wallet = {
    ...wallet,
    tokens: wallet.tokens + pack.tokens,
    lifetimeEarned: wallet.lifetimeEarned + pack.tokens,
  };
  return { wallet: { ...wallet }, tokensGranted: pack.tokens };
}

export async function claimAdReward(
  _sessionId?: string,
): Promise<AdRewardGrantResponse> {
  wallet = {
    ...wallet,
    tokens: wallet.tokens + ECONOMY.adRewardTokens,
    lifetimeEarned: wallet.lifetimeEarned + ECONOMY.adRewardTokens,
  };
  return {
    wallet: { ...wallet },
    tokensGranted: ECONOMY.adRewardTokens,
  };
}

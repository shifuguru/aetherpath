/** Shared contracts for Aetherpath client + API. */

export type ChoiceId = string;

export interface StoryChoice {
  id: ChoiceId;
  label: string;
  /** Short hint shown under the label (optional). */
  hint?: string;
}

export interface StoryBeat {
  id: string;
  text: string;
  /** Who is speaking / narrating this beat. */
  voice: "narrator" | "system" | "character";
  createdAt: string;
}

/** Visual brief for the holographic world between story and choices. */
export interface HoloSceneBrief {
  /** High-level place: crypt, cavern, throne hall, etc. */
  locale: string;
  mood: "tense" | "wonder" | "danger" | "calm" | "eerie";
  /** Sparse props the renderer can map to primitives. */
  props: string[];
  /** Soft palette hint for the hologram wash. */
  palette: {
    primary: string;
    secondary: string;
    glow: string;
  };
  /** Optional focal subject description. */
  focal?: string;
}

export interface PlayerState {
  name: string;
  className: string;
  hp: number;
  maxHp: number;
  inventory: string[];
}

export interface AdventureSession {
  id: string;
  seed: string;
  player: PlayerState;
  beats: StoryBeat[];
  choices: StoryChoice[];
  holo: HoloSceneBrief;
  tokensRemaining: number;
  status: "active" | "awaiting_tokens" | "ended";
}

export interface StartAdventureRequest {
  playerName?: string;
  className?: string;
  seed?: string;
}

export interface StartAdventureResponse {
  session: AdventureSession;
}

export interface ChooseActionRequest {
  sessionId: string;
  choiceId: ChoiceId;
  /** Optional free-text override when custom prompts are enabled later. */
  customPrompt?: string;
}

export interface ChooseActionResponse {
  session: AdventureSession;
  tokensSpent: number;
}

export interface WalletSnapshot {
  tokens: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
}

export interface TokenPack {
  id: string;
  label: string;
  tokens: number;
  priceCents: number;
  /** Stripe/App Store product id placeholder. */
  productSku: string;
}

export interface AdRewardGrantRequest {
  sessionId?: string;
  /** Provider completion token / receipt from rewarded ad SDK. */
  adReceipt: string;
}

export interface AdRewardGrantResponse {
  wallet: WalletSnapshot;
  tokensGranted: number;
}

export const TOKEN_PACKS: TokenPack[] = [
  {
    id: "embers",
    label: "Ember Pouch",
    tokens: 50,
    priceCents: 99,
    productSku: "aetherpath.tokens.embers",
  },
  {
    id: "lantern",
    label: "Lantern Cache",
    tokens: 150,
    priceCents: 249,
    productSku: "aetherpath.tokens.lantern",
  },
  {
    id: "vault",
    label: "Vault of Sparks",
    tokens: 500,
    priceCents: 699,
    productSku: "aetherpath.tokens.vault",
  },
];

export const ECONOMY = {
  freeTokenGrant: 20,
  tokensPerTurn: 2,
  adRewardTokens: 10,
} as const;

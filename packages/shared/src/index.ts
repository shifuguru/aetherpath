/** Shared contracts for Aetherpath client + API. */

import type { Cardinal, RoomMap } from "./room.js";

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
  /**
   * Renderer stage hint.
   * - creation: faint isometric tile + figure materialising
   * - explore: player on a small tile fog map
   * - scene: denser chamber composition
   * - victory: the Aether Core chamber, claimed
   * - defeat: the hologram gutters out
   */
  stage?: "creation" | "explore" | "scene" | "victory" | "defeat";
  /** How many floor tiles are revealed around the player (explore). */
  revealedTiles?: number;
  /** Structured room map for the hologram renderer (walls/doors/floors). */
  room?: RoomMap;
}

/** Visual identity chosen during player creation. */
export type CharacterBuild = "slim" | "sturdy" | "tall";

export interface CharacterAppearance {
  build: CharacterBuild;
  /** Suit wash for the hologram figure. */
  primary: string;
  /** Emissive accent / glow. */
  glow: string;
}

export interface PlayerState {
  name: string;
  className: string;
  appearance: CharacterAppearance;
  hp: number;
  maxHp: number;
  inventory: string[];
  /** Rooms of the vault successfully cleared so far. */
  depth: number;
}

/** What the party finds when a door is pushed through. */
export type EncounterKind = "empty" | "treasure" | "trap" | "monster" | "relic";

/**
 * A door has been pushed but not yet resolved — used only for the
 * "monster" case, where the player gets a fight/flee choice before the
 * next room is committed to the session.
 */
export interface PendingTransition {
  facing: Cardinal;
  depth: number;
  encounter: EncounterKind;
  nextRoom: RoomMap;
}

export interface AdventureSession {
  id: string;
  seed: string;
  player: PlayerState;
  beats: StoryBeat[];
  choices: StoryChoice[];
  holo: HoloSceneBrief;
  tokensRemaining: number;
  status: "active" | "awaiting_tokens" | "ended" | "won" | "lost";
  pending?: PendingTransition;
}

export interface StartAdventureRequest {
  playerName?: string;
  className?: string;
  seed?: string;
  appearance?: CharacterAppearance;
}

export const DEFAULT_APPEARANCE: CharacterAppearance = {
  build: "slim",
  primary: "#1a2f3a",
  glow: "#7dffc8",
};

export const APPEARANCE_PRESETS: CharacterAppearance[] = [
  DEFAULT_APPEARANCE,
  { build: "sturdy", primary: "#2a2438", glow: "#9ee7ff" },
  { build: "tall", primary: "#102820", glow: "#6dffb0" },
  { build: "slim", primary: "#241820", glow: "#ffb38a" },
  { build: "sturdy", primary: "#1a2830", glow: "#d4b0ff" },
];

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
  // A full winning run through the vault takes ~10-20 turns; the free grant
  // should comfortably cover one honest attempt at 2 tokens/turn.
  freeTokenGrant: 44,
  tokensPerTurn: 2,
  adRewardTokens: 12,
} as const;

/** Rooms deep the Aether Core sits — a full run is a bounded, winnable crawl. */
export const WIN_DEPTH = 5;

export { createOpeningSession, generateTurn, applyTurn } from "./storyEngine.js";
export {
  generateSimpleRoom,
  revealAround,
  revealSemiRing,
  movePlayer,
  countRevealed,
  oppositeFacing,
  enterRoomAtDoor,
  hashSeed,
  mulberry32,
  type TileKind,
  type Cardinal,
  type GridPos,
  type MapTile,
  type RoomMap,
  type GenerateRoomOptions,
} from "./room.js";

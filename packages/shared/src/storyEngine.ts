import type {
  AdventureSession,
  CharacterAppearance,
  ChoiceId,
  HoloSceneBrief,
  StoryBeat,
  StoryChoice,
} from "./index.js";
import {
  countRevealed,
  generateSimpleRoom,
  movePlayer,
  revealAround,
  revealSemiRing,
  type RoomMap,
} from "./room.js";

const FALLBACK_APPEARANCE: CharacterAppearance = {
  build: "slim",
  primary: "#1a2f3a",
  glow: "#7dffc8",
};

function openingRoom(seed: string): RoomMap {
  // 5x5 keeps walls/doors one look-around (radius 2) away from center spawn.
  return generateSimpleRoom({
    id: `threshold-${seed}`,
    seed,
    width: 5,
    height: 5,
    doors: ["N", "E"],
    reveal: "player",
    tileSize: 1,
  });
}

function advanceRoom(session: AdventureSession, choiceId: ChoiceId): RoomMap {
  const base =
    session.holo.room ??
    openingRoom(session.seed);

  if (choiceId === "look-around") {
    return revealSemiRing(base, base.player, "N", 2);
  }
  if (choiceId === "move-blind") {
    return movePlayer(base, "N", 1);
  }
  // Later beats widen awareness inside the same chamber.
  return revealAround(base, base.player, Math.min(3, 1 + Math.floor(session.beats.length / 2)));
}

function sid(length = 8): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) out += alphabet[bytes[i]! % alphabet.length];
  return out;
}

/**
 * Skeleton story engine.
 * Swap `generateTurn` for a real LLM call that returns structured JSON
 * matching StoryBeat + StoryChoice[] + HoloSceneBrief.
 */
const OPENING: {
  beat: string;
  choices: StoryChoice[];
  holo: HoloSceneBrief;
} = {
  beat: "The chamber is only a single square of stone — and you. Beyond the tile, the vault is unwritten dark. How will you take your first step into it?",
  choices: [
    {
      id: "look-around",
      label: "Stay still and look around",
      hint: "Reveal a semi-ring of tiles around you",
    },
    {
      id: "move-blind",
      label: "Move forward blindly",
      hint: "Step ahead and uncover a ring of stone",
    },
  ],
  holo: {
    locale: "threshold square",
    mood: "eerie",
    props: ["isometric tile", "holographic figure"],
    palette: {
      primary: "#1a2f3a",
      secondary: "#3d6b7a",
      glow: "#7dffc8",
    },
    focal: "a lone isometric tile holding your form",
    stage: "explore",
    revealedTiles: 1,
  },
};

const BRANCHES: Record<
  string,
  { beat: string; choices: StoryChoice[]; holo: HoloSceneBrief }
> = {
  "look-around": {
    beat: "You hold your ground. Stone knits outward in a broken crescent — floors, then wall faces, then a doorframe humming with cold light. Somewhere beyond the threshold, breath that is not yours waits.",
    choices: [
      { id: "call", label: "Call out into the dark" },
      { id: "knife", label: "Draw your blade and wait" },
      { id: "retreat", label: "Ease back from the door" },
      { id: "offer", label: "Offer a coin toward the threshold" },
    ],
    holo: {
      locale: "listening antechamber",
      mood: "tense",
      props: ["walls", "doorframe", "semi-ring"],
      palette: {
        primary: "#0f1c24",
        secondary: "#2a4a55",
        glow: "#9ee7ff",
      },
      focal: "walls and a door resolving from the fog of war",
      stage: "explore",
    },
  },
  "move-blind": {
    beat: "You step into black. A ring of floor hammers into place — then the chamber's walls snap up around you. Ahead, a door stands in the north wall, ajar, breathing warm air that does not belong in a tomb.",
    choices: [
      { id: "push", label: "Push the door open" },
      { id: "peek", label: "Peer through the gap" },
      { id: "moss", label: "Study the phosphor seams in the wall" },
    ],
    holo: {
      locale: "forward chamber",
      mood: "wonder",
      props: ["walls", "north door", "tile-ring"],
      palette: {
        primary: "#102820",
        secondary: "#1f5a44",
        glow: "#6dffb0",
      },
      focal: "a revealed room ring and a north door leaking amber",
      stage: "explore",
    },
  },
  listen: {
    beat: "Water drips in a measured rhythm — three soft, one hard. Under it, a second cadence: breath that is not yours. Something patient has noticed you.",
    choices: [
      { id: "call", label: "Call out into the dark" },
      { id: "knife", label: "Draw your blade and wait" },
      { id: "retreat", label: "Ease back toward the stair" },
      { id: "offer", label: "Offer a coin into the dark" },
    ],
    holo: {
      locale: "listening antechamber",
      mood: "tense",
      props: ["water channel", "shadow shapes", "hanging chains"],
      palette: {
        primary: "#0f1c24",
        secondary: "#2a4a55",
        glow: "#9ee7ff",
      },
      focal: "ripples in a black pool answering your stillness",
      stage: "scene",
    },
  },
  descend: {
    beat: "The stair coils tighter. Phosphor moss paints the walls in cold green veins. At the landing, a bronze door stands ajar — and warm air breathes out, wrong for a tomb.",
    choices: [
      { id: "push", label: "Push the door open" },
      { id: "peek", label: "Peer through the gap" },
      { id: "moss", label: "Harvest the phosphor moss" },
    ],
    holo: {
      locale: "spiral descent",
      mood: "wonder",
      props: ["spiral stair", "moss veins", "bronze door"],
      palette: {
        primary: "#102820",
        secondary: "#1f5a44",
        glow: "#6dffb0",
      },
      focal: "a bronze door leaking warm amber light",
      stage: "scene",
    },
  },
  mark: {
    beat: "Your knife bites limestone. The ward flares once — pale teal — then sinks into the stone as if swallowed. For a heartbeat the whole corridor remembers your name.",
    choices: [
      { id: "follow-glow", label: "Follow the fading glow" },
      { id: "name", label: "Speak your true name to the ward" },
      { id: "descend", label: "Turn and take the stair" },
    ],
    holo: {
      locale: "warded arch",
      mood: "calm",
      props: ["carved rune", "stone dust", "faint teal glow"],
      palette: {
        primary: "#15222c",
        secondary: "#2f5560",
        glow: "#5ef0d0",
      },
      focal: "a freshly carved ward still cooling in the stone",
      stage: "scene",
    },
  },
};

function fallbackTurn(choiceLabel: string): {
  beat: string;
  choices: StoryChoice[];
  holo: HoloSceneBrief;
} {
  return {
    beat: `You choose: ${choiceLabel}. The vault answers — corridors rearrange like a thought unfinished. New stone settles into place, still warm from creation.`,
    choices: [
      { id: "press-on", label: "Press deeper" },
      { id: "search", label: "Search the chamber" },
      { id: "rest", label: "Rest and take stock" },
    ],
    holo: {
      locale: "shifting corridor",
      mood: "wonder",
      props: ["new-formed walls", "floating dust", "distant doorlight"],
      palette: {
        primary: "#1b2430",
        secondary: "#3a5168",
        glow: "#8fd6ff",
      },
      focal: "stone knitting itself into a path ahead",
      stage: "scene",
    },
  };
}

export function createOpeningSession(input: {
  id: string;
  seed: string;
  playerName: string;
  className: string;
  appearance?: CharacterAppearance;
  tokensRemaining: number;
}): AdventureSession {
  const appearance = input.appearance ?? FALLBACK_APPEARANCE;
  const room = openingRoom(input.seed);
  const holo: HoloSceneBrief = {
    ...OPENING.holo,
    palette: {
      ...OPENING.holo.palette,
      primary: appearance.primary,
      glow: appearance.glow,
    },
    room,
    revealedTiles: countRevealed(room),
  };

  const beat: StoryBeat = {
    id: sid(8),
    text: OPENING.beat,
    voice: "narrator",
    createdAt: new Date().toISOString(),
  };

  return {
    id: input.id,
    seed: input.seed,
    player: {
      name: input.playerName,
      className: input.className,
      appearance,
      hp: 20,
      maxHp: 20,
      inventory: ["torch", "worn map", "iron knife"],
    },
    beats: [beat],
    choices: OPENING.choices,
    holo,
    tokensRemaining: input.tokensRemaining,
    status: "active",
  };
}

export async function generateTurn(
  session: AdventureSession,
  choiceId: ChoiceId,
): Promise<{
  beat: StoryBeat;
  choices: StoryChoice[];
  holo: HoloSceneBrief;
}> {
  // Hook for real AI: if OPENAI_API_KEY is set, call the model with session context.
  // Skeleton uses authored branches + procedural fallback so the loop works offline.
  const prior = session.choices.find((c) => c.id === choiceId);
  const branch = BRANCHES[choiceId] ?? fallbackTurn(prior?.label ?? choiceId);
  const room = advanceRoom(session, choiceId);

  // Mild procedural tint so repeats feel less static.
  const holo: HoloSceneBrief = {
    ...branch.holo,
    props: [...branch.holo.props, `echo-${session.beats.length}`],
    palette: {
      ...branch.holo.palette,
      glow: session.player.appearance?.glow ?? branch.holo.palette.glow,
    },
    room,
    revealedTiles: countRevealed(room),
    stage: branch.holo.stage ?? "explore",
  };

  return {
    beat: {
      id: sid(8),
      text: branch.beat,
      voice: "narrator",
      createdAt: new Date().toISOString(),
    },
    choices: branch.choices,
    holo,
  };
}

import type {
  AdventureSession,
  CharacterAppearance,
  ChoiceId,
  HoloSceneBrief,
  StoryBeat,
  StoryChoice,
} from "@aetherpath/shared";
import { DEFAULT_APPEARANCE } from "@aetherpath/shared";
import { nanoid } from "nanoid";

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
    beat: "You hold your ground. Stone knits outward in a broken crescent — three tiles, then five — and the dark yields a wet arch, a water channel, and the scrape of something patient just out of sight.",
    choices: [
      { id: "call", label: "Call out into the dark" },
      { id: "knife", label: "Draw your blade and wait" },
      { id: "retreat", label: "Ease back toward the stair" },
      { id: "offer", label: "Offer a coin into the dark" },
    ],
    holo: {
      locale: "listening antechamber",
      mood: "tense",
      props: ["water channel", "shadow shapes", "hanging chains", "semi-ring"],
      palette: {
        primary: "#0f1c24",
        secondary: "#2a4a55",
        glow: "#9ee7ff",
      },
      focal: "a semi-ring of tiles blooming around your stillness",
      stage: "explore",
      revealedTiles: 5,
    },
  },
  "move-blind": {
    beat: "You step into black. A full ring of stone hammers into place underfoot — cold, new, still smoking with creation. Ahead, a bronze door stands ajar, breathing warm air that does not belong in a tomb.",
    choices: [
      { id: "push", label: "Push the door open" },
      { id: "peek", label: "Peer through the gap" },
      { id: "moss", label: "Harvest the phosphor moss" },
    ],
    holo: {
      locale: "forward ring",
      mood: "wonder",
      props: ["spiral stair", "moss veins", "bronze door", "tile-ring"],
      palette: {
        primary: "#102820",
        secondary: "#1f5a44",
        glow: "#6dffb0",
      },
      focal: "a ring of new stone and a bronze door leaking amber",
      stage: "explore",
      revealedTiles: 9,
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
  const appearance = input.appearance ?? DEFAULT_APPEARANCE;
  const holo: HoloSceneBrief = {
    ...OPENING.holo,
    palette: {
      ...OPENING.holo.palette,
      primary: appearance.primary,
      glow: appearance.glow,
    },
  };

  const beat: StoryBeat = {
    id: nanoid(8),
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

  // Mild procedural tint so repeats feel less static.
  const holo: HoloSceneBrief = {
    ...branch.holo,
    props: [...branch.holo.props, `echo-${session.beats.length}`],
    palette: {
      ...branch.holo.palette,
      glow: session.player.appearance?.glow ?? branch.holo.palette.glow,
    },
  };

  return {
    beat: {
      id: nanoid(8),
      text: branch.beat,
      voice: "narrator",
      createdAt: new Date().toISOString(),
    },
    choices: branch.choices,
    holo,
  };
}

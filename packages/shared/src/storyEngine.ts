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
  describeTileUnderPlayer,
  generateSimpleRoom,
  getTile,
  movePlayer,
  parseMoveChoice,
  revealSemiRing,
  travelChoices,
  type Cardinal,
  type RoomMap,
} from "./room.js";

const FALLBACK_APPEARANCE: CharacterAppearance = {
  build: "slim",
  primary: "#1a2f3a",
  glow: "#7dffc8",
};

const EXPLORE_PALETTE = {
  primary: "#1a2f3a",
  secondary: "#3d6b7a",
  glow: "#7dffc8",
};

function openingRoom(seed: string): RoomMap {
  return generateSimpleRoom({
    id: `threshold-${seed}`,
    seed,
    width: 5,
    height: 5,
    doors: ["N", "E"],
    reveal: "player",
    tileSize: 1,
    facing: "N",
  });
}

function sid(length = 8): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) out += alphabet[bytes[i]! % alphabet.length];
  return out;
}

function exploreChoices(room: RoomMap, includeLook: boolean): StoryChoice[] {
  const moves = travelChoices(room);
  const choices: StoryChoice[] = [];
  if (includeLook) {
    choices.push({
      id: "look-around",
      label: "Stay still and look around",
      hint: "Reveal nearby tiles without moving",
    });
  }
  // Keep ≤4 buttons: prefer travel, drop look if needed.
  const roomForMoves = 4 - choices.length;
  choices.push(...moves.slice(0, roomForMoves));
  if (choices.length === 0) {
    choices.push({
      id: "look-around",
      label: "Look around",
      hint: "Survey the dark",
    });
  }
  return choices;
}

function exploreHolo(
  room: RoomMap,
  locale: string,
  focal: string,
  mood: HoloSceneBrief["mood"] = "eerie",
  glow?: string,
): HoloSceneBrief {
  return {
    locale,
    mood,
    props: ["floor", "wall", "door"],
    palette: {
      ...EXPLORE_PALETTE,
      ...(glow ? { glow } : {}),
    },
    focal,
    stage: "explore",
    room,
    revealedTiles: countRevealed(room),
  };
}

function travelBeat(room: RoomMap, dir: Cardinal): string {
  const under = getTile(room, room.player.x, room.player.y);
  const dirWord =
    dir === "N" ? "north" : dir === "S" ? "south" : dir === "W" ? "west" : "east";
  if (under?.kind === "door") {
    return `One step ${dirWord} — you cross onto the doorway. Stone underfoot, open air beyond. ${describeTileUnderPlayer(room)} The chamber still waits; you can keep traveling tile by tile.`;
  }
  return `You step one tile ${dirWord}. The hologram catches up — adjacent stone resolves around your new footing. ${describeTileUnderPlayer(room)}`;
}

/**
 * Skeleton story engine.
 * Explore mode: look around, then travel one tile at a time.
 */
const OPENING: {
  beat: string;
  choices: StoryChoice[];
  holo: HoloSceneBrief;
} = {
  beat: "The chamber is only a single square of stone — and you. Beyond the tile, the vault is unwritten dark. Look to learn the room, or take a single step and travel.",
  choices: [
    {
      id: "look-around",
      label: "Stay still and look around",
      hint: "Reveal nearby tiles without moving",
    },
    {
      id: "move-n",
      label: "Step north",
      hint: "One tile",
    },
    {
      id: "move-e",
      label: "Step east",
      hint: "One tile",
    },
    {
      id: "move-w",
      label: "Step west",
      hint: "One tile",
    },
  ],
  holo: {
    locale: "threshold square",
    mood: "eerie",
    props: ["floor"],
    palette: EXPLORE_PALETTE,
    focal: "a lone square tile holding your form",
    stage: "explore",
    revealedTiles: 1,
  },
};

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
  const holo = exploreHolo(
    room,
    OPENING.holo.locale,
    OPENING.holo.focal ?? "",
    "eerie",
    appearance.glow,
  );

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
    // Opening offers look + cardinals that are walkable from center (all 4 on 5x5).
    choices: exploreChoices(room, true),
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
  const base = session.holo.room ?? openingRoom(session.seed);
  const glow = session.player.appearance?.glow;
  const moveDir = parseMoveChoice(choiceId);

  if (choiceId === "look-around") {
    const room = revealSemiRing(base, base.player, base.facing, 2);
    return {
      beat: {
        id: sid(8),
        text: "You hold still. Nearby floors resolve, then wall faces, then doorframes humming with cold light. You can travel one tile at a time from here.",
        voice: "narrator",
        createdAt: new Date().toISOString(),
      },
      choices: exploreChoices(room, false),
      holo: exploreHolo(
        room,
        "listening antechamber",
        "walls and doors resolving around your footing",
        "tense",
        glow,
      ),
    };
  }

  if (moveDir) {
    const before = base.player;
    const room = movePlayer(base, moveDir, 1);
    const stepped =
      room.player.x !== before.x || room.player.y !== before.y;
    const beatText = stepped
      ? travelBeat(room, moveDir)
      : "Stone blocks that way. You stay planted and study the wall closing the path.";

    return {
      beat: {
        id: sid(8),
        text: beatText,
        voice: "narrator",
        createdAt: new Date().toISOString(),
      },
      choices: exploreChoices(room, true),
      holo: exploreHolo(
        room,
        "traveling chamber",
        stepped
          ? `one tile ${moveDir === "N" ? "north" : moveDir === "S" ? "south" : moveDir === "W" ? "west" : "east"}`
          : "path blocked",
        "wonder",
        glow,
      ),
    };
  }

  // Unknown choice: stay put, keep travel options.
  return {
    beat: {
      id: sid(8),
      text: "The vault waits. Choose a direction and travel one tile at a time.",
      voice: "narrator",
      createdAt: new Date().toISOString(),
    },
    choices: exploreChoices(base, true),
    holo: exploreHolo(
      base,
      session.holo.locale,
      session.holo.focal ?? "the chamber holds",
      session.holo.mood,
      glow,
    ),
  };
}

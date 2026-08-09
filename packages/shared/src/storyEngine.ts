import type {
  AdventureSession,
  CharacterAppearance,
  ChoiceId,
  HoloSceneBrief,
  PlayerState,
  StoryBeat,
  StoryChoice,
} from "./index.js";
import {
  countRevealed,
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

const SCRAPS = [
  "iron key",
  "phosphor shard",
  "frayed ribbon",
  "cold coin",
  "bone charm",
  "rust nail",
];

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

function statusBeat(text: string): StoryBeat {
  return {
    id: sid(8),
    text,
    voice: "system",
    createdAt: new Date().toISOString(),
  };
}

function exploreChoices(room: RoomMap, includeLook: boolean): StoryChoice[] {
  const moves = travelChoices(room);
  const choices: StoryChoice[] = [];
  if (includeLook) {
    choices.push({
      id: "look-around",
      label: "Look around",
      hint: "Reveal nearby tiles",
    });
  }
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

function dirWord(dir: Cardinal): string {
  return dir === "N" ? "north" : dir === "S" ? "south" : dir === "W" ? "west" : "east";
}

function maybeLoot(
  player: PlayerState,
  chance: number,
): { player: PlayerState; status: string | null } {
  if (Math.random() > chance) return { player, status: null };
  const item = SCRAPS[Math.floor(Math.random() * SCRAPS.length)]!;
  if (player.inventory.includes(item)) return { player, status: null };
  return {
    player: { ...player, inventory: [...player.inventory, item] },
    status: `+1 ${item}`,
  };
}

function joinStatus(...parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(" · ");
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
  const holo = exploreHolo(
    room,
    "threshold",
    "lone tile",
    "eerie",
    appearance.glow,
  );

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
    beats: [statusBeat("Chamber unresolved")],
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
  player?: PlayerState;
}> {
  const base = session.holo.room ?? openingRoom(session.seed);
  const glow = session.player.appearance?.glow;
  const moveDir = parseMoveChoice(choiceId);
  const revealedBefore = base.tiles.filter((t) => t.revealed).length;

  if (choiceId === "look-around") {
    const room = revealSemiRing(base, base.player, base.facing, 2);
    const gained = room.tiles.filter((t) => t.revealed).length - revealedBefore;
    const loot = maybeLoot(session.player, 0.35);
    return {
      beat: statusBeat(
        joinStatus(
          gained > 0 ? `+${gained} tiles revealed` : "Nothing new nearby",
          loot.status,
        ),
      ),
      choices: exploreChoices(room, false),
      holo: exploreHolo(room, "chamber", "survey", "tense", glow),
      player: loot.status ? loot.player : undefined,
    };
  }

  if (moveDir) {
    const before = base.player;
    const room = movePlayer(base, moveDir, 1);
    const stepped =
      room.player.x !== before.x || room.player.y !== before.y;
    const gained = room.tiles.filter((t) => t.revealed).length - revealedBefore;
    const under = getTile(room, room.player.x, room.player.y);

    if (!stepped) {
      return {
        beat: statusBeat("Path blocked"),
        choices: exploreChoices(base, true),
        holo: exploreHolo(base, session.holo.locale, "blocked", "tense", glow),
      };
    }

    const onDoor = under?.kind === "door";
    const loot = maybeLoot(session.player, onDoor ? 0.55 : 0.18);
    const primary = onDoor
      ? `Doorway · ${dirWord(moveDir)}`
      : `Stepped ${dirWord(moveDir)}`;

    return {
      beat: statusBeat(
        joinStatus(
          primary,
          gained > 0 ? `+${gained} revealed` : null,
          loot.status,
        ),
      ),
      choices: exploreChoices(room, true),
      holo: exploreHolo(
        room,
        onDoor ? "threshold" : "chamber",
        onDoor ? "doorway" : `step ${dirWord(moveDir)}`,
        "wonder",
        glow,
      ),
      player: loot.status ? loot.player : undefined,
    };
  }

  return {
    beat: statusBeat("Awaiting move"),
    choices: exploreChoices(base, true),
    holo: exploreHolo(
      base,
      session.holo.locale,
      session.holo.focal ?? "hold",
      session.holo.mood,
      glow,
    ),
  };
}

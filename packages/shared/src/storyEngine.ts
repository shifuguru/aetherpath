import type {
  AdventureSession,
  Cardinal,
  CharacterAppearance,
  ChoiceId,
  EncounterKind,
  HoloSceneBrief,
  StoryBeat,
  StoryChoice,
} from "./index.js";
import { WIN_DEPTH } from "./index.js";
import {
  countRevealed,
  enterRoomAtDoor,
  generateSimpleRoom,
  hashSeed,
  movePlayer,
  mulberry32,
  oppositeFacing,
  revealAround,
  type RoomMap,
} from "./room.js";

const FALLBACK_APPEARANCE: CharacterAppearance = {
  build: "slim",
  primary: "#1a2f3a",
  glow: "#7dffc8",
};

const DIRECTION_NAME: Record<Cardinal, string> = {
  N: "north",
  E: "east",
  S: "south",
  W: "west",
};

const TREASURE_ITEMS = [
  "gleaming coin cache",
  "vial of healing draught",
  "phosphor lantern",
  "silver vault key",
  "warded amulet",
  "shard of cold light",
];

function sid(length = 8): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) out += alphabet[bytes[i]! % alphabet.length];
  return out;
}

function beat(text: string): StoryBeat {
  return { id: sid(8), text, voice: "narrator", createdAt: new Date().toISOString() };
}

function clampHp(hp: number, maxHp: number): number {
  return Math.max(0, Math.min(maxHp, hp));
}

function hasWeapon(inventory: string[]): boolean {
  return inventory.some((item) => /blade|knife|sword|dagger/i.test(item));
}

function openingRoom(seed: string): RoomMap {
  // 5x5 keeps walls/doors one look-around away from the center spawn.
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

function roomSizeForDepth(depth: number): number {
  if (depth <= 2) return 5;
  if (depth <= 4) return 7;
  return 9;
}

function doorsForDepth(rng: () => number, entryFacing: Cardinal, depth: number): Cardinal[] {
  if (depth >= WIN_DEPTH) return [entryFacing];
  const cardinals: Cardinal[] = ["N", "E", "S", "W"];
  const doors = new Set<Cardinal>([entryFacing]);
  // Every non-relic room must offer at least one way forward — never a dead end.
  const extraCount = rng() < 0.7 ? 1 : 2;
  const pool = cardinals.filter((c) => c !== entryFacing);
  for (let i = 0; i < extraCount && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    doors.add(pool.splice(idx, 1)[0]!);
  }
  return Array.from(doors);
}

function rollEncounter(
  seed: string,
  depth: number,
  facing: Cardinal,
): { kind: EncounterKind; rng: () => number } {
  // Keyed by the specific door pushed, not just depth, so alternate doors in
  // the same room can lead to genuinely different fates.
  const rng = mulberry32(hashSeed(`${seed}-encounter-${depth}-${facing}`));
  if (depth >= WIN_DEPTH) return { kind: "relic", rng };
  const roll = rng();
  if (roll < 0.25) return { kind: "empty", rng };
  if (roll < 0.55) return { kind: "treasure", rng };
  if (roll < 0.85) return { kind: "monster", rng };
  return { kind: "trap", rng };
}

/** Doors already behind the player never re-offer themselves as a choice. */
function doorChoices(room: RoomMap): StoryChoice[] {
  const doors = room.tiles.filter(
    (t) => t.kind === "door" && t.revealed && !(t.x === room.player.x && t.y === room.player.y),
  );
  const seen = new Set<Cardinal>();
  const choices: StoryChoice[] = [];
  for (const d of doors) {
    if (!d.facing || seen.has(d.facing)) continue;
    seen.add(d.facing);
    choices.push({
      id: `door-${d.facing}`,
      label: `Push through the ${DIRECTION_NAME[d.facing]} door`,
      hint: "Advance deeper into the vault",
    });
  }
  return choices;
}

/** Explore-or-advance choices for whatever the room currently reveals. */
function exploreChoices(room: RoomMap): StoryChoice[] {
  const doors = doorChoices(room);
  if (doors.length > 0) return doors;
  return [
    {
      id: "look-around",
      label: "Stay still and look around",
      hint: "Reveal the chamber around you",
    },
    {
      id: "move-blind",
      label: "Move forward blindly",
      hint: "Step ahead and uncover a ring of stone",
    },
  ];
}

function briefFor(
  room: RoomMap,
  appearance: CharacterAppearance,
  opts: {
    locale: string;
    mood: HoloSceneBrief["mood"];
    focal: string;
    stage?: HoloSceneBrief["stage"];
    props?: string[];
  },
): HoloSceneBrief {
  return {
    locale: opts.locale,
    mood: opts.mood,
    props: opts.props ?? ["walls", "doorways", "fog of war"],
    palette: {
      primary: appearance.primary,
      secondary: "#3d6b7a",
      glow: appearance.glow,
    },
    focal: opts.focal,
    stage: opts.stage ?? "explore",
    room,
    revealedTiles: countRevealed(room),
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
  const holo = briefFor(room, appearance, {
    locale: "threshold square",
    mood: "eerie",
    focal: "a lone isometric tile holding your form",
    props: ["isometric tile", "holographic figure"],
  });

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
      depth: 0,
    },
    beats: [
      beat(
        "The chamber is only a single square of stone — and you. Beyond the tile, the vault is unwritten dark. How will you take your first step into it?",
      ),
    ],
    choices: exploreChoices(room),
    holo,
    tokensRemaining: input.tokensRemaining,
    status: "active",
  };
}

function resolveLookAround(session: AdventureSession): {
  beat: StoryBeat;
  choices: StoryChoice[];
  holo: HoloSceneBrief;
} {
  const room = session.holo.room ?? openingRoom(session.seed);
  const radius = Math.max(room.width, room.height);
  const revealed = revealAround(room, room.player, radius);
  const doors = doorChoices(revealed).length;

  const text =
    doors > 0
      ? `You hold your ground and let your eyes adjust. Stone resolves around you — floor, then wall, then ${
          doors > 1 ? "doorways" : "a doorway"
        } cut into the dark, each one a promise or a threat.`
      : "You hold your ground and let your eyes adjust. Stone resolves around you — a sealed chamber, walls closing in on every side, no door yet in sight.";

  return {
    beat: beat(text),
    choices: exploreChoices(revealed),
    holo: briefFor(revealed, session.player.appearance, {
      locale: "listening chamber",
      mood: doors > 0 ? "tense" : "eerie",
      focal: doors > 0 ? "walls and doorways resolving from the fog of war" : "a sealed chamber, fully lit",
      props: ["walls", "doorways", "fog of war"],
    }),
  };
}

function resolveMoveBlind(session: AdventureSession): {
  beat: StoryBeat;
  choices: StoryChoice[];
  holo: HoloSceneBrief;
} {
  const room = session.holo.room ?? openingRoom(session.seed);
  const direction = room.entryFacing ? oppositeFacing(room.entryFacing) : "N";
  const moved = movePlayer(room, direction, 1);
  const doors = doorChoices(moved).length;

  const text =
    doors > 0
      ? "You step into black. A ring of floor hammers into place beneath your boots, then the chamber's walls snap up around you — and a doorway leaks faint light nearby."
      : "You step into black. A ring of floor hammers into place beneath your boots, then the chamber's walls snap up around you, still sealed on every side you can see.";

  return {
    beat: beat(text),
    choices: exploreChoices(moved),
    holo: briefFor(moved, session.player.appearance, {
      locale: "forward chamber",
      mood: "wonder",
      focal: "a revealed ring of stone underfoot",
      props: ["walls", "tile-ring", "fog of war"],
    }),
  };
}

function describeItem(item: string): string {
  return item;
}

function resolveDoorPush(
  session: AdventureSession,
  facing: Cardinal,
): {
  beat: StoryBeat;
  choices: StoryChoice[];
  holo: HoloSceneBrief;
  playerPatch?: Partial<AdventureSession["player"]>;
  pending?: AdventureSession["pending"];
  statusOverride?: AdventureSession["status"];
} {
  const currentRoom = session.holo.room ?? openingRoom(session.seed);
  const nextDepth = session.player.depth + 1;
  const entryFacing = oppositeFacing(facing);
  const { kind, rng } = rollEncounter(session.seed, nextDepth, facing);

  const size = kind === "relic" ? 5 : roomSizeForDepth(nextDepth);
  const doors = doorsForDepth(rng, entryFacing, nextDepth);
  const rawRoom = generateSimpleRoom({
    id: `room-${session.seed}-${nextDepth}-${facing}`,
    seed: `${session.seed}-room-${nextDepth}-${facing}`,
    width: size,
    height: size,
    doors,
    reveal: "player",
    tileSize: 1,
  });
  const nextRoom: RoomMap = enterRoomAtDoor(rawRoom, entryFacing);

  if (kind === "monster") {
    return {
      beat: beat(
        `You push through the ${DIRECTION_NAME[facing]} door — and something uncoils in the dark beyond it, breathing too evenly to be yours. It has noticed you.`,
      ),
      choices: [
        { id: "fight", label: "Draw your blade and fight", hint: "Risk a wound for a clear path" },
        { id: "flee", label: "Slam the door and retreat", hint: "Stay safe, stay put" },
      ],
      holo: briefFor(currentRoom, session.player.appearance, {
        locale: session.holo.locale,
        mood: "danger",
        focal: "a door held shut against something patient",
        props: ["trembling door", "held breath"],
      }),
      pending: { facing, depth: nextDepth, encounter: "monster", nextRoom },
    };
  }

  if (kind === "relic") {
    return {
      beat: beat(
        "The chamber beyond opens into hush and light: the Aether Core hangs suspended above a plinth of black glass, pulsing in time with your heartbeat. You close your hand around it, and the vault exhales.",
      ),
      choices: [],
      holo: briefFor(nextRoom, session.player.appearance, {
        locale: "the Aether Core chamber",
        mood: "wonder",
        focal: "the Aether Core, claimed",
        stage: "victory",
        props: ["floating core", "black glass plinth", "aftermath"],
      }),
      statusOverride: "won",
      playerPatch: { depth: nextDepth, inventory: [...session.player.inventory, "the Aether Core"] },
    };
  }

  if (kind === "trap") {
    const dmg = Math.round(3 + rng() * 4); // 3-7
    const hp = clampHp(session.player.hp - dmg, session.player.maxHp);
    const lost = hp <= 0;
    return {
      beat: beat(
        lost
          ? `The threshold betrays you — a hidden plate gives beneath your foot and pain lances through you. Your legs buckle; the hologram gutters and the vault goes dark.`
          : `The threshold betrays you — a hidden plate gives beneath your foot, and pain blooms along your side (-${dmg} HP). You press through, wary now, into the room beyond.`,
      ),
      choices: lost ? [] : exploreChoices(nextRoom),
      holo: lost
        ? briefFor(nextRoom, session.player.appearance, {
            locale: nextRoom.entryFacing ? "the vault, gone dark" : "gone dark",
            mood: "danger",
            focal: "the hologram, guttering out",
            stage: "defeat",
          })
        : briefFor(nextRoom, session.player.appearance, {
            locale: "wounded passage",
            mood: "danger",
            focal: "a fresh chamber, entered hurt",
          }),
      statusOverride: lost ? "lost" : undefined,
      playerPatch: { hp, depth: nextDepth },
    };
  }

  if (kind === "treasure") {
    const isDraught = rng() < 0.35;
    const item = isDraught
      ? "vial of healing draught"
      : TREASURE_ITEMS.filter((i) => i !== "vial of healing draught")[
          Math.floor(rng() * (TREASURE_ITEMS.length - 1))
        ] ?? "curious trinket";
    const heals = /healing|draught/.test(item);
    const healAmount = heals ? Math.round(4 + rng() * 5) : 0; // 4-9
    const hp = clampHp(session.player.hp + healAmount, session.player.maxHp);
    return {
      beat: beat(
        `Beyond the door, something glints in the gloom: a ${describeItem(item)}. You claim it before the dark can change its mind.${
          heals ? ` Warmth spreads through the wound you didn't know you were favouring (+${healAmount} HP).` : ""
        }`,
      ),
      choices: exploreChoices(nextRoom),
      holo: briefFor(nextRoom, session.player.appearance, {
        locale: "glinting chamber",
        mood: "wonder",
        focal: `a ${item}, freshly claimed`,
      }),
      playerPatch: { hp, depth: nextDepth, inventory: [...session.player.inventory, item] },
    };
  }

  // empty
  return {
    beat: beat(
      "The door gives way onto quiet stone — no threat waits here, only dust and dripping water. You press on, tokens of relief loosening your grip on your blade.",
    ),
    choices: exploreChoices(nextRoom),
    holo: briefFor(nextRoom, session.player.appearance, {
      locale: "quiet passage",
      mood: "calm",
      focal: "an empty chamber, undisturbed",
    }),
    playerPatch: { depth: nextDepth },
  };
}

function resolveFight(session: AdventureSession): {
  beat: StoryBeat;
  choices: StoryChoice[];
  holo: HoloSceneBrief;
  playerPatch?: Partial<AdventureSession["player"]>;
  statusOverride?: AdventureSession["status"];
} {
  const pending = session.pending;
  if (!pending) {
    return resolveLookAround(session);
  }
  const rng = mulberry32(hashSeed(`${session.seed}-fight-${pending.depth}-${pending.facing}`));
  const successChance = hasWeapon(session.player.inventory) ? 0.62 : 0.48;
  const success = rng() < successChance;
  const dmgRoll = rng();
  const nextRoom = pending.nextRoom;

  if (success) {
    const dmg = Math.round(2 + dmgRoll * 4); // 2-6 graze
    const hp = clampHp(session.player.hp - dmg, session.player.maxHp);
    const gotLoot = rng() < 0.5;
    const loot = gotLoot ? TREASURE_ITEMS[Math.floor(rng() * TREASURE_ITEMS.length)] : undefined;
    return {
      beat: beat(
        `Steel meets whatever prowled the dark with a shriek that isn't quite animal. It dissolves into settling dust${
          loot ? `, leaving behind a ${loot}` : ""
        } — and a shallow wound you'll feel tomorrow (-${dmg} HP).`,
      ),
      choices: exploreChoices(nextRoom),
      holo: briefFor(nextRoom, session.player.appearance, {
        locale: "cleared threshold",
        mood: "calm",
        focal: "settling dust where the threat once stood",
      }),
      playerPatch: {
        hp,
        depth: pending.depth,
        inventory: loot ? [...session.player.inventory, loot] : session.player.inventory,
      },
    };
  }

  const dmg = Math.round(8 + dmgRoll * 7); // 8-15 heavy
  const hp = clampHp(session.player.hp - dmg, session.player.maxHp);
  const lost = hp <= 0;
  return {
    beat: beat(
      lost
        ? `You misjudge the strike. Something rakes past your guard, and the world tips sideways — the hologram gutters, and the vault goes dark around you.`
        : `You misjudge the strike. Claws — or worse — rake past your guard before the thing withdraws, hissing, into the walls themselves (-${dmg} HP). Shaken, you push on into the room beyond.`,
    ),
    choices: lost ? [] : exploreChoices(nextRoom),
    holo: lost
      ? briefFor(nextRoom, session.player.appearance, {
          locale: "gone dark",
          mood: "danger",
          focal: "the hologram, guttering out",
          stage: "defeat",
        })
      : briefFor(nextRoom, session.player.appearance, {
          locale: "wounded passage",
          mood: "danger",
          focal: "a fresh chamber, entered hurt",
        }),
    statusOverride: lost ? "lost" : undefined,
    playerPatch: { hp, depth: pending.depth },
  };
}

function resolveFlee(session: AdventureSession): {
  beat: StoryBeat;
  choices: StoryChoice[];
  holo: HoloSceneBrief;
  playerPatch?: Partial<AdventureSession["player"]>;
  statusOverride?: AdventureSession["status"];
} {
  const currentRoom = session.holo.room ?? openingRoom(session.seed);
  const hp = clampHp(session.player.hp - 1, session.player.maxHp);
  const lost = hp <= 0;
  return {
    beat: beat(
      lost
        ? "You haul the door shut and brace it, heart hammering — but the scrape costs you the last of your strength. The hologram gutters, and the vault goes dark."
        : "You haul the door shut and brace it, heart hammering (-1 HP, a scrape as you wrench free). Whatever prowls beyond stays beyond — for now.",
    ),
    choices: lost ? [] : exploreChoices(currentRoom),
    holo: lost
      ? briefFor(currentRoom, session.player.appearance, {
          locale: "gone dark",
          mood: "danger",
          focal: "the hologram, guttering out",
          stage: "defeat",
        })
      : briefFor(currentRoom, session.player.appearance, {
          locale: session.holo.locale,
          mood: "tense",
          focal: "a door, held shut once more",
        }),
    statusOverride: lost ? "lost" : undefined,
    playerPatch: { hp },
  };
}

export async function generateTurn(
  session: AdventureSession,
  choiceId: ChoiceId,
): Promise<{
  beat: StoryBeat;
  choices: StoryChoice[];
  holo: HoloSceneBrief;
  playerPatch?: Partial<AdventureSession["player"]>;
  pending?: AdventureSession["pending"];
  statusOverride?: AdventureSession["status"];
}> {
  // Hook for real AI: if OPENAI_API_KEY is set, call the model with session context
  // and fall back to this deterministic engine on failure.
  const doorMatch = /^door-(N|E|S|W)$/.exec(choiceId);

  if (choiceId === "look-around") return resolveLookAround(session);
  if (choiceId === "move-blind") return resolveMoveBlind(session);
  if (doorMatch) return resolveDoorPush(session, doorMatch[1] as Cardinal);
  if (choiceId === "fight") return resolveFight(session);
  if (choiceId === "flee") return resolveFlee(session);

  // Unknown/legacy choice id — treat as a safe no-op look-around.
  return resolveLookAround(session);
}

/** Merge a resolved turn into a session. Token accounting stays with the caller. */
export function applyTurn(
  session: AdventureSession,
  turn: {
    beat: StoryBeat;
    choices: StoryChoice[];
    holo: HoloSceneBrief;
    playerPatch?: Partial<AdventureSession["player"]>;
    pending?: AdventureSession["pending"];
    statusOverride?: AdventureSession["status"];
  },
): AdventureSession {
  return {
    ...session,
    beats: [...session.beats, turn.beat],
    choices: turn.choices,
    holo: turn.holo,
    player: turn.playerPatch ? { ...session.player, ...turn.playerPatch } : session.player,
    pending: turn.pending,
    status: turn.statusOverride ?? "active",
  };
}

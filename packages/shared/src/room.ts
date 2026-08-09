/** Simple seeded dungeon room: floor, walls, doors on a square grid. */

export type TileKind = "floor" | "wall" | "door" | "void";
export type Cardinal = "N" | "E" | "S" | "W";

export const CARDINALS: Cardinal[] = ["N", "E", "S", "W"];

export interface GridPos {
  x: number;
  y: number;
}

export interface MapTile {
  x: number;
  y: number;
  kind: TileKind;
  /** Door / feature facing. */
  facing?: Cardinal;
  revealed: boolean;
}

export interface RoomMap {
  id: string;
  width: number;
  height: number;
  tiles: MapTile[];
  player: GridPos;
  /** Direction the player last stepped / is facing. */
  facing: Cardinal;
  /** World units between tile centers. */
  tileSize: number;
}

export interface GenerateRoomOptions {
  id?: string;
  width?: number;
  height?: number;
  /** Which perimeter sides get a door (default: one north door). */
  doors?: Cardinal[];
  /** Starting reveal: only the player tile, or a filled rectangle. */
  reveal?: "player" | "all";
  tileSize?: number;
  seed?: string;
  facing?: Cardinal;
}

const DIR_DELTA: Record<Cardinal, GridPos> = {
  N: { x: 0, y: -1 },
  S: { x: 0, y: 1 },
  W: { x: -1, y: 0 },
  E: { x: 1, y: 0 },
};

const DIR_LABEL: Record<Cardinal, string> = {
  N: "north",
  S: "south",
  W: "west",
  E: "east",
};

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function key(x: number, y: number) {
  return `${x},${y}`;
}

function doorCell(
  width: number,
  height: number,
  facing: Cardinal,
): GridPos {
  const midX = Math.floor(width / 2);
  const midY = Math.floor(height / 2);
  switch (facing) {
    case "N":
      return { x: midX, y: 0 };
    case "S":
      return { x: midX, y: height - 1 };
    case "W":
      return { x: 0, y: midY };
    case "E":
      return { x: width - 1, y: midY };
  }
}

export function isWalkable(tile: MapTile | undefined): boolean {
  return !!tile && (tile.kind === "floor" || tile.kind === "door");
}

export function getTile(room: RoomMap, x: number, y: number): MapTile | undefined {
  return room.tiles.find((t) => t.x === x && t.y === y);
}

export function stepPos(from: GridPos, facing: Cardinal): GridPos {
  const d = DIR_DELTA[facing];
  return { x: from.x + d.x, y: from.y + d.y };
}

export function parseMoveChoice(choiceId: string): Cardinal | null {
  const m = /^move-([nesw])$/i.exec(choiceId);
  if (!m) return null;
  return m[1]!.toUpperCase() as Cardinal;
}

export function moveChoiceId(facing: Cardinal): string {
  return `move-${facing.toLowerCase()}`;
}

/** Walkable neighbors from the player's current tile (1 step). */
export function listExits(room: RoomMap): Cardinal[] {
  return CARDINALS.filter((dir) => {
    const next = stepPos(room.player, dir);
    return isWalkable(getTile(room, next.x, next.y));
  });
}

/** Choice buttons for one-tile travel in each open direction. */
export function travelChoices(room: RoomMap): Array<{
  id: string;
  label: string;
  hint?: string;
}> {
  return listExits(room).map((dir) => {
    const next = stepPos(room.player, dir);
    const tile = getTile(room, next.x, next.y);
    const throughDoor = tile?.kind === "door";
    return {
      id: moveChoiceId(dir),
      label: throughDoor
        ? `Step ${DIR_LABEL[dir]} into the doorway`
        : `Step ${DIR_LABEL[dir]}`,
      hint: throughDoor ? "One tile — onto the threshold" : "One tile",
    };
  });
}

/**
 * Rectangular room: wall perimeter, floor interior, optional doors.
 * Grid origin is top-left; +y runs "south" for readability.
 */
export function generateSimpleRoom(options: GenerateRoomOptions = {}): RoomMap {
  const width = Math.max(3, options.width ?? 7);
  const height = Math.max(3, options.height ?? 7);
  const tileSize = options.tileSize ?? 1;
  const seed = options.seed ?? `${width}x${height}`;
  const rng = mulberry32(hashSeed(seed));

  let doors = options.doors;
  if (!doors || doors.length === 0) {
    const picks: Cardinal[] = ["N", "E", "S", "W"];
    doors = [picks[Math.floor(rng() * picks.length)]!];
    if (rng() < 0.4) {
      const extra = picks[Math.floor(rng() * picks.length)]!;
      if (!doors.includes(extra)) doors = [...doors, extra];
    }
  }

  const doorKeys = new Set(
    doors.map((d) => {
      const c = doorCell(width, height, d);
      return key(c.x, c.y);
    }),
  );
  const facingByKey = new Map<string, Cardinal>();
  for (const d of doors) {
    const c = doorCell(width, height, d);
    facingByKey.set(key(c.x, c.y), d);
  }

  const player = {
    x: Math.floor(width / 2),
    y: Math.floor(height / 2),
  };

  const revealAll = options.reveal === "all";
  const tiles: MapTile[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      const k = key(x, y);
      let kind: TileKind = "floor";
      let facing: Cardinal | undefined;
      if (edge) {
        if (doorKeys.has(k)) {
          kind = "door";
          facing = facingByKey.get(k);
        } else {
          kind = "wall";
        }
      }
      const isPlayer = x === player.x && y === player.y;
      tiles.push({
        x,
        y,
        kind,
        facing,
        revealed: revealAll || isPlayer,
      });
    }
  }

  return {
    id: options.id ?? `room-${seed}`,
    width,
    height,
    tiles,
    player,
    facing: options.facing ?? "N",
    tileSize,
  };
}

/** Reveal floor/wall/door tiles in a chebyshev radius (square ring). */
export function revealAround(
  room: RoomMap,
  origin: GridPos,
  radius: number,
): RoomMap {
  const tiles = room.tiles.map((tile) => {
    const dist = Math.max(Math.abs(tile.x - origin.x), Math.abs(tile.y - origin.y));
    if (dist <= radius) return { ...tile, revealed: true };
    return tile;
  });
  return { ...room, tiles };
}

/** Reveal a forward-biased semi-ring (look-around). */
export function revealSemiRing(
  room: RoomMap,
  origin: GridPos,
  facing: Cardinal = "N",
  radius = 2,
): RoomMap {
  const tiles = room.tiles.map((tile) => {
    const dx = tile.x - origin.x;
    const dy = tile.y - origin.y;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));
    if (dist === 0) return { ...tile, revealed: true };
    if (dist > radius) return tile;

    const forward =
      facing === "N"
        ? dy < 0 || (dy === 0 && Math.abs(dx) <= radius)
        : facing === "S"
          ? dy > 0 || (dy === 0 && Math.abs(dx) <= radius)
          : facing === "W"
            ? dx < 0 || (dx === 0 && Math.abs(dy) <= radius)
            : dx > 0 || (dx === 0 && Math.abs(dy) <= radius);

    if (forward || dist === 1) return { ...tile, revealed: true };
    return tile;
  });
  return { ...room, tiles, facing };
}

/**
 * Step the player exactly one walkable tile, then reveal adjacent tiles.
 * Standing on a door counts as travel onto that threshold tile.
 */
export function movePlayer(
  room: RoomMap,
  facing: Cardinal,
  revealRadius = 1,
): RoomMap {
  const next = stepPos(room.player, facing);
  const target = getTile(room, next.x, next.y);
  if (!isWalkable(target)) {
    return { ...revealAround(room, room.player, revealRadius), facing };
  }

  const withPlayer: RoomMap = {
    ...room,
    player: next,
    facing,
  };
  return revealAround(withPlayer, next, revealRadius);
}

export function countRevealed(room: RoomMap): number {
  return room.tiles.filter((t) => t.revealed && t.kind === "floor").length;
}

export function describeTileUnderPlayer(room: RoomMap): string {
  const tile = getTile(room, room.player.x, room.player.y);
  if (tile?.kind === "door") {
    return `You stand on the ${DIR_LABEL[tile.facing ?? room.facing]} threshold.`;
  }
  return `You stand on stone at ${room.player.x},${room.player.y}.`;
}

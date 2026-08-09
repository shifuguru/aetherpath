/** Simple seeded dungeon room: floor, walls, doors on a square grid. */

export type TileKind = "floor" | "wall" | "door" | "void";
export type Cardinal = "N" | "E" | "S" | "W";

export function oppositeFacing(facing: Cardinal): Cardinal {
  switch (facing) {
    case "N":
      return "S";
    case "S":
      return "N";
    case "E":
      return "W";
    case "W":
      return "E";
  }
}

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
  /** World units between tile centers. */
  tileSize: number;
  /** Which door the player walked in through, if any (drives move-blind direction). */
  entryFacing?: Cardinal;
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
}

export function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number) {
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
    // Always one door; 40% chance of a second opposite-ish door.
    doors = [picks[Math.floor(rng() * picks.length)]!];
    if (rng() < 0.4) {
      const extra = picks[Math.floor(rng() * picks.length)]!;
      if (!doors.includes(extra)) doors = [...doors, extra];
    }
  }

  const doorKeys = new Set(doors.map((d) => key(doorCell(width, height, d).x, doorCell(width, height, d).y)));
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
    tileSize,
  };
}

/**
 * Move the player to the door matching `entryFacing` (the door you just
 * walked through, from the other side) and reveal only that threshold tile.
 * Falls back to the room's default center spawn if no matching door exists.
 */
export function enterRoomAtDoor(room: RoomMap, entryFacing: Cardinal): RoomMap {
  const doorTile = room.tiles.find(
    (t) => t.kind === "door" && t.facing === entryFacing,
  );
  if (!doorTile) return room;

  const player = { x: doorTile.x, y: doorTile.y };
  const tiles = room.tiles.map((t) => ({
    ...t,
    revealed: t.x === player.x && t.y === player.y,
  }));
  return { ...room, player, tiles, entryFacing };
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
    if (dist === 0 || dist > radius) return tile;

    const forward =
      facing === "N"
        ? dy < 0 || (dy === 0 && Math.abs(dx) <= radius)
        : facing === "S"
          ? dy > 0 || (dy === 0 && Math.abs(dx) <= radius)
          : facing === "W"
            ? dx < 0 || (dx === 0 && Math.abs(dy) <= radius)
            : dx > 0 || (dx === 0 && Math.abs(dy) <= radius);

    // Semi-ring: forward hemisphere + immediate sides
    if (forward || dist === 1) return { ...tile, revealed: true };
    return tile;
  });
  return { ...room, tiles };
}

/** Step player one tile if walkable; reveal a full ring afterward. */
export function movePlayer(
  room: RoomMap,
  facing: Cardinal,
  revealRadius = 1,
): RoomMap {
  const delta =
    facing === "N"
      ? { x: 0, y: -1 }
      : facing === "S"
        ? { x: 0, y: 1 }
        : facing === "W"
          ? { x: -1, y: 0 }
          : { x: 1, y: 0 };

  const next = { x: room.player.x + delta.x, y: room.player.y + delta.y };
  const target = room.tiles.find((t) => t.x === next.x && t.y === next.y);
  if (!target || target.kind === "wall" || target.kind === "void") {
    return revealAround(room, room.player, revealRadius);
  }

  const withPlayer = { ...room, player: next };
  return revealAround(withPlayer, next, revealRadius);
}

export function countRevealed(room: RoomMap): number {
  return room.tiles.filter((t) => t.revealed && t.kind === "floor").length;
}

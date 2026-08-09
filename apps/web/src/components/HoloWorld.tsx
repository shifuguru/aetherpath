import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import type { Group } from "three";
import type {
  CharacterAppearance,
  HoloSceneBrief,
  MapTile,
  RoomMap,
} from "@aetherpath/shared";
import { DEFAULT_APPEARANCE } from "@aetherpath/shared";

/** Square footprint — camera angle supplies the isometric read. */
const TILE = 1;
const FLOOR = 0.92;
const WALL_H = 0.95;
const WALL_T = 0.88;

function roomCenter(room: RoomMap) {
  return {
    x: (room.width - 1) / 2,
    y: (room.height - 1) / 2,
  };
}

/** Fixed room anchor: grid cells stay put while the player walks. */
function gridToWorld(room: RoomMap, x: number, y: number) {
  const size = room.tileSize || TILE;
  const c = roomCenter(room);
  return {
    x: (x - c.x) * size,
    z: (y - c.y) * size,
  };
}

function FloorTile({
  x,
  z,
  color,
  opacity = 0.4,
  accent = false,
}: {
  x: number;
  z: number;
  color: string;
  opacity?: number;
  accent?: boolean;
}) {
  return (
    <group position={[x, 0, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[FLOOR, FLOOR]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={accent ? 0.5 : 0.22}
          transparent
          opacity={opacity}
          metalness={0.15}
          roughness={0.6}
          wireframe
        />
      </mesh>
      {/* Soft fill so the square reads without relying on diamond rotation */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
        <planeGeometry args={[FLOOR * 0.92, FLOOR * 0.92]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={accent ? 0.2 : 0.08}
          transparent
          opacity={opacity * 0.35}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>
    </group>
  );
}

function WallTile({
  x,
  z,
  color,
  glow,
}: {
  x: number;
  z: number;
  color: string;
  glow: string;
}) {
  return (
    <mesh position={[x, WALL_H / 2, z]}>
      <boxGeometry args={[WALL_T, WALL_H, WALL_T]} />
      <meshStandardMaterial
        color={color}
        emissive={glow}
        emissiveIntensity={0.16}
        transparent
        opacity={0.7}
        wireframe
      />
    </mesh>
  );
}

function DoorTile({
  x,
  z,
  color,
  glow,
  facing,
}: {
  x: number;
  z: number;
  color: string;
  glow: string;
  facing?: string;
}) {
  const yaw = facing === "E" || facing === "W" ? Math.PI / 2 : 0;
  return (
    <group position={[x, 0, z]} rotation={[0, yaw, 0]}>
      <mesh position={[-0.34, 0.48, 0]}>
        <boxGeometry args={[0.14, 0.96, 0.2]} />
        <meshStandardMaterial
          color={color}
          emissive={glow}
          emissiveIntensity={0.45}
          wireframe
        />
      </mesh>
      <mesh position={[0.34, 0.48, 0]}>
        <boxGeometry args={[0.14, 0.96, 0.2]} />
        <meshStandardMaterial
          color={color}
          emissive={glow}
          emissiveIntensity={0.45}
          wireframe
        />
      </mesh>
      <mesh position={[0, 0.96, 0]}>
        <boxGeometry args={[0.82, 0.12, 0.2]} />
        <meshStandardMaterial
          color={glow}
          emissive={glow}
          emissiveIntensity={0.7}
          transparent
          opacity={0.9}
          wireframe
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[0.72, 0.4]} />
        <meshStandardMaterial
          color={glow}
          emissive={glow}
          emissiveIntensity={0.55}
          transparent
          opacity={0.45}
          wireframe
        />
      </mesh>
    </group>
  );
}

function HoloFigure({
  appearance,
  dropIn,
  x,
  z,
  yaw = 0,
}: {
  appearance: CharacterAppearance;
  dropIn: boolean;
  x: number;
  z: number;
  yaw?: number;
}) {
  const root = useRef<Group>(null);
  const bob = useRef<Group>(null);
  const startY = dropIn ? 2.4 : 0;
  const settled = useRef(!dropIn);
  const target = useRef({ x, z });
  const pos = useRef({ x, z });

  useEffect(() => {
    target.current = { x, z };
  }, [x, z]);

  useEffect(() => {
    settled.current = !dropIn;
    if (bob.current) bob.current.position.y = dropIn ? startY : 0;
    if (dropIn) {
      pos.current = { x, z };
      if (root.current) {
        root.current.position.x = x;
        root.current.position.z = z;
      }
    }
  }, [dropIn, appearance.glow, appearance.build, startY, x, z]);

  useFrame((state, delta) => {
    if (root.current) {
      // Ease across exactly one tile when the grid position changes.
      const speed = 6;
      pos.current.x += (target.current.x - pos.current.x) * Math.min(1, delta * speed);
      pos.current.z += (target.current.z - pos.current.z) * Math.min(1, delta * speed);
      root.current.position.x = pos.current.x;
      root.current.position.z = pos.current.z;
      root.current.rotation.y = yaw;
    }

    if (!bob.current) return;
    if (!settled.current) {
      bob.current.position.y = Math.max(0, bob.current.position.y - delta * 2.8);
      if (bob.current.position.y <= 0.02) {
        bob.current.position.y = 0;
        settled.current = true;
      }
      return;
    }
    bob.current.position.y = Math.sin(state.clock.elapsedTime * 1.6) * 0.04;
  });

  const dims =
    appearance.build === "sturdy"
      ? { torso: [0.32, 0.46, 0.2] as const, leg: 0.26, head: 0.15 }
      : appearance.build === "tall"
        ? { torso: [0.24, 0.58, 0.16] as const, leg: 0.34, head: 0.13 }
        : { torso: [0.26, 0.48, 0.16] as const, leg: 0.28, head: 0.14 };

  return (
    <group ref={root} position={[x, 0, z]}>
      <group ref={bob} position={[0, startY, 0]}>
        <mesh position={[0, dims.leg + dims.torso[1] / 2, 0]}>
          <boxGeometry args={[...dims.torso]} />
          <meshStandardMaterial
            color={appearance.primary}
            emissive={appearance.glow}
            emissiveIntensity={0.55}
            transparent
            opacity={0.85}
            wireframe
          />
        </mesh>
        <mesh position={[0, dims.leg + dims.torso[1] + dims.head, 0]}>
          <octahedronGeometry args={[dims.head, 0]} />
          <meshStandardMaterial
            color={appearance.glow}
            emissive={appearance.glow}
            emissiveIntensity={0.9}
            transparent
            opacity={0.9}
            wireframe
          />
        </mesh>
        <mesh position={[-0.09, dims.leg / 2, 0]}>
          <boxGeometry args={[0.09, dims.leg, 0.09]} />
          <meshStandardMaterial
            color={appearance.primary}
            emissive={appearance.glow}
            emissiveIntensity={0.3}
            wireframe
          />
        </mesh>
        <mesh position={[0.09, dims.leg / 2, 0]}>
          <boxGeometry args={[0.09, dims.leg, 0.09]} />
          <meshStandardMaterial
            color={appearance.primary}
            emissive={appearance.glow}
            emissiveIntensity={0.3}
            wireframe
          />
        </mesh>
      </group>
    </group>
  );
}

function facingYaw(facing: string | undefined): number {
  switch (facing) {
    case "E":
      return Math.PI / 2;
    case "S":
      return Math.PI;
    case "W":
      return -Math.PI / 2;
    default:
      return 0;
  }
}

function RoomTiles({
  room,
  colors,
}: {
  room: RoomMap;
  colors: { primary: string; secondary: string; glow: string };
}) {
  const visible = room.tiles.filter((t) => t.revealed && t.kind !== "void");

  return (
    <>
      {visible.map((tile: MapTile) => {
        const { x, z } = gridToWorld(room, tile.x, tile.y);
        const isPlayer = tile.x === room.player.x && tile.y === room.player.y;
        if (tile.kind === "wall") {
          return (
            <WallTile
              key={`${tile.x}-${tile.y}-w`}
              x={x}
              z={z}
              color={colors.primary}
              glow={colors.glow}
            />
          );
        }
        if (tile.kind === "door") {
          return (
            <group key={`${tile.x}-${tile.y}-d`}>
              <FloorTile
                x={x}
                z={z}
                color={isPlayer ? colors.glow : colors.secondary}
                opacity={isPlayer ? 0.5 : 0.28}
                accent={isPlayer}
              />
              <DoorTile
                x={x}
                z={z}
                color={colors.secondary}
                glow={colors.glow}
                facing={tile.facing}
              />
            </group>
          );
        }
        return (
          <FloorTile
            key={`${tile.x}-${tile.y}-f`}
            x={x}
            z={z}
            color={isPlayer ? colors.glow : colors.secondary}
            opacity={isPlayer ? 0.55 : 0.32}
            accent={isPlayer}
          />
        );
      })}
    </>
  );
}

function SparseTiles({
  colors,
}: {
  colors: { secondary: string; glow: string };
}) {
  return <FloorTile x={0} z={0} color={colors.glow} opacity={0.55} accent />;
}

function HoloScene({
  brief,
  appearance,
  dropIn,
}: {
  brief: HoloSceneBrief;
  appearance: CharacterAppearance;
  dropIn: boolean;
}) {
  const stage = brief.stage ?? "scene";
  const room = brief.room;
  const colors = useMemo(
    () => ({
      primary: brief.palette.primary,
      secondary: brief.palette.secondary,
      glow: appearance.glow || brief.palette.glow,
    }),
    [appearance.glow, brief.palette.glow, brief.palette.primary, brief.palette.secondary],
  );

  const playerWorld = room
    ? gridToWorld(room, room.player.x, room.player.y)
    : { x: 0, z: 0 };

  const span = room ? Math.max(room.width, room.height) : 3;
  const fogFar = 10 + span * 1.2;

  return (
    <>
      <color attach="background" args={["#03080c"]} />
      <fog attach="fog" args={["#03080c", 6, fogFar]} />
      <ambientLight intensity={0.38} />
      <pointLight position={[2, 3.2, 2]} intensity={1.25} color={colors.glow} />
      <pointLight position={[-2.5, 1.2, -2]} intensity={0.45} color={colors.secondary} />

      <group position={[0, 0.02, 0]}>
        {room ? (
          <RoomTiles room={room} colors={colors} />
        ) : (
          <SparseTiles colors={colors} />
        )}

        <HoloFigure
          appearance={appearance}
          dropIn={dropIn}
          x={playerWorld.x}
          z={playerWorld.z}
          yaw={facingYaw(room?.facing)}
        />
      </group>

      <Sparkles
        count={stage === "creation" ? 24 : 32}
        scale={[4 + span * 0.35, 2.5, 4 + span * 0.35]}
        size={1.8}
        speed={0.3}
        opacity={0.45}
        color={colors.glow}
      />
    </>
  );
}

export function HoloWorld({
  brief,
  appearance = DEFAULT_APPEARANCE,
  dropIn = false,
  showCaption = true,
}: {
  brief: HoloSceneBrief;
  appearance?: CharacterAppearance;
  dropIn?: boolean;
  /** Hide the bottom locale line (e.g. during character create). */
  showCaption?: boolean;
}) {
  const span = brief.room
    ? Math.max(brief.room.width, brief.room.height)
    : 3;
  const dist = 4.2 + (span - 3) * 0.55;
  const caption = brief.locale.trim();

  return (
    <section className="holo-pane" aria-label="Holographic world">
      <div className="holo-canvas">
        <Canvas camera={{ position: [dist, dist * 0.85, dist], fov: 36 }}>
          <HoloScene brief={brief} appearance={appearance} dropIn={dropIn} />
        </Canvas>
      </div>
      {showCaption && caption ? (
        <div className="holo-caption">{caption}</div>
      ) : null}
    </section>
  );
}

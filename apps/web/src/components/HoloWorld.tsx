import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import type { Group } from "three";
import type {
  CharacterAppearance,
  HoloSceneBrief,
  MapTile,
  RoomMap,
} from "@aetherpath/shared";
import { DEFAULT_APPEARANCE } from "@aetherpath/shared";

const TILE = 1;

function gridToWorld(room: RoomMap, x: number, y: number) {
  const size = room.tileSize || TILE;
  return {
    x: (x - room.player.x) * size,
    z: (y - room.player.y) * size,
  };
}

function FloorTile({
  x,
  z,
  color,
  opacity = 0.45,
  accent = false,
}: {
  x: number;
  z: number;
  color: string;
  opacity?: number;
  accent?: boolean;
}) {
  return (
    <mesh position={[x, -0.02, z]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
      <planeGeometry args={[0.98, 0.98]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={accent ? 0.45 : 0.28}
        transparent
        opacity={opacity}
        metalness={0.2}
        roughness={0.55}
        wireframe
      />
    </mesh>
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
    <mesh position={[x, 0.42, z]}>
      <boxGeometry args={[0.92, 0.85, 0.92]} />
      <meshStandardMaterial
        color={color}
        emissive={glow}
        emissiveIntensity={0.18}
        transparent
        opacity={0.72}
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
  const yaw =
    facing === "E" || facing === "W" ? Math.PI / 2 : 0;
  return (
    <group position={[x, 0, z]} rotation={[0, yaw, 0]}>
      {/* Frame posts */}
      <mesh position={[-0.32, 0.45, 0]}>
        <boxGeometry args={[0.12, 0.9, 0.18]} />
        <meshStandardMaterial
          color={color}
          emissive={glow}
          emissiveIntensity={0.4}
          wireframe
        />
      </mesh>
      <mesh position={[0.32, 0.45, 0]}>
        <boxGeometry args={[0.12, 0.9, 0.18]} />
        <meshStandardMaterial
          color={color}
          emissive={glow}
          emissiveIntensity={0.4}
          wireframe
        />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[0.76, 0.12, 0.18]} />
        <meshStandardMaterial
          color={glow}
          emissive={glow}
          emissiveIntensity={0.65}
          transparent
          opacity={0.85}
          wireframe
        />
      </mesh>
      {/* Threshold */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.7, 0.35]} />
        <meshStandardMaterial
          color={glow}
          emissive={glow}
          emissiveIntensity={0.5}
          transparent
          opacity={0.4}
          wireframe
        />
      </mesh>
    </group>
  );
}

function HoloFigure({
  appearance,
  dropIn,
  x = 0,
  z = 0,
}: {
  appearance: CharacterAppearance;
  dropIn: boolean;
  x?: number;
  z?: number;
}) {
  const group = useRef<Group>(null);
  const startY = dropIn ? 2.4 : 0;
  const settled = useRef(!dropIn);

  useEffect(() => {
    settled.current = !dropIn;
    if (group.current) {
      group.current.position.y = dropIn ? startY : 0;
    }
  }, [dropIn, appearance.glow, appearance.build, startY]);

  useFrame((state, delta) => {
    if (!group.current) return;
    if (!settled.current) {
      group.current.position.y = Math.max(0, group.current.position.y - delta * 2.8);
      if (group.current.position.y <= 0.02) {
        group.current.position.y = 0;
        settled.current = true;
      }
      return;
    }
    group.current.position.y = Math.sin(state.clock.elapsedTime * 1.6) * 0.04;
  });

  const dims =
    appearance.build === "sturdy"
      ? { torso: [0.34, 0.48, 0.22] as const, leg: 0.28, head: 0.16 }
      : appearance.build === "tall"
        ? { torso: [0.26, 0.62, 0.18] as const, leg: 0.36, head: 0.14 }
        : { torso: [0.28, 0.52, 0.18] as const, leg: 0.3, head: 0.15 };

  return (
    <group position={[x, 0, z]}>
      <group ref={group} position={[0, startY, 0]}>
        <mesh position={[0, dims.leg + dims.torso[1] / 2, 0]}>
          <boxGeometry args={[...dims.torso]} />
          <meshStandardMaterial
            color={appearance.primary}
            emissive={appearance.glow}
            emissiveIntensity={0.55}
            transparent
            opacity={0.82}
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
        <mesh position={[-0.1, dims.leg / 2, 0]}>
          <boxGeometry args={[0.1, dims.leg, 0.1]} />
          <meshStandardMaterial
            color={appearance.primary}
            emissive={appearance.glow}
            emissiveIntensity={0.3}
            wireframe
          />
        </mesh>
        <mesh position={[0.1, dims.leg / 2, 0]}>
          <boxGeometry args={[0.1, dims.leg, 0.1]} />
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
            <DoorTile
              key={`${tile.x}-${tile.y}-d`}
              x={x}
              z={z}
              color={colors.secondary}
              glow={colors.glow}
              facing={tile.facing}
            />
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

/** Fallback when no room map is attached (creation / legacy briefs). */
function SparseTiles({
  count,
  colors,
}: {
  count: number;
  colors: { secondary: string; glow: string };
}) {
  const tiles = useMemo(() => {
    if (count <= 1) return [{ x: 0, z: 0 }];
    const step = 1.05;
    const ring = [{ x: 0, z: 0 }];
    const dirs = [
      [step, 0],
      [-step, 0],
      [0, step],
      [0, -step],
      [step * 0.7, step * 0.7],
      [-step * 0.7, step * 0.7],
      [step * 0.7, -step * 0.7],
      [-step * 0.7, -step * 0.7],
    ];
    for (let i = 0; i < Math.min(count - 1, dirs.length); i++) {
      ring.push({ x: dirs[i]![0], z: dirs[i]![1] });
    }
    return ring;
  }, [count]);

  return (
    <>
      {tiles.map((t, i) => (
        <FloorTile
          key={`${t.x}-${t.z}-${i}`}
          x={t.x}
          z={t.z}
          color={i === 0 ? colors.glow : colors.secondary}
          opacity={i === 0 ? 0.55 : 0.28}
          accent={i === 0}
        />
      ))}
    </>
  );
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

  const propCount = stage === "scene" && !room ? Math.min(brief.props.length, 5) : 0;
  const camPull = room ? 1 + Math.max(room.width, room.height) * 0.08 : 1;

  return (
    <>
      <color attach="background" args={["#03080c"]} />
      <fog attach="fog" args={["#03080c", 7 * camPull, 16 * camPull]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[0, 2.4, 2]} intensity={1.4} color={colors.glow} />
      <pointLight position={[-2, -1, -2]} intensity={0.5} color={colors.secondary} />

      <Float
        speed={stage === "creation" ? 0.6 : 0.9}
        rotationIntensity={0.05}
        floatIntensity={stage === "creation" ? 0.15 : 0.22}
      >
        <group position={[0, 0.05, 0]}>
          {room ? (
            <RoomTiles room={room} colors={colors} />
          ) : (
            <SparseTiles
              count={brief.revealedTiles ?? 1}
              colors={colors}
            />
          )}

          <HoloFigure appearance={appearance} dropIn={dropIn} />

          {Array.from({ length: propCount }).map((_, i) => {
            const angle = (i / propCount) * Math.PI * 2;
            return (
              <mesh
                key={brief.props[i] ?? i}
                position={[
                  Math.cos(angle) * 1.55,
                  0.2 + (i % 2) * 0.2,
                  Math.sin(angle) * 1.55,
                ]}
              >
                <boxGeometry args={[0.18, 0.45 + (i % 3) * 0.12, 0.18]} />
                <meshStandardMaterial
                  color={colors.secondary}
                  emissive={colors.glow}
                  emissiveIntensity={0.2}
                  wireframe
                />
              </mesh>
            );
          })}
        </group>
      </Float>

      <Sparkles
        count={stage === "creation" ? 28 : 36}
        scale={[5 * camPull, 3, 5 * camPull]}
        size={2}
        speed={0.35}
        opacity={0.5}
        color={colors.glow}
      />
    </>
  );
}

export function HoloWorld({
  brief,
  appearance = DEFAULT_APPEARANCE,
  dropIn = false,
}: {
  brief: HoloSceneBrief;
  appearance?: CharacterAppearance;
  dropIn?: boolean;
}) {
  const span = brief.room
    ? Math.max(brief.room.width, brief.room.height)
    : 3;
  const dist = 3.1 + span * 0.35;

  return (
    <section className="holo-pane" aria-label="Holographic world">
      <div className="holo-canvas">
        <Canvas camera={{ position: [dist, dist * 0.95, dist], fov: 38 }}>
          <HoloScene brief={brief} appearance={appearance} dropIn={dropIn} />
        </Canvas>
      </div>
      <div className="holo-caption">
        {brief.locale}
        {brief.focal ? ` · ${brief.focal}` : ""}
      </div>
    </section>
  );
}

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import type { Group, Mesh } from "three";
import type { CharacterAppearance, HoloSceneBrief } from "@aetherpath/shared";
import { DEFAULT_APPEARANCE } from "@aetherpath/shared";

/** Isometric diamond footprint on XZ. */
function IsoTile({
  x = 0,
  z = 0,
  color,
  opacity = 0.45,
  scale = 1,
}: {
  x?: number;
  z?: number;
  color: string;
  opacity?: number;
  scale?: number;
}) {
  return (
    <mesh
      position={[x, -0.02, z]}
      rotation={[-Math.PI / 2, 0, Math.PI / 4]}
      scale={scale}
    >
      <planeGeometry args={[1.05, 1.05]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.35}
        transparent
        opacity={opacity}
        metalness={0.2}
        roughness={0.55}
        wireframe
      />
    </mesh>
  );
}

function HoloFigure({
  appearance,
  dropIn,
}: {
  appearance: CharacterAppearance;
  dropIn: boolean;
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
  );
}

function tileOffsets(count: number): Array<{ x: number; z: number }> {
  if (count <= 1) return [{ x: 0, z: 0 }];
  const step = 1.05;
  const ring: Array<{ x: number; z: number }> = [{ x: 0, z: 0 }];
  // axial-ish ring around center for isometric footprint
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
    ring.push({ x: dirs[i][0], z: dirs[i][1] });
  }
  return ring;
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
  const ring = useRef<Mesh>(null);
  const stage = brief.stage ?? "scene";
  const colors = useMemo(
    () => ({
      primary: brief.palette.primary,
      secondary: brief.palette.secondary,
      glow: appearance.glow || brief.palette.glow,
    }),
    [appearance.glow, brief.palette.glow, brief.palette.primary, brief.palette.secondary],
  );

  useFrame((_, delta) => {
    if (ring.current) {
      ring.current.rotation.z -= delta * 0.28;
    }
  });

  const tiles = tileOffsets(brief.revealedTiles ?? (stage === "creation" ? 1 : 1));
  const propCount = stage === "scene" ? Math.min(brief.props.length, 5) : 0;

  return (
    <>
      <color attach="background" args={["#03080c"]} />
      <fog attach="fog" args={["#03080c", 6, 14]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[0, 2.2, 2]} intensity={1.4} color={colors.glow} />
      <pointLight position={[-2, -1, -2]} intensity={0.5} color={colors.secondary} />

      <Float
        speed={stage === "creation" ? 0.6 : 1.1}
        rotationIntensity={0.08}
        floatIntensity={stage === "creation" ? 0.15 : 0.4}
      >
        <group position={[0, 0.05, 0]}>
          {tiles.map((t, i) => (
            <IsoTile
              key={`${t.x}-${t.z}-${i}`}
              x={t.x}
              z={t.z}
              color={i === 0 ? colors.glow : colors.secondary}
              opacity={i === 0 ? 0.55 : 0.28}
            />
          ))}

          <mesh ref={ring} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.35, 1.48, 64]} />
            <meshBasicMaterial color={colors.glow} transparent opacity={0.22} />
          </mesh>

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
        count={stage === "creation" ? 28 : 40}
        scale={[5, 3, 5]}
        size={2}
        speed={0.35}
        opacity={0.55}
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
  return (
    <section className="holo-pane" aria-label="Holographic world">
      <div className="holo-canvas">
        <Canvas camera={{ position: [3.2, 3.4, 3.2], fov: 38 }}>
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

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
import { useMemo, useRef } from "react";
import type { Group, Mesh } from "three";
import type { HoloSceneBrief } from "@aetherpath/shared";

function HoloScene({ brief }: { brief: HoloSceneBrief }) {
  const group = useRef<Group>(null);
  const ring = useRef<Mesh>(null);

  const colors = useMemo(
    () => ({
      primary: brief.palette.primary,
      secondary: brief.palette.secondary,
      glow: brief.palette.glow,
    }),
    [brief.palette.glow, brief.palette.primary, brief.palette.secondary],
  );

  useFrame((_, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.18;
    }
    if (ring.current) {
      ring.current.rotation.z -= delta * 0.35;
      ring.current.rotation.x += delta * 0.12;
    }
  });

  const propCount = Math.min(brief.props.length, 5);

  return (
    <>
      <color attach="background" args={["#03080c"]} />
      <fog attach="fog" args={["#03080c", 6, 14]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[0, 2.2, 2]} intensity={1.4} color={colors.glow} />
      <pointLight position={[-2, -1, -2]} intensity={0.5} color={colors.secondary} />

      <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.55}>
        <group ref={group} position={[0, 0.1, 0]}>
          <mesh position={[0, -0.85, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.55, 1.72, 64]} />
            <meshBasicMaterial color={colors.glow} transparent opacity={0.35} />
          </mesh>

          <mesh ref={ring} position={[0, 0, 0]}>
            <torusGeometry args={[1.15, 0.02, 12, 80]} />
            <meshStandardMaterial
              color={colors.glow}
              emissive={colors.glow}
              emissiveIntensity={0.8}
              metalness={0.2}
              roughness={0.35}
            />
          </mesh>

          <mesh position={[0, -0.2, 0]}>
            <cylinderGeometry args={[0.9, 1.15, 0.35, 6]} />
            <meshStandardMaterial
              color={colors.primary}
              emissive={colors.secondary}
              emissiveIntensity={0.25}
              metalness={0.45}
              roughness={0.4}
              wireframe
            />
          </mesh>

          <mesh position={[0, 0.55, 0]}>
            <octahedronGeometry args={[0.45, 0]} />
            <meshStandardMaterial
              color={colors.glow}
              emissive={colors.glow}
              emissiveIntensity={0.65}
              transparent
              opacity={0.75}
              wireframe
            />
          </mesh>

          {Array.from({ length: propCount }).map((_, i) => {
            const angle = (i / propCount) * Math.PI * 2;
            return (
              <mesh
                key={brief.props[i] ?? i}
                position={[Math.cos(angle) * 1.35, 0.15 + (i % 2) * 0.25, Math.sin(angle) * 1.35]}
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
        count={40}
        scale={[5, 3, 5]}
        size={2}
        speed={0.35}
        opacity={0.55}
        color={colors.glow}
      />
    </>
  );
}

export function HoloWorld({ brief }: { brief: HoloSceneBrief }) {
  return (
    <section className="holo-pane" aria-label="Holographic world">
      <div className="holo-canvas">
        <Canvas camera={{ position: [0, 1.2, 4.2], fov: 42 }}>
          <HoloScene brief={brief} />
        </Canvas>
      </div>
      <div className="holo-caption">
        {brief.locale}
        {brief.focal ? ` · ${brief.focal}` : ""}
      </div>
    </section>
  );
}

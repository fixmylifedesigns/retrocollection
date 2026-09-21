"use client";

import { ContactShadows, PresentationControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { Game } from "@/lib/library";
import { SYSTEMS, coverSources, extensionOf } from "@/lib/systems";
import { GameBoyCart, GbaCart, Ps2Case } from "./Media3D";
import { useCoverTexture } from "./useCoverTexture";

// Scale each kind of media so they appear at a similar size on stage.
const SCALE = { gb: 1, gba: 1.3, ps2: 0.38 } as const;

function Media({ game, launching, still }: { game: Game; launching: boolean; still: boolean }) {
  const system = SYSTEMS[game.system];
  const texture = useCoverTexture(coverSources(game), game.title, system.accent);
  const group = useRef<THREE.Group>(null);
  const born = useRef<number | null>(null);
  const launchedAt = useRef<number | null>(null);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    born.current ??= t;

    // Entrance: spin in from the side and grow.
    const enter = still ? 1 : Math.min(1, (t - born.current) / 0.7);
    const ease = 1 - Math.pow(1 - enter, 3);

    // Idle: a slow sway and float, like it's on a display stand.
    const sway = still ? 0 : Math.sin(t * 0.6) * 0.35;
    const float = still ? 0 : Math.sin(t * 1.2) * 0.08;

    g.rotation.y = (1 - ease) * -Math.PI * 0.9 + sway;
    g.scale.setScalar(SCALE[game.system] * (0.6 + 0.4 * ease));
    g.position.y = float;
    g.rotation.x = 0;

    // Launch: lift, square up, then drop into the (imaginary) slot.
    if (launching) {
      launchedAt.current ??= t;
      const p = Math.min(1, (t - launchedAt.current) / 0.55);
      const lift = p < 0.3 ? p / 0.3 : 1 - (p - 0.3) / 0.7;
      g.rotation.y *= 1 - p;
      g.rotation.x = -0.25 * p;
      g.position.y = lift * 0.8 - Math.pow(Math.max(0, (p - 0.3) / 0.7), 2) * 9;
    } else {
      launchedAt.current = null;
    }
  });

  const gbc = extensionOf(game.fileName) === ".gbc";
  return (
    <group ref={group}>
      {game.system === "gb" && <GameBoyCart texture={texture} color={gbc ? "#3c404b" : undefined} />}
      {game.system === "gba" && <GbaCart texture={texture} />}
      {game.system === "ps2" && <Ps2Case texture={texture} />}
    </group>
  );
}

export default function GameStage({ game, launching, still }: { game: Game; launching: boolean; still: boolean }) {
  return (
    <Canvas
      camera={{ position: [0, 0.6, 17], fov: 30 }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      shadows
      aria-label={`3D view of ${game.title}`}
    >
      <hemisphereLight args={["#ffffff", "#30334a", 0.9]} />
      <directionalLight position={[4, 6, 8]} intensity={1.6} castShadow />
      <directionalLight position={[-6, 2, -4]} intensity={0.6} color="#a5a8ff" />
      {/* rim light so dark cases still read against the black page */}
      <directionalLight position={[0, 4, -10]} intensity={1.4} color="#c7c9ff" />
      <PresentationControls snap polar={[-0.3, 0.3]} azimuth={[-0.9, 0.9]} speed={1.4}>
        {/* key remounts on game change so the entrance animation replays */}
        <Media key={game.id} game={game} launching={launching} still={still} />
      </PresentationControls>
      <ContactShadows position={[0, -4.2, 0]} opacity={0.45} scale={16} blur={2.6} far={6} />
    </Canvas>
  );
}

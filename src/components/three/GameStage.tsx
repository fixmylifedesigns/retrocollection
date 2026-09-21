"use client";

import { ContactShadows } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, Suspense, useRef, type ReactNode, type RefObject } from "react";
import * as THREE from "three";
import type { Game } from "@/lib/library";
import { SYSTEMS, coverSources, extensionOf } from "@/lib/systems";
import { GbaModelCart, GbcModelCart, type GbcShell } from "./CartridgeModels";
import { GameBoyCart, GbaCart, Ps2Case } from "./Media3D";
import { useCoverTexture } from "./useCoverTexture";

// Scale each kind of media so they appear at a similar size on stage.
const SCALE = { gb: 1, gba: 1.5, ps2: 0.38 } as const;

// Width of each item on stage (after SCALE), used to shrink items that don't fit a narrow slot.
const ITEM_WIDTH = { gb: 5.7, gba: 8.55, ps2: 5.13 } as const;

// Camera: 30° field of view from 17 units away shows 9.11 units top to bottom at z = 0.
const CAMERA_Z = 17;
const VISIBLE_HEIGHT = 2 * CAMERA_Z * Math.tan((15 * Math.PI) / 180);

function Media({ game, launching, still, hovered }: { game: Game; launching: boolean; still: boolean; hovered: boolean }) {
  const system = SYSTEMS[game.system];
  const texture = useCoverTexture(coverSources(game), game.title, system.accent);
  const group = useRef<THREE.Group>(null);
  const born = useRef<number | null>(null);
  const launchedAt = useRef<number | null>(null);
  const hover = useRef(0);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    born.current ??= t;

    // Entrance: spin in from the side and grow.
    const enter = still ? 1 : Math.min(1, (t - born.current) / 0.7);
    const ease = 1 - Math.pow(1 - enter, 3);

    // Idle: a slow sway and float, like it's on a display stand.
    // Hovering turns it to face you and lifts it a little.
    hover.current += ((hovered ? 1 : 0) - hover.current) * 0.12;
    const sway = still ? 0 : Math.sin(t * 0.6 + game.id.length) * 0.35 * (1 - hover.current);
    const float = still ? 0 : Math.sin(t * 1.2 + game.id.length) * 0.08;

    g.rotation.y = (1 - ease) * -Math.PI * 0.9 + sway;
    g.scale.setScalar(SCALE[game.system] * (0.6 + 0.4 * ease) * (1 + 0.06 * hover.current));
    g.position.y = float + 0.35 * hover.current;
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
  const shell: GbcShell = /yellow|pikachu/i.test(game.fileName) ? "yellow" : gbc ? "black" : "grey";
  // The simple shapes show while a model loads, and stay if it can't load.
  const simpleGb = <GameBoyCart texture={texture} color={gbc ? "#3c404b" : undefined} />;
  const simpleGba = <GbaCart texture={texture} />;
  return (
    <group ref={group}>
      {game.system === "gb" && (
        <ModelOr fallback={simpleGb}>
          <GbcModelCart texture={texture} shell={shell} size={6.5} />
        </ModelOr>
      )}
      {game.system === "gba" && (
        <ModelOr fallback={simpleGba}>
          <GbaModelCart texture={texture} size={5.7} />
        </ModelOr>
      )}
      {game.system === "ps2" && <Ps2Case texture={texture} />}
    </group>
  );
}

/** Renders a 3D model, or `fallback` while it loads or if it fails to load. */
function ModelOr({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  return (
    <ModelBoundary fallback={fallback}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </ModelBoundary>
  );
}

class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** One game in the rail, kept centred over its DOM slot as the row scrolls. */
function RailItem({
  game,
  slot,
  hovered,
  launching,
  still,
}: {
  game: Game;
  slot: () => HTMLElement | null;
  hovered: boolean;
  launching: boolean;
  still: boolean;
}) {
  const outer = useRef<THREE.Group>(null);
  const size = useThree((state) => state.size);
  const canvas = useThree((state) => state.gl.domElement);

  useFrame(() => {
    const el = slot();
    const g = outer.current;
    if (!el || !g) return;
    const area = canvas.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const pxToWorld = VISIBLE_HEIGHT / size.height;
    g.position.x = (r.left + r.width / 2 - area.left - area.width / 2) * pxToWorld;
    g.scale.setScalar(Math.min(1, (r.width * pxToWorld * 0.82) / ITEM_WIDTH[game.system]));
  });

  return (
    <group ref={outer}>
      <Media game={game} launching={launching} still={still} hovered={hovered} />
    </group>
  );
}

/**
 * The 3D row behind a system's scrollable rail. The rail stays a normal DOM
 * scroller (touch, trackpad, keyboard all work); each model follows its slot.
 */
export default function RailStage({
  games,
  slots,
  range,
  hovered,
  launchingId,
  still,
}: {
  games: Game[];
  slots: RefObject<(HTMLElement | null)[]>;
  range: [number, number];
  hovered: number | null;
  launchingId: string | null;
  still: boolean;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0.6, CAMERA_Z], fov: 30 }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      shadows
    >
      <hemisphereLight args={["#ffffff", "#30334a", 0.9]} />
      <directionalLight position={[4, 6, 8]} intensity={1.6} castShadow />
      <directionalLight position={[-6, 2, -4]} intensity={0.6} color="#a5a8ff" />
      {/* rim light so dark cartridges and cases still read against the black page */}
      <directionalLight position={[0, 4, -10]} intensity={1.4} color="#c7c9ff" />
      {games.slice(range[0], range[1] + 1).map((game, k) => {
        const i = range[0] + k;
        return (
          <RailItem
            key={game.id}
            game={game}
            slot={() => slots.current?.[i] ?? null}
            hovered={hovered === i}
            launching={launchingId === game.id}
            still={still}
          />
        );
      })}
      <ContactShadows position={[0, -3.7, 0]} opacity={0.4} scale={80} blur={2.6} far={4} />
    </Canvas>
  );
}

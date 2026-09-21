"use client";

import { RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { fitCover } from "./useCoverTexture";

/*
 * Procedural 3D media, in centimetres, built from simple shapes so there are
 * no model files to license or load. A GLB model can replace any of these
 * later without touching the stage.
 */

function extruded(shape: THREE.Shape, depth: number, bevel = 0.07) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: depth - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 12,
  });
  geometry.center();
  return geometry;
}

function Label({ texture, width, height, x = 0, y = 0, z }: {
  texture: THREE.Texture | null;
  width: number;
  height: number;
  x?: number;
  y?: number;
  z: number;
}) {
  useMemo(() => texture && fitCover(texture, width / height), [texture, width, height]);
  return (
    <mesh position={[x, y, z]}>
      <planeGeometry args={[width, height]} />
      {/* keyed so the shader recompiles when the texture arrives */}
      <meshStandardMaterial
        key={texture?.uuid ?? "none"}
        map={texture ?? undefined}
        color={texture ? "#ffffff" : "#44485a"}
        roughness={0.55}
      />
    </mesh>
  );
}

const PLASTIC = { roughness: 0.62, metalness: 0.02 };

/** Original Game Boy cartridge: 5.7 × 6.5 cm with the notched top-right corner. */
export function GameBoyCart({ texture, color = "#c9cbd2" }: { texture: THREE.Texture | null; color?: string }) {
  const w = 5.7, h = 6.5, d = 0.8, notch = 0.7;
  const geometry = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, -h / 2);
    s.lineTo(w / 2, -h / 2);
    s.lineTo(w / 2, h / 2 - notch);
    s.lineTo(w / 2 - notch, h / 2);
    s.lineTo(-w / 2, h / 2);
    s.closePath();
    return extruded(s, d);
  }, []);
  const front = d / 2 + 0.002;
  return (
    <group>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial color={color} {...PLASTIC} />
      </mesh>
      {/* grip ridges along the top */}
      {Array.from({ length: 15 }, (_, i) => (
        <mesh key={i} position={[-2.35 + i * 0.28, h / 2 - 0.42, d / 2 + 0.02]}>
          <boxGeometry args={[0.08, 0.36, 0.04]} />
          <meshStandardMaterial color={color} {...PLASTIC} />
        </mesh>
      ))}
      {/* recessed label area */}
      <mesh position={[-0.1, -0.45, front]}>
        <planeGeometry args={[4.75, 4.45]} />
        <meshStandardMaterial color="#b3b6bf" {...PLASTIC} />
      </mesh>
      <Label texture={texture} width={4.45} height={4.15} x={-0.1} y={-0.45} z={front + 0.002} />
    </group>
  );
}

/** Game Boy Advance cartridge: 5.7 × 3.5 cm, rounded, with a raised top edge. */
export function GbaCart({ texture, color = "#bfc2cb" }: { texture: THREE.Texture | null; color?: string }) {
  const w = 5.7, h = 3.5, d = 0.8, r = 0.35;
  const geometry = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + r, -h / 2);
    s.lineTo(w / 2 - r, -h / 2);
    s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r);
    s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    s.lineTo(-w / 2 + r, h / 2);
    s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r);
    s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return extruded(s, d);
  }, []);
  const front = d / 2 + 0.002;
  return (
    <group>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial color={color} {...PLASTIC} />
      </mesh>
      {/* raised grip along the top edge */}
      <mesh position={[0, h / 2 - 0.22, d / 2 + 0.04]}>
        <boxGeometry args={[w - 0.9, 0.26, 0.08]} />
        <meshStandardMaterial color={color} {...PLASTIC} />
      </mesh>
      <Label texture={texture} width={4.7} height={2.55} y={-0.28} z={front} />
    </group>
  );
}

/** PS2 DVD case: 13.5 × 19 × 1.4 cm, black plastic with the cover under a clear sleeve. */
export function Ps2Case({ texture }: { texture: THREE.Texture | null }) {
  const w = 13.5, h = 19, d = 1.4;
  const front = d / 2 + 0.002;
  return (
    <group>
      <RoundedBox args={[w, h, d]} radius={0.22} smoothness={4} castShadow>
        <meshStandardMaterial color="#262a36" roughness={0.4} metalness={0.05} />
      </RoundedBox>
      {/* Box art already includes the PS2 banner, so the cover fills the sleeve. */}
      <Label texture={texture} width={w - 1.1} height={h - 1.1} x={0.2} z={front} />
      {/* clear sleeve sheen over the cover */}
      <mesh position={[0.2, 0, front + 0.01]}>
        <planeGeometry args={[w - 0.9, h - 0.9]} />
        <meshPhysicalMaterial transparent opacity={0.12} roughness={0.08} clearcoat={1} color="#ffffff" />
      </mesh>
    </group>
  );
}

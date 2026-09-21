"use client";

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { fitCover } from "./useCoverTexture";

/*
 * Game Boy (Color) and Game Boy Advance cartridges from the fixmylife
 * GameLandingPage models (public/models). The label logic follows
 * GbcCartridge.jsx and GbaCartridge.jsx there, with the game's cover as the
 * label. Models are Draco-compressed; the decoder is served from /draco
 * (copied out of three.js at build time by scripts/copy-draco.mjs).
 */

export const GBC_MODEL = "/models/gbc-cartridges-transformed.glb";
export const GBA_MODEL = "/models/gba-cartridge-transformed.glb";
const DRACO = "/draco/";

/** Scales and centres an object so its largest side is `size` stage units. */
function useFitted(object: THREE.Object3D | null, size: number) {
  return useMemo(() => {
    if (!object) return { scale: 1, offset: new THREE.Vector3() };
    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    const dims = box.getSize(new THREE.Vector3());
    const scale = size / Math.max(dims.x, dims.y, dims.z);
    return { scale, offset: box.getCenter(new THREE.Vector3()).multiplyScalar(-1) };
  }, [object, size]);
}

// ---------------------------------------------------------------------------
// Game Boy / Game Boy Color

const GBC_SHELLS = {
  black: "GBA_Cartridge_Zelda_GBA_Zelda_MTL_0",
  yellow: "GBA_Cartridge_Yellow_GBA_Pokemon_MTL_0",
  grey: "GBA_Cartridge_Kirby_GBA_Kirby_MTL_0",
} as const;
export type GbcShell = keyof typeof GBC_SHELLS;

// Label calibration from GbcCartridge.jsx, relative to the shell's local geometry.
const GBC_LABEL = { width: 0.66, height: 0.67, x: -0.07, vertical: 0, front: 1 };

function GbcLabel({ texture, geometry }: { texture: THREE.Texture; geometry: THREE.BufferGeometry }) {
  const placement = useMemo(() => {
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const frontOffset = Math.max(size.x, size.z) * 0.002;
    return {
      width: size.x * GBC_LABEL.width,
      height: size.z * GBC_LABEL.height,
      x: center.x + size.x * GBC_LABEL.x,
      y: GBC_LABEL.front > 0 ? box.max.y + frontOffset : box.min.y - frontOffset,
      z: center.z + size.z * GBC_LABEL.vertical,
    };
  }, [geometry]);

  useEffect(() => {
    texture.flipY = false;
    texture.center.set(0.5, 0.5);
    texture.rotation = -Math.PI / 2; // counter the cartridge mesh orientation
    // The picture is turned a quarter, so crop to the label's upright shape.
    fitCover(texture, placement.width / placement.height);
    texture.needsUpdate = true;
  }, [texture, placement]);

  return (
    <mesh position={[placement.x, placement.y, placement.z]} rotation={[Math.PI / 2, 0, Math.PI]} renderOrder={10}>
      <planeGeometry args={[placement.height, placement.width]} />
      <meshBasicMaterial
        map={texture}
        toneMapped={false}
        side={THREE.DoubleSide}
        polygonOffset
        polygonOffsetFactor={-4}
        polygonOffsetUnits={-4}
      />
    </mesh>
  );
}

export function GbcModelCart({ texture, shell = "grey", size }: { texture: THREE.Texture | null; shell?: GbcShell; size: number }) {
  const { nodes } = useGLTF(GBC_MODEL, DRACO);
  const source = nodes[GBC_SHELLS[shell]] as THREE.Mesh | undefined;
  const cartridge = useMemo(() => source?.clone() ?? null, [source]);
  const { scale, offset } = useFitted(cartridge, size);
  if (!cartridge || !source) return null;
  return (
    // Front faces the camera after a quarter turn, as in GbcCartridgeViewer.jsx.
    <group rotation={[0, -Math.PI / 2, 0]}>
      <group scale={scale}>
        <group position={offset}>
          <primitive object={cartridge}>
            {texture && <GbcLabel key={texture.uuid} texture={texture} geometry={source.geometry} />}
          </primitive>
        </group>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Game Boy Advance

export function GbaModelCart({ texture, size }: { texture: THREE.Texture | null; size: number }) {
  const { scene } = useGLTF(GBA_MODEL, DRACO);
  const cartridge = useMemo(() => scene.clone(true), [scene]);
  const { scale, offset } = useFitted(cartridge, size);

  // Put the cover on the label mesh ("Object_6"), remapping its UVs to the whole image.
  useEffect(() => {
    const label = cartridge.getObjectByName("Object_6") as THREE.Mesh | undefined;
    if (!label?.isMesh || !texture) return;

    const geometry = label.geometry.clone();
    const uv = geometry.attributes.uv as THREE.BufferAttribute | undefined;
    if (uv) {
      let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
      for (let i = 0; i < uv.count; i++) {
        minU = Math.min(minU, uv.getX(i));
        maxU = Math.max(maxU, uv.getX(i));
        minV = Math.min(minV, uv.getY(i));
        maxV = Math.max(maxV, uv.getY(i));
      }
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, (uv.getX(i) - minU) / (maxU - minU || 1), (uv.getY(i) - minV) / (maxV - minV || 1));
      }
      uv.needsUpdate = true;
    }

    // Crop the cover to the label's shape (measured in the cartridge's own space).
    const box = new THREE.Box3().setFromObject(label);
    const dims = box.getSize(new THREE.Vector3());
    const sides = [dims.x, dims.y, dims.z].sort((a, b) => b - a);
    texture.flipY = true;
    fitCover(texture, sides[0] / sides[1]);
    texture.needsUpdate = true;

    const original = { geometry: label.geometry, material: label.material };
    const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
    label.geometry = geometry;
    label.material = material;
    return () => {
      label.geometry = original.geometry;
      label.material = original.material;
      geometry.dispose();
      material.dispose();
    };
  }, [cartridge, texture]);

  return (
    // The label faces +X in the model; a quarter turn brings it to the camera.
    <group rotation={[0, -Math.PI / 2, 0]}>
      <group scale={scale}>
        <primitive object={cartridge} position={offset} />
      </group>
    </group>
  );
}

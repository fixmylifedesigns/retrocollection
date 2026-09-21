"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";

/** Tries each cover URL (through /api/art so WebGL may use it) and falls back to a printed label. */
export function useCoverTexture(sources: string[], title: string, accent: string): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const key = sources.join("|");

  useEffect(() => {
    let cancelled = false;
    let loaded: THREE.Texture | null = null;
    const loader = new THREE.TextureLoader();

    (async () => {
      for (const src of sources) {
        try {
          loaded = await loader.loadAsync(`/api/art?u=${encodeURIComponent(src)}`);
          break;
        } catch {
          // try the next cover
        }
      }
      loaded ??= labelTexture(title, accent);
      loaded.colorSpace = THREE.SRGBColorSpace;
      loaded.anisotropy = 8;
      if (cancelled) loaded.dispose();
      else setTexture(loaded);
    })();

    return () => {
      cancelled = true;
      loaded?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, title, accent]);

  return texture;
}

/** A plain printed label: the title on the system's colour. */
function labelTexture(title: string, accent: string): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = "#fff";
  ctx.font = "600 48px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const words = title.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > 420 && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  lines.slice(0, 5).forEach((l, i, all) => ctx.fillText(l, 256, 256 + (i - (all.length - 1) / 2) * 58));
  return new THREE.CanvasTexture(canvas);
}

/** Crops a texture like CSS object-fit: cover for a plane of the given aspect (width / height). */
export function fitCover(texture: THREE.Texture, planeAspect: number) {
  const img = texture.image as { width: number; height: number } | undefined;
  if (!img?.width || !img?.height) return;
  const imgAspect = img.width / img.height;
  texture.repeat.set(1, 1);
  texture.offset.set(0, 0);
  if (imgAspect > planeAspect) {
    texture.repeat.x = planeAspect / imgAspect;
    texture.offset.x = (1 - texture.repeat.x) / 2;
  } else {
    texture.repeat.y = imgAspect / planeAspect;
    texture.offset.y = (1 - texture.repeat.y) / 2;
  }
  texture.needsUpdate = true;
}

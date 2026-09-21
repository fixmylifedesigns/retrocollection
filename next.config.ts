import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The emulator runs inside /emulator/index.html (an iframe). Controllers are
  // read through the Gamepad API, so the frame must be allowed to use it.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Permissions-Policy", value: "gamepad=(self)" }],
      },
      {
        // The PS2 player (Play!) runs on threads, which need SharedArrayBuffer,
        // which browsers only allow on cross-origin isolated pages.
        source: "/ps2/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;

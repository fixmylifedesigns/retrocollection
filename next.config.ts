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
    ];
  },
};

export default nextConfig;

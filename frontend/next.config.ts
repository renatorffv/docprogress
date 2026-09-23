import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy reverso: chamadas do browser para /api/* são repassadas ao backend no VPS
  // Evita o bloqueio de mixed-content (HTTPS frontend → HTTP backend)
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";
import { execSync } from "child_process";

function resolveBuildVersion(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (!sha || sha.length === 0) return "dev";

  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join(".");

  try {
    const count = execSync("git rev-list --count HEAD", {
      encoding: "utf-8",
      timeout: 5000,
    }).trim();
    if (count && /^\d+$/.test(count)) {
      return `v${date}-${count}`;
    }
  } catch {
    // git no disponible en este build, usar SHA corto como secuencia
  }

  return `v${date}-${sha.slice(0, 8)}`;
}

const appVersion = resolveBuildVersion();

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.12"],
  turbopack: {
    root: process.cwd(),
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
  async headers() {
    const securityHeaders = [
      {
        key: "Content-Security-Policy",
        value: "base-uri 'self'; frame-ancestors 'none'; form-action 'self' https://webpay3gint.transbank.cl https://webpay3g.transbank.cl; object-src 'none'",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

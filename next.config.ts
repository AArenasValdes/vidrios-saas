import type { NextConfig } from "next";
import { execSync } from "child_process";

type ResolveBuildVersionOptions = {
  env?: NodeJS.ProcessEnv;
  now?: Date;
  exec?: typeof execSync;
};

function formatBuildDate(now: Date) {
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join(".");
}

function normalizeShortSha(value: string | undefined) {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, 7);
}

export function resolveBuildVersion({
  env = process.env,
  now = new Date(),
  exec = execSync,
}: ResolveBuildVersionOptions = {}): string {
  const date = formatBuildDate(now);
  const vercelSha = normalizeShortSha(env.VERCEL_GIT_COMMIT_SHA);

  if (vercelSha) {
    return `v${date}-${vercelSha}`;
  }

  try {
    const localSha = exec("git rev-parse --short HEAD", {
      encoding: "utf-8",
      timeout: 5000,
    }).trim();
    const normalizedLocalSha = normalizeShortSha(localSha);

    return normalizedLocalSha ? `v${date}-${normalizedLocalSha}` : "dev";
  } catch {
    return "dev";
  }
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

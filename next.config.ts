import type { NextConfig } from "next";

const commitSha = process.env.VERCEL_GIT_COMMIT_SHA;
const appVersion =
  commitSha && commitSha.length > 0
    ? commitSha.slice(0, 12)
    : process.env.NEXT_PUBLIC_APP_VERSION || "dev";

const nextConfig: NextConfig = {
  // Permite probar el dev server desde el celular en la red local.
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

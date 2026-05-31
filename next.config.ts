import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite probar el dev server desde el celular en la red local.
  allowedDevOrigins: ["192.168.0.12"],
  turbopack: {
    root: process.cwd(),
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

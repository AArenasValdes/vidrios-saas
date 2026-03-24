import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite probar el dev server desde el celular en la red local.
  allowedDevOrigins: ["192.168.0.12"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vidrios SaaS",
    short_name: "Vidrios",
    description:
      "Cotizaciones rapidas para talleres de vidrio y aluminio, optimizado para celular.",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0f18",
    theme_color: "#0a0f18",
    lang: "es-CL",
    icons: [
      {
        src: "/brand/ventora-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/brand/ventora-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}


import { Geist, JetBrains_Mono, Lato, Space_Grotesk, Syne } from "next/font/google";

/** Fuente base de la app (layout raíz). */
export const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

/** Landing / planes / login / legal. */
export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

/** Tipografías del shell autenticado (antes vía CSS @import de Google Fonts). */
export const syne = Syne({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-syne",
  display: "swap",
});

export const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-lato",
  display: "swap",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

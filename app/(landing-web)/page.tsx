import nextDynamic from "next/dynamic";

import { LandingHeroServer } from "./landing-hero-server";
import { LandingNavClient } from "./landing-nav-client";
import s from "./landing.module.css";

// bundle-dynamic-imports: todo bajo el fold fuera del chunk crítico del hero RSC.
const LandingBelowFold = nextDynamic(
  () =>
    import("./landing-page-client").then((mod) => ({
      default: mod.LandingBelowFold,
    })),
  { ssr: true }
);

/** Landing cacheable: hero RSC + islas client. */
export const dynamic = "force-static";

export default function LandingPage() {
  return (
    <main className={s.page}>
      <LandingNavClient />
      <LandingHeroServer />
      <LandingBelowFold />
    </main>
  );
}

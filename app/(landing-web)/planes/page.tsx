import type { Metadata } from "next";
import { PricingPlans } from "@/features/billing/components/pricing-plans";
import { LandingNavClient } from "../landing-nav-client";
import s from "./page.module.css";

export const dynamic = "force-static";
export const metadata: Metadata = {
  title: "Planes Ventora | Cotizador para talleres",
  description: "Elige Ventora Cotización o Ventora Comercial y parte con 15 días gratis.",
};

export default function PlanesPage() {
  return (
    <main className={s.page}>
      <LandingNavClient />
      <div className={s.container}>
        <header className={s.hero}>
          <span className={s.kicker}>Planes Ventora</span>
          <h1 className={s.title}>Cotiza mejor. Elige el nivel que necesitas.</h1>
          <p className={s.subtitle}>Empieza gratis, trabaja desde cualquier dispositivo y escala cuando tu flujo comercial lo pida.</p>
        </header>
        <PricingPlans context="public" />
      </div>
    </main>
  );
}

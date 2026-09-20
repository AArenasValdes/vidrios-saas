"use client";

import Link from "next/link";
import { LuArrowLeft, LuArrowUpRight } from "react-icons/lu";

import {
  PremiumPageReveal,
  PremiumPageSection,
} from "@/components/motion/premium-page-reveal";
import { useOnboardingChecklist } from "@/features/onboarding/hooks/useOnboardingChecklist";
import { LeadChannels } from "@/features/solicitudes/components/lead-channels";

import s from "./page.module.css";

export default function LeadChannelsPage() {
  const onboarding = useOnboardingChecklist();

  return (
    <PremiumPageReveal className={s.root}>
      <PremiumPageSection className={s.desktopHeader} data-onboarding-target="canales-hero">
        <div className={s.desktopHeaderActions}>
          <Link href="/solicitudes" className={s.headerSecondary} prefetch={false}>
            <LuArrowLeft aria-hidden />
            Volver
          </Link>
          <Link
            href="/configuracion/pagina-venta"
            className={s.headerPrimary}
            prefetch={false}
          >
            <LuArrowUpRight aria-hidden />
            Editar página
          </Link>
        </div>
      </PremiumPageSection>

      <PremiumPageSection className={s.mobileHero} data-onboarding-target="canales-hero-mobile">
        <Link href="/solicitudes" className={s.mobileBack} prefetch={false}>
          <LuArrowLeft aria-hidden />
          Volver
        </Link>
        <h1 className={s.mobileTitle}>QR y opciones</h1>
        <p className={s.mobileText}>Usa tu página donde tus clientes te encuentren.</p>
      </PremiumPageSection>

      <LeadChannels
        onChannelDistributed={(input) =>
          onboarding.markChannelReady({
            completionSource: input.completionSource,
            metadataJson: input.metadataJson,
          })
        }
      />
    </PremiumPageReveal>
  );
}

"use client";

import Link from "next/link";
import { LuArrowLeft, LuArrowUpRight } from "react-icons/lu";

import {
  PremiumPageReveal,
  PremiumPageSection,
} from "@/components/motion/premium-page-reveal";
import { OnboardingGuide } from "@/features/onboarding/components/onboarding-guide";
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

      <PremiumPageSection className={s.mobileHero}>
        <div className={s.mobileHeroCopy}>
          <span className={s.mobileEyebrow}>Solicitudes</span>
          <h1 className={s.mobileTitle}>Comparte tu página por canal</h1>
          <p className={s.mobileText}>
            Copia el link correcto y sigue de dónde llegan las solicitudes.
          </p>
        </div>

        <div className={s.mobileHeroActions}>
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

      <OnboardingGuide controller={onboarding} routeKey="canales" />

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

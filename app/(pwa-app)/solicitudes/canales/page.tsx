"use client";

import Link from "next/link";
import { LuArrowLeft, LuArrowUpRight } from "react-icons/lu";

import {
  PremiumPageReveal,
  PremiumPageSection,
} from "@/components/motion/premium-page-reveal";
import { OnboardingChecklistCard } from "@/features/onboarding/components/onboarding-checklist-card";
import { useOnboardingChecklist } from "@/features/onboarding/hooks/useOnboardingChecklist";
import { LeadChannels } from "@/features/solicitudes/components/lead-channels";

import s from "./page.module.css";

export default function LeadChannelsPage() {
  const onboarding = useOnboardingChecklist();

  return (
    <PremiumPageReveal className={s.root}>
      <PremiumPageSection className={s.heroCard}>
        <div className={s.heroCopy}>
          <span className={s.heroEyebrow}>Área operativa / Solicitudes</span>
          <h1 className={s.heroTitle}>Comparte tu página y recibe solicitudes por el canal correcto</h1>
          <p className={s.heroText}>
            Elige dónde la vas a publicar y copia lo que necesitas sin enredos.
          </p>
        </div>

        <div className={s.heroActions}>
          <Link href="/solicitudes" className={s.heroActionSecondary} prefetch={false}>
            <LuArrowLeft aria-hidden />
            Volver
          </Link>
          <Link
            href="/configuracion/empresa"
            className={s.heroActionSecondary}
            prefetch={false}
          >
            <LuArrowUpRight aria-hidden />
            Editar página
          </Link>
        </div>
      </PremiumPageSection>

      {onboarding.isVisible || onboarding.isLoading || onboarding.error ? (
        <PremiumPageSection>
          <OnboardingChecklistCard controller={onboarding} variant="compact" />
        </PremiumPageSection>
      ) : null}

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

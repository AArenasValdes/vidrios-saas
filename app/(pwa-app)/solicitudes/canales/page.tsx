"use client";

import Link from "next/link";
import { LuArrowLeft, LuArrowUpRight, LuQrCode } from "react-icons/lu";

import {
  PremiumPageReveal,
  PremiumPageSection,
} from "@/components/motion/premium-page-reveal";
import { LeadChannels } from "@/features/solicitudes/components/lead-channels";

import s from "./page.module.css";

export default function LeadChannelsPage() {
  return (
    <PremiumPageReveal className={s.root}>
      <PremiumPageSection className={s.heroCard}>
        <div className={s.heroShell}>
          <div className={s.heroCopy}>
            <span className={s.heroEyebrow}>Canales de captacion</span>
            <h1 className={s.heroTitle}>Links y QR listos para traer leads</h1>
            <p className={s.heroText}>
              Comparte enlaces por canal, imprime tu QR y rastrea de donde llega
              cada solicitud sin perder el hilo comercial.
            </p>
          </div>

          <div className={s.heroMetrics}>
            <div className={s.metricCard}>
              <span className={s.metricLabel}>Origen trazable</span>
              <strong>UTM listo</strong>
              <p>Instagram, Facebook, WhatsApp, QR y link directo.</p>
            </div>
            <div className={s.metricCard}>
              <span className={s.metricLabel}>Uso real</span>
              <strong>QR para calle</strong>
              <p>Tarjetas, camionetas, vitrinas, letreros y bio de redes.</p>
            </div>
          </div>
        </div>

        <div className={s.heroActions}>
          <Link href="/solicitudes" className={s.heroActionSecondary} prefetch={false}>
            <LuArrowLeft aria-hidden />
            Volver a solicitudes
          </Link>
          <Link
            href="/configuracion/empresa"
            className={s.heroActionSecondary}
            prefetch={false}
          >
            <LuArrowUpRight aria-hidden />
            Editar pagina publica
          </Link>
        </div>
      </PremiumPageSection>

      <PremiumPageSection className={s.tipCard}>
        <div className={s.tipIcon}>
          <LuQrCode aria-hidden />
        </div>
        <div className={s.tipCopy}>
          <strong>Visible dentro de Ventora</strong>
          <p>
            Esta vista ya no depende de URL manual. Queda accesible desde
            <b> Solicitudes</b> y <b>Empresa</b>. No la deje anonima porque expone
            enlaces internos de captacion del negocio.
          </p>
        </div>
      </PremiumPageSection>

      <LeadChannels />
    </PremiumPageReveal>
  );
}

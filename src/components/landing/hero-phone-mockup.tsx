"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

import s from "./hero-phone-mockup.module.css";

const HERO_QUOTE_SCREENSHOT = "/ventora-landing-page/capturalanding-pdf.png";

export function HeroPhoneMockup() {
  return (
    <div className={s.stage}>
      <div className={s.phone}>
        <div className={s.screenShell}>
          <div className={s.screenCrop}>
            <Image
              src={HERO_QUOTE_SCREENSHOT}
              alt="Presupuesto profesional de vidrios y aluminio con logo, planos, items y total"
              fill
              className={s.screenImage}
              priority
              unoptimized
              sizes="(max-width: 640px) 420px, 480px"
            />
          </div>
        </div>
      </div>

      <div className={s.whatsappBar}>
        <span className={s.whatsappBarPulse} />
        <span className={s.whatsappIcon} aria-hidden>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 2C6.486 2 2 6.486 2 12c0 1.77.46 3.43 1.268 4.87L2 22l5.29-1.24A9.96 9.96 0 0 0 12 22c5.514 0 10-4.486 10-10S17.514 2 12 2zm0 18.182a8.16 8.16 0 0 1-4.16-1.14l-.3-.178-3.14.735.82-3.06-.196-.312A8.18 8.18 0 0 1 3.818 12c0-4.515 3.667-8.182 8.182-8.182S20.182 7.485 20.182 12 16.515 20.182 12 20.182z" />
          </svg>
        </span>
        <span>Enviar por WhatsApp</span>
        <span className={s.sendArrow}>
          <ArrowUpRight size={15} strokeWidth={2.4} />
        </span>
      </div>
    </div>
  );
}

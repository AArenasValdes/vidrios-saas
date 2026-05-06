"use client";

import { LeadChannels } from "@/features/solicitudes/components/lead-channels";
import s from "./page.module.css";

export default function LeadChannelsPage() {
  return (
    <div className={s.root}>
      <header className={s.header}>
        <h1 className={s.title}>Captación de clientes</h1>
        <p className={s.subtitle}>
          Genera links y QR para capturar solicitudes desde diferentes canales.
        </p>
      </header>
      <LeadChannels />
    </div>
  );
}

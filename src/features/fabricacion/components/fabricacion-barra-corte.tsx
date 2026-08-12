"use client";

import type { FabricacionBarraPauta } from "@/features/fabricacion/types/fabricacion-snapshot";

import s from "./fabricacion-workspace.module.css";

type Props = {
  bar: FabricacionBarraPauta;
  tirasCount?: number;
  animate?: boolean;
  index?: number;
};

function formatMm(value: number) {
  return value.toLocaleString("es-CL");
}

/**
 * Representación visual premium de una tira comercial y sus cortes.
 * Solo presentación: no calcula pauta.
 */
export function FabricacionBarraCorte({
  bar,
  tirasCount,
  animate = true,
  index = 0,
}: Props) {
  const usable =
    Math.max(1, bar.largoComercialMm - Math.max(0, bar.despunteInicialMm));
  const segments = [
    ...bar.cortes.map((cut, cutIndex) => ({
      key: `${cut.componenteId}-${cutIndex}`,
      mm: cut.largoMm,
      kind: "cut" as const,
      label: formatMm(cut.largoMm),
      title: `${cut.funcion || "Corte"}: ${formatMm(cut.largoMm)} mm`,
    })),
    ...(bar.sobranteMm > 0
      ? [
          {
            key: `waste-${bar.indice}`,
            mm: bar.sobranteMm,
            kind: "waste" as const,
            label: `sobrante ${formatMm(bar.sobranteMm)}`,
            title: `Sobrante: ${formatMm(bar.sobranteMm)} mm`,
          },
        ]
      : []),
  ];

  const label = bar.nombrePerfil.trim() || bar.codigoPerfil || "Perfil";

  return (
    <article
      className={s.fabCutBar}
      data-animate={animate ? "true" : "false"}
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <header className={s.fabCutBarHeader}>
        <strong>
          {label}
          {" · "}
          Tira {bar.indice}
          {tirasCount && tirasCount > 1 ? ` de ${tirasCount}` : ""}
          {" · "}
          {formatMm(bar.largoComercialMm)} mm
        </strong>
        {(bar.despunteInicialMm > 0 || bar.perdidaCortesMm > 0) && (
          <span>
            {bar.despunteInicialMm > 0
              ? `Despunte ${formatMm(bar.despunteInicialMm)} mm`
              : ""}
            {bar.despunteInicialMm > 0 && bar.perdidaCortesMm > 0 ? " · " : ""}
            {bar.perdidaCortesMm > 0
              ? `Kerf ${formatMm(bar.perdidaCortesMm)} mm`
              : ""}
          </span>
        )}
      </header>
      <div
        className={s.fabCutTrack}
        role="img"
        aria-label={`Tira ${bar.indice} de ${label}: ${bar.cortes.length} cortes, sobrante ${formatMm(bar.sobranteMm)} mm`}
      >
        {segments.map((segment) => (
          <span
            key={segment.key}
            className={s.fabCutSegment}
            data-kind={segment.kind}
            style={{ flexGrow: Math.max(segment.mm / usable, 0.04) }}
            title={segment.title}
          >
            <em>{segment.label}</em>
          </span>
        ))}
      </div>
    </article>
  );
}

type GroupProps = {
  label: string;
  tiras: number;
  largoComercialMm: number;
  barras: FabricacionBarraPauta[];
  startIndex?: number;
};

export function FabricacionPerfilTirasVisual({
  label,
  tiras,
  largoComercialMm,
  barras,
  startIndex = 0,
}: GroupProps) {
  return (
    <section className={s.fabPerfilTirasBlock}>
      <header className={s.fabPerfilTirasHeader}>
        <strong>{label}</strong>
        <em>
          {tiras} {tiras === 1 ? "tira" : "tiras"} de{" "}
          {(largoComercialMm / 1000).toLocaleString("es-CL", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{" "}
          m
        </em>
      </header>
      <div className={s.fabPerfilTirasBars}>
        {barras.map((bar, index) => (
          <FabricacionBarraCorte
            key={`${bar.codigoPerfil}-${bar.indice}`}
            bar={bar}
            tirasCount={tiras}
            index={startIndex + index}
          />
        ))}
      </div>
    </section>
  );
}

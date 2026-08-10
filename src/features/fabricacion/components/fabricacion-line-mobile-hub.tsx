"use client";

import Link from "next/link";
import {
  CheckCircle2,
  ChevronLeft,
  Monitor,
  Pencil,
} from "lucide-react";

import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { formatLineTemplatePriceLabel } from "@/features/cotizaciones/line-templates/utils/catalog-labels";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import { formatCurrency } from "@/utils/formatCurrency";

import s from "./fabricacion-line-mobile-hub.module.css";

const STATUS_LABELS = {
  draft: "Borrador",
  testing: "En prueba",
  validated: "Validada",
  review_required: "Requiere revisión",
  archived: "Archivada",
} as const;

type Props = {
  template: CotizacionLineTemplate;
  currentRecipe: FabricationRecipeRecord | null;
  olderRecipes: FabricationRecipeRecord[];
  error: string | null;
};

function summarizeRecipe(recipe: FabricationRecipeRecord) {
  const perfiles = recipe.definition.perfiles.length;
  const vidrios = recipe.definition.vidrios.length;
  const accesorios = recipe.definition.accesorios.length;
  const tipología = recipe.definition.identidad.tipologia.replaceAll("_", " ");
  const hojas = recipe.definition.identidad.hojas;

  return {
    perfiles,
    vidrios,
    accesorios,
    tipología,
    hojas,
    nombre: recipe.definition.identidad.nombre,
    version: recipe.version,
    status: recipe.status,
  };
}

export function FabricacionLineMobileHub({
  template,
  currentRecipe,
  olderRecipes,
  error,
}: Props) {
  const summary = currentRecipe ? summarizeRecipe(currentRecipe) : null;

  return (
    <main className={s.page}>
      <header className={s.header}>
        <Link
          href="/configuracion/empresa/lineas-precios"
          className={s.backButton}
          aria-label="Volver a líneas y precios"
        >
          <ChevronLeft aria-hidden />
        </Link>
        <div>
          <h1>{template.nombre}</h1>
          <p>Resumen de la línea</p>
        </div>
      </header>

      {error ? <div className={s.errorBand}>{error}</div> : null}

      <aside className={s.desktopNotice} role="note">
        <span className={s.desktopNoticeIcon} aria-hidden>
          <Monitor />
        </span>
        <div>
          <strong>Configura en el computador</strong>
          <p>
            Cubicación, pauta de corte y despiece se arman en desktop. Aquí solo
            ves el estado de lo ya configurado.
          </p>
        </div>
      </aside>

      <section className={s.commercialSection} aria-labelledby="commercial-title">
        <div className={s.sectionHeading}>
          <h2 id="commercial-title">Información comercial</h2>
          <span>{template.isActive ? "Activa" : "En pausa"}</span>
        </div>
        <div className={s.priceRow}>
          <div>
            <strong>
              {formatLineTemplatePriceLabel(
                template.unidadCobro,
                template.precioM2Sugerido,
                formatCurrency
              )}
            </strong>
            <small>
              Mínimo{" "}
              {template.minimoCobrable > 0
                ? formatCurrency(template.minimoCobrable)
                : "sin definir"}
            </small>
          </div>
          <Link
            href={`/configuracion/empresa/lineas-precios?editar=${template.id}`}
            className={s.editCommercialButton}
          >
            <Pencil aria-hidden />
            Precio
          </Link>
        </div>
      </section>

      <section className={s.fabricationSection} aria-labelledby="fabrication-title">
        <div className={s.fabricationHeading}>
          <div>
            <h2 id="fabrication-title">Fabricación</h2>
            <p>Solo lectura · se configura en desktop</p>
          </div>
        </div>

        {!summary ? (
          <div className={s.emptyRecipe}>
            <div className={s.emptyIcon}>
              <Monitor aria-hidden />
            </div>
            <div>
              <strong>Aún sin receta de fabricación</strong>
              <p>
                Puedes cotizar esta línea. Para cubicación y despiece, prepara la
                receta desde el computador.
              </p>
            </div>
          </div>
        ) : (
          <article className={s.currentRecipe} data-status={summary.status}>
            <div className={s.recipeTop}>
              <div>
                <span>{STATUS_LABELS[summary.status]}</span>
                <h3>{summary.nombre}</h3>
                <p>
                  Versión {summary.version}
                  {summary.status === "validated" ? " · lista para cotizar despiece" : ""}
                </p>
              </div>
              {summary.status === "validated" ? (
                <CheckCircle2 className={s.validatedMark} aria-hidden />
              ) : null}
            </div>

            <dl className={s.progressList}>
              <div>
                <dt>Tipología</dt>
                <dd>
                  {summary.tipología}
                  {summary.hojas ? ` · ${summary.hojas} hojas` : ""}
                </dd>
              </div>
              <div>
                <dt>Perfiles</dt>
                <dd>
                  {summary.perfiles > 0
                    ? `${summary.perfiles} en despiece`
                    : "Pendientes"}
                </dd>
              </div>
              <div>
                <dt>Vidrio</dt>
                <dd>
                  {summary.vidrios > 0
                    ? `${summary.vidrios} preliminar`
                    : "Pendiente"}
                </dd>
              </div>
              <div>
                <dt>Accesorios</dt>
                <dd>
                  {summary.accesorios > 0
                    ? `${summary.accesorios} preliminar`
                    : "Pendiente"}
                </dd>
              </div>
            </dl>

            <p className={s.readOnlyHint}>
              Para editar receta, probar medidas o activar, ábrela en el
              computador.
            </p>
          </article>
        )}
      </section>

      {olderRecipes.length > 0 ? (
        <details className={s.history}>
          <summary>
            Versiones anteriores
            <span>{olderRecipes.length}</span>
          </summary>
          <div className={s.historyList}>
            {olderRecipes.map((recipe) => (
              <article key={recipe.id}>
                <div>
                  <strong>Versión {recipe.version}</strong>
                  <span>{STATUS_LABELS[recipe.status]}</span>
                </div>
              </article>
            ))}
          </div>
        </details>
      ) : null}
    </main>
  );
}

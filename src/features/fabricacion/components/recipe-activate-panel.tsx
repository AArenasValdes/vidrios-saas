"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Calculator,
  CheckCircle2,
  Eye,
  Grid3X3,
  Layers3,
  Lightbulb,
  Package,
  PanelTop,
  Pencil,
  Ruler,
  ShieldCheck,
  Sparkles,
  Tag,
  Rocket,
} from "lucide-react";

import type { CotizacionLineTemplateMaterial } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type {
  FabricacionEntradaCalculo,
  FabricacionReceta,
  FabricacionTipologia,
} from "@/features/fabricacion/types/fabricacion-domain";
import type { FabricationRecipeTestRecord } from "@/features/fabricacion/types/fabricacion-persistence";

import s from "./fabricacion-workspace.module.css";

type Props = {
  recipe: FabricacionReceta;
  providerName: string;
  lineName: string;
  material: CotizacionLineTemplateMaterial;
  tests: FabricationRecipeTestRecord[];
  canActivate: boolean;
  isActivated?: boolean;
  isSaving: boolean;
  onEditRecipe: () => void;
  onBackToRecipe: () => void;
  onActivate: () => void;
};

function formatTypologyLabel(tipologia: FabricacionTipologia) {
  const labels: Record<FabricacionTipologia, string> = {
    pano_fijo: "Paño fijo",
    corredera: "Corredera",
    abatible: "Abatible",
    proyectante: "Proyectante",
    puerta_abatible: "Puerta abatible",
    puerta_corredera: "Puerta corredera",
    shower: "Shower",
    personalizada: "Personalizada",
  };
  return labels[tipologia] ?? tipologia.replaceAll("_", " ");
}

function formatVariant(value: string | null | undefined) {
  if (!value?.trim()) return "Estándar";
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function leafCompositionLabel(recipe: FabricacionReceta) {
  const typology = formatTypologyLabel(recipe.identidad.tipologia);
  const hojas = recipe.identidad.hojas;
  if (recipe.identidad.tipologia === "pano_fijo") {
    return hojas === 1 ? "Paño fijo" : `${hojas} paños fijos`;
  }
  if (
    recipe.identidad.tipologia === "puerta_abatible" ||
    recipe.identidad.tipologia === "puerta_corredera"
  ) {
    return hojas === 1 ? `${typology} de 1 hoja` : `${typology} de ${hojas} hojas`;
  }
  return hojas === 1 ? `${typology} de 1 hoja` : `${typology} de ${hojas} hojas`;
}

function leafSectionTitle(tipologia: FabricacionTipologia) {
  if (tipologia === "pano_fijo") return "Paños configurados";
  if (tipologia === "shower") return "Paneles configurados";
  return "Hojas configuradas";
}

function profileHasWorkshopIdentity(
  profile: FabricacionReceta["perfiles"][number]
): boolean {
  return Boolean(
    profile.funcion.trim() ||
      profile.nombrePerfil.trim() ||
      profile.codigoPerfil.trim()
  );
}

export function buildRecipeActivateChecklist(
  recipe: FabricacionReceta,
  tests: FabricationRecipeTestRecord[]
) {
  const requiredTests = tests.filter((test) => test.isRequired !== false);
  const requiredProfilesOk =
    recipe.perfiles.length > 0 &&
    recipe.perfiles.every(
      (profile) => !profile.requerido || profileHasWorkshopIdentity(profile)
    );
  const basicRulesOk =
    requiredProfilesOk &&
    recipe.perfiles.every((profile) => {
      if (!profile.requerido) return true;
      return Boolean(profile.reglaMedida.base);
    });
  const testsOk =
    requiredTests.length > 0 && requiredTests.every((test) => test.passed);

  return [
    {
      label: "La línea tiene un nombre y tipología definidos",
      done: Boolean(recipe.identidad.nombre.trim() && recipe.identidad.tipologia),
    },
    {
      label: "Los perfiles obligatorios están identificados",
      done: requiredProfilesOk,
    },
    {
      label: "Se definieron las medidas base de cada función",
      done: basicRulesOk,
    },
    {
      label: "La receta se calculó correctamente",
      done: testsOk,
    },
    {
      label: "No hay errores críticos",
      done: requiredProfilesOk && basicRulesOk && testsOk,
    },
  ];
}

export function isRecipeReadyToActivate(
  recipe: FabricacionReceta,
  tests: FabricationRecipeTestRecord[]
) {
  return buildRecipeActivateChecklist(recipe, tests).every((item) => item.done);
}

function pickReferenceInput(
  tests: FabricationRecipeTestRecord[],
  recipe: FabricacionReceta
): FabricacionEntradaCalculo {
  const preferred =
    tests.find((test) => test.isRequired !== false && test.passed) ??
    tests.find((test) => test.passed) ??
    tests[0];
  if (preferred) return preferred.input;
  return {
    anchoTotalMm: 1200,
    altoTotalMm: 1000,
    cantidad: 1,
    hojas: recipe.identidad.hojas,
    modulos: recipe.identidad.modulos,
    variante: recipe.identidad.variante,
  };
}

function formatMm(value: number) {
  return `${value.toLocaleString("es-CL")} mm`;
}

export function RecipeActivatePanel({
  recipe,
  providerName,
  lineName,
  material,
  tests,
  canActivate,
  isActivated = false,
  isSaving,
  onEditRecipe,
  onBackToRecipe,
  onActivate,
}: Props) {
  const [showFullSummary, setShowFullSummary] = useState(false);
  const readyTitle = isActivated
    ? "Receta activa"
    : canActivate
      ? "¡Todo listo para activar!"
      : "Todavía faltan validaciones";
  const readyCopy = isActivated
    ? "Esta tipología ya está disponible para nuevas cotizaciones. Puedes revisar el resumen o volver a editarla si necesitas ajustar algo."
    : canActivate
      ? "Tu receta pasó las validaciones básicas y está lista para usarse. Siempre podrás editarla o desactivarla cuando lo necesites."
      : "Completa perfiles, largos comerciales y una prueba obligatoria antes de activar esta tipología.";
  const activateLabel = isActivated ? "Receta activada" : "Activar receta";
  const checklist = useMemo(
    () => buildRecipeActivateChecklist(recipe, tests),
    [recipe, tests]
  );
  const referenceInput = useMemo(
    () => pickReferenceInput(tests, recipe),
    [tests, recipe]
  );
  const typologyLabel = formatTypologyLabel(recipe.identidad.tipologia);
  const compositionLabel = leafCompositionLabel(recipe);
  const areaM2 =
    (referenceInput.anchoTotalMm * referenceInput.altoTotalMm) / 1_000_000;
  const functionsCount = recipe.perfiles.filter((profile) =>
    Boolean(profile.funcion.trim())
  ).length;
  const rulesCount = checklist.filter((item) => item.done).length;
  const materialsCount =
    recipe.perfiles.filter((profile) => (profile.reglaMedida.ajusteMm ?? 0) !== 0)
      .length + recipe.vidrios.length;

  const includeCards = [
    {
      icon: Calculator,
      title: "Funciones calculadas",
      detail: "Medidas y cantidades por componente",
      value: functionsCount,
    },
    {
      icon: Grid3X3,
      title: "Perfiles y componentes",
      detail: "Marco, hojas y piezas de la receta",
      value: recipe.perfiles.length,
    },
    {
      icon: ShieldCheck,
      title: "Reglas y validaciones",
      detail: "Controles listos antes de activar",
      value: rulesCount,
    },
    {
      icon: Tag,
      title: "Materiales y descuentos",
      detail: "Ajustes, vidrios y complementos",
      value: Math.max(materialsCount, recipe.accesorios.length),
    },
  ];

  if (showFullSummary) {
    return (
      <section className={s.activatePanel} data-view="summary">
        <header className={s.activatePanelHeader}>
          <div>
            <h2>3. Resumen completo de la receta</h2>
            <p>Revisa todos los detalles antes de activar esta tipología para cotizar.</p>
          </div>
          <button type="button" className={s.secondaryButton} onClick={onEditRecipe}>
            <Pencil size={15} />
            Editar receta
          </button>
        </header>

        <div className={s.activateOverviewGrid}>
          <article>
            <span><Ruler size={18} aria-hidden="true" /></span>
            <strong>Dimensiones base</strong>
            <p>
              {formatMm(referenceInput.anchoTotalMm)} (Ancho) ×{" "}
              {formatMm(referenceInput.altoTotalMm)} (Alto)
            </p>
            <small>{areaM2.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²</small>
          </article>
          <article>
            <span><Layers3 size={18} aria-hidden="true" /></span>
            <strong>Material principal</strong>
            <p>{material}</p>
            <small>
              Tipología {typologyLabel} · Línea {lineName || "Sin línea"}
            </small>
          </article>
          <article>
            <span><PanelTop size={18} aria-hidden="true" /></span>
            <strong>{leafSectionTitle(recipe.identidad.tipologia)}</strong>
            <p>{recipe.identidad.hojas}</p>
            <small>
              {compositionLabel} · Variante {formatVariant(recipe.identidad.variante)}
            </small>
          </article>
          <article>
            <span><Package size={18} aria-hidden="true" /></span>
            <strong>Total de perfiles</strong>
            <p>{recipe.perfiles.length}</p>
            <small>
              Perfiles del marco: {recipe.perfiles.length} · Accesorios:{" "}
              {recipe.accesorios.length}
            </small>
          </article>
        </div>

        <div className={s.activateDetailGrid}>
          <section className={s.activateDetailCard}>
            <header>
              <h3>Perfiles del marco ({recipe.perfiles.length})</h3>
            </header>
            {recipe.perfiles.length === 0 ? (
              <p className={s.activateEmpty}>Sin perfiles en esta receta.</p>
            ) : (
              <div className={s.activateMiniTable}>
                <div>
                  <span>Perfil</span>
                  <span>Función</span>
                  <span>Cantidad</span>
                  <span>Largo comercial</span>
                </div>
                {recipe.perfiles.slice(0, 6).map((profile) => (
                  <div key={profile.id}>
                    <strong>
                      {profile.nombrePerfil.trim() ||
                        profile.codigoPerfil.trim() ||
                        "Sin perfil"}
                    </strong>
                    <span>{profile.funcion || "Sin función"}</span>
                    <span>{profile.reglaCantidad.cantidad}</span>
                    <span>
                      {profile.largoComercialMm
                        ? formatMm(profile.largoComercialMm)
                        : "Por confirmar"}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {recipe.perfiles.length > 6 ? (
              <button type="button" className={s.activateLinkButton} onClick={onEditRecipe}>
                Ver todos los detalles ({recipe.perfiles.length})
              </button>
            ) : null}
          </section>

          <section className={s.activateDetailCard}>
            <header>
              <h3>Vidrios ({recipe.vidrios.length})</h3>
            </header>
            {recipe.vidrios.length === 0 ? (
              <p className={s.activateEmpty}>Sin vidrios configurados.</p>
            ) : (
              <div className={s.activateMiniTable} data-cols="3">
                <div>
                  <span>Vidrio</span>
                  <span>Descripción</span>
                  <span>Cantidad</span>
                </div>
                {recipe.vidrios.map((glass) => (
                  <div key={glass.id}>
                    <strong>{glass.nombre || "Vidrio"}</strong>
                    <span>Paño de vidrio</span>
                    <span>{glass.reglaCantidad.cantidad}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={s.activateDetailCard}>
            <header>
              <h3>Accesorios ({recipe.accesorios.length})</h3>
            </header>
            {recipe.accesorios.length === 0 ? (
              <p className={s.activateEmpty}>Sin accesorios configurados.</p>
            ) : (
              <div className={s.activateMiniTable} data-cols="3">
                <div>
                  <span>Accesorio</span>
                  <span>Código</span>
                  <span>Cantidad</span>
                </div>
                {recipe.accesorios.map((accessory) => (
                  <div key={accessory.id}>
                    <strong>{accessory.nombre || "Accesorio"}</strong>
                    <span>{accessory.codigo.trim() || "Sin código"}</span>
                    <span>{accessory.reglaCantidad.cantidad}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={s.activateDetailCard}>
            <header>
              <h3>Reglas y validaciones ({checklist.length})</h3>
            </header>
            <ul className={s.activateRulesList}>
              {checklist.map((item) => (
                <li key={item.label} data-complete={item.done}>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>{item.label}</span>
                  <small>{item.done ? "OK" : "Pendiente"}</small>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className={s.activateFooterBar}>
          <button
            type="button"
            className={s.secondaryButton}
            onClick={() => setShowFullSummary(false)}
          >
            <ArrowLeft size={16} />
            Volver al resumen
          </button>
          <div className={s.activatePrimaryWrap}>
            <button
              type="button"
              className={s.primaryButton}
              disabled={!canActivate || isSaving || isActivated}
              onClick={onActivate}
            >
              <Rocket size={17} />
              {activateLabel}
            </button>
            <small>
              {isActivated
                ? "Ya está disponible para nuevas cotizaciones"
                : "Quedará disponible para nuevas cotizaciones"}
            </small>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={s.activatePanel} data-view="ready">
      <header className={s.activatePanelHeader}>
        <div>
          <h2>3. Probar y activar la receta</h2>
          <p>Valida que todo esté correcto antes de activarla para nuevas cotizaciones.</p>
        </div>
      </header>

      <div
        className={s.activateReadyBanner}
        data-ready={canActivate || isActivated}
      >
        <span aria-hidden="true">
          {canActivate || isActivated ? (
            <CheckCircle2 size={28} />
          ) : (
            <Sparkles size={28} />
          )}
        </span>
        <div>
          <strong>{readyTitle}</strong>
          <p>{readyCopy}</p>
        </div>
        <button
          type="button"
          className={s.secondaryButton}
          onClick={() => setShowFullSummary(true)}
        >
          <Eye size={16} />
          Ver resumen completo
        </button>
      </div>

      <div className={s.activateReadyGrid}>
        <section className={s.activateChecklistCard}>
          <h3>Checklist de validación</h3>
          <ul>
            {checklist.map((item) => (
              <li key={item.label} data-complete={item.done}>
                <span aria-hidden="true">
                  <CheckCircle2 size={18} />
                </span>
                {item.label}
              </li>
            ))}
          </ul>
        </section>

        <section className={s.activateIncludesCard}>
          <h3>Qué incluye esta receta</h3>
          <ul>
            {includeCards.map((card) => {
              const Icon = card.icon;
              return (
                <li key={card.title}>
                  <span aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <div>
                    <strong>{card.title}</strong>
                    <p>{card.detail}</p>
                  </div>
                  <em>{card.value}</em>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className={s.activateFooterBar}>
        <button type="button" className={s.secondaryButton} onClick={onBackToRecipe}>
          <ArrowLeft size={16} />
          Volver a receta
        </button>
        <div className={s.activatePrimaryWrap}>
          <button
            type="button"
            className={s.primaryButton}
            disabled={!canActivate || isSaving || isActivated}
            onClick={onActivate}
          >
            <Rocket size={17} />
            {activateLabel}
          </button>
          <small>
            {isActivated
              ? "Ya está disponible para nuevas cotizaciones"
              : "Quedará disponible para nuevas cotizaciones"}
          </small>
        </div>
      </div>
    </section>
  );
}

export function RecipeActivateSidebarTip() {
  return (
    <section className={s.activateTipCard}>
      <span aria-hidden="true">
        <Lightbulb size={18} />
      </span>
      <div>
        <strong>Último paso</strong>
        <p>
          Prueba una medida real, compara con tu taller y activa la receta cuando
          todo coincida.
        </p>
      </div>
    </section>
  );
}

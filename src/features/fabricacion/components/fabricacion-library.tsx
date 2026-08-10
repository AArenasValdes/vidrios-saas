"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  Search,
  Sparkles,
  Wrench,
} from "lucide-react";

import { useCotizacionLineTemplates } from "@/features/cotizaciones/line-templates/hooks/useCotizacionLineTemplates";
import {
  BIBLIOTECA_RECETAS_PRIORIZADAS,
  type BibliotecaRecetaSugerida,
} from "@/features/fabricacion/fixtures/biblioteca-recetas-sugeridas";
import { useFabricationRecipes } from "@/features/fabricacion/hooks/use-fabrication-recipes";
import type {
  FabricationRecipeRecord,
  FabricationRecipeStatus,
} from "@/features/fabricacion/types/fabricacion-persistence";

import s from "./fabricacion-library.module.css";

type LibraryMode = "library" | "recipes";
type LibraryTab = "all" | "private" | "validated";

const STATUS_COPY: Record<FabricationRecipeStatus, string> = {
  draft: "Borrador",
  testing: "Lista para probar",
  validated: "Validada",
  review_required: "Requiere revisión",
  archived: "Archivada",
};

function normalize(value: string | null | undefined) {
  return value?.trim().toLocaleLowerCase("es-CL") ?? "";
}

function recipeStatusClass(status: FabricationRecipeStatus) {
  if (status === "validated") return s.statusValidated;
  if (status === "testing") return s.statusTesting;
  if (status === "review_required") return s.statusReview;
  return s.statusDraft;
}

function isSuggestedLinked(
  template: { nombre: string; proveedor: string | null },
  entry: BibliotecaRecetaSugerida
) {
  return (
    normalize(template.nombre) === normalize(entry.linea) &&
    (!template.proveedor || normalize(template.proveedor) === normalize(entry.proveedor))
  );
}

function RecipeCard({ recipe }: { recipe: FabricationRecipeRecord }) {
  const componentCount =
    recipe.definition.perfiles.length +
    recipe.definition.vidrios.length +
    recipe.definition.accesorios.length;
  const missing = [
    ...recipe.definition.perfiles.flatMap((profile) => profile.datosPendientes),
    ...recipe.definition.notasValidacion,
  ].filter(Boolean);

  return (
    <article className={s.recipeCard}>
      <div className={s.cardTopline}>
        <span className={`${s.statusBadge} ${recipeStatusClass(recipe.status)}`}>
          {STATUS_COPY[recipe.status]}
        </span>
        <span className={s.version}>v{recipe.version}</span>
      </div>
      <h2>{recipe.definition.identidad.nombre || recipe.lineName}</h2>
      <p className={s.cardMeta}>
        {recipe.providerName || "Proveedor por confirmar"} · {recipe.typology || "Tipología por confirmar"}
      </p>
      <div className={s.recipeFacts}>
        <span>{componentCount} componentes</span>
        <span>{recipe.definition.identidad.hojas} hojas</span>
      </div>
      {missing.length > 0 && recipe.status !== "validated" ? (
        <p className={s.pendingLine}>Faltan datos o verificación de taller.</p>
      ) : (
        <p className={s.readyLine}>Versión disponible para cotizar.</p>
      )}
      {recipe.lineTemplateId ? (
        <Link
          className={s.cardAction}
          href={`/configuracion/empresa/lineas-precios/${recipe.lineTemplateId}/fabricacion`}
        >
          Ver receta <ArrowRight aria-hidden />
        </Link>
      ) : null}
    </article>
  );
}

export function FabricacionLibrary({
  mode,
  lineTemplateId = null,
}: {
  mode: LibraryMode;
  lineTemplateId?: number | null;
}) {
  const { templates, isLoading: templatesLoading } = useCotizacionLineTemplates();
  const { recipes, isLoading: recipesLoading } = useFabricationRecipes();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<LibraryTab>(mode === "recipes" ? "private" : "all");
  const [providerFilter, setProviderFilter] = useState("all");
  const scopedTemplate = Number.isInteger(lineTemplateId)
    ? templates.find((template) => Number(template.id) === lineTemplateId) ?? null
    : null;

  const privateRecipes = useMemo(
    () => recipes.filter((recipe) => recipe.scope === "organization" && recipe.status !== "archived"),
    [recipes]
  );
  const validatedRecipes = useMemo(
    () => privateRecipes.filter((recipe) => recipe.status === "validated"),
    [privateRecipes]
  );
  const providerOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [...templates.map((template) => template.proveedor), ...BIBLIOTECA_RECETAS_PRIORIZADAS.map((entry) => entry.proveedor)]
            .filter((provider): provider is string => Boolean(provider?.trim()))
            .sort((left, right) => left.localeCompare(right, "es-CL"))
        )
      ),
    [templates]
  );
  const normalizedQuery = normalize(query);
  const matches = (parts: Array<string | null | undefined>) =>
    parts.some((part) => normalize(part).includes(normalizedQuery));
  const visibleSuggestions = BIBLIOTECA_RECETAS_PRIORIZADAS.filter((entry) => {
    const providerMatches = providerFilter === "all" || entry.proveedor === providerFilter;
    const lineMatches = scopedTemplate ? isSuggestedLinked(scopedTemplate, entry) : true;
    return providerMatches && lineMatches && matches([entry.proveedor, entry.linea, entry.variante]);
  });
  const visibleSuggestionGroups = (() => {
    const groups = new Map<string, BibliotecaRecetaSugerida[]>();
    visibleSuggestions.forEach((entry) => {
      groups.set(entry.proveedor, [...(groups.get(entry.proveedor) ?? []), entry]);
    });
    return Array.from(groups.entries()).sort(([left], [right]) => left.localeCompare(right, "es-CL"));
  })();
  const visibleRecipes = privateRecipes.filter((recipe) => {
    const providerMatches = providerFilter === "all" || recipe.providerName === providerFilter;
    const lineMatches = scopedTemplate
      ? recipe.lineTemplateId === Number(scopedTemplate.id)
      : true;
    return (
      providerMatches &&
      lineMatches &&
      matches([recipe.providerName, recipe.lineName, recipe.typology, recipe.variant])
    );
  });

  if (templatesLoading || recipesLoading) {
    return <div className={s.loading}>Cargando biblioteca de líneas y recetas...</div>;
  }

  return (
    <main className={s.page}>
      <header className={s.header}>
        <div className={s.headerIdentity}>
          <span className={s.headerIcon}><BookOpen aria-hidden /></span>
          <div>
            <p className={s.eyebrow}>Catálogo privado</p>
            <h1>{mode === "library" ? "Biblioteca técnica" : "Recetas del catálogo"}</h1>
            <p>
              {scopedTemplate
                ? `${scopedTemplate.nombre}${scopedTemplate.proveedor ? ` · ${scopedTemplate.proveedor}` : ""}`
                : "Plantillas y recetas vinculadas a tus líneas comerciales."}
            </p>
          </div>
        </div>
        <div className={s.headerActions}>
          <Link className={s.secondaryButton} href="/configuracion/empresa/lineas-precios">
            Volver al catálogo privado
          </Link>
        </div>
      </header>

      <section className={s.controls} aria-label="Filtros de biblioteca">
        <label className={s.searchBox}>
          <Search aria-hidden />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar líneas o proveedores..." />
        </label>
        <label className={s.selectBox}>
          <span>Proveedor</span>
          <select value={providerFilter} onChange={(event) => setProviderFilter(event.target.value)}>
            <option value="all">Todos</option>
            {providerOptions.map((provider) => <option key={provider} value={provider}>{provider}</option>)}
          </select>
        </label>
      </section>

      <section className={s.catalogue}>
          <div className={s.tabs} role="tablist" aria-label="Estado de recetas">
            {([
              ["all", "Todas las líneas", BIBLIOTECA_RECETAS_PRIORIZADAS.length + privateRecipes.length],
              ["private", "Mis recetas", privateRecipes.length],
              ["validated", "Validadas", validatedRecipes.length],
            ] as Array<[LibraryTab, string, number]>).map(([value, label, count]) => (
              <button className={tab === value ? s.tabActive : s.tab} key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)}>
                {label}<span>{count}</span>
              </button>
            ))}
          </div>

          {tab === "all" ? (
            <>
              {visibleSuggestionGroups.map(([provider, entries]) => <section className={s.providerGroup} key={provider}>
                <div className={s.groupHeading}><Sparkles aria-hidden /><h2>{provider}</h2><span>{entries.length} líneas · información disponible sin inventar fórmulas</span></div>
                <div className={s.suggestionGrid}>
                  {entries.map((entry) => {
                    const canConfigure = Boolean(
                      scopedTemplate &&
                        isSuggestedLinked(scopedTemplate, entry) &&
                        entry.crearDefinicion
                    );
                    return <article className={s.suggestionCard} key={entry.id}>
                      <div className={s.cardTopline}><span className={entry.estado === "sugerida" ? s.suggestedBadge : s.recognizedBadge}>{entry.estado === "sugerida" ? "Sugerida" : "Reconocida"}</span><span>{entry.proveedor}</span></div>
                      <h2>{entry.proveedor} {entry.linea}</h2>
                      <p>{entry.variante}</p>
                      <p className={s.documentation}>{entry.estado === "sugerida" ? "Base técnica inicial. Debe revisarse con un caso de taller." : entry.motivoPendiente}</p>
                      {canConfigure ? <Link className={s.primaryInline} href={`/configuracion/empresa/lineas-precios/${scopedTemplate?.id}/fabricacion?plantilla=${encodeURIComponent(entry.id)}`}>Usar plantilla <ArrowRight aria-hidden /></Link> : <Link className={s.secondaryInline} href="/configuracion/empresa/lineas-precios">{entry.crearDefinicion ? "Seleccionar línea comercial" : "Ver datos pendientes"}</Link>}
                    </article>;
                  })}
                </div>
              </section>)}
              {visibleRecipes.length > 0 ? <section className={s.providerGroup}>
                <div className={s.groupHeading}><Wrench aria-hidden /><h2>Recetas de tu taller</h2></div>
                <div className={s.recipeGrid}>{visibleRecipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}</div>
              </section> : null}
            </>
          ) : null}

          {tab === "private" ? <div className={s.recipeGrid}>{visibleRecipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}</div> : null}
          {tab === "validated" ? <div className={s.recipeGrid}>{visibleRecipes.filter((recipe) => recipe.status === "validated").map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}</div> : null}
          {(tab === "private" || tab === "validated") && visibleRecipes.filter((recipe) => tab !== "validated" || recipe.status === "validated").length === 0 ? <div className={s.emptyState}><ClipboardCheck aria-hidden /><h2>No hay recetas en este estado</h2><p>Una receta solo queda disponible para cotizar después de una prueba real y validación de taller.</p></div> : null}
      </section>
    </main>
  );
}

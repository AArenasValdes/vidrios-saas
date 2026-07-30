"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Archive,
  ArrowLeft,
  Beaker,
  CheckCircle2,
  Copy,
  FilePlus2,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
} from "lucide-react";

import { useCotizacionLineTemplates } from "@/features/cotizaciones/line-templates/hooks/useCotizacionLineTemplates";
import { RecipeGuidedEditor } from "@/features/fabricacion/components/recipe-guided-editor";
import { RecipeTestLab } from "@/features/fabricacion/components/recipe-test-lab";
import { useFabricationRecipes } from "@/features/fabricacion/hooks/use-fabrication-recipes";
import {
  contarBloqueosCriticosReceta,
  crearRecetaFabricacionVacia,
} from "@/features/fabricacion/services/fabricacion-receta-editor.service";
import type { FabricacionReceta } from "@/features/fabricacion/types/fabricacion-domain";
import type {
  FabricationRecipeRecord,
  FabricationRecipeStatus,
} from "@/features/fabricacion/types/fabricacion-persistence";

import s from "./fabricacion-workspace.module.css";

const STATUS_COPY: Record<
  FabricationRecipeStatus,
  { label: string; detail: string; tone: string }
> = {
  draft: {
    label: "Borrador",
    detail: "Receta lista para completar",
    tone: "draft",
  },
  testing: {
    label: "En prueba",
    detail: "Receta lista para probar",
    tone: "testing",
  },
  validated: {
    label: "Validada para el taller",
    detail: "Validada por tu taller",
    tone: "validated",
  },
  review_required: {
    label: "Requiere revision",
    detail: "Esta version cambio y debe revisarse",
    tone: "review",
  },
  archived: {
    label: "Archivada",
    detail: "Fuera de uso",
    tone: "archived",
  },
};

type WorkspaceView = "list" | "edit" | "test";

function cloneRecipe(recipe: FabricacionReceta) {
  return JSON.parse(JSON.stringify(recipe)) as FabricacionReceta;
}

function formatDate(value: string | null) {
  if (!value) return "Sin validar";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function FabricacionLineWorkspace({
  lineTemplateId,
}: {
  lineTemplateId: number;
}) {
  const { templates, isLoading: isLoadingTemplates } =
    useCotizacionLineTemplates();
  const {
    recipes,
    tests,
    isLoading,
    isSaving,
    error,
    createRecipe,
    updateRecipe,
    duplicateRecipe,
    createRecipeVersion,
    archiveRecipe,
    loadTests,
    createRecipeTest,
    runRecipeTest,
    validateRecipe,
  } = useFabricationRecipes();

  const [view, setView] = useState<WorkspaceView>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<FabricacionReceta | null>(null);
  const [providerName, setProviderName] = useState("");
  const [lineName, setLineName] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const template =
    templates.find((entry) => Number(entry.id) === lineTemplateId) ?? null;
  const lineRecipes = useMemo(
    () =>
      recipes.filter(
        (recipe) =>
          recipe.scope === "organization" &&
          recipe.lineTemplateId === lineTemplateId
      ),
    [lineTemplateId, recipes]
  );
  const ventoraRecipes = useMemo(
    () =>
      recipes.filter(
        (recipe) =>
          recipe.scope === "ventora" &&
          (recipe.lineTemplateId === lineTemplateId ||
            recipe.lineTemplateId === null ||
            recipe.lineName.trim().toLowerCase() ===
              template?.nombre.trim().toLowerCase())
      ),
    [lineTemplateId, recipes, template?.nombre]
  );
  const selected =
    recipes.find((recipe) => recipe.id === selectedId) ?? null;
  const selectedTests = selected ? tests[selected.id] ?? [] : [];
  const validatedCount = lineRecipes.filter(
    (recipe) => recipe.status === "validated"
  ).length;

  const returnToList = () => {
    setView("list");
    setSelectedId(null);
    setDraft(null);
    setFeedback(null);
  };

  const openEditor = (recipe: FabricationRecipeRecord) => {
    setSelectedId(recipe.id);
    setDraft(cloneRecipe(recipe.definition));
    setProviderName(recipe.providerName);
    setLineName(recipe.lineName);
    setView("edit");
    setFeedback(null);
  };

  const openTestLab = async (recipe: FabricationRecipeRecord) => {
    setSelectedId(recipe.id);
    setView("test");
    setFeedback(null);
    await loadTests(recipe.id);
  };

  const handleCreate = async () => {
    if (!template) return;
    const definition = crearRecetaFabricacionVacia({
      recipeIdentityId: crypto.randomUUID(),
      lineName: template.nombre,
    });
    const created = await createRecipe({
      lineTemplateId,
      providerName: template.proveedor ?? "",
      lineName: template.nombre,
      typology: definition.identidad.tipologia,
      leavesCount: definition.identidad.hojas,
      variant: definition.identidad.variante,
      definition,
      sourceType: "manual",
    });
    openEditor(created);
  };

  const handleSave = async () => {
    if (!selected || !draft) return;
    const updated = await updateRecipe(selected.id, {
      providerName,
      lineName,
      typology: draft.identidad.tipologia,
      leavesCount: draft.identidad.hojas,
      variant: draft.identidad.variante,
      definition: draft,
    });
    setDraft(cloneRecipe(updated.definition));
    setFeedback("Borrador guardado.");
  };

  const handleDuplicate = async (recipe: FabricationRecipeRecord) => {
    if (!template) return;
    const duplicated = await duplicateRecipe(recipe.id, {
      lineTemplateId,
      providerName: template.proveedor ?? recipe.providerName,
      lineName: template.nombre,
    });
    openEditor(duplicated);
  };

  const handleNewVersion = async (recipe: FabricationRecipeRecord) => {
    const version = await createRecipeVersion(recipe.id);
    openEditor(version);
  };

  const handleArchive = async (recipe: FabricationRecipeRecord) => {
    const confirmed = window.confirm(
      `Archivar ${recipe.definition.identidad.nombre}? La version historica se conservara.`
    );
    if (!confirmed) return;
    await archiveRecipe(recipe.id);
    returnToList();
  };

  const handleValidate = async () => {
    if (!selected) return;
    await validateRecipe(selected.id);
    setFeedback("Receta validada para tu taller.");
    returnToList();
  };

  if (isLoadingTemplates || isLoading) {
    return <div className={s.loadingState}>Cargando recetas de fabricacion...</div>;
  }

  if (!template) {
    return (
      <div className={s.loadingState}>
        No se encontro la linea comercial solicitada.
        <Link href="/configuracion/empresa/lineas-precios">Volver a lineas</Link>
      </div>
    );
  }

  if (view === "edit" && selected && draft) {
    const status = STATUS_COPY[selected.status];
    const readOnly = selected.status === "validated";

    return (
      <main className={s.workspace}>
        <header className={s.workspaceHeader}>
          <button type="button" className={s.backButton} onClick={returnToList}>
            <ArrowLeft size={17} />
            Volver a recetas
          </button>
          <div className={s.headerTitle}>
            <span>{template.nombre}</span>
            <h1>{draft.identidad.nombre}</h1>
            <p>
              Version {selected.version} ·{" "}
              <span className={s.statusPill} data-tone={status.tone}>
                {status.label}
              </span>
            </p>
          </div>
          <div className={s.headerActions}>
            {readOnly ? (
              <button
                type="button"
                className={s.primaryButton}
                onClick={() => void handleNewVersion(selected)}
              >
                <RotateCcw size={16} />
                Crear nueva version
              </button>
            ) : (
              <button
                type="button"
                className={s.primaryButton}
                disabled={isSaving}
                onClick={() => void handleSave()}
              >
                <Save size={16} />
                Guardar borrador
              </button>
            )}
          </div>
        </header>

        {readOnly ? (
          <div className={s.noticeBand}>
            <ShieldCheck size={18} />
            Esta version esta bloqueada. Para cambiarla, crea una nueva version.
          </div>
        ) : null}
        {feedback ? <div className={s.successBand}>{feedback}</div> : null}
        {error ? <div className={s.errorBand}>{error}</div> : null}

        <RecipeGuidedEditor
          recipe={draft}
          providerName={providerName}
          lineName={lineName}
          readOnly={readOnly}
          onRecipeChange={setDraft}
          onProviderNameChange={setProviderName}
          onLineNameChange={setLineName}
        />
      </main>
    );
  }

  if (view === "test" && selected) {
    const criticalBlocks = contarBloqueosCriticosReceta(selected.definition);
    const requiredTests = selectedTests.filter((test) => test.isRequired !== false);
    const canValidate =
      selected.scope === "organization" &&
      selected.status !== "validated" &&
      criticalBlocks === 0 &&
      requiredTests.length > 0 &&
      requiredTests.every((test) => test.passed);

    return (
      <main className={s.workspace}>
        <header className={s.workspaceHeader}>
          <button type="button" className={s.backButton} onClick={returnToList}>
            <ArrowLeft size={17} />
            Volver a recetas
          </button>
          <div className={s.headerTitle}>
            <span>Laboratorio · {template.nombre}</span>
            <h1>{selected.definition.identidad.nombre}</h1>
            <p>Version {selected.version} · prueba con datos de un trabajo real</p>
          </div>
          <div className={s.headerActions}>
            <button
              type="button"
              className={s.validateButton}
              disabled={!canValidate || isSaving}
              title={
                canValidate
                  ? "Validar esta version"
                  : "Completa perfiles y aprueba todos los casos obligatorios"
              }
              onClick={() => void handleValidate()}
            >
              <CheckCircle2 size={17} />
              Valide esta receta con un trabajo real
            </button>
          </div>
        </header>

        {!canValidate ? (
          <div className={s.noticeBand}>
            <Beaker size={18} />
            {criticalBlocks > 0
              ? "Falta asignar el codigo de perfiles obligatorios."
              : requiredTests.length === 0
                ? "Guarda al menos un caso obligatorio."
                : "Todos los casos obligatorios deben coincidir antes de validar."}
          </div>
        ) : null}
        {feedback ? <div className={s.successBand}>{feedback}</div> : null}
        {error ? <div className={s.errorBand}>{error}</div> : null}

        <RecipeTestLab
          recipe={selected}
          tests={selectedTests}
          isSaving={isSaving}
          onSaveTest={async (input) => {
            await createRecipeTest({
              recipeId: selected.id,
              name: input.name,
              input: input.input,
              expectedOutput: input.expectedOutput,
              isRequired: input.isRequired,
            });
            if (selected.status === "draft" || selected.status === "review_required") {
              await updateRecipe(selected.id, { status: "testing" });
            }
          }}
          onRunTest={async (testId) => {
            await runRecipeTest(selected.id, testId);
          }}
        />
      </main>
    );
  }

  return (
    <main className={s.workspace}>
      <header className={s.workspaceHeader}>
        <Link href="/configuracion/empresa/lineas-precios" className={s.backButton}>
          <ArrowLeft size={17} />
          Lineas y precios
        </Link>
        <div className={s.headerTitle}>
          <span>Cubicacion y pauta de corte</span>
          <h1>{template.nombre}</h1>
          <p>
            {lineRecipes.length} recetas · {validatedCount} validadas para el taller
          </p>
        </div>
        <div className={s.headerActions}>
          <button
            type="button"
            className={s.primaryButton}
            disabled={isSaving}
            onClick={() => void handleCreate()}
          >
            <Plus size={17} />
            Crear receta propia
          </button>
        </div>
      </header>

      {error ? <div className={s.errorBand}>{error}</div> : null}

      <section className={s.summaryStrip} aria-label="Estado de cubicacion">
        <div>
          <span>Estado de la linea</span>
          <strong>
            {validatedCount > 0
              ? "Validada para el taller"
              : lineRecipes.length > 0
                ? "Configuracion en curso"
                : "Sin configurar"}
          </strong>
        </div>
        <div>
          <span>Recetas privadas</span>
          <strong>{lineRecipes.length}</strong>
        </div>
        <div>
          <span>Listas para cotizar</span>
          <strong>{validatedCount}</strong>
        </div>
      </section>

      <section className={s.recipeSection}>
        <div className={s.sectionHeading}>
          <div>
            <span>Tu taller</span>
            <h2>Recetas asociadas a esta linea</h2>
          </div>
          <p>Las versiones validadas quedan bloqueadas y conservan su historial.</p>
        </div>

        {lineRecipes.length === 0 ? (
          <div className={s.emptyState}>
            <FilePlus2 size={24} />
            <strong>Sin configurar</strong>
            <p>Crea una receta propia o duplica una receta Ventora disponible.</p>
          </div>
        ) : (
          <div className={s.recipeList}>
            {lineRecipes.map((recipe) => {
              const status = STATUS_COPY[recipe.status];
              return (
                <article key={recipe.id} className={s.recipeRow} data-tone={status.tone}>
                  <div className={s.recipeIdentity}>
                    <span className={s.statusPill} data-tone={status.tone}>
                      {status.label}
                    </span>
                    <strong>{recipe.definition.identidad.nombre}</strong>
                    <small>{status.detail}</small>
                  </div>
                  <dl className={s.recipeFacts}>
                    <div>
                      <dt>Tipologia</dt>
                      <dd>{recipe.definition.identidad.tipologia.replaceAll("_", " ")}</dd>
                    </div>
                    <div>
                      <dt>Hojas</dt>
                      <dd>{recipe.definition.identidad.hojas}</dd>
                    </div>
                    <div>
                      <dt>Variante / herraje</dt>
                      <dd>
                        {recipe.definition.identidad.variante}
                        {recipe.definition.identidad.herraje
                          ? ` · ${recipe.definition.identidad.herraje}`
                          : ""}
                      </dd>
                    </div>
                    <div>
                      <dt>Version</dt>
                      <dd>v{recipe.version}</dd>
                    </div>
                    <div>
                      <dt>Validacion</dt>
                      <dd>{formatDate(recipe.validatedAt)}</dd>
                    </div>
                  </dl>
                  <div className={s.recipeActions}>
                    {recipe.status === "validated" ? (
                      <button
                        type="button"
                        className={s.secondaryButton}
                        onClick={() => void handleNewVersion(recipe)}
                      >
                        <RotateCcw size={15} />
                        Nueva version
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={s.secondaryButton}
                        onClick={() => openEditor(recipe)}
                      >
                        <Pencil size={15} />
                        Editar borrador
                      </button>
                    )}
                    <button
                      type="button"
                      className={s.secondaryButton}
                      onClick={() => void openTestLab(recipe)}
                    >
                      <Beaker size={15} />
                      Probar receta
                    </button>
                    <button
                      type="button"
                      className={s.iconButton}
                      aria-label={`Archivar ${recipe.definition.identidad.nombre}`}
                      title="Archivar"
                      onClick={() => void handleArchive(recipe)}
                    >
                      <Archive size={16} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {ventoraRecipes.length > 0 ? (
        <section className={s.recipeSection}>
          <div className={s.sectionHeading}>
            <div>
              <span>Biblioteca Ventora</span>
              <h2>Recetas disponibles para copiar</h2>
            </div>
            <p>Nunca se presentan como listas para fabricar sin validacion de tu taller.</p>
          </div>
          <div className={s.recipeList}>
            {ventoraRecipes.map((recipe) => (
              <article key={recipe.id} className={s.recipeRow} data-tone="ventora">
                <div className={s.recipeIdentity}>
                  <span className={s.statusPill} data-tone="ventora">
                    Receta Ventora
                  </span>
                  <strong>{recipe.definition.identidad.nombre}</strong>
                  <small>Copiala y pruebala con un trabajo real.</small>
                </div>
                <dl className={s.recipeFacts}>
                  <div>
                    <dt>Tipologia</dt>
                    <dd>{recipe.definition.identidad.tipologia.replaceAll("_", " ")}</dd>
                  </div>
                  <div>
                    <dt>Hojas</dt>
                    <dd>{recipe.definition.identidad.hojas}</dd>
                  </div>
                  <div>
                    <dt>Variante</dt>
                    <dd>{recipe.definition.identidad.variante}</dd>
                  </div>
                  <div>
                    <dt>Version</dt>
                    <dd>v{recipe.version}</dd>
                  </div>
                </dl>
                <div className={s.recipeActions}>
                  <button
                    type="button"
                    className={s.secondaryButton}
                    onClick={() => void handleDuplicate(recipe)}
                  >
                    <Copy size={15} />
                    Usar receta disponible
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

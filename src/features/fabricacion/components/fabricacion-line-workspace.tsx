"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Beaker,
  CheckCircle2,
  Copy,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
} from "lucide-react";

import { useCotizacionLineTemplates } from "@/features/cotizaciones/line-templates/hooks/useCotizacionLineTemplates";
import type { CotizacionLineTemplateMaterial } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { RecipeGuidedEditor } from "@/features/fabricacion/components/recipe-guided-editor";
import { FabricacionLineMobileHub } from "@/features/fabricacion/components/fabricacion-line-mobile-hub";
import { isRecipeReadyToActivate } from "@/features/fabricacion/components/recipe-activate-panel";
import { FabricacionTipologiaPreview } from "@/features/fabricacion/components/fabricacion-tipologia-preview";
import { RecipeTestLab } from "@/features/fabricacion/components/recipe-test-lab";
import {
  BIBLIOTECA_RECETAS_PRIORIZADAS,
  type BibliotecaRecetaSugerida,
} from "@/features/fabricacion/fixtures/biblioteca-recetas-sugeridas";
import {
  BASES_TIPOLOGICAS_VENTORA,
  crearBaseTipologicaVentora,
  resolverBaseEstructuralVentora,
} from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import {
  buildProcedenciaPersistence,
  resolveProcedenciaFromSource,
} from "@/features/fabricacion/types/fabricacion-receta-procedencia";
import { useFabricationRecipes } from "@/features/fabricacion/hooks/use-fabrication-recipes";
import {
  contarBloqueosCriticosReceta,
  crearRecetaFabricacionVacia,
} from "@/features/fabricacion/services/fabricacion-receta-editor.service";
import { VENTORA_LARGO_COMERCIAL_PRESET_MM } from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import { applyLargoToProfilesWithoutLength } from "@/features/fabricacion/services/taller-perfiles.service";
import type {
  FabricacionEntradaCalculo,
  FabricacionReceta,
  FabricacionResultadoCubicacion,
} from "@/features/fabricacion/types/fabricacion-domain";
import type {
  FabricationRecipeRecord,
  FabricationRecipeSourceType,
  FabricationRecipeStatus,
  FabricationRecipeTestRecord,
  UpdateFabricationRecipeInput,
} from "@/features/fabricacion/types/fabricacion-persistence";

import s from "./fabricacion-workspace.module.css";

const STATUS_COPY: Record<
  FabricationRecipeStatus,
  { label: string; detail: string; tone: string }
> = {
  draft: {
    label: "Borrador",
    detail: "Fabricación por completar",
    tone: "draft",
  },
  testing: {
    label: "En prueba",
    detail: "Lista para probar con una medida",
    tone: "testing",
  },
  validated: {
    label: "Lista para cotizar",
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
type RecipeStartMode = "ventora" | "ai" | "blank";

const WORKFLOW_STEPS = [
  { id: "base", label: "Base" },
  { id: "components", label: "Componentes" },
  { id: "rules", label: "Reglas" },
  { id: "test", label: "Prueba" },
  { id: "plan", label: "Pauta" },
  { id: "validation", label: "Validar" },
] as const;

type RecipeWorkflowStepId = (typeof WORKFLOW_STEPS)[number]["id"];

const PRIMARY_WORKFLOW_STEPS = [
  { id: "line", label: "Línea" },
  { id: "recipe", label: "Fabricación" },
  { id: "activate", label: "Probar" },
] as const;

type PrimaryWorkflowStepId = (typeof PRIMARY_WORKFLOW_STEPS)[number]["id"];

function getPrimaryWorkflowStep(step: RecipeWorkflowStepId): PrimaryWorkflowStepId {
  if (step === "base") return "line";
  if (step === "test" || step === "validation") return "activate";
  return "recipe";
}

function getInternalStepForPrimary(
  step: PrimaryWorkflowStepId
): RecipeWorkflowStepId {
  if (step === "line") return "base";
  if (step === "activate") return "test";
  return "components";
}

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

function getRecipeStage(
  recipe: FabricationRecipeRecord,
  recipeTests: FabricationRecipeTestRecord[] = []
) {
  const componentCount =
    recipe.definition.perfiles.length +
    recipe.definition.vidrios.length +
    recipe.definition.accesorios.length;
  const cutSettings = recipe.definition.configuracionCorte;
  const hasComponents = componentCount > 0;
  const hasRules =
    hasComponents &&
    recipe.definition.perfiles.every(
      (profile) => !profile.requerido || Boolean(profile.reglaMedida.base)
    ) &&
    contarBloqueosCriticosReceta(recipe.definition) === 0;
  const hasCutPolicy =
    cutSettings?.perdidaCorteMm != null &&
    cutSettings.despunteInicialMm != null &&
    cutSettings.sobranteMinimoAprovechableMm != null;
  const hasTest =
    recipeTests.length > 0 ||
    recipe.status === "testing" ||
    recipe.status === "validated";
  const requiredTests = recipeTests.filter((test) => test.isRequired !== false);
  const canValidate =
    recipe.status !== "validated" &&
    contarBloqueosCriticosReceta(recipe.definition) === 0 &&
    requiredTests.length > 0 &&
    requiredTests.every((test) => test.passed);
  const completed = {
    base: true,
    components: hasComponents,
    rules: hasRules,
    test: hasTest,
    plan: hasTest,
    validation: recipe.status === "validated",
  } satisfies Record<RecipeWorkflowStepId, boolean>;
  // Flujo primario: Línea → Fabricación → Probar (sin paso Pauta).
  const currentStep: RecipeWorkflowStepId = !hasComponents
    ? "components"
    : !hasTest
      ? "test"
      : recipe.status === "validated"
        ? "validation"
        : "test";

  let nextLabel = "Probar con una medida real";
  if (!hasComponents) nextLabel = "Preparar fabricación";
  else if (!hasTest) nextLabel = "Probar con una medida real";
  else if (canValidate) nextLabel = "Dejar lista para cotizar";

  return {
    componentCount,
    hasComponents,
    hasRules,
    hasCutPolicy,
    hasTest,
    canValidate,
    completed,
    currentStep,
    nextLabel,
  };
}

function RecipeWorkflowStepper({
  progress,
  activeStep,
  onStep,
}: {
  progress: ReturnType<typeof getRecipeStage> | null;
  activeStep?: RecipeWorkflowStepId;
  onStep?: (step: RecipeWorkflowStepId) => void;
}) {
  const currentPrimaryStep = getPrimaryWorkflowStep(
    activeStep ?? progress?.currentStep ?? "base"
  );
  const currentIndex = PRIMARY_WORKFLOW_STEPS.findIndex(
    (step) => step.id === currentPrimaryStep
  );

  return (
    <nav className={s.workflowStepper} aria-label="Etapas de fabricación">
      {PRIMARY_WORKFLOW_STEPS.map((step, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = currentPrimaryStep === step.id;
        const isLockedFromLine =
          currentPrimaryStep === "line" && step.id !== "line";
        return (
          <button
            key={step.id}
            type="button"
            className={s.workflowStep}
            data-complete={isComplete}
            data-current={isCurrent}
            disabled={!onStep || isLockedFromLine}
            onClick={() => {
              if (!onStep || !progress) return;
              onStep(getInternalStepForPrimary(step.id));
            }}
          >
            <span>{isComplete ? <CheckCircle2 aria-hidden /> : index + 1}</span>
            <strong>{step.label}</strong>
          </button>
        );
      })}
    </nav>
  );
}

function formatTypologyLabel(tipologia: string) {
  return tipologia
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function RecipeSummaryPanel({
  recipe,
  providerName,
  lineName,
  progress,
  activeStep,
  updatedAt,
  readyToActivate = false,
  onStep,
}: {
  recipe: FabricacionReceta;
  providerName: string;
  lineName: string;
  progress: ReturnType<typeof getRecipeStage>;
  activeStep: RecipeWorkflowStepId;
  updatedAt?: string | null;
  readyToActivate?: boolean;
  onStep: (step: RecipeWorkflowStepId) => void;
}) {
  const isRecipeStage = activeStep === "components" || activeStep === "rules";
  const isActivateStage = activeStep === "test" || activeStep === "validation";
  void progress;
  void readyToActivate;
  void updatedAt;
  void isRecipeStage;
  void isActivateStage;
  // Sidebar: preview técnica + meta compacta (no panel administrativo).
  return (
    <aside className={`${s.guidedSidebar} ${s.fabCompactSidebar}`}>
      <section className={s.fabSidebarCard} aria-label="Resumen de fabricación">
        <FabricacionTipologiaPreview
          tipologia={recipe.identidad.tipologia}
          hojas={recipe.identidad.hojas}
          size="sm"
        />
        <strong>
          {lineName || "Línea"} · {formatTypologyLabel(recipe.identidad.tipologia)}
          {recipe.identidad.hojas > 1 ? ` ${recipe.identidad.hojas}H` : ""}
        </strong>
        <span>
          {[providerName, `${recipe.perfiles.length} perfiles`, `${recipe.accesorios.length} accesorios`]
            .filter(Boolean)
            .join(" · ")}
        </span>
        <button
          type="button"
          className={s.fabCompactMetaEdit}
          onClick={() => onStep(isActivateStage ? "components" : "base")}
        >
          Cambiar
        </button>
      </section>
    </aside>
  );
}

function LineSetupSidebar({
  recipe,
  providerName,
  lineName,
  material,
}: {
  recipe: FabricacionReceta;
  providerName: string;
  lineName: string;
  material: CotizacionLineTemplateMaterial;
  startMode?: RecipeStartMode;
  origenLabel?: string | null;
  origenDetail?: string | null;
}) {
  const typologyLabel =
    BASES_TIPOLOGICAS_VENTORA.find(
      (entry) => entry.tipologia === recipe.identidad.tipologia
    )?.label ?? "Personalizada";

  return (
    <aside className={`${s.guidedSidebar} ${s.fabCompactSidebar}`}>
      <section className={s.fabSidebarCard} aria-label="Línea en preparación">
        <FabricacionTipologiaPreview
          tipologia={recipe.identidad.tipologia}
          hojas={recipe.identidad.hojas}
          size="sm"
        />
        <strong>{lineName || "Línea"} · {typologyLabel}</strong>
        <span>
          {[providerName, material].filter(Boolean).join(" · ") || "Configura qué fabricas"}
        </span>
      </section>
    </aside>
  );
}

export function FabricacionLineWorkspace({
  lineTemplateId,
  initialSuggestedRecipeId = null,
}: {
  lineTemplateId: number;
  initialSuggestedRecipeId?: string | null;
}) {
  const {
    templates,
    isLoading: isLoadingTemplates,
    isSaving: isSavingLineTemplate,
    error: lineTemplateError,
    updateTemplate,
  } = useCotizacionLineTemplates();
  const {
    recipes,
    tests,
    isLoading,
    isResolvingOrganization,
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
  const [lineMaterial, setLineMaterial] =
    useState<CotizacionLineTemplateMaterial>("Aluminio");
  const [recipeStartMode, setRecipeStartMode] =
    useState<RecipeStartMode>("ventora");
  const [hasChangedRecipeStartMode, setHasChangedRecipeStartMode] =
    useState(false);
  const [lineSetupError, setLineSetupError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<RecipeWorkflowStepId>("base");
  const [isDesktopWorkspace, setIsDesktopWorkspace] = useState(false);
  const [hasResolvedWorkspaceViewport, setHasResolvedWorkspaceViewport] =
    useState(false);
  const hasAppliedInitialSuggestion = useRef(false);
  const hasBootstrappedEmptyRecipe = useRef(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const syncViewport = () => {
      const matches = mediaQuery.matches;
      setIsDesktopWorkspace(matches);
      setHasResolvedWorkspaceViewport(true);
    };

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);
    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    if (!hasResolvedWorkspaceViewport || isDesktopWorkspace) return;
    if (view === "list") return;
    setView("list");
    setSelectedId(null);
    setDraft(null);
    setActiveStep("base");
  }, [hasResolvedWorkspaceViewport, isDesktopWorkspace, view]);

  const template =
    templates.find((entry) => Number(entry.id) === lineTemplateId) ?? null;
  const providerOptions = useMemo(
    () =>
      Array.from(
        new Set(
          templates
            .map((entry) => entry.proveedor?.trim())
            .filter((provider): provider is string => Boolean(provider))
        )
      ).sort((left, right) => left.localeCompare(right, "es-CL")),
    [templates]
  );
  const lineRecipes = useMemo(
    () =>
      recipes.filter(
        (recipe) =>
          recipe.scope === "organization" &&
          recipe.lineTemplateId === lineTemplateId
      ).sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
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
  const suggestedRecipesForLine = useMemo(() => {
    const normalizedLine = template?.nombre.trim().toLocaleLowerCase("es-CL");
    const normalizedProvider = template?.proveedor?.trim().toLocaleLowerCase("es-CL");
    if (!normalizedLine) return [];
    return BIBLIOTECA_RECETAS_PRIORIZADAS.filter(
      (entry) =>
        entry.crearDefinicion &&
        entry.linea.trim().toLocaleLowerCase("es-CL") === normalizedLine &&
        (!normalizedProvider ||
          entry.proveedor.trim().toLocaleLowerCase("es-CL") === normalizedProvider)
    );
  }, [template?.nombre, template?.proveedor]);
  const selected =
    recipes.find((recipe) => recipe.id === selectedId) ?? null;
  const selectedTests = selected ? tests[selected.id] ?? [] : [];
  const focusRecipe = lineRecipes[0] ?? null;
  const focusTests = focusRecipe ? tests[focusRecipe.id] ?? [] : [];
  const focusProgress = focusRecipe
    ? getRecipeStage(focusRecipe, focusTests)
    : null;
  const archivedRecipeCount = Math.max(0, lineRecipes.length - 1);

  useEffect(() => {
    if (view !== "list" || !focusRecipe || tests[focusRecipe.id]) return;
    void loadTests(focusRecipe.id).catch(() => undefined);
  }, [focusRecipe, loadTests, tests, view]);

  const returnToList = () => {
    setView("list");
    setSelectedId(null);
    setDraft(null);
    setFeedback(null);
    setLineSetupError(null);
    setActiveStep("base");
  };

  const openEditor = useCallback((recipe: FabricationRecipeRecord, step: RecipeWorkflowStepId = "base") => {
    setSelectedId(recipe.id);
    setDraft(cloneRecipe(recipe.definition));
    setProviderName(recipe.providerName);
    setLineName(recipe.lineName);
    setLineMaterial(template?.material ?? "Aluminio");
    const procedencia = resolveProcedenciaFromSource({
      sourceType: recipe.sourceType,
      sourceReference: recipe.sourceReference,
    });
    const restoredStartMode: RecipeStartMode =
      procedencia.procedencia === "borrador_ia"
        ? "ai"
        : procedencia.procedencia === "base_ventora"
          ? "ventora"
          : procedencia.procedencia === "receta_taller" &&
              recipe.sourceReference === "blank-start"
            ? "blank"
            : resolverBaseEstructuralVentora({
                  tipologia: recipe.definition.identidad.tipologia,
                  hojas: recipe.definition.identidad.hojas,
                })
              ? "ventora"
              : "blank";
    setRecipeStartMode(restoredStartMode);
    setHasChangedRecipeStartMode(false);
    setLineSetupError(null);
    setActiveStep(step);
    setView("edit");
    setFeedback(null);
  }, [template?.material]);

  const openTestLab = useCallback(async (
    recipe: FabricationRecipeRecord,
    step: "test" | "plan" | "validation" = "test"
  ) => {
    setSelectedId(recipe.id);
    setActiveStep(step);
    setView("test");
    setFeedback(null);
    await loadTests(recipe.id);
  }, [loadTests]);

  const handleCreateFromDefinition = async (input: {
    definition: FabricacionReceta;
    sourceType: FabricationRecipeSourceType;
    sourceReference?: string | null;
  }) => {
    if (!template) return;
    const created = await createRecipe({
      lineTemplateId,
      providerName: template.proveedor ?? "",
      lineName: template.nombre,
      typology: input.definition.identidad.tipologia,
      leavesCount: input.definition.identidad.hojas,
      variant: input.definition.identidad.variante,
      definition: input.definition,
      sourceType: input.sourceType,
      sourceReference: input.sourceReference,
    });
    openEditor(created);
  };

  const handleCreate = async (sourceType: "manual" | "imported_ai" = "manual") => {
    if (!template) return;
    const definition = crearRecetaFabricacionVacia({
      recipeIdentityId: crypto.randomUUID(),
      lineName: template.nombre,
    });
    await handleCreateFromDefinition({ definition, sourceType });
  };

  useEffect(() => {
    if (
      !hasResolvedWorkspaceViewport ||
      !isDesktopWorkspace ||
      view !== "list" ||
      isLoading ||
      isLoadingTemplates ||
      !template
    ) {
      return;
    }

    if (focusRecipe) {
      const timeoutId = window.setTimeout(() => {
        openEditor(focusRecipe, "base");
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }

    // Sin receta: crear borrador vacío y abrir Paso 1 (sin pantalla previa).
    if (hasBootstrappedEmptyRecipe.current || isSaving) return;
    hasBootstrappedEmptyRecipe.current = true;
    void handleCreate("manual").catch(() => {
      hasBootstrappedEmptyRecipe.current = false;
    });
  }, [
    focusRecipe,
    hasResolvedWorkspaceViewport,
    isDesktopWorkspace,
    isLoading,
    isLoadingTemplates,
    isSaving,
    openEditor,
    template,
    view,
  ]);

  const prepareLineSetupDraft = (sourceDraft: FabricacionReceta | null = draft) => {
    if (!sourceDraft) return null;
    const componentCount =
      sourceDraft.perfiles.length +
      sourceDraft.vidrios.length +
      sourceDraft.accesorios.length;
    const shouldPrepareStructure =
      hasChangedRecipeStartMode || componentCount === 0;

    if (!shouldPrepareStructure) return sourceDraft;

    if (recipeStartMode === "blank" || recipeStartMode === "ai") {
      return {
        ...sourceDraft,
        perfiles: [],
        vidrios: [],
        accesorios: [],
        configuracionCorte: {
          perdidaCorteMm: null,
          despunteInicialMm: null,
          sobranteMinimoAprovechableMm: null,
          largoComercialDefaultMm: VENTORA_LARGO_COMERCIAL_PRESET_MM,
        },
        notasValidacion: [],
      } satisfies FabricacionReceta;
    }

    const base = resolverBaseEstructuralVentora({
      tipologia: sourceDraft.identidad.tipologia,
      hojas: sourceDraft.identidad.hojas,
    });
    if (!base) {
      return {
        ...sourceDraft,
        perfiles: [],
        vidrios: [],
        accesorios: [],
        configuracionCorte: {
          perdidaCorteMm: null,
          despunteInicialMm: null,
          sobranteMinimoAprovechableMm: null,
          largoComercialDefaultMm: VENTORA_LARGO_COMERCIAL_PRESET_MM,
        },
        notasValidacion: [],
      } satisfies FabricacionReceta;
    }

    const prepared = crearBaseTipologicaVentora({
      tipologia: base.tipologia,
      hojas: sourceDraft.identidad.hojas,
      modulos: sourceDraft.identidad.modulos,
      lineName,
    });
    return {
      ...prepared,
      version: sourceDraft.version,
      // Una base precargada nunca hereda "validada" por el solo hecho de existir.
      estado:
        sourceDraft.estado === "validada"
          ? sourceDraft.estado
          : "ejemplo_no_validado",
      identidad: {
        ...prepared.identidad,
        recetaId: sourceDraft.identidad.recetaId,
        codigo: sourceDraft.identidad.codigo,
        nombre: sourceDraft.identidad.nombre,
        hojas: sourceDraft.identidad.hojas,
        modulos: sourceDraft.identidad.modulos,
        variante: sourceDraft.identidad.variante,
        herraje: sourceDraft.identidad.herraje,
      },
    } satisfies FabricacionReceta;
  };

  const resolveStartModePersistence = (
    recipeToSave: FabricacionReceta
  ): Pick<UpdateFabricationRecipeInput, "sourceType" | "sourceReference"> => {
    // Conservar plantilla/base de origen si el usuario no cambió el modo de inicio.
    if (!hasChangedRecipeStartMode && selected) {
      return {
        sourceType: selected.sourceType,
        sourceReference: selected.sourceReference,
      };
    }
    if (recipeStartMode === "ai") {
      return buildProcedenciaPersistence("borrador_ia");
    }
    if (recipeStartMode === "ventora") {
      return buildProcedenciaPersistence("base_ventora", {
        tipologica: recipeToSave.identidad.tipologia,
        hojas: recipeToSave.identidad.hojas,
      });
    }
    return buildProcedenciaPersistence("receta_taller");
  };

  const handleSave = async (
    nextDraft?: FabricacionReceta,
    options?: { silent?: boolean }
  ) => {
    const recipeToSave = nextDraft ?? draft;
    if (!selected || !recipeToSave) return null;
    const silent = options?.silent === true;
    const startModeMeta = resolveStartModePersistence(recipeToSave);
    const updated = await updateRecipe(
      selected.id,
      {
        providerName,
        lineName,
        typology: recipeToSave.identidad.tipologia,
        leavesCount: recipeToSave.identidad.hojas,
        variant: recipeToSave.identidad.variante,
        definition: recipeToSave,
        ...startModeMeta,
      },
      { quiet: silent }
    );
    if (template && template.material !== lineMaterial) {
      await updateTemplate(template.id, { material: lineMaterial });
    }
    // En guardado silencioso (cambio de paso) no pisamos el draft local:
    // evita un segundo render/parpadeo mientras el usuario ya avanzó.
    if (!silent) {
      setDraft(cloneRecipe(updated.definition));
      setFeedback("Borrador guardado.");
    }
    setHasChangedRecipeStartMode(false);
    setLineSetupError(null);
    return updated;
  };

  const navigateToRecipeStep = async (
    recipe: FabricationRecipeRecord,
    step: RecipeWorkflowStepId
  ) => {
    if (step === "base" || step === "components" || step === "rules") {
      // Al volver desde Probar, conservar el borrador en memoria.
      // Antes se reabría con recipe.definition del servidor y se perdía la tipología/perfiles no guardados.
      if (
        (view === "edit" || view === "test") &&
        selectedId === recipe.id &&
        draft
      ) {
        setView("edit");
        setActiveStep(step);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      openEditor(recipe, step);
      return;
    }

    // test / plan / validation viven en el laboratorio del paso 3.
    const draftToPersist =
      view === "edit" &&
      draft &&
      selectedId === recipe.id &&
      selected?.status !== "validated"
        ? draft
        : null;
    void openTestLab(recipe, step);
    if (draftToPersist) {
      void handleSave(draftToPersist, { silent: true }).catch(() => undefined);
    }
  };

  const handleSaveLineSetup = async () => {
    const prepared = prepareLineSetupDraft();
    if (!prepared) return;
    setDraft(prepared);
    await handleSave(prepared);
  };

  const handleContinueToRecipe = () => {
    if (!draft || !selected) return;
    if (!lineName.trim()) {
      setLineSetupError("Escribe el nombre de la línea para continuar.");
      return;
    }
    if (!draft.identidad.tipologia || draft.identidad.hojas < 1) {
      setLineSetupError("Selecciona qué fabricas con esta línea.");
      return;
    }

    const typologyLabel =
      BASES_TIPOLOGICAS_VENTORA.find(
        (entry) => entry.tipologia === draft.identidad.tipologia
      )?.label ??
      draft.identidad.tipologia.replaceAll("_", " ");
    const derivedName =
      draft.identidad.nombre.trim() ||
      `${lineName.trim()} · ${typologyLabel}`;

    const withName: FabricacionReceta = {
      ...draft,
      identidad: { ...draft.identidad, nombre: derivedName },
    };
    setDraft(withName);

    const prepared =
      selected.status === "validated"
        ? withName
        : prepareLineSetupDraft(withName);
    if (!prepared) return;
    const preparedNamed: FabricacionReceta = {
      ...prepared,
      identidad: {
        ...prepared.identidad,
        nombre: prepared.identidad.nombre.trim() || derivedName,
      },
    };
    setDraft(preparedNamed);
    setLineSetupError(null);
    setFeedback(null);
    setActiveStep("components");
    window.scrollTo({ top: 0, behavior: "auto" });
    if (selected.status !== "validated") {
      void handleSave(preparedNamed, { silent: true }).catch(() => undefined);
    }
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

  const handleUseSuggested = useCallback(async (entry: BibliotecaRecetaSugerida) => {
    if (!template || !entry.crearDefinicion) return;
    const definition = entry.crearDefinicion();
    const created = await createRecipe({
      lineTemplateId,
      providerName: template.proveedor ?? entry.proveedor,
      lineName: template.nombre,
      typology: definition.identidad.tipologia,
      leavesCount: definition.identidad.hojas,
      variant: definition.identidad.variante,
      definition,
      sourceType: "copied",
      sourceReference: entry.id,
    });
    openEditor(created);
  }, [createRecipe, lineTemplateId, openEditor, template]);

  useEffect(() => {
    if (
      !initialSuggestedRecipeId ||
      hasAppliedInitialSuggestion.current ||
      isLoading ||
      isLoadingTemplates
    ) {
      return;
    }
    const suggested = suggestedRecipesForLine.find(
      (entry) => entry.id === initialSuggestedRecipeId
    );
    if (!suggested) return;
    const timeoutId = window.setTimeout(() => {
      if (hasAppliedInitialSuggestion.current) return;
      hasAppliedInitialSuggestion.current = true;
      void handleUseSuggested(suggested);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [
    handleUseSuggested,
    initialSuggestedRecipeId,
    isLoading,
    isLoadingTemplates,
    suggestedRecipesForLine,
  ]);

  const handleNewVersion = async (recipe: FabricationRecipeRecord) => {
    const version = await createRecipeVersion(recipe.id);
    openEditor(version);
  };

  const handleArchive = async (recipe: FabricationRecipeRecord) => {
    const confirmed = window.confirm(
      `Archivar ${recipe.definition.identidad.nombre}? La version historica se conservara.`
    );
    if (!confirmed) return;
    try {
      await archiveRecipe(recipe.id);
      returnToList();
    } catch {
      // El hook deja el mensaje visible en la banda de error.
    }
  };

  const handleValidate = async (options?: { stayOnStep?: boolean }) => {
    if (!selected) return;
    await validateRecipe(selected.id);
    setFeedback("Receta validada");
    if (!options?.stayOnStep) {
      returnToList();
    }
  };

  if (isLoadingTemplates || isLoading || isResolvingOrganization) {
    return <div className={s.loadingState}>Cargando fabricación...</div>;
  }

  if (!template) {
    return (
      <div className={s.loadingState}>
        No se encontro la linea comercial solicitada.
        <Link href="/configuracion/empresa/lineas-precios">Volver a lineas</Link>
      </div>
    );
  }

  if (
    view === "list" &&
    focusRecipe &&
    hasResolvedWorkspaceViewport &&
    isDesktopWorkspace
  ) {
    return <div className={s.loadingState}>Abriendo fabricación...</div>;
  }

  if (!hasResolvedWorkspaceViewport) {
    return <div className={s.loadingState}>Cargando fabricación...</div>;
  }

  // Móvil: solo resumen de lo configurado en desktop (sin wizard ni IA).
  if (hasResolvedWorkspaceViewport && !isDesktopWorkspace) {
    return (
      <FabricacionLineMobileHub
        template={template}
        currentRecipe={focusRecipe}
        olderRecipes={lineRecipes.slice(1)}
        error={error}
      />
    );
  }

  if (view === "edit" && selected && draft) {
    const status = STATUS_COPY[selected.status];
    const readOnly = selected.status === "validated";
    const progress = getRecipeStage(selected, selectedTests);
    const editorStep =
      activeStep === "base" ||
      activeStep === "components" ||
      activeStep === "rules" ||
      activeStep === "plan"
        ? activeStep
        : "base";
    const stepIndex = WORKFLOW_STEPS.findIndex((step) => step.id === editorStep);
    const previousStep = WORKFLOW_STEPS[stepIndex - 1]?.id ?? null;
    const nextStep = WORKFLOW_STEPS[stepIndex + 1]?.id ?? null;
    const isRecipeStage = editorStep === "components" || editorStep === "rules";
    const recipePreviousStep = isRecipeStage ? "base" : previousStep;
    const recipeNextStep = isRecipeStage ? "test" : nextStep;

    return (
      <main className={`${s.workspace} ${editorStep === "base" ? s.lineSetupWorkspace : ""}`}>
        {editorStep !== "base" ? <RecipeWorkflowStepper
          progress={progress}
          activeStep={editorStep}
          onStep={(step) => navigateToRecipeStep(selected, step)}
        /> : null}
        {editorStep === "base" ? (
          <>
            <RecipeWorkflowStepper
              progress={progress}
              activeStep={editorStep}
              onStep={(step) => navigateToRecipeStep(selected, step)}
            />
            <header className={s.lineSetupHeader}>
              <div className={s.lineSetupHeaderMain}>
                <h1>Administrar línea</h1>
                <nav aria-label="Ubicación actual">
                  <span>Empresa</span>
                  <i aria-hidden="true">/</i>
                  <Link href="/configuracion/empresa/lineas-precios">Líneas</Link>
                  <i aria-hidden="true">/</i>
                  <strong>{lineName || template.nombre}</strong>
                </nav>
              </div>
              <Link
                href="/configuracion/empresa/lineas-precios"
                className={s.lineSetupBackLink}
                onClick={() => {
                }}
              >
                <ArrowLeft size={16} aria-hidden />
                Volver a líneas
              </Link>
            </header>
          </>
        ) : (
        <header className={`${s.workspaceHeader} ${s.recipeWorkspaceHeader}`}>
          <div className={s.recipeHeaderLead}>
            <Link
              href="/configuracion/empresa/lineas-precios"
              className={s.lineSetupBackLink}
            >
              <ArrowLeft size={16} aria-hidden />
              Volver a líneas
            </Link>
            <nav className={s.recipeBreadcrumb} aria-label="Ubicación actual">
              <span>Empresa</span>
              <i aria-hidden="true">/</i>
              <Link href="/configuracion/empresa/lineas-precios">Líneas</Link>
              <i aria-hidden="true">/</i>
              <strong>{lineName || template.nombre}</strong>
            </nav>
          </div>
          <div className={s.headerTitle}>
            <h1>{draft.identidad.nombre}</h1>
            <p>
              Versión {selected.version} ·{" "}
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
        )}

        {readOnly ? (
          <div className={s.noticeBand}>
            <ShieldCheck size={18} />
            Esta version esta bloqueada. Para cambiarla, crea una nueva version.
          </div>
        ) : null}
        {feedback ? <div className={s.successBand}>{feedback}</div> : null}
        {lineSetupError ? <div className={s.errorBand}>{lineSetupError}</div> : null}
        {error || lineTemplateError ? (
          <div className={s.errorBand}>{error || lineTemplateError}</div>
        ) : null}

        {editorStep === "base" ? (
        <>
        <div className={`${s.desktopGuidedLayout} ${s.lineSetupLayout}`}>
          <div className={s.guidedMainColumn}>
            <RecipeGuidedEditor
              recipe={draft}
              providerName={providerName}
              lineName={lineName}
              material={lineMaterial}
              providerOptions={providerOptions}
              startMode={recipeStartMode}
              readOnly={readOnly}
              desktopActiveStep="base"
              onRecipeChange={setDraft}
              onProviderNameChange={setProviderName}
              onLineNameChange={setLineName}
              onMaterialChange={setLineMaterial}
              onStartModeChange={(mode) => {
                setRecipeStartMode(mode);
                setHasChangedRecipeStartMode(true);
              }}
            />
          </div>
          <LineSetupSidebar
            recipe={draft}
            providerName={providerName}
            lineName={lineName}
            material={lineMaterial}
            startMode={recipeStartMode}
            origenLabel={
              hasChangedRecipeStartMode || !selected
                ? null
                : resolveProcedenciaFromSource({
                    sourceType: selected.sourceType,
                    sourceReference: selected.sourceReference,
                  }).label
            }
            origenDetail={
              hasChangedRecipeStartMode || !selected
                ? null
                : resolveProcedenciaFromSource({
                    sourceType: selected.sourceType,
                    sourceReference: selected.sourceReference,
                  }).detail
            }
          />
        </div>
        <div className={s.lineSetupActionBar}>
          <div>
            <Link
              href="/configuracion/empresa/lineas-precios"
              className={s.secondaryButton}
            >
              <ArrowLeft size={16} aria-hidden />
              Volver a líneas
            </Link>
            {readOnly ? (
              <button
                type="button"
                className={s.secondaryButton}
                onClick={() => void handleNewVersion(selected)}
              >
                <RotateCcw size={16} />
                Crear nueva versión
              </button>
            ) : (
              <button
                type="button"
                className={s.secondaryButton}
                disabled={isSaving || isSavingLineTemplate}
                onClick={() => void handleSaveLineSetup()}
              >
                <Save size={16} />
                Guardar borrador
              </button>
            )}
            <span>{readOnly ? "Esta versión está validada." : "Se guardará como borrador."}</span>
          </div>
          <button
            type="button"
            className={s.primaryButton}
            onClick={handleContinueToRecipe}
          >
            Preparar fabricación
            <ArrowRight size={18} />
          </button>
        </div>
        </>
        ) : (
        <>
        <div className={`${s.desktopGuidedLayout} ${s.fabSheetLayout}`}>
          <div className={s.guidedMainColumn}>
            <RecipeGuidedEditor
              recipe={draft}
              providerName={providerName}
              lineName={lineName}
              readOnly={readOnly}
              startMode={recipeStartMode}
              preferAiAssist={false}
              desktopActiveStep={editorStep}
              pautaInput={selectedTests[0]?.input ?? null}
              workshopRecipes={recipes
                .filter((entry) => entry.scope === "organization")
                .map((entry) => entry.definition)}
              onRecipeChange={setDraft}
              onProviderNameChange={setProviderName}
              onLineNameChange={setLineName}
              onStartModeChange={(mode) => {
                setRecipeStartMode(mode);
                setHasChangedRecipeStartMode(true);
              }}
              onPersistRecipe={async (nextRecipe) => {
                setDraft(nextRecipe);
                await handleSave(nextRecipe, { silent: true });
              }}
              onContinueToTest={() => {
                if (!selected) return;
                void navigateToRecipeStep(selected, "test");
              }}
              onBaseApplied={() => {
                setFeedback("Fabricación preparada. Revisa cómo trabaja tu taller.");
                setActiveStep("components");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </div>
          <RecipeSummaryPanel
            recipe={draft}
            providerName={providerName}
            lineName={lineName}
            progress={progress}
            activeStep={editorStep}
            updatedAt={selected.updatedAt}
            onStep={(step) => navigateToRecipeStep(selected, step)}
          />
        </div>
        <div className={`${s.guidedFooter} ${s.desktopOnlyGuidedFooter}`}>
          <button
            type="button"
            className={s.secondaryButton}
            disabled={!recipePreviousStep}
            onClick={() => recipePreviousStep && navigateToRecipeStep(selected, recipePreviousStep)}
          >
            <ArrowLeft size={17} />
            {isRecipeStage ? "Volver a línea" : "Atrás"}
          </button>
          {recipeNextStep ? (
            <button
              type="button"
              className={s.primaryButton}
              onClick={() => navigateToRecipeStep(selected, recipeNextStep)}
            >
              {isRecipeStage ? "Probar con una medida real" : "Continuar"}
              <ArrowRight size={17} />
            </button>
          ) : null}
        </div>
        </>
        )}
      </main>
    );
  }

  if (view === "test" && selected) {
    // Preferir el borrador local para que el paso 3 no “pierda” tipología/perfiles
    // mientras el guardado silencioso termina en background.
    const workingSelected =
      draft && selectedId === selected.id
        ? {
            ...selected,
            definition: draft,
            providerName,
            lineName: lineName || selected.lineName,
          }
        : selected;
    const showActivateReady = isRecipeReadyToActivate(
      workingSelected.definition,
      selectedTests
    );
    const canValidate =
      workingSelected.scope === "organization" &&
      workingSelected.status !== "validated" &&
      showActivateReady;
    const progress = getRecipeStage(workingSelected, selectedTests);
    const labStep: RecipeWorkflowStepId = "test";
    const goToRecipe = () =>
      navigateToRecipeStep(workingSelected, "components");
    const saveLabTest = async (input: {
      name: string;
      input: FabricacionEntradaCalculo;
      expectedOutput: FabricacionResultadoCubicacion;
      isRequired: boolean;
    }) => {
      await createRecipeTest({
        recipeId: workingSelected.id,
        name: input.name,
        input: input.input,
        expectedOutput: input.expectedOutput,
        isRequired: input.isRequired,
      });
      if (
        workingSelected.status === "draft" ||
        workingSelected.status === "review_required"
      ) {
        await updateRecipe(workingSelected.id, { status: "testing" });
      }
    };

    return (
      <main className={s.workspace}>
        <RecipeWorkflowStepper
          progress={progress}
          activeStep={labStep}
          onStep={(step) => navigateToRecipeStep(workingSelected, step)}
        />
        <header className={`${s.workspaceHeader} ${s.recipeWorkspaceHeader}`}>
          <div className={s.recipeHeaderLead}>
            <Link
              href="/configuracion/empresa/lineas-precios"
              className={s.lineSetupBackLink}
            >
              <ArrowLeft size={16} aria-hidden />
              Volver a líneas
            </Link>
            <nav className={s.recipeBreadcrumb} aria-label="Ubicación actual">
              <span>Empresa</span>
              <i aria-hidden="true">/</i>
              <Link href="/configuracion/empresa/lineas-precios">Líneas</Link>
              <i aria-hidden="true">/</i>
              <strong>{workingSelected.lineName || template.nombre}</strong>
            </nav>
          </div>
          <div className={s.headerTitle}>
            <h1>{workingSelected.definition.identidad.nombre}</h1>
            <p>
              Versión {workingSelected.version} ·{" "}
              <span className={s.statusPill} data-tone={STATUS_COPY[workingSelected.status].tone}>
                {STATUS_COPY[workingSelected.status].label}
              </span>
            </p>
          </div>
          <div className={s.desktopHeaderAction}>
            <button
              type="button"
              className={s.secondaryButton}
              disabled={isSaving || workingSelected.status === "validated"}
              onClick={async () => {
                await handleSave(workingSelected.definition);
              }}
            >
              <Save size={16} />
              Guardar borrador
            </button>
          </div>
        </header>

        {feedback ? <div className={s.successBand}>{feedback}</div> : null}
        {error ? <div className={s.errorBand}>{error}</div> : null}

        <div className={s.desktopGuidedLayout}>
          <div className={s.guidedMainColumn}>
            <RecipeTestLab
              recipe={workingSelected}
              tests={selectedTests}
              isSaving={isSaving}
              isActivated={workingSelected.status === "validated"}
              canActivateFromSaved={canValidate}
              desktopActiveStep={labStep}
              onBackToRecipe={goToRecipe}
              onConfigureLengths={goToRecipe}
              onApplyPresetLengths={async () => {
                const next = applyLargoToProfilesWithoutLength(
                  workingSelected.definition,
                  VENTORA_LARGO_COMERCIAL_PRESET_MM
                );
                setDraft(next);
                await handleSave(next, { silent: true });
              }}
              onActivate={() => void handleValidate({ stayOnStep: true })}
              onSaveTest={saveLabTest}
              onRunTest={async (testId) => {
                await runRecipeTest(workingSelected.id, testId);
              }}
            />
          </div>
          <RecipeSummaryPanel
            recipe={workingSelected.definition}
            providerName={workingSelected.providerName}
            lineName={workingSelected.lineName}
            progress={progress}
            activeStep={labStep}
            readyToActivate={showActivateReady}
            onStep={(step) => navigateToRecipeStep(workingSelected, step)}
          />
        </div>
      </main>
    );
  }

  return (
    <>
      <main className={`${s.workspace} ${s.desktopListView}`}>
      <header className={s.workspaceHeader}>
        <Link href="/configuracion/empresa/lineas-precios" className={s.backButton}>
          <ArrowLeft size={17} />
          Catálogo privado
        </Link>
        <div className={s.headerTitle}>
          <span>Fabricación</span>
          <h1>{template.nombre}</h1>
          <p>Configuración de fabricación de esta línea.</p>
        </div>
        <div className={s.headerActions}>
          <Link
            href={`/biblioteca-lineas?lineTemplateId=${lineTemplateId}`}
            className={s.secondaryButton}
          >
            <Copy size={17} />
            Biblioteca técnica
          </Link>
          {!focusRecipe ? (
            <button
              type="button"
              className={s.primaryButton}
              disabled={isSaving}
              onClick={() => void handleCreate("manual")}
            >
              <Plus size={17} />
              Preparar fabricación
            </button>
          ) : null}
          {focusRecipe?.status === "validated" ? (
            <button
              type="button"
              className={s.primaryButton}
              disabled={isSaving}
              onClick={() => void handleNewVersion(focusRecipe)}
            >
              <RotateCcw size={16} />
              Crear nueva versión
            </button>
          ) : null}
        </div>
      </header>

      {error ? <div className={s.errorBand}>{error}</div> : null}

      <RecipeWorkflowStepper
        progress={focusProgress}
        activeStep={focusProgress?.currentStep}
        onStep={focusRecipe ? (step) => {
          navigateToRecipeStep(focusRecipe, step);
        } : undefined}
      />

      <p className={s.workspaceHelp}>
        Cotizar no depende de esta configuración. Sirve para cubicación y pauta
        automática al cotizar.
      </p>

      <section className={s.recipeSection}>
        {focusRecipe ? (
          <div className={s.sectionHeading}>
            <div>
              <h2>Continúa donde quedaste</h2>
            </div>
            <p>
              La fabricación activa concentra el trabajo. Las versiones anteriores
              quedan guardadas abajo.
            </p>
          </div>
        ) : null}

        {!focusRecipe ? (
          <div className={s.emptyInline}>
            Preparando el Paso 1 de la línea…
          </div>
        ) : (
          <>
            {(() => {
              const status = STATUS_COPY[focusRecipe.status];
              const stage = focusProgress ?? getRecipeStage(focusRecipe);
              return (
                <article className={s.recipeFocus} data-tone={status.tone}>
                  <div className={s.recipeFocusHeader}>
                    <div className={s.recipeFocusIdentity}>
                      <span className={s.statusPill} data-tone={status.tone}>{status.label}</span>
                      <strong>{focusRecipe.definition.identidad.nombre}</strong>
                      <small>Versión {focusRecipe.version} · {status.detail}</small>
                    </div>
                    <button type="button" className={s.iconButton} aria-label={`Archivar ${focusRecipe.definition.identidad.nombre}`} title="Archivar fabricación" onClick={() => void handleArchive(focusRecipe)}>
                      <Archive size={16} />
                    </button>
                  </div>
                  <dl className={s.recipeFocusProgress}>
                    <div><dt>Línea</dt><dd>Definida</dd></div>
                    <div><dt>Fabricación</dt><dd>{stage.hasComponents ? `${stage.componentCount} piezas` : "Pendiente"}</dd></div>
                    <div><dt>Probar</dt><dd>{focusRecipe.status === "validated" ? "Lista para cotizar" : stage.hasTest ? (stage.canValidate ? "Lista para validar" : "En prueba") : "Pendiente"}</dd></div>
                  </dl>
                  <div className={s.recipeFocusActions}>
                    {focusRecipe.status === "validated" ? (
                      <button type="button" className={s.primaryButton} disabled={isSaving} onClick={() => void handleNewVersion(focusRecipe)}>
                        <RotateCcw size={16} />
                        Crear nueva versión
                      </button>
                    ) : (
                      <button type="button" className={s.primaryButton} disabled={isSaving} onClick={() => navigateToRecipeStep(focusRecipe, stage.currentStep)}>
                        {getPrimaryWorkflowStep(stage.currentStep) === "activate" ? (
                          <Beaker size={16} />
                        ) : (
                          <Pencil size={16} />
                        )}
                        {stage.nextLabel}
                      </button>
                    )}
                  </div>
                </article>
              );
            })()}

            {archivedRecipeCount > 0 ? (
              <details className={s.recipeHistory}>
                <summary>Versiones anteriores <span>{archivedRecipeCount}</span></summary>
                <div className={s.recipeList}>
                  {lineRecipes.slice(1).map((recipe) => {
                    const status = STATUS_COPY[recipe.status];
                    return (
                      <article key={recipe.id} className={s.recipeRow} data-tone={status.tone}>
                        <div className={s.recipeIdentity}>
                          <span className={s.statusPill} data-tone={status.tone}>{status.label}</span>
                          <strong>{recipe.definition.identidad.nombre}</strong>
                          <small>Versión {recipe.version} · {formatDate(recipe.validatedAt)}</small>
                        </div>
                        <dl className={s.recipeFacts}>
                          <div><dt>Tipología</dt><dd>{recipe.definition.identidad.tipologia.replaceAll("_", " ")}</dd></div>
                          <div><dt>Hojas</dt><dd>{recipe.definition.identidad.hojas}</dd></div>
                          <div><dt>Componentes</dt><dd>{getRecipeStage(recipe).componentCount}</dd></div>
                        </dl>
                        <div className={s.recipeActions}>
                          <button type="button" className={s.secondaryButton} onClick={() => openEditor(recipe)}>
                            <Pencil size={15} />
                            Abrir
                          </button>
                          <button type="button" className={s.iconButton} aria-label={`Archivar ${recipe.definition.identidad.nombre}`} title="Archivar" onClick={() => void handleArchive(recipe)}>
                            <Archive size={16} />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </details>
            ) : null}
          </>
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
                    Usar fabricación disponible
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className={s.recipeSection}>
          <div className={s.sectionHeading}>
            <div>
              <span>Biblioteca técnica</span>
              <h2>Plantillas sugeridas para esta línea</h2>
            </div>
            <p>Solo aparecen plantillas documentadas que coinciden con esta línea.</p>
        </div>
        <div className={s.catalogGrid}>
          {suggestedRecipesForLine.map((entry) => (
            <article key={entry.id} className={s.catalogItem}>
              <div>
                <span className={s.statusPill} data-tone={entry.estado === "sugerida" ? "testing" : "draft"}>
                  {entry.estado === "sugerida" ? "Sugerida" : "Linea reconocida"}
                </span>
                <strong>{entry.proveedor} {entry.linea}</strong>
                <small>{entry.variante} · {entry.tipologia.replaceAll("_", " ")}</small>
              </div>
              {entry.crearDefinicion ? (
                <button
                  type="button"
                  className={s.secondaryButton}
                  disabled={isSaving}
                  onClick={() => void handleUseSuggested(entry)}
                >
                  <Copy size={15} />
                  Copiar como borrador
                </button>
              ) : (
                <p>{entry.motivoPendiente}</p>
              )}
            </article>
          ))}
          {suggestedRecipesForLine.length === 0 ? (
            <p className={s.emptyInline}>
              No hay plantilla sugerida compatible con esta línea. Puedes usar el
              asistente o configurar la fabricación manualmente.
            </p>
          ) : null}
        </div>
      </section>
      </main>
    </>
  );
}

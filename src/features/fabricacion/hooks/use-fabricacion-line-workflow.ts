"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useCotizacionLineTemplates } from "@/features/cotizaciones/line-templates/hooks/useCotizacionLineTemplates";
import type { CotizacionLineTemplateMaterial } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  BIBLIOTECA_RECETAS_PRIORIZADAS,
  type BibliotecaRecetaSugerida,
} from "@/features/fabricacion/fixtures/biblioteca-recetas-sugeridas";
import {
  crearBaseTipologicaVentora,
  resolverBaseEstructuralVentora,
  BASES_TIPOLOGICAS_VENTORA,
} from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import {
  alignRecipeIdentityForCatalogDisplay,
  crearRecetaEstructuralParaLineaComercial,
  resolveArquetipoEstructuralId,
} from "@/features/fabricacion/fixtures/arquetipos-estructurales-lineas";
import { resolvePlantillaIdFromCatalogKey } from "@/features/fabricacion/fixtures/line-base-variant-catalog";
import { useFabricationRecipes } from "@/features/fabricacion/hooks/use-fabrication-recipes";
import { crearRecetaFabricacionVacia } from "@/features/fabricacion/services/fabricacion-receta-editor.service";
import { evaluarRecetaListaParaProbar } from "@/features/fabricacion/services/fabricacion-receta-lista-para-probar.service";
import { enriquecerCodigosPerfilRecetaFabricacion } from "@/features/fabricacion/services/fabricacion-receta-codigos.service";
import { enriquecerRecetaDesdeCatalogo } from "@/features/fabricacion/services/enriquecer-receta-desde-catalogo.service";
import { resolveInitialFabricationStepForTemplate } from "@/features/fabricacion/services/fabricacion-workflow-initial-step.service";
import {
  buildFabricationRecipeSummary,
  VENTORA_LARGO_COMERCIAL_PRESET_MM,
} from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import {
  cloneFabricacionRecipe,
  getRecipeStage,
  mapMobileWizardToWorkflowStep,
  mapWorkflowStepToMobileWizard,
} from "@/features/fabricacion/services/fabricacion-line-workflow.utils";
import {
  mergeSodalL25WorkspaceRecipes,
  isSodalL25CatalogKey,
} from "@/features/fabricacion/services/sodal-l25-context.service";
import { resolveEffectiveSodalL25CatalogKey } from "@/features/fabricacion/services/sodal-l25-presentation.service";
import {
  resolveVariantTreeGroups,
  type FabricacionVariantTreeItem,
} from "@/features/fabricacion/services/fabricacion-line-variant.service";
import {
  buildProcedenciaPersistence,
  resolveProcedenciaFromSource,
} from "@/features/fabricacion/types/fabricacion-receta-procedencia";
import type {
  FabricacionMobileView,
  FabricacionWorkspaceView,
  MobileWizardStepId,
  RecipeStartMode,
  RecipeWorkflowStepId,
} from "@/features/fabricacion/types/fabricacion-line-workflow";
import type { FabricacionReceta } from "@/features/fabricacion/types/fabricacion-domain";
import type {
  FabricationRecipeRecord,
  FabricationRecipeSourceType,
  UpdateFabricationRecipeInput,
} from "@/features/fabricacion/types/fabricacion-persistence";

type UseFabricacionLineWorkflowInput = {
  lineTemplateId: number;
  initialSuggestedRecipeId?: string | null;
  enableDesktopBootstrap?: boolean;
  isDesktopWorkspace?: boolean;
  hasResolvedWorkspaceViewport?: boolean;
};

export function useFabricacionLineWorkflow({
  lineTemplateId,
  initialSuggestedRecipeId = null,
  enableDesktopBootstrap = false,
  isDesktopWorkspace = false,
  hasResolvedWorkspaceViewport = true,
}: UseFabricacionLineWorkflowInput) {
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
  } = useFabricationRecipes({ lineTemplateId });

  const [view, setView] = useState<FabricacionWorkspaceView>("list");
  const [mobileView, setMobileView] = useState<FabricacionMobileView>("detail");
  const [mobileWizardStep, setMobileWizardStep] =
    useState<MobileWizardStepId>("product");
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
  const [isCreatingVariant, setIsCreatingVariant] = useState(false);
  const [activeStep, setActiveStep] = useState<RecipeWorkflowStepId>("base");
  const hasAppliedInitialSuggestion = useRef(false);
  const hasBootstrappedEmptyRecipe = useRef(false);

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
      recipes
        .filter(
          (recipe) =>
            recipe.scope === "organization" &&
            recipe.lineTemplateId === lineTemplateId
        )
        .sort(
          (left, right) =>
            new Date(right.updatedAt).getTime() -
            new Date(left.updatedAt).getTime()
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
  const effectiveCatalogKey = useMemo(
    () =>
      resolveEffectiveSodalL25CatalogKey({
        catalogKey: template?.catalogKey,
        nombre: template?.nombre,
      }),
    [template?.catalogKey, template?.nombre]
  );
  const fabricacionLineRecipes = useMemo(() => {
    if (!isSodalL25CatalogKey(effectiveCatalogKey)) {
      return lineRecipes;
    }
    return mergeSodalL25WorkspaceRecipes({
      organization: lineRecipes,
      ventora: ventoraRecipes,
    });
  }, [effectiveCatalogKey, lineRecipes, ventoraRecipes]);
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
  const selected = recipes.find((recipe) => recipe.id === selectedId) ?? null;
  const selectedTests = selected ? tests[selected.id] ?? [] : [];
  const focusRecipe = lineRecipes[0] ?? null;
  const focusTests = focusRecipe ? tests[focusRecipe.id] ?? [] : [];
  const focusProgress = focusRecipe
    ? getRecipeStage(focusRecipe, focusTests)
    : null;
  const archivedRecipeCount = Math.max(0, lineRecipes.length - 1);
  const variantTreeGroups = useMemo(
    () =>
      resolveVariantTreeGroups({
        catalogKey: template?.catalogKey,
        recipes: lineRecipes,
      }),
    [lineRecipes, template?.catalogKey]
  );

  useEffect(() => {
    if (view !== "list" || !focusRecipe || tests[focusRecipe.id]) return;
    void loadTests(focusRecipe.id).catch(() => undefined);
  }, [focusRecipe, loadTests, tests, view]);

  const returnToList = useCallback(() => {
    setView("list");
    setMobileView("detail");
    setSelectedId(null);
    setDraft(null);
    setFeedback(null);
    setLineSetupError(null);
    setActiveStep("base");
    setMobileWizardStep("product");
  }, []);

  const openEditor = useCallback(
    (recipe: FabricationRecipeRecord, step?: RecipeWorkflowStepId) => {
      const raw = alignRecipeIdentityForCatalogDisplay({
        recipe: cloneFabricacionRecipe(recipe.definition),
        catalogKey: template?.catalogKey,
        lineName: template?.nombre,
      });
      const enriched = enriquecerRecetaDesdeCatalogo({
        receta: enriquecerCodigosPerfilRecetaFabricacion({
          receta: raw,
          sourceType: recipe.sourceType,
          sourceReference: recipe.sourceReference,
          lineName: recipe.lineName,
        }),
        catalogKey: template?.catalogKey,
      });
      setSelectedId(recipe.id);
      setDraft(enriched);
      setProviderName(recipe.providerName);
      setLineName(recipe.lineName);
      setLineMaterial(template?.material ?? "Aluminio");
      const procedencia = resolveProcedenciaFromSource({
        sourceType: recipe.sourceType,
        sourceReference: recipe.sourceReference,
        sourceName: recipe.sourceName,
        sourceRevision: recipe.sourceRevision,
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
      const resolvedStep =
        step ?? resolveInitialFabricationStepForTemplate(template, recipe);
      setActiveStep(resolvedStep);
      setMobileWizardStep(mapWorkflowStepToMobileWizard(resolvedStep));
      setView("edit");
      setMobileView("wizard");
      setFeedback(null);
    },
    [template]
  );

  const openTestLab = useCallback(
    async (
      recipe: FabricationRecipeRecord,
      step: "test" | "plan" | "validation" = "test"
    ) => {
      openEditor(recipe, step);
      setView("test");
      await loadTests(recipe.id);
    },
    [loadTests, openEditor]
  );

  const handleCreateFromDefinition = useCallback(
    async (input: {
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
    },
    [createRecipe, lineTemplateId, openEditor, template]
  );

  const handleCreate = useCallback(
    async (sourceType: "manual" | "imported_ai" = "manual") => {
      if (!template) return;

      const structuralArchetypeId =
        typeof template.catalogMetadata?.structuralArchetypeId === "string"
          ? template.catalogMetadata.structuralArchetypeId
          : null;

      const resolvedStructuralArchetypeId = resolveArquetipoEstructuralId({
        catalogKey: template.catalogKey,
        structuralArchetypeId,
      });
      const structuralDefinition = crearRecetaEstructuralParaLineaComercial({
        catalogKey: template.catalogKey,
        structuralArchetypeId,
        lineName: template.nombre,
      });

      const definition =
        structuralDefinition ??
        crearRecetaFabricacionVacia({
          recipeIdentityId: crypto.randomUUID(),
          lineName: template.nombre,
        });
      const definitionWithCatalog = enriquecerRecetaDesdeCatalogo({
        receta: definition,
        catalogKey: template.catalogKey,
      });

      await handleCreateFromDefinition({
        definition: definitionWithCatalog,
        sourceType,
        sourceReference: structuralDefinition
          ? `ventora-arquetipo:${resolvedStructuralArchetypeId ?? template.catalogKey}`
          : "blank-start",
      });
    },
    [handleCreateFromDefinition, template]
  );

  const prepareLineSetupDraft = useCallback(
    (sourceDraft: FabricacionReceta | null = draft) => {
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
    },
    [draft, hasChangedRecipeStartMode, lineName, recipeStartMode]
  );

  const resolveStartModePersistence = useCallback(
    (
      recipeToSave: FabricacionReceta
    ): Pick<
      UpdateFabricationRecipeInput,
      "sourceType" | "sourceReference" | "sourceName" | "sourceRevision"
    > => {
      if (!hasChangedRecipeStartMode && selected) {
        return {
          sourceType: selected.sourceType,
          sourceReference: selected.sourceReference,
          sourceName: selected.sourceName ?? null,
          sourceRevision: selected.sourceRevision ?? null,
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
    },
    [hasChangedRecipeStartMode, recipeStartMode, selected]
  );

  const handleSave = useCallback(
    async (nextDraft?: FabricacionReceta, options?: { silent?: boolean }) => {
      const recipeToSave = nextDraft ?? draft;
      if (!selected || !recipeToSave) return null;
      const silent = options?.silent === true;
      const startModeMeta = resolveStartModePersistence(recipeToSave);
      const catalogKey = resolveEffectiveSodalL25CatalogKey({
        catalogKey: template?.catalogKey,
        nombre: template?.nombre,
      });
      const isL25ValidatedEdit =
        selected.status === "validated" && isSodalL25CatalogKey(catalogKey);

      const updated = isL25ValidatedEdit
        ? await createRecipeVersion(
            selected.id,
            {
              definition: recipeToSave,
              status: "testing",
            },
            { quiet: silent }
          )
        : await updateRecipe(
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

      setSelectedId(updated.id);
      setDraft(cloneFabricacionRecipe(updated.definition));

      if (!silent) {
        setFeedback(
          isL25ValidatedEdit
            ? "Ajustes guardados. Puedes seguir editando esta variante."
            : "Borrador guardado."
        );
      }
      setHasChangedRecipeStartMode(false);
      setLineSetupError(null);
      return updated;
    },
    [
      createRecipeVersion,
      draft,
      lineMaterial,
      lineName,
      providerName,
      resolveStartModePersistence,
      selected,
      template,
      updateRecipe,
      updateTemplate,
    ]
  );

  const navigateToRecipeStep = useCallback(
    async (recipe: FabricationRecipeRecord, step: RecipeWorkflowStepId) => {
      if (step === "base" || step === "components" || step === "rules") {
        if (
          (view === "edit" || view === "test") &&
          selectedId === recipe.id &&
          draft
        ) {
          setView("edit");
          setMobileView("wizard");
          setActiveStep(step);
          setMobileWizardStep(mapWorkflowStepToMobileWizard(step));
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
        openEditor(recipe, step);
        return;
      }

      const draftToPersist =
        view === "edit" &&
        draft &&
        selectedId === recipe.id &&
        selected?.status !== "validated"
          ? draft
          : recipe.definition;
      const recipeToTest = draftToPersist ?? recipe.definition;
      const probarEvaluacion = evaluarRecetaListaParaProbar(recipeToTest);
      const recipeSummary = buildFabricationRecipeSummary(recipeToTest);
      if (!probarEvaluacion.listaParaProbar || !recipeSummary.compositionComplete) {
        setFeedback(
          probarEvaluacion.bloqueos[0] ??
            "Completa la composición técnica antes de probar; no se generará una pauta mientras siga pendiente."
        );
        return;
      }
      const draftToPersistSilent =
        view === "edit" &&
        draft &&
        selectedId === recipe.id &&
        selected?.status !== "validated"
          ? draft
          : null;
      void openTestLab(recipe, step);
      if (draftToPersistSilent) {
        void handleSave(draftToPersistSilent, { silent: true }).catch(
          () => undefined
        );
      }
    },
    [draft, handleSave, openEditor, openTestLab, selected?.status, selectedId, view]
  );

  const handleSaveLineSetup = useCallback(async () => {
    const prepared = prepareLineSetupDraft();
    if (!prepared) return;
    setDraft(prepared);
    await handleSave(prepared);
  }, [handleSave, prepareLineSetupDraft]);

  const handleContinueToRecipe = useCallback(() => {
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
      )?.label ?? draft.identidad.tipologia.replaceAll("_", " ");
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
    setMobileWizardStep("profiles");
    window.scrollTo({ top: 0, behavior: "auto" });
    if (selected.status !== "validated") {
      void handleSave(preparedNamed, { silent: true }).catch(() => undefined);
    }
  }, [draft, handleSave, lineName, prepareLineSetupDraft, selected]);

  const handleCreateMissingVariant = useCallback(
    async (item: FabricacionVariantTreeItem) => {
      if (!template) return;
      setIsCreatingVariant(true);
      try {
        const plantillaId = resolvePlantillaIdFromCatalogKey(template.catalogKey);
        const definition = item.slot.buildDefinition({
          lineName: template.nombre,
          plantillaId,
        });
        const created = await createRecipe({
          lineTemplateId,
          providerName: template.proveedor ?? "",
          lineName: template.nombre,
          typology: item.slot.typology,
          leavesCount: item.slot.leavesCount,
          variant: definition.identidad.variante,
          definition,
          sourceType: item.slot.complete ? "workshop" : "manual",
          sourceReference: item.slot.sourceReference,
        });
        openEditor(created);
      } finally {
        setIsCreatingVariant(false);
      }
    },
    [createRecipe, lineTemplateId, openEditor, template]
  );

  const handleDuplicate = useCallback(
    async (recipe: FabricationRecipeRecord) => {
      if (!template) return;
      const duplicated = await duplicateRecipe(recipe.id, {
        lineTemplateId,
        providerName: template.proveedor ?? recipe.providerName,
        lineName: template.nombre,
      });
      openEditor(duplicated);
    },
    [duplicateRecipe, lineTemplateId, openEditor, template]
  );

  const handleUseSuggested = useCallback(
    async (entry: BibliotecaRecetaSugerida) => {
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
    },
    [createRecipe, lineTemplateId, openEditor, template]
  );

  const handleNewVersion = useCallback(
    async (recipe: FabricationRecipeRecord) => {
      const version = await createRecipeVersion(recipe.id);
      openEditor(version);
    },
    [createRecipeVersion, openEditor]
  );

  const handleArchive = useCallback(
    async (recipe: FabricationRecipeRecord) => {
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
    },
    [archiveRecipe, returnToList]
  );

  const handleValidate = useCallback(
    async (options?: { stayOnStep?: boolean }) => {
      if (!selected) return;
      await validateRecipe(selected.id);
      setFeedback("Receta validada");
      if (!options?.stayOnStep) {
        returnToList();
      }
    },
    [returnToList, selected, validateRecipe]
  );

  const openMobileFabrication = useCallback(
    async (recipe?: FabricationRecipeRecord | null) => {
      const target = recipe ?? focusRecipe;
      if (!target) {
        await handleCreate("manual");
        return;
      }
      openEditor(target, "base");
    },
    [focusRecipe, handleCreate, openEditor]
  );

  const navigateMobileWizardStep = useCallback(
    (step: MobileWizardStepId) => {
      setMobileWizardStep(step);
      setActiveStep(mapMobileWizardToWorkflowStep(step));
    },
    []
  );

  useEffect(() => {
    if (
      !enableDesktopBootstrap ||
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
        openEditor(focusRecipe);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }

    if (hasBootstrappedEmptyRecipe.current || isSaving) return;
    hasBootstrappedEmptyRecipe.current = true;
    void handleCreate("manual").catch(() => {
      hasBootstrappedEmptyRecipe.current = false;
    });
  }, [
    enableDesktopBootstrap,
    focusRecipe,
    handleCreate,
    hasResolvedWorkspaceViewport,
    isDesktopWorkspace,
    isLoading,
    isLoadingTemplates,
    isSaving,
    openEditor,
    template,
    view,
  ]);

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

  return {
    template,
    providerOptions,
    lineRecipes,
    fabricacionLineRecipes,
    ventoraRecipes,
    suggestedRecipesForLine,
    variantTreeGroups,
    focusRecipe,
    focusTests,
    focusProgress,
    archivedRecipeCount,
    selected,
    selectedTests,
    selectedId,
    draft,
    setDraft,
    providerName,
    setProviderName,
    lineName,
    setLineName,
    lineMaterial,
    setLineMaterial,
    recipeStartMode,
    setRecipeStartMode,
    hasChangedRecipeStartMode,
    setHasChangedRecipeStartMode,
    lineSetupError,
    feedback,
    setFeedback,
    activeStep,
    setActiveStep,
    view,
    setView,
    mobileView,
    setMobileView,
    mobileWizardStep,
    navigateMobileWizardStep,
    isCreatingVariant,
    isLoading,
    isLoadingTemplates,
    isResolvingOrganization,
    isSaving,
    isSavingLineTemplate,
    error,
    lineTemplateError,
    recipes,
    tests,
    returnToList,
    openEditor,
    openTestLab,
    openMobileFabrication,
    handleCreate,
    handleCreateFromDefinition,
    handleCreateMissingVariant,
    handleSave,
    handleSaveLineSetup,
    handleContinueToRecipe,
    navigateToRecipeStep,
    handleDuplicate,
    handleUseSuggested,
    handleNewVersion,
    handleArchive,
    handleValidate,
    prepareLineSetupDraft,
    createRecipeTest,
    runRecipeTest,
    updateRecipe,
    loadTests,
  };
}

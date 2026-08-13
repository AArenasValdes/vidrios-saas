"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LuArrowLeft,
  LuBookOpen,
  LuChevronRight,
  LuCopyPlus,
  LuEllipsisVertical,
  LuPlus,
  LuSearch,
  LuSlidersHorizontal,
  LuSettings2,
  LuTrash2,
  LuUpload,
} from "react-icons/lu";
import { useFabricationRecipes } from "@/features/fabricacion/hooks/use-fabrication-recipes";
import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import { useCotizacionLineTemplates } from "@/features/cotizaciones/line-templates/hooks/useCotizacionLineTemplates";
import { buildTechnicalCardStatus } from "@/features/cotizaciones/line-templates/services/catalogo-fabricacion-card-status";
import {
  buildFabricationRecipeInputFromInicioRapido,
  buildLineTemplatePayloadFromInicioRapido,
  listarInicioRapidoCatalogo,
  type CatalogoInicioRapidoItem,
} from "@/features/cotizaciones/line-templates/services/catalogo-usar-base-ventora.service";
import { CatalogoBasesVentoraSection } from "@/features/cotizaciones/line-templates/components/catalogo-bases-ventora-section";
import {
  buildLineTemplateCuttingPreview,
  getLineTemplateCubicationConfig,
  getLineTemplateGlassMetadata,
  getLineTemplateProfilePreview,
  getLineTemplateCuttingRules,
  getLineTemplateEstimationRules,
  getLineTemplateSystemMetadata,
  mergeLineTemplateCubicationConfig,
  mergeLineTemplateGlassMetadata,
  mergeLineTemplateCuttingRules,
  mergeLineTemplateEstimationRules,
  mergeLineTemplateSystemMetadata,
  clearNeedsCommercialPriceFlag,
  lineTemplateNeedsCommercialPrice,
  CotizacionLineTemplate,
  CotizacionLineTemplateCategoria,
  CotizacionLineTemplateEstimationMode,
  CotizacionLineTemplateMaterial,
  CotizacionLineTemplateUnidadCobro,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  applyCalibrationPresetToCubicationPatch,
  getCubicationSystemCalibrationPreset,
  resolveStatusAfterCalibrationEdit,
  suggestCubicationDeductionsFromWorkshopExample,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-calibration";
import {
  formatLineTemplatePriceLabel,
  LINE_TEMPLATE_CATEGORIA_LABELS,
} from "@/features/cotizaciones/line-templates/utils/catalog-labels";
import {
  compareLineTemplateGroups,
  getLineTemplateProviderLabel,
  listLineTemplateProviderFilterOptions,
  LINE_TEMPLATE_GROUP_NO_PROVIDER,
  LINE_TEMPLATE_GROUP_NO_SYSTEM,
  LINE_TEMPLATE_PROVIDER_FILTER_ALL,
} from "@/features/cotizaciones/line-templates/services/line-template-group.service";
import { formatCurrency } from "@/utils/formatCurrency";

import type { LineTemplateFormDraft } from "./line-template-form-wizard";
import {
  getFabricationRecipeFromMetadata,
  getFabricationRecipePackFromMetadata,
} from "@/features/cotizaciones/line-templates/types/fabrication-recipe";
import {
  buildRecipeCuttingPreview,
  migrateLegacyCubicationToRecipe,
  recipePreviewToLegacyCuttingPreview,
} from "@/features/cotizaciones/line-templates/services/fabrication-recipe.service";
import s from "./lineas-precios-page-client.module.css";
import desktop from "./lineas-precios-page-client.desktop.module.css";
import {
  LineasPreciosMobileView,
} from "./lineas-precios-mobile-view";

const LineTemplateFormWizard = dynamic(
  () =>
    import("./line-template-form-wizard").then((module) => ({
      default: module.LineTemplateFormWizard,
    })),
  {
    ssr: false,
    loading: () => (
      <div className={s.wizardLoadingOverlay} role="status" aria-live="polite">
        <div className={s.wizardLoading}>Preparando editor...</div>
      </div>
    ),
  }
);

export type { LineTemplateFormDraft };

function formatDeductionInput(value: number) {
  return value > 0 ? String(Math.round(value)) : "0";
}

type StatusFilterValue = "todas" | "activas" | "inactivas";
type CategoryFilterValue = "Todo" | "aluminio" | "pvc" | "vidrio";
type TechnicalFilterValue =
  | "todas"
  | "solo_cotizar"
  | "borradores"
  | "listas_para_probar"
  | "validadas";

type Props = {
  openNewByDefault?: boolean;
};

function parseDecimal(value: string) {
  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function formatDecimalInput(value: number) {
  return value > 0 ? String(value).replace(".", ",") : "";
}

function buildDraft(template?: CotizacionLineTemplate): LineTemplateFormDraft {
  const glassMetadata = getLineTemplateGlassMetadata(template?.catalogMetadata);
  const estimationRules = getLineTemplateEstimationRules(template?.catalogMetadata);
  const cuttingRules = getLineTemplateCuttingRules(template?.catalogMetadata);
  const systemMetadata = getLineTemplateSystemMetadata(template?.catalogMetadata);
  const cubicationConfig = getLineTemplateCubicationConfig(template?.catalogMetadata);
  return {
    nombre: template?.nombre ?? "",
    categoria: template?.categoria ?? "aluminio",
    unidadCobro: template?.unidadCobro ?? "m2",
    material: template?.material ?? "",
    espesor: glassMetadata.espesor ?? "",
    terminacion: glassMetadata.terminacion ?? "",
    vidrioPrincipalRecomendado: template?.vidrioPrincipalRecomendado ?? "",
    costoBase: template && template.costoBase > 0 ? String(template.costoBase) : "",
    precioM2Sugerido:
      template && template.precioM2Sugerido > 0 ? String(template.precioM2Sugerido) : "",
    minimoCobrable:
      template && template.minimoCobrable > 0 ? String(template.minimoCobrable) : "",
    redondeoPrecio: String(template?.redondeoPrecio ?? 1000),
    mermaPct: template && template.mermaPct > 0 ? String(template.mermaPct) : "",
    margenObjetivoPct:
      template?.margenObjetivoPct && template.margenObjetivoPct > 0
        ? String(template.margenObjetivoPct)
        : "",
    proveedor: template?.proveedor ?? "",
    lineSystem: systemMetadata.lineSystem ?? "",
    cubicationSystem: cubicationConfig.system,
    cubicationStatus: cubicationConfig.status,
    profileFrame: cubicationConfig.profileFrame,
    profileSash: cubicationConfig.profileSash,
    profileMeeting: cubicationConfig.profileMeeting ?? "",
    profileGlazingBead: cubicationConfig.profileGlazingBead ?? "",
    profileSill: cubicationConfig.profileSill ?? "",
    profileAccessory: cubicationConfig.profileAccessory ?? "",
    deductionFrameHorizontalMm: formatDeductionInput(
      cubicationConfig.deductionFrameHorizontalMm
    ),
    deductionFrameVerticalMm: formatDeductionInput(cubicationConfig.deductionFrameVerticalMm),
    deductionSashHorizontalMm: formatDeductionInput(cubicationConfig.deductionSashHorizontalMm),
    deductionSashVerticalMm: formatDeductionInput(cubicationConfig.deductionSashVerticalMm),
    deductionGlassWidthMm: formatDeductionInput(cubicationConfig.deductionGlassWidthMm),
    deductionGlassHeightMm: formatDeductionInput(cubicationConfig.deductionGlassHeightMm),
    vigenciaDesde: template?.vigenciaDesde ?? "",
    vigenciaHasta: template?.vigenciaHasta ?? "",
    estimationEnabled: estimationRules.enabled,
    estimationMode: template?.categoria === "vidrio" ? "vidrio" : estimationRules.mode,
    estimationFrameFactor: formatDecimalInput(estimationRules.frameFactor),
    estimationSashFactor: formatDecimalInput(estimationRules.sashFactor),
    estimationAccessoryUnits: formatDecimalInput(estimationRules.accessoryUnits),
    cuttingEnabled: cuttingRules.enabled,
    cuttingMode: cuttingRules.mode === "sin_corte" ? "marco_hojas" : cuttingRules.mode,
    cuttingBarLengthMm: String(cuttingRules.barLengthMm),
    cuttingSawKerfMm: String(cuttingRules.sawKerfMm),
    cuttingSashCount: String(cuttingRules.sashCount),
    isActive: template?.isActive ?? true,
    fabricationRecipe: template
      ? getFabricationRecipeFromMetadata(template.catalogMetadata as Record<string, unknown>) ??
        migrateLegacyCubicationToRecipe(template.catalogMetadata)
      : null,
    fabricationRecipePack: template
      ? getFabricationRecipePackFromMetadata(
          template.catalogMetadata as Record<string, unknown>
        )
      : null,
  };
}

function resolveDraftLineUsageMode(draft: LineTemplateFormDraft) {
  if (!draft.estimationEnabled) return "solo_cotizar" as const;
  return draft.cuttingEnabled ? "cubicacion_pauta" : "con_estimacion";
}

function getDigits(value: string) {
  return value.replace(/[^\d]/g, "");
}

function parseMoney(value: string) {
  const digits = getDigits(value);
  return digits ? Number(digits) : 0;
}

function buildRoundingLabel(value: number, formatMoney: (amount: number) => string) {
  return value > 0 ? formatMoney(value) : "Sin redondeo";
}

function draftHasAdvancedDetails(draft: LineTemplateFormDraft) {
  return Boolean(
    draft.minimoCobrable ||
      draft.mermaPct ||
      draft.margenObjetivoPct ||
      draft.proveedor.trim() ||
      draft.lineSystem.trim() ||
      draft.vigenciaDesde ||
      draft.vigenciaHasta ||
      draft.vidrioPrincipalRecomendado ||
      draft.espesor.trim() ||
      draft.terminacion.trim() ||
      (draft.redondeoPrecio !== "0" && draft.redondeoPrecio !== "1000")
  );
}

function buildLineTemplateGroup(template: CotizacionLineTemplate) {
  const provider = template.proveedor?.trim() || LINE_TEMPLATE_GROUP_NO_PROVIDER;
  const system =
    getLineTemplateSystemMetadata(template.catalogMetadata).lineSystem?.trim() ||
    LINE_TEMPLATE_GROUP_NO_SYSTEM;

  return {
    key: `${provider.toLowerCase()}::${system.toLowerCase()}`,
    provider,
    system,
    label: `${provider} · ${system}`,
  };
}

export function LineasPreciosPageClient({ openNewByDefault = false }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { profile } = useOrganizationProfile();
  const formatMoney = useCallback(
    (value: number) => formatCurrency(value, profile?.locale, profile?.currencyCode),
    [profile?.currencyCode, profile?.locale]
  );
  const {
    templates,
    isLoading,
    isSaving,
    error,
    createTemplate,
    updateTemplate,
    duplicateTemplate,
    deleteTemplate,
  } = useCotizacionLineTemplates();
  const { recipes: fabricationRecipes, createRecipe } = useFabricationRecipes();
  const ventoraBaseRecommendations = useMemo(
    () => listarInicioRapidoCatalogo(),
    []
  );
  const [usingBaseId, setUsingBaseId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterValue>("Todo");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("todas");
  const [technicalFilter, setTechnicalFilter] =
    useState<TechnicalFilterValue>("todas");
  const [providerFilter, setProviderFilter] = useState<string>(
    LINE_TEMPLATE_PROVIDER_FILTER_ALL
  );
  const [desktopFiltersOpen, setDesktopFiltersOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);
  const [sheetMode, setSheetMode] = useState<"new" | "edit" | null>(() =>
    openNewByDefault ? "new" : null
  );
  const [editingTemplateId, setEditingTemplateId] = useState<string | number | null>(null);
  const [draft, setDraft] = useState<LineTemplateFormDraft>(() => buildDraft());
  const [wizardStep, setWizardStep] = useState(1);
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);
  const [calibrationVanoWidthMm, setCalibrationVanoWidthMm] = useState("1200");
  const [calibrationVanoHeightMm, setCalibrationVanoHeightMm] = useState("1000");
  const [expectedGlassWidthMm, setExpectedGlassWidthMm] = useState("");
  const [expectedGlassHeightMm, setExpectedGlassHeightMm] = useState("");
  const [expectedFrameHorizontalMm, setExpectedFrameHorizontalMm] = useState("");
  const [expectedFrameVerticalMm, setExpectedFrameVerticalMm] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(
    null
  );
  const openedEditQueryRef = useRef<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timeoutId = window.setTimeout(() => setFeedback(null), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  const activeCount = useMemo(
    () => templates.filter((template) => template.isActive).length,
    [templates]
  );
  const categoryCounts = useMemo(
    () => ({
      Todo: templates.length,
      aluminio: templates.filter((template) => template.categoria === "aluminio").length,
      pvc: templates.filter((template) => template.categoria === "pvc").length,
      vidrio: templates.filter((template) => template.categoria === "vidrio").length,
    }),
    [templates]
  );

  const providerFilterOptions = useMemo(
    () =>
      listLineTemplateProviderFilterOptions(
        templates.map((template) => template.proveedor)
      ),
    [templates]
  );

  const effectiveProviderFilter =
    providerFilter === LINE_TEMPLATE_PROVIDER_FILTER_ALL ||
    providerFilterOptions.includes(providerFilter)
      ? providerFilter
      : LINE_TEMPLATE_PROVIDER_FILTER_ALL;
  const desktopFilterCount = [
    categoryFilter !== "Todo",
    statusFilter !== "todas",
    technicalFilter !== "todas",
    effectiveProviderFilter !== LINE_TEMPLATE_PROVIDER_FILTER_ALL,
  ].filter(Boolean).length;

  const technicalStatusesByTemplateId = useMemo(
    () =>
      new Map(
        templates.map((template) => [
          String(template.id),
          buildTechnicalCardStatus(
            template,
            fabricationRecipes.filter(
              (recipe) =>
                recipe.scope === "organization" &&
                recipe.lineTemplateId === Number(template.id)
            )
          ),
        ])
      ),
    [fabricationRecipes, templates]
  );
  const technicalFilterCounts = useMemo(
    () => ({
      todas: templates.length,
      solo_cotizar: templates.filter(
        (template) =>
          technicalStatusesByTemplateId.get(String(template.id))?.filter ===
          "solo_cotizar"
      ).length,
      borradores: templates.filter(
        (template) =>
          technicalStatusesByTemplateId.get(String(template.id))?.filter ===
          "borradores"
      ).length,
      listas_para_probar: templates.filter(
        (template) =>
          technicalStatusesByTemplateId.get(String(template.id))?.filter ===
          "listas_para_probar"
      ).length,
      validadas: templates.filter(
        (template) =>
          technicalStatusesByTemplateId.get(String(template.id))?.filter ===
          "validadas"
      ).length,
    }),
    [technicalStatusesByTemplateId, templates]
  );

  const filteredTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return templates.filter((template) => {
      const matchesCategory =
        categoryFilter === "Todo" ? true : template.categoria === categoryFilter;
      const matchesStatus =
        statusFilter === "todas"
          ? true
          : statusFilter === "activas"
            ? template.isActive
            : !template.isActive;
      const matchesTechnical =
        technicalFilter === "todas"
          ? true
          : technicalStatusesByTemplateId.get(String(template.id))?.filter ===
            technicalFilter;
      const providerLabel = getLineTemplateProviderLabel(template.proveedor);
      const matchesProvider =
        effectiveProviderFilter === LINE_TEMPLATE_PROVIDER_FILTER_ALL
          ? true
          : providerLabel === effectiveProviderFilter;
      const matchesQuery = normalizedQuery
        ? template.nombre.toLowerCase().includes(normalizedQuery)
          || (template.proveedor ?? "").toLowerCase().includes(normalizedQuery)
          || (getLineTemplateSystemMetadata(template.catalogMetadata).lineSystem ?? "")
            .toLowerCase()
            .includes(normalizedQuery)
        : true;

      return (
        matchesCategory &&
        matchesStatus &&
        matchesTechnical &&
        matchesProvider &&
        matchesQuery
      );
    });
  }, [
    categoryFilter,
    effectiveProviderFilter,
    query,
    statusFilter,
    technicalFilter,
    technicalStatusesByTemplateId,
    templates,
  ]);
  const groupedTemplates = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        provider: string;
        system: string;
        label: string;
        templates: CotizacionLineTemplate[];
      }
    >();

    filteredTemplates.forEach((template) => {
      const group = buildLineTemplateGroup(template);
      const existingGroup = groups.get(group.key);
      if (existingGroup) {
        existingGroup.templates.push(template);
        return;
      }

      groups.set(group.key, { ...group, templates: [template] });
    });

    return Array.from(groups.values()).sort(compareLineTemplateGroups);
  }, [filteredTemplates]);

  const pricePerM2 = parseMoney(draft.precioM2Sugerido);
  const minimum = parseMoney(draft.minimoCobrable);
  const costoBase = parseMoney(draft.costoBase);
  const unidadCobro = (draft.unidadCobro || "m2") as CotizacionLineTemplateUnidadCobro;
  const isGlassDraft = draft.categoria === "vidrio";
  const estimationFrameFactor = parseDecimal(draft.estimationFrameFactor);
  const estimationSashFactor = parseDecimal(draft.estimationSashFactor);
  const estimationAccessoryUnits = parseDecimal(draft.estimationAccessoryUnits);
  const estimationSampleAreaM2 = 1.2;
  const estimationSamplePerimeterMl = 4.4;
  const estimationSampleFrameMl =
    draft.estimationEnabled && draft.estimationMode !== "vidrio"
      ? estimationSamplePerimeterMl * estimationFrameFactor
      : 0;
  const estimationSampleSashMl =
    draft.estimationEnabled && draft.estimationMode === "marco_hojas"
      ? estimationSamplePerimeterMl * estimationSashFactor
      : 0;
  const draftCubicationConfig = {
    system: draft.cubicationSystem,
    status: draft.cubicationStatus,
    profileFrame: draft.profileFrame || "Marco",
    profileSash: draft.profileSash || "Hoja",
    profileMeeting: draft.profileMeeting || null,
    profileGlazingBead: draft.profileGlazingBead || null,
    profileSill: draft.profileSill || null,
    profileAccessory: draft.profileAccessory || null,
    deductionFrameHorizontalMm: parseDecimal(draft.deductionFrameHorizontalMm),
    deductionFrameVerticalMm: parseDecimal(draft.deductionFrameVerticalMm),
    deductionSashHorizontalMm: parseDecimal(draft.deductionSashHorizontalMm),
    deductionSashVerticalMm: parseDecimal(draft.deductionSashVerticalMm),
    deductionGlassWidthMm: parseDecimal(draft.deductionGlassWidthMm),
    deductionGlassHeightMm: parseDecimal(draft.deductionGlassHeightMm),
  };
  const calibrationWidthMm = Math.max(1, Math.round(parseDecimal(calibrationVanoWidthMm) || 1200));
  const calibrationHeightMm = Math.max(
    1,
    Math.round(parseDecimal(calibrationVanoHeightMm) || 1000)
  );
  const calibrationSuggestion = suggestCubicationDeductionsFromWorkshopExample({
    system: draft.cubicationSystem,
    vanoWidthMm: calibrationWidthMm,
    vanoHeightMm: calibrationHeightMm,
    sashCount: Math.max(1, Math.round(parseDecimal(draft.cuttingSashCount) || 2)),
    expectedGlassWidthMm: parseDecimal(expectedGlassWidthMm),
    expectedGlassHeightMm: parseDecimal(expectedGlassHeightMm),
    expectedFrameHorizontalMm: expectedFrameHorizontalMm.trim()
      ? parseDecimal(expectedFrameHorizontalMm)
      : null,
    expectedFrameVerticalMm: expectedFrameVerticalMm.trim()
      ? parseDecimal(expectedFrameVerticalMm)
      : null,
  });
  const systemCalibrationPreset = getCubicationSystemCalibrationPreset(draft.cubicationSystem);
  const expectedGlassWidthValue = expectedGlassWidthMm.trim()
    ? Math.round(parseDecimal(expectedGlassWidthMm))
    : null;
  const expectedGlassHeightValue = expectedGlassHeightMm.trim()
    ? Math.round(parseDecimal(expectedGlassHeightMm))
    : null;
  const cuttingPreview = (() => {
    const rules = {
      enabled: draft.estimationEnabled && draft.cuttingEnabled && !isGlassDraft,
      mode: draft.cuttingMode,
      barLengthMm: parseDecimal(draft.cuttingBarLengthMm),
      sawKerfMm: parseDecimal(draft.cuttingSawKerfMm),
      sashCount: parseDecimal(draft.cuttingSashCount),
    };
    const dims = {
      widthMm: calibrationWidthMm,
      heightMm: calibrationHeightMm,
      quantity: 1,
    };
    if (draft.fabricationRecipe && rules.enabled) {
      return recipePreviewToLegacyCuttingPreview(
        buildRecipeCuttingPreview(draft.fabricationRecipe, {
          ...dims,
          sashCount: draft.fabricationRecipe.sashCount,
          moduleCount: draft.fabricationRecipe.moduleCount,
        }, {
          barLengthMm: rules.barLengthMm,
          kerfMm: rules.sawKerfMm,
        })
      );
    }
    return buildLineTemplateCuttingPreview(rules, dims, draftCubicationConfig);
  })();
  const glassCalibrationDelta =
    cuttingPreview.glass &&
    expectedGlassWidthValue != null &&
    expectedGlassHeightValue != null
      ? {
          widthMm: cuttingPreview.glass.widthMm - expectedGlassWidthValue,
          heightMm: cuttingPreview.glass.heightMm - expectedGlassHeightValue,
        }
      : null;
  const saveDisabled =
    !draft.nombre.trim() ||
    !draft.categoria ||
    !draft.unidadCobro ||
    (!isGlassDraft && !draft.material);
  const sheetTitle =
    sheetMode === "edit"
      ? isGlassDraft
        ? "Editar producto de cristal"
        : "Editar línea"
      : isGlassDraft
        ? "Nuevo producto de cristal"
        : "Nueva línea";

  const resetQueryFlag = () => {
    if (!searchParams.get("nueva") && !searchParams.get("editar")) return;
    router.replace(pathname, { scroll: false });
  };

  const openNewSheet = () => {
    const nextDraft = buildDraft();
    setDraft(nextDraft);
    setWizardStep(1);
    setShowAdvancedDetails(false);
    setCalibrationVanoWidthMm("1200");
    setCalibrationVanoHeightMm("1000");
    setExpectedGlassWidthMm("");
    setExpectedGlassHeightMm("");
    setExpectedFrameHorizontalMm("");
    setExpectedFrameVerticalMm("");
    setEditingTemplateId(null);
    setOpenMenuId(null);
    setFeedback(null);
    setSheetMode("new");
  };

  const openEditSheet = useCallback((template: CotizacionLineTemplate) => {
    const nextDraft = buildDraft(template);
    setDraft(nextDraft);
    setWizardStep(1);
    setShowAdvancedDetails(draftHasAdvancedDetails(nextDraft));
    setCalibrationVanoWidthMm("1200");
    setCalibrationVanoHeightMm("1000");
    setExpectedGlassWidthMm("");
    setExpectedGlassHeightMm("");
    setExpectedFrameHorizontalMm("");
    setExpectedFrameVerticalMm("");
    setEditingTemplateId(template.id);
    setOpenMenuId(null);
    setFeedback(null);
    setSheetMode("edit");
  }, []);

  useEffect(() => {
    const requestedId = searchParams.get("editar");
    if (!requestedId || isLoading || openedEditQueryRef.current === requestedId) return;
    const requestedTemplate = templates.find(
      (template) => String(template.id) === requestedId
    );
    if (!requestedTemplate) return;
    openedEditQueryRef.current = requestedId;
    const timeoutId = window.setTimeout(() => openEditSheet(requestedTemplate), 0);
    return () => window.clearTimeout(timeoutId);
  }, [isLoading, openEditSheet, searchParams, templates]);

  const closeSheet = () => {
    setSheetMode(null);
    setEditingTemplateId(null);
    setWizardStep(1);
    setShowAdvancedDetails(false);
    setDraft(buildDraft());
    openedEditQueryRef.current = null;
    resetQueryFlag();
  };


  const handleApplySystemCalibrationPreset = () => {
    const preset = getCubicationSystemCalibrationPreset(draft.cubicationSystem);
    const cubicationPatch = applyCalibrationPresetToCubicationPatch(preset);
    setDraft((current) => {
      const usageMode = resolveDraftLineUsageMode(current);
      return {
        ...current,
        profileFrame: cubicationPatch.profileFrame ?? current.profileFrame,
        profileSash: cubicationPatch.profileSash ?? current.profileSash,
        profileMeeting: cubicationPatch.profileMeeting ?? "",
        profileGlazingBead: cubicationPatch.profileGlazingBead ?? "",
        profileSill: cubicationPatch.profileSill ?? "",
        profileAccessory: cubicationPatch.profileAccessory ?? "",
        deductionFrameHorizontalMm: formatDeductionInput(
          cubicationPatch.deductionFrameHorizontalMm ?? 0
        ),
        deductionFrameVerticalMm: formatDeductionInput(
          cubicationPatch.deductionFrameVerticalMm ?? 0
        ),
        deductionSashHorizontalMm: formatDeductionInput(
          cubicationPatch.deductionSashHorizontalMm ?? 0
        ),
        deductionSashVerticalMm: formatDeductionInput(
          cubicationPatch.deductionSashVerticalMm ?? 0
        ),
        deductionGlassWidthMm: formatDeductionInput(cubicationPatch.deductionGlassWidthMm ?? 0),
        deductionGlassHeightMm: formatDeductionInput(cubicationPatch.deductionGlassHeightMm ?? 0),
        cuttingMode: preset.suggestedCuttingMode,
        cuttingSashCount: String(preset.suggestedSashCount),
        estimationEnabled: usageMode !== "solo_cotizar",
        cuttingEnabled: usageMode === "cubicacion_pauta",
        cubicationStatus: resolveStatusAfterCalibrationEdit(current.cubicationStatus),
      };
    });
    setFeedback({
      kind: "success",
      message: "Preset del sistema aplicado. Revisa con tu ejemplo real y guarda.",
    });
  };

  const handleApplyWorkshopCalibrationSuggestion = () => {
    if (!calibrationSuggestion.canApply) {
      setFeedback({
        kind: "error",
        message: "Ingresa el vidrio real (ancho y alto) del ejemplo de taller.",
      });
      return;
    }

    const patch = calibrationSuggestion.patch;
    setDraft((current) => ({
      ...current,
      deductionFrameHorizontalMm:
        patch.deductionFrameHorizontalMm != null
          ? formatDeductionInput(patch.deductionFrameHorizontalMm)
          : current.deductionFrameHorizontalMm,
      deductionFrameVerticalMm:
        patch.deductionFrameVerticalMm != null
          ? formatDeductionInput(patch.deductionFrameVerticalMm)
          : current.deductionFrameVerticalMm,
      deductionSashHorizontalMm:
        patch.deductionSashHorizontalMm != null
          ? formatDeductionInput(patch.deductionSashHorizontalMm)
          : current.deductionSashHorizontalMm,
      deductionSashVerticalMm:
        patch.deductionSashVerticalMm != null
          ? formatDeductionInput(patch.deductionSashVerticalMm)
          : current.deductionSashVerticalMm,
      deductionGlassWidthMm:
        patch.deductionGlassWidthMm != null
          ? formatDeductionInput(patch.deductionGlassWidthMm)
          : current.deductionGlassWidthMm,
      deductionGlassHeightMm:
        patch.deductionGlassHeightMm != null
          ? formatDeductionInput(patch.deductionGlassHeightMm)
          : current.deductionGlassHeightMm,
      cubicationStatus: resolveStatusAfterCalibrationEdit(current.cubicationStatus),
    }));
    setFeedback({
      kind: "success",
      message: "Descuentos ajustados al ejemplo. Guarda la línea para persistirlos.",
    });
  };

  const handleDraftChange = <K extends keyof LineTemplateFormDraft>(
    key: K,
    value: LineTemplateFormDraft[K]
  ) => {
    setDraft((current) => {
      if (key === "categoria") {
        const categoria = value as CotizacionLineTemplateCategoria;
        if (categoria === "vidrio") {
          return {
            ...current,
            categoria,
            material: "Cristal",
            unidadCobro: "m2",
            lineSystem: "Cristal",
            vidrioPrincipalRecomendado: "",
            estimationMode: "vidrio",
            estimationFrameFactor: "",
            estimationSashFactor: "",
          };
        }

        return {
          ...current,
          categoria,
          material: categoria === "pvc" ? "PVC" : "Aluminio",
          lineSystem: current.lineSystem === "Cristal" ? "" : current.lineSystem,
          estimationMode:
            current.estimationMode === "vidrio" ? "marco_simple" : current.estimationMode,
          estimationFrameFactor:
            current.estimationMode === "vidrio" && !current.estimationFrameFactor
              ? "1"
              : current.estimationFrameFactor,
        };
      }

      if (key === "estimationMode") {
        const mode = value as CotizacionLineTemplateEstimationMode;
        return {
          ...current,
          estimationMode: mode,
          estimationFrameFactor: mode === "vidrio" ? "" : current.estimationFrameFactor || "1",
          estimationSashFactor:
            mode === "marco_hojas" ? current.estimationSashFactor || "1" : "",
        };
      }

      if (key === "estimationEnabled" && value === false) {
        return { ...current, estimationEnabled: false, cuttingEnabled: false };
      }

      return { ...current, [key]: value };
    });
  };

  const handleDraftPatch = (patch: Partial<LineTemplateFormDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const handleSave = async (options?: { openTechnicalWorkspace?: boolean }) => {
    if (saveDisabled) return;

    // Mantener material alineado a categoría: evita líneas PVC guardadas como
    // Aluminio (o al revés) que luego no aparecen al cotizar.
    const material: CotizacionLineTemplateMaterial = isGlassDraft
      ? "Cristal"
      : draft.categoria === "pvc"
        ? "PVC"
        : draft.categoria === "vidrio"
          ? "Cristal"
          : draft.material === "PVC"
            ? "PVC"
            : "Aluminio";
    if (!material) return;

    const editingTemplate =
      sheetMode === "edit" && editingTemplateId !== null
        ? templates.find((template) => template.id === editingTemplateId)
        : undefined;

    const catalogMetadata = clearNeedsCommercialPriceFlag(
      mergeLineTemplateCuttingRules(
        mergeLineTemplateEstimationRules(
          mergeLineTemplateCubicationConfig(
            mergeLineTemplateSystemMetadata(
              mergeLineTemplateGlassMetadata(
                editingTemplate?.catalogMetadata,
                isGlassDraft
                  ? {
                      espesor: draft.espesor,
                      terminacion: draft.terminacion,
                    }
                  : {}
              ),
              {
                lineSystem: draft.lineSystem,
              }
            ),
            {
              system: draft.cubicationSystem,
              status: draft.cubicationStatus,
              profileFrame: draft.profileFrame,
              profileSash: draft.profileSash,
              profileMeeting: draft.profileMeeting || null,
              profileGlazingBead: draft.profileGlazingBead || null,
              profileSill: draft.profileSill || null,
              profileAccessory: draft.profileAccessory || null,
              deductionFrameHorizontalMm: parseDecimal(draft.deductionFrameHorizontalMm),
              deductionFrameVerticalMm: parseDecimal(draft.deductionFrameVerticalMm),
              deductionSashHorizontalMm: parseDecimal(draft.deductionSashHorizontalMm),
              deductionSashVerticalMm: parseDecimal(draft.deductionSashVerticalMm),
              deductionGlassWidthMm: parseDecimal(draft.deductionGlassWidthMm),
              deductionGlassHeightMm: parseDecimal(draft.deductionGlassHeightMm),
            }
          ),
          {
            enabled: draft.estimationEnabled,
            mode: isGlassDraft ? "vidrio" : draft.estimationMode,
            frameFactor: isGlassDraft ? 0 : estimationFrameFactor,
            sashFactor:
              isGlassDraft || draft.estimationMode !== "marco_hojas" ? 0 : estimationSashFactor,
            accessoryUnits: estimationAccessoryUnits,
          }
        ),
        {
          // Intent de pauta: se persiste aunque la receta aún no esté validada.
          // getLineTemplateCuttingRules solo habilita la pauta operativa si status === validada.
          enabled: draft.estimationEnabled && draft.cuttingEnabled && !isGlassDraft,
          mode: isGlassDraft ? "sin_corte" : draft.cuttingMode,
          barLengthMm: draft.fabricationRecipe?.defaultBarLengthMm
            ? draft.fabricationRecipe.defaultBarLengthMm
            : parseDecimal(draft.cuttingBarLengthMm),
          sawKerfMm:
            draft.fabricationRecipe?.defaultKerfMm != null
              ? draft.fabricationRecipe.defaultKerfMm
              : parseDecimal(draft.cuttingSawKerfMm),
          sashCount: parseDecimal(draft.cuttingSashCount),
        }
      ),
      pricePerM2
    );

    if (pricePerM2 <= 0) {
      catalogMetadata.needsCommercialPrice = true;
    }

    const payload = {
      nombre: draft.nombre,
      categoria: draft.categoria as CotizacionLineTemplateCategoria,
      unidadCobro: isGlassDraft ? "m2" : unidadCobro,
      material,
      vidrioPrincipalRecomendado: isGlassDraft ? null : draft.vidrioPrincipalRecomendado || null,
      costoBase,
      precioM2Sugerido: pricePerM2,
      minimoCobrable: minimum,
      redondeoPrecio: Number(draft.redondeoPrecio || "1000") || 1000,
      mermaPct: draft.mermaPct ? Number(draft.mermaPct.replace(",", ".")) : 0,
      margenObjetivoPct: draft.margenObjetivoPct
        ? Number(draft.margenObjetivoPct.replace(",", "."))
        : null,
      proveedor: draft.proveedor || null,
      vigenciaDesde: draft.vigenciaDesde || null,
      vigenciaHasta: draft.vigenciaHasta || null,
      catalogMetadata,
      isActive: draft.isActive,
    };

    try {
      if (sheetMode === "edit" && editingTemplateId !== null) {
        await updateTemplate(editingTemplateId, payload);
        setFeedback({
          kind: "success",
          message: isGlassDraft ? "Producto de cristal actualizado." : "Línea actualizada.",
        });
      } else {
        const created = await createTemplate(payload);
        if (options?.openTechnicalWorkspace && !isGlassDraft) {
          closeSheet();
          router.push(
            `/configuracion/empresa/lineas-precios/${created.id}/fabricacion`
          );
          return;
        }
        setFeedback({
          kind: "success",
          message: isGlassDraft ? "Producto de cristal guardado." : "Línea guardada.",
        });
      }

      closeSheet();
    } catch (saveError) {
      setFeedback({
        kind: "error",
        message:
          saveError instanceof Error ? saveError.message : "No pudimos guardar este producto.",
      });
    }
  };

  const handleUseVentoraBase = async (item: CatalogoInicioRapidoItem) => {
    if (usingBaseId) return;
    setUsingBaseId(item.id);
    setFeedback(null);

    try {
      const linePayload = buildLineTemplatePayloadFromInicioRapido({
        item,
        existingNames: templates.map((template) => template.nombre),
      });
      const created = await createTemplate(linePayload);
      const recipePayload = buildFabricationRecipeInputFromInicioRapido({
        item,
        lineTemplateId: Number(created.id),
        lineName: created.nombre,
      });
      await createRecipe(recipePayload);
      setFeedback({
        kind: "success",
        message:
          item.kind === "plantilla_ventora"
            ? `Se creó “${created.nombre}” con ajustes de la plantilla. Continúa la configuración.`
            : `Se creó “${created.nombre}” en tu catálogo. Continúa la configuración.`,
      });
      router.push(
        `/configuracion/empresa/lineas-precios/${created.id}/fabricacion`
      );
    } catch (useBaseError) {
      setFeedback({
        kind: "error",
        message:
          useBaseError instanceof Error
            ? useBaseError.message
            : "No pudimos crear la línea desde esta opción.",
      });
      setUsingBaseId(null);
    }
  };

  const handleToggleActive = async (template: CotizacionLineTemplate) => {
    try {
      await updateTemplate(template.id, { isActive: !template.isActive });
      setFeedback({
        kind: "success",
        message: template.isActive ? "Línea pausada." : "Línea activada.",
      });
    } catch (toggleError) {
      setFeedback({
        kind: "error",
        message:
          toggleError instanceof Error ? toggleError.message : "No pudimos cambiar el estado.",
      });
    }
  };

  const handleDuplicate = async (templateId: string | number) => {
    try {
      await duplicateTemplate(templateId);
      setOpenMenuId(null);
      setFeedback({ kind: "success", message: "Línea duplicada." });
    } catch (duplicateError) {
      setFeedback({
        kind: "error",
        message:
          duplicateError instanceof Error
            ? duplicateError.message
            : "No pudimos duplicar la línea.",
      });
    }
  };

  const handleDelete = async (templateId: string | number) => {
    const confirmed = window.confirm(
      "¿Eliminar esta línea? Es mejor pausarla si todavía podría servirte."
    );
    if (!confirmed) return;

    try {
      await deleteTemplate(templateId);
      setOpenMenuId(null);
      setFeedback({ kind: "success", message: "Línea eliminada." });
    } catch (deleteError) {
      setFeedback({
        kind: "error",
        message:
          deleteError instanceof Error
            ? deleteError.message
            : "No pudimos eliminar la línea.",
      });
    }
  };

  const isEmpty = !isLoading && templates.length === 0;
  const hasNoResults = !isLoading && templates.length > 0 && filteredTemplates.length === 0;
  const inactiveCount = templates.length - activeCount;

  return (
    <>
      <LineasPreciosMobileView
        templates={templates}
        filteredTemplates={filteredTemplates}
        activeCount={activeCount}
        inactiveCount={inactiveCount}
        query={query}
        onQueryChange={setQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        technicalFilter={technicalFilter}
        onTechnicalFilterChange={setTechnicalFilter}
        providerFilter={effectiveProviderFilter}
        providerFilterAll={LINE_TEMPLATE_PROVIDER_FILTER_ALL}
        providerOptions={providerFilterOptions}
        onProviderFilterChange={setProviderFilter}
        technicalStatuses={technicalStatusesByTemplateId}
        technicalCounts={technicalFilterCounts}
        isLoading={isLoading}
        error={error}
        feedback={feedback}
        onNew={openNewSheet}
        onEdit={openEditSheet}
        baseRecommendations={ventoraBaseRecommendations}
        isUsingBase={usingBaseId !== null}
        usingBaseId={usingBaseId}
        onUseBase={(recommendation) => void handleUseVentoraBase(recommendation)}
        formatMoney={formatMoney}
      />

      <div className={`${s.page} ${s.desktopCatalog} ${desktop.page}`}>
      <header className={`${s.header} ${desktop.header}`}>
        <Link href="/configuracion/empresa" className={s.backButton}>
          <LuArrowLeft aria-hidden />
        </Link>

        <div className={s.headerCopy}>
          <h1>Catálogo privado</h1>
          <p>
            {templates.length} líneas guardadas · {activeCount} activas
          </p>
        </div>

        <div className={s.headerActions}>
          <Link
            href="/biblioteca-lineas"
            className={s.importButton}
            aria-label="Abrir biblioteca de líneas y recetas"
          >
            <LuBookOpen aria-hidden />
            <span className={s.headerActionLabel}>Biblioteca técnica</span>
          </Link>
          <Link
            href="/configuracion/empresa/lineas-precios/importar"
            className={s.importButton}
            aria-label="Importar catálogo"
          >
            <LuUpload aria-hidden />
            <span className={s.headerActionLabel}>Importar</span>
          </Link>
          <button
            type="button"
            className={s.addButton}
            onClick={openNewSheet}
            aria-label="Nueva línea"
          >
            <LuPlus aria-hidden />
            <span className={s.headerActionLabel}>Nueva línea</span>
          </button>
        </div>
      </header>

      <section className={s.desktopSummary} aria-label="Resumen del catálogo">
        <div className={s.summaryItem}>
          <span>Líneas guardadas</span>
          <strong>{templates.length}</strong>
        </div>
        <div className={s.summaryItem}>
          <span>Activas para cotizar</span>
          <strong>{activeCount}</strong>
        </div>
        <div className={s.summaryItem}>
          <span>En pausa</span>
          <strong>{inactiveCount}</strong>
        </div>
      </section>

      <section className={`${s.toolbar} ${desktop.toolbar}`}>
        <div className={`${s.desktopToolbar} ${desktop.desktopToolbar}`}>
          <div className={`${s.desktopToolbarMain} ${desktop.toolbarMain}`}>
            <label className={`${s.searchWrap} ${desktop.searchField}`}>
              <LuSearch className={s.searchIcon} aria-hidden />
              <input
                className={s.searchInput}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por línea, proveedor o sistema"
                aria-label="Buscar líneas"
              />
            </label>

            {providerFilterOptions.length > 0 ? (
              <label className={`${s.providerFilter} ${desktop.filterField}`}>
                <span className={s.providerFilterLabel}>Proveedor</span>
                <select
                  className={s.providerFilterSelect}
                  value={effectiveProviderFilter}
                  onChange={(event) => setProviderFilter(event.target.value)}
                  aria-label="Filtrar por proveedor"
                >
                  <option value={LINE_TEMPLATE_PROVIDER_FILTER_ALL}>
                    Todos los proveedores
                  </option>
                  {providerFilterOptions.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className={desktop.filterField}>
              <span className={s.providerFilterLabel}>Material</span>
              <select
                className={s.providerFilterSelect}
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value as CategoryFilterValue)
                }
                aria-label="Filtrar por material"
              >
                <option value="Todo">Todos</option>
                <option value="aluminio">Aluminio</option>
                <option value="pvc">PVC</option>
                <option value="vidrio">Cristales</option>
              </select>
            </label>

            <label className={desktop.filterField}>
              <span className={s.providerFilterLabel}>Fabricación</span>
              <select
                className={s.providerFilterSelect}
                value={technicalFilter}
                onChange={(event) =>
                  setTechnicalFilter(event.target.value as TechnicalFilterValue)
                }
                aria-label="Filtrar por estado de fabricación"
              >
                <option value="todas">Todas</option>
                <option value="solo_cotizar">Sin configurar</option>
                <option value="borradores">Borradores</option>
                <option value="listas_para_probar">Lista para probar</option>
                <option value="validadas">Validadas</option>
              </select>
            </label>

            <button
              type="button"
              className={`${s.desktopFiltersTrigger} ${desktop.filtersTrigger} ${
                desktopFiltersOpen ? s.desktopFiltersTriggerActive : ""
              }`}
              onClick={() => setDesktopFiltersOpen((current) => !current)}
              aria-expanded={desktopFiltersOpen}
              aria-controls="catalogo-filtros-avanzados"
            >
              <LuSlidersHorizontal aria-hidden />
              Filtros
              {desktopFilterCount > 0 ? (
                <span className={s.desktopFilterCount}>{desktopFilterCount}</span>
              ) : null}
            </button>
          </div>

          {desktopFiltersOpen ? (
            <div
              className={`${s.desktopFiltersPanel} ${desktop.filtersPanel}`}
              id="catalogo-filtros-avanzados"
            >
              <div className={s.desktopFilterGroup}>
                <span className={s.desktopFilterLabel}>Material</span>
                <div className={s.materialSegment} role="tablist" aria-label="Filtrar por categoría">
                  {[
                    { value: "Todo" as const, label: "Todo" },
                    { value: "aluminio" as const, label: "Aluminio" },
                    { value: "pvc" as const, label: "PVC" },
                    { value: "vidrio" as const, label: "Cristales" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`${s.materialSegmentButton} ${
                        categoryFilter === option.value ? s.materialSegmentButtonActive : ""
                      }`}
                      data-material={option.value === "vidrio" ? "Cristal" : option.label}
                      onClick={() => setCategoryFilter(option.value)}
                      aria-pressed={categoryFilter === option.value}
                    >
                      <span>{option.label}</span>
                      <small>{categoryCounts[option.value]}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className={`${s.desktopFilterGroup} ${desktop.availabilityGroup}`}>
                <span className={s.desktopFilterLabel}>Disponibilidad</span>
                <div className={s.statusChips} role="tablist" aria-label="Filtrar por estado comercial">
                  {[
                    { value: "todas" as const, label: "Todas" },
                    { value: "activas" as const, label: "Activas" },
                    { value: "inactivas" as const, label: "Inactivas" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`${s.statusChip} ${
                        statusFilter === option.value ? s.statusChipActive : ""
                      }`}
                      onClick={() => setStatusFilter(option.value)}
                      aria-pressed={statusFilter === option.value}
                    >
                      <span>{option.label}</span>
                      <small>
                        {option.value === "todas"
                          ? templates.length
                          : option.value === "activas"
                            ? activeCount
                            : inactiveCount}
                      </small>
                    </button>
                  ))}
                </div>
              </div>

              <div className={`${s.desktopFilterGroup} ${s.desktopRecipeFilterGroup}`}>
                <span className={s.desktopFilterLabel}>Fabricación</span>
                <div className={s.statusChips} role="tablist" aria-label="Filtrar por estado de fabricación">
                  {[
                    { value: "todas" as const, label: "Todas" },
                    { value: "solo_cotizar" as const, label: "Sin configurar" },
                    { value: "borradores" as const, label: "Borradores" },
                    { value: "listas_para_probar" as const, label: "Lista para probar" },
                    { value: "validadas" as const, label: "Validadas" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`${s.statusChip} ${
                        technicalFilter === option.value ? s.statusChipActive : ""
                      }`}
                      onClick={() => setTechnicalFilter(option.value)}
                      aria-pressed={technicalFilter === option.value}
                    >
                      <span>{option.label}</span>
                      <small>{technicalFilterCounts[option.value]}</small>
                    </button>
                  ))}
                </div>
              </div>

              {desktopFilterCount > 0 ? (
                <button
                  type="button"
                  className={`${s.desktopFiltersReset} ${desktop.filtersReset}`}
                  onClick={() => {
                    setCategoryFilter("Todo");
                    setStatusFilter("todas");
                    setTechnicalFilter("todas");
                    setProviderFilter(LINE_TEMPLATE_PROVIDER_FILTER_ALL);
                  }}
                >
                  Restablecer
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className={s.mobileToolbar}>
        <div className={s.filterPrimaryRow}>
          <label className={s.searchWrap}>
            <LuSearch className={s.searchIcon} aria-hidden />
            <input
              className={s.searchInput}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar líneas..."
              aria-label="Buscar líneas"
            />
          </label>

          {providerFilterOptions.length > 0 ? (
            <label className={s.providerFilter}>
              <span className={s.providerFilterLabel}>Proveedor</span>
              <select
                className={s.providerFilterSelect}
                value={effectiveProviderFilter}
                onChange={(event) => setProviderFilter(event.target.value)}
                aria-label="Filtrar por proveedor"
              >
                <option value={LINE_TEMPLATE_PROVIDER_FILTER_ALL}>
                  Todos los proveedores
                </option>
                {providerFilterOptions.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className={s.materialSegment} role="tablist" aria-label="Filtrar por categoría">
            {[
              { value: "Todo" as const, label: "Todo" },
              { value: "aluminio" as const, label: "Aluminio" },
              { value: "pvc" as const, label: "PVC" },
              { value: "vidrio" as const, label: "Cristales" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${s.materialSegmentButton} ${
                  categoryFilter === option.value ? s.materialSegmentButtonActive : ""
                }`}
                data-material={option.value === "vidrio" ? "Cristal" : option.label}
                onClick={() => setCategoryFilter(option.value)}
                aria-pressed={categoryFilter === option.value}
              >
                <span>{option.label}</span>
                <small>{categoryCounts[option.value]}</small>
              </button>
            ))}
          </div>

          <div
            className={`${s.statusChips} ${s.commercialStatusChips}`}
            role="tablist"
            aria-label="Filtrar por estado comercial"
          >
            {[
              { value: "todas" as const, label: "Todas" },
              { value: "activas" as const, label: "Activas" },
              { value: "inactivas" as const, label: "Inactivas" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${s.statusChip} ${
                  statusFilter === option.value ? s.statusChipActive : ""
                }`}
                onClick={() => setStatusFilter(option.value)}
                aria-pressed={statusFilter === option.value}
              >
                <span>{option.label}</span>
                <small>
                  {option.value === "todas"
                    ? templates.length
                    : option.value === "activas"
                      ? activeCount
                      : inactiveCount}
                </small>
              </button>
            ))}
          </div>
        </div>

        <div className={s.technicalFilterRow}>
          <span className={s.filterGroupLabel}>Fabricación</span>
          <div
            className={`${s.statusChips} ${s.technicalStatusChips}`}
            role="tablist"
            aria-label="Filtrar por estado de fabricación"
          >
            {[
              { value: "todas" as const, label: "Todas" },
              { value: "solo_cotizar" as const, label: "Sin configurar" },
              { value: "borradores" as const, label: "Borradores" },
              { value: "listas_para_probar" as const, label: "Lista para probar" },
              { value: "validadas" as const, label: "Validadas" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${s.statusChip} ${
                  technicalFilter === option.value ? s.statusChipActive : ""
                }`}
                onClick={() => setTechnicalFilter(option.value)}
                aria-pressed={technicalFilter === option.value}
              >
                <span>{option.label}</span>
                <small>{technicalFilterCounts[option.value]}</small>
              </button>
            ))}
          </div>
        </div>
        </div>
      </section>

      {feedback ? (
        <div
          className={`${s.feedback} ${
            feedback.kind === "error" ? s.feedbackError : s.feedbackSuccess
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {error ? <div className={`${s.feedback} ${s.feedbackError}`}>{error}</div> : null}

      <CatalogoBasesVentoraSection
        recommendations={ventoraBaseRecommendations}
        privateLineCount={templates.length}
        isUsingBase={usingBaseId !== null}
        usingBaseId={usingBaseId}
        onUseBase={(recommendation) => void handleUseVentoraBase(recommendation)}
      />

      {isEmpty ? (
        <section className={s.emptyState}>
          <strong>Aún no tienes líneas en tu catálogo privado</strong>
          <p>
            Usa una Base Ventora arriba o crea una línea con precio, mínimo y
            redondeo para reutilizarla en tus cotizaciones.
          </p>
          <button type="button" className={s.primaryButton} onClick={openNewSheet}>
            <LuPlus aria-hidden />
            Crear línea
          </button>
        </section>
      ) : null}

      {hasNoResults ? (
        <section className={s.emptyState}>
          <strong>No encontramos líneas</strong>
          <p>Prueba con otro nombre o cambia los filtros.</p>
        </section>
      ) : null}

      {!isEmpty && !hasNoResults ? (
        <section className={`${s.list} ${desktop.list}`}>
          {groupedTemplates.map((group) => (
            <section className={`${s.catalogGroup} ${desktop.catalogGroup}`} key={group.key}>
              <div className={`${s.groupHeader} ${desktop.groupHeader}`}>
                <div>
                  <span>{group.provider}</span>
                  <strong>{group.system}</strong>
                </div>
                <small>
                  {group.templates.length}{" "}
                  {group.templates.length === 1 ? "línea" : "líneas"}
                </small>
              </div>

              <div
                className={`${s.groupCards} ${
                  desktop.groupCards
                } ${
                  group.templates.length === 1
                    ? `${s.groupCardsSingle} ${desktop.groupCardsSingle}`
                    : ""
                }`}
              >
              {group.templates.map((template) => {
                const isMenuOpen = openMenuId === template.id;
                const glassMetadata = getLineTemplateGlassMetadata(template.catalogMetadata);
                const glassDescription = [glassMetadata.espesor, glassMetadata.terminacion]
                  .filter(Boolean)
                  .join(" · ");
                const profilePreview = getLineTemplateProfilePreview(template.catalogMetadata);
                const needsPrice = lineTemplateNeedsCommercialPrice(template);
                const lineSystem = getLineTemplateSystemMetadata(template.catalogMetadata).lineSystem;
                const lineContext = [template.proveedor, lineSystem].filter(Boolean).join(" · ");
                const technicalStatus = technicalStatusesByTemplateId.get(
                  String(template.id)
                );
                if (!technicalStatus) return null;

                return (
                  <article
                    key={template.id}
                    className={`${s.card} ${desktop.card} ${template.isActive ? "" : s.cardInactive} ${
                      isMenuOpen ? s.cardMenuOpen : ""
                    }`}
                    data-material={template.material}
                  >
                    <div
                      className={`${s.cardTop} ${desktop.cardTop} ${
                        profilePreview ? s.cardTopWithProfilePreview : ""
                      }`}
                    >
                      {profilePreview ? (
                        <figure className={`${s.profilePreview} ${desktop.profilePreview}`}>
                          {/* Asset técnico externo o interno, definido por proveedor. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={profilePreview.assetUrl}
                            alt={`Sección técnica de ${template.nombre}`}
                          />
                          <figcaption>
                            {profilePreview.sourceLabel}
                            {profilePreview.sourcePage !== null
                              ? ` · pág. ${profilePreview.sourcePage}`
                              : ""}
                          </figcaption>
                        </figure>
                      ) : null}
                      <div className={`${s.cardTitleBlock} ${desktop.cardTitleBlock}`}>
                        <div className={s.cardTitleText}>
                          <strong>{template.nombre}</strong>
                          <span className={s.materialPill} data-material={template.material}>
                            {LINE_TEMPLATE_CATEGORIA_LABELS[template.categoria]}
                          </span>
                          {needsPrice ? (
                            <span className={s.pendingPricePill}>Sin precio</span>
                          ) : null}
                        </div>
                        {lineContext ? (
                          <span className={s.cardHierarchy}>{lineContext}</span>
                        ) : null}
                      </div>

                      <div className={`${s.cardActions} ${desktop.cardActions}`}>
                        <button
                          type="button"
                          className={s.cardTapHint}
                          onClick={() => openEditSheet(template)}
                        >
                          Editar
                          <LuChevronRight aria-hidden />
                        </button>

                        <div className={s.menuWrap}>
                          <button
                            type="button"
                            className={s.menuButton}
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenMenuId((current) =>
                                current === template.id ? null : template.id
                              );
                            }}
                            aria-expanded={isMenuOpen}
                            aria-label={`Acciones para ${template.nombre}`}
                          >
                            <LuEllipsisVertical aria-hidden />
                          </button>

                          {isMenuOpen ? (
                            <div
                              className={s.menuPanel}
                              onClick={(event) => event.stopPropagation()}
                            >
                              <Link
                                href={`/configuracion/empresa/lineas-precios/${template.id}/fabricacion`}
                                className={s.menuAction}
                                onClick={(event) => event.stopPropagation()}
                              >
                                <LuSettings2 aria-hidden />
                                Administrar fabricación
                              </Link>
                              <button
                                type="button"
                                className={s.menuAction}
                                onClick={() => void handleDuplicate(template.id)}
                              >
                                <LuCopyPlus aria-hidden />
                                Duplicar línea
                              </button>
                              <button
                                type="button"
                                className={`${s.menuAction} ${s.menuActionDanger}`}
                                onClick={() => void handleDelete(template.id)}
                              >
                                <LuTrash2 aria-hidden />
                                Eliminar línea
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className={`${s.priceRow} ${desktop.priceRow}`}>
                      <strong>
                        {needsPrice
                          ? "Completar precio"
                          : formatLineTemplatePriceLabel(
                              template.unidadCobro,
                              template.precioM2Sugerido,
                              formatMoney
                            )}
                      </strong>
                      <span>
                        {template.costoBase > 0
                          ? `Costo ${formatMoney(template.costoBase)}`
                          : "Sin costo"}
                        {" · "}
                        Mín.{" "}
                        {template.minimoCobrable > 0
                          ? formatMoney(template.minimoCobrable)
                          : "Sin mínimo"}
                      </span>
                    </div>

                    <div
                      className={`${s.technicalStatusRow} ${desktop.technicalStatusRow}`}
                      data-tech-status={technicalStatus.tone}
                    >
                      <div className={s.technicalStatusCopy}>
                        <span className={s.technicalStatusLabel}>Fabricación</span>
                        <div className={s.technicalStatusMeta}>
                          <span
                            className={s.technicalStatusPill}
                            data-tech-status={technicalStatus.tone}
                          >
                            {technicalStatus.label}
                          </span>
                          <span className={s.technicalStatusDetail}>
                            {technicalStatus.detail}
                          </span>
                        </div>
                      </div>
                      <Link
                        href={`/configuracion/empresa/lineas-precios/${template.id}/fabricacion`}
                        className={s.technicalManageLink}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {technicalStatus.actionLabel}
                        <LuChevronRight aria-hidden />
                      </Link>
                    </div>

                    <div className={s.cardDivider} />

                    {template.categoria === "vidrio" && glassDescription ? (
                      <span className={`${s.roundingMeta} ${desktop.detailMeta}`}>{glassDescription}</span>
                    ) : template.vidrioPrincipalRecomendado ? (
                      <span className={`${s.roundingMeta} ${desktop.detailMeta}`}>
                        Vidrio habitual: {template.vidrioPrincipalRecomendado}
                      </span>
                    ) : null}

                    <div className={`${s.cardBottom} ${desktop.cardBottom}`}>
                      <span className={s.roundingMeta}>
                        Redondeo: {buildRoundingLabel(template.redondeoPrecio, formatMoney)}
                      </span>

                      <button
                        type="button"
                        className={`${s.switch} ${template.isActive ? s.switchOn : ""}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleToggleActive(template);
                        }}
                        aria-pressed={template.isActive}
                        aria-label={`${template.isActive ? "Desactivar" : "Activar"} ${
                          template.nombre
                        }`}
                      >
                        <span className={s.switchThumb} />
                      </button>
                    </div>
                  </article>
                );
              })}
              </div>
            </section>
          ))}
        </section>
      ) : null}

      </div>

      {sheetMode ? (
        <LineTemplateFormWizard
          sheetMode={sheetMode}
          sheetTitle={sheetTitle}
          wizardStep={wizardStep}
          onWizardStepChange={setWizardStep}
          draft={draft}
          onDraftChange={handleDraftChange}
          onDraftPatch={handleDraftPatch}
          showAdvancedDetails={showAdvancedDetails}
          onShowAdvancedDetailsChange={setShowAdvancedDetails}
          isGlassDraft={isGlassDraft}
          saveDisabled={saveDisabled}
          isSaving={isSaving}
          onSave={() => void handleSave()}
          onSaveAndConfigure={() =>
            void handleSave({ openTechnicalWorkspace: true })
          }
          onClose={closeSheet}
          pricePerM2={pricePerM2}
          minimum={minimum}
          costoBase={costoBase}
          unidadCobro={unidadCobro}
          calibrationVanoWidthMm={calibrationVanoWidthMm}
          calibrationVanoHeightMm={calibrationVanoHeightMm}
          expectedGlassWidthMm={expectedGlassWidthMm}
          expectedGlassHeightMm={expectedGlassHeightMm}
          expectedFrameHorizontalMm={expectedFrameHorizontalMm}
          expectedFrameVerticalMm={expectedFrameVerticalMm}
          onCalibrationVanoWidthMmChange={setCalibrationVanoWidthMm}
          onCalibrationVanoHeightMmChange={setCalibrationVanoHeightMm}
          onExpectedGlassWidthMmChange={setExpectedGlassWidthMm}
          onExpectedGlassHeightMmChange={setExpectedGlassHeightMm}
          onExpectedFrameHorizontalMmChange={setExpectedFrameHorizontalMm}
          onExpectedFrameVerticalMmChange={setExpectedFrameVerticalMm}
          calibrationWidthMm={calibrationWidthMm}
          calibrationHeightMm={calibrationHeightMm}
          expectedGlassWidthValue={expectedGlassWidthValue}
          expectedGlassHeightValue={expectedGlassHeightValue}
          glassCalibrationDelta={glassCalibrationDelta}
          cuttingPreview={cuttingPreview}
          systemCalibrationPreset={systemCalibrationPreset}
          calibrationSuggestion={calibrationSuggestion}
          onApplySystemCalibrationPreset={handleApplySystemCalibrationPreset}
          onApplyWorkshopCalibrationSuggestion={handleApplyWorkshopCalibrationSuggestion}
          estimationSampleAreaM2={estimationSampleAreaM2}
          estimationSampleFrameMl={estimationSampleFrameMl}
          estimationSampleSashMl={estimationSampleSashMl}
          estimationAccessoryUnits={estimationAccessoryUnits}
          technicalAdminHref={
            sheetMode === "edit" && editingTemplateId !== null
              ? `/configuracion/empresa/lineas-precios/${editingTemplateId}/fabricacion`
              : null
          }
        />
      ) : null}
    </>
  );
}

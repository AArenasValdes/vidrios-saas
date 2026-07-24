"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  LuArrowLeft,
  LuChevronRight,
  LuCopyPlus,
  LuEllipsisVertical,
  LuPlus,
  LuSearch,
  LuTrash2,
  LuUpload,
} from "react-icons/lu";
import { useCotizacionLineTemplates } from "@/features/cotizaciones/line-templates/hooks/useCotizacionLineTemplates";
import {
  buildLineTemplateCuttingPreview,
  getLineTemplateCubicationConfig,
  getLineTemplateGlassMetadata,
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
  CotizacionLineTemplateCubicationStatus,
  CotizacionLineTemplateCubicationSystem,
  CotizacionLineTemplateCuttingMode,
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

import {
  LineTemplateFormWizard,
  resolveLineUsageMode,
  type LineTemplateFormDraft,
} from "./line-template-form-wizard";
import { mergeFabricationRecipeIntoMetadata } from "@/features/cotizaciones/line-templates/types/fabrication-recipe";
import {
  buildRecipeCuttingPreview,
  migrateLegacyCubicationToRecipe,
  recipePreviewToLegacyCuttingPreview,
} from "@/features/cotizaciones/line-templates/services/fabrication-recipe.service";
import s from "./lineas-precios-page-client.module.css";

export type { LineTemplateFormDraft };

function formatDeductionInput(value: number) {
  return value > 0 ? String(Math.round(value)) : "0";
}

type StatusFilterValue = "todas" | "activas" | "inactivas";
type CategoryFilterValue = "Todo" | "aluminio" | "pvc" | "vidrio";

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
      ? migrateLegacyCubicationToRecipe(template.catalogMetadata)
      : null,
  };
}

function getDigits(value: string) {
  return value.replace(/[^\d]/g, "");
}

function parseMoney(value: string) {
  const digits = getDigits(value);
  return digits ? Number(digits) : 0;
}

function buildRoundingLabel(value: number) {
  return value > 0 ? formatCurrency(value) : "Sin redondeo";
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

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterValue>("Todo");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("todas");
  const [providerFilter, setProviderFilter] = useState<string>(
    LINE_TEMPLATE_PROVIDER_FILTER_ALL
  );
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

  useEffect(() => {
    if (providerFilter === LINE_TEMPLATE_PROVIDER_FILTER_ALL) {
      return;
    }
    if (!providerFilterOptions.includes(providerFilter)) {
      setProviderFilter(LINE_TEMPLATE_PROVIDER_FILTER_ALL);
    }
  }, [providerFilter, providerFilterOptions]);

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
      const providerLabel = getLineTemplateProviderLabel(template.proveedor);
      const matchesProvider =
        providerFilter === LINE_TEMPLATE_PROVIDER_FILTER_ALL
          ? true
          : providerLabel === providerFilter;
      const matchesQuery = normalizedQuery
        ? template.nombre.toLowerCase().includes(normalizedQuery)
          || (template.proveedor ?? "").toLowerCase().includes(normalizedQuery)
          || (getLineTemplateSystemMetadata(template.catalogMetadata).lineSystem ?? "")
            .toLowerCase()
            .includes(normalizedQuery)
        : true;

      return matchesCategory && matchesStatus && matchesProvider && matchesQuery;
    });
  }, [categoryFilter, providerFilter, query, statusFilter, templates]);
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
    if (!searchParams.get("nueva")) return;
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

  const openEditSheet = (template: CotizacionLineTemplate) => {
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
  };

  const closeSheet = () => {
    setSheetMode(null);
    setEditingTemplateId(null);
    setWizardStep(1);
    setShowAdvancedDetails(false);
    setDraft(buildDraft());
    resetQueryFlag();
  };


  const handleApplySystemCalibrationPreset = () => {
    const preset = getCubicationSystemCalibrationPreset(draft.cubicationSystem);
    const cubicationPatch = applyCalibrationPresetToCubicationPatch(preset);
    setDraft((current) => {
      const usageMode = resolveLineUsageMode(current);
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

  const handleSave = async () => {
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

    const withRecipe = mergeFabricationRecipeIntoMetadata(
      catalogMetadata,
      draft.fabricationRecipe
    ) as typeof catalogMetadata;
    Object.assign(catalogMetadata, withRecipe);
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
        await createTemplate(payload);
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
    <div className={s.page}>
      <header className={s.header}>
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

      <section className={s.toolbar}>
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

        <div className={s.filterStack}>
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

          <div className={s.filterMetaRow}>
            {providerFilterOptions.length > 0 ? (
              <label className={s.providerFilter}>
                <span className={s.providerFilterLabel}>Proveedores</span>
                <select
                  className={s.providerFilterSelect}
                  value={providerFilter}
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

            <div className={s.statusChips} role="tablist" aria-label="Filtrar por estado">
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

      {isEmpty ? (
        <section className={s.emptyState}>
          <strong>Aún no tienes líneas guardadas</strong>
          <p>Agrega una línea con precio, mínimo y redondeo para reutilizarla en tus cotizaciones.</p>
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
        <section className={s.list}>
          {groupedTemplates.map((group) => (
            <Fragment key={group.key}>
              <div className={s.groupHeader}>
                <div>
                  <span>{group.provider}</span>
                  <strong>{group.system}</strong>
                </div>
                <small>
                  {group.templates.length}{" "}
                  {group.templates.length === 1 ? "línea" : "líneas"}
                </small>
              </div>

              {group.templates.map((template) => {
                const isMenuOpen = openMenuId === template.id;
                const glassMetadata = getLineTemplateGlassMetadata(template.catalogMetadata);
                const glassDescription = [glassMetadata.espesor, glassMetadata.terminacion]
                  .filter(Boolean)
                  .join(" · ");
                const needsPrice = lineTemplateNeedsCommercialPrice(template);
                const lineSystem = getLineTemplateSystemMetadata(template.catalogMetadata).lineSystem;
                const lineContext = [template.proveedor, lineSystem].filter(Boolean).join(" · ");

                return (
                  <article
                    key={template.id}
                    className={`${s.card} ${template.isActive ? "" : s.cardInactive} ${
                      isMenuOpen ? s.cardMenuOpen : ""
                    }`}
                    data-material={template.material}
                    onClick={() => openEditSheet(template)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openEditSheet(template);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={s.cardTop}>
                      <div className={s.cardTitleBlock}>
                        <div className={s.cardTitleText}>
                          <strong>{template.nombre}</strong>
                          <span className={s.materialPill} data-material={template.material}>
                            {LINE_TEMPLATE_CATEGORIA_LABELS[template.categoria]}
                          </span>
                          {needsPrice ? (
                            <span className={s.pendingPricePill}>Sin precio</span>
                          ) : null}
                        </div>
                        <span className={s.cardTapHint}>
                          Editar
                          <LuChevronRight aria-hidden />
                        </span>
                        {lineContext ? (
                          <span className={s.cardHierarchy}>{lineContext}</span>
                        ) : null}
                      </div>

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
                            <button
                              type="button"
                              className={s.menuAction}
                              onClick={() => void handleDuplicate(template.id)}
                            >
                              <LuCopyPlus aria-hidden />
                              Duplicar
                            </button>
                            <button
                              type="button"
                              className={`${s.menuAction} ${s.menuActionDanger}`}
                              onClick={() => void handleDelete(template.id)}
                            >
                              <LuTrash2 aria-hidden />
                              Eliminar
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className={s.priceRow}>
                      <strong>
                        {needsPrice
                          ? "Completar precio"
                          : formatLineTemplatePriceLabel(
                              template.unidadCobro,
                              template.precioM2Sugerido,
                              formatCurrency
                            )}
                      </strong>
                      <span>
                        {template.costoBase > 0
                          ? `Costo ${formatCurrency(template.costoBase)}`
                          : "Sin costo"}
                        {" · "}
                        Mín.{" "}
                        {template.minimoCobrable > 0
                          ? formatCurrency(template.minimoCobrable)
                          : "Sin mínimo"}
                      </span>
                    </div>

                    <div className={s.cardDivider} />

                    {template.categoria === "vidrio" && glassDescription ? (
                      <span className={s.roundingMeta}>{glassDescription}</span>
                    ) : template.vidrioPrincipalRecomendado ? (
                      <span className={s.roundingMeta}>
                        Vidrio habitual: {template.vidrioPrincipalRecomendado}
                      </span>
                    ) : null}

                    <div className={s.cardBottom}>
                      <span className={s.roundingMeta}>
                        Redondeo: {buildRoundingLabel(template.redondeoPrecio)}
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
            </Fragment>
          ))}
        </section>
      ) : null}

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
        />
      ) : null}
    </div>
  );
}

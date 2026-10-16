"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { LuArrowRight, LuX } from "react-icons/lu";

import { LineTemplatePicker } from "@/features/cotizaciones/line-templates/components/line-template-picker";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { resolveLineCompatibilityOpeningType } from "@/features/cotizaciones/line-templates/services/line-template-compatibility.service";
import { resolveSupplierFamilyKeyForLineTemplate } from "@/features/cotizaciones/line-templates/services/line-template-family.service";
import { VENTORA_DEFAULT_LINE_CATALOG } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import {
  ALUMINUM_COLOR_OPTIONS,
  applyLineTemplateToComponentForm,
  buildComponentFormLinePricingSummary,
  PVC_COLOR_OPTIONS,
  type ComponentFormState,
  mapItemToForm,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { GlassOptionPicker } from "@/features/cotizaciones/visual-composer/components/glass-option-picker";
import type { QuoteConstructorItemPatch } from "@/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service";
import { MeasureDimensionInput } from "@/features/cotizaciones/components/measure-dimension-input";
import { resolveComponentFabricacionHojas } from "@/features/cotizaciones/new-quote/workflow-ui";
import { SodalL25QuoteConfigPanel } from "@/features/fabricacion/components/sodal-l25-quote-config-panel";
import { useFabricationRecipes } from "@/features/fabricacion/hooks/use-fabrication-recipes";
import {
  resolveConstructorRecipeCandidates,
  resolveConstructorRecipeSelection,
} from "@/features/fabricacion/services/constructor-recipe-selection.service";
import { resolveFabricationRecipe } from "@/features/fabricacion/services/fabricacion-receta-resolver.service";
import { resolveUniversalPricedLineFallbacks } from "@/features/fabricacion/services/fabricacion-receta-universal-fallback.service";
import { inferirTipologiaFabricacionPieza } from "@/features/fabricacion/services/fabricacion-contexto-pieza.service";
import { QuoteFabricationVariantPicker } from "@/features/fabricacion/components/quote-fabrication-variant-picker";
import { getLineVariantSlots } from "@/features/fabricacion/fixtures/line-base-variant-catalog";
import type {
  SodalL25GlazingSlug,
  SodalL25LegSlug,
  SodalL25ReinforcementSlug,
} from "@/features/fabricacion/fixtures/sodal-l25-zeta-catalog";
import { isSodalL25CatalogKey, resolveEffectiveSodalL25CatalogKey } from "@/features/fabricacion/services/sodal-l25-presentation.service";
import { useOrganizationMeasureUnit } from "@/features/organization-profile/hooks/use-organization-measure-unit";
import { resolveSupplierFinishName } from "@/features/proveedor-catalogos/services/supplier-presentation-resolution.service";
import { resolveSupplierPresentationsForQuote, type SupplierPriceProviderOption } from "@/features/proveedor-catalogos/services/supplier-presentations.client";
import {
  measureDimensionFieldLabel,
  measureDimensionPlaceholder,
} from "@/features/organization-profile/services/measure-unit.service";

import { useMobileViewportStability } from "../../../_hooks/use-mobile-viewport-stability";
import s from "./paso-dos-cuaderno-movil.module.css";

const QUICK_QTY = [1, 2, 4, 6] as const;
const PROFILE_MATERIALS = ["Aluminio", "PVC"] as const;

type ProfileMaterial = Extract<ComponentFormState["material"], (typeof PROFILE_MATERIALS)[number]>;

function normalizeProfileMaterial(material: ComponentFormState["material"]): ProfileMaterial {
  return material === "PVC" ? "PVC" : "Aluminio";
}

function getColorOptionsForMaterial(material: ProfileMaterial) {
  return material === "PVC" ? PVC_COLOR_OPTIONS : ALUMINUM_COLOR_OPTIONS;
}

function inferLeavesFromLineLabel(value: string | null | undefined): number | null {
  const match = value?.match(/(?:^|\D)([234])\s*hojas?(?:\D|$)/i);
  return match?.[1] ? Number(match[1]) : null;
}

function resolveVariantCatalogKey(
  template: CotizacionLineTemplate | null,
  fallbackKey: string | null | undefined,
  fallbackName: string | null | undefined
) {
  const directKey = template?.catalogKey?.trim() || fallbackKey?.trim();
  const identity = `${template?.nombre ?? ""} ${fallbackName ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ");
  const isLine = (number: string) =>
    new RegExp(`(?:serie|linea|l)\\s*${number}(?:\\D|$)`).test(identity);

  if (isLine("5000")) return "ventora:l5000";
  if (isLine("4000")) return "ventora:serie-4000-corredera-2h";
  if (isLine("4800")) return "ventora:serie-4800-corredera-2h";
  if (isLine("45")) return "ventora:serie-45-puerta";
  if (isLine("42")) return "ventora:l42";
  if (isLine("32")) return "ventora:l32";
  if (isLine("25")) return "ventora:l25";
  if (isLine("20")) return /fijo|paño fijo|pano fijo/.test(identity)
    ? "ventora:l20-fijos"
    : "ventora:l20";
  if (isLine("15")) return "ventora:serie-15-corredera-2h";
  return directKey || null;
}

type Props = {
  item: CotizacionWorkflowItem;
  lineTemplates: CotizacionLineTemplate[];
  glassOptions: readonly string[];
  formatCurrencyInput: (value: string) => string;
  onClose: () => void;
  onSave: (patch: QuoteConstructorItemPatch) => void;
  onTemplatePriceUpdated?: (itemId: string, template: CotizacionLineTemplate) => void;
  onOpenConstructor: (pendingChanges: QuoteConstructorItemPatch) => void;
  onDuplicate: () => void;
  onRemove: () => void;
};

export function CuadernoQuickEditSheet({
  item,
  lineTemplates,
  glassOptions,
  formatCurrencyInput,
  onClose,
  onSave,
  onTemplatePriceUpdated,
  onOpenConstructor,
  onDuplicate,
  onRemove,
}: Props) {
  const measureUnit = useOrganizationMeasureUnit();
  const titleId = useId();
  useMobileViewportStability();
  const form = useMemo(() => mapItemToForm(item), [item]);
  const [nombre, setNombre] = useState(item.nombre);
  const [ancho, setAncho] = useState(item.ancho ? String(item.ancho) : "");
  const [alto, setAlto] = useState(item.alto ? String(item.alto) : "");
  const [cantidad, setCantidad] = useState(String(Math.max(1, item.cantidad || 1)));
  const [precioDraft, setPrecioDraft] = useState<string | null>(null);
  const [precioEditedManually, setPrecioEditedManually] = useState(false);
  const [lineTemplateIdDraft, setLineTemplateIdDraft] = useState<string | null>(null);
  const [selectedLineTemplateDraft, setSelectedLineTemplateDraft] =
    useState<CotizacionLineTemplate | null>(null);
  const [vidrioDraft, setVidrioDraft] = useState<string | null>(null);
  const [colorHexDraft, setColorHexDraft] = useState<string | null>(null);
  const [materialDraft, setMaterialDraft] = useState<ProfileMaterial>(() =>
    normalizeProfileMaterial(form.material)
  );
  const [showColorChoices, setShowColorChoices] = useState(false);
  const [fabricationSelectionDraft, setFabricationSelectionDraft] = useState<string | null>(null);
  const [supplierProviderKeyDraft, setSupplierProviderKeyDraft] = useState<string | null>(null);
  const [supplierProviderResolution, setSupplierProviderResolution] = useState<{
    key: string;
    options: SupplierPriceProviderOption[];
    familyPreferenceProviderKey: string | null;
    canManageFamilyPreferences: boolean;
    error: string | null;
  } | null>(null);
  const [familyPreferenceOverride, setFamilyPreferenceOverride] = useState<{ familyKey: string; providerKey: string | null } | null>(null);
  const [familyPreferenceSaving, setFamilyPreferenceSaving] = useState(false);
  const [familyPreferenceError, setFamilyPreferenceError] = useState<string | null>(null);
  const [sodalL25ConfigDraft, setSodalL25ConfigDraft] = useState<
    Pick<
      ComponentFormState,
      | "catalogLineKey"
      | "fabricacionGlazing"
      | "fabricacionLeg"
      | "fabricacionReinforcement"
      | "fabricacionVariante"
    > | null
  >(null);

  const itemPrice = item.precioUnitario > 0 ? String(Math.round(item.precioUnitario)) : "";
  const precio = precioDraft ?? itemPrice;
  const lineTemplateId = lineTemplateIdDraft ?? form.lineTemplateId;
  const selectedLineTemplate = selectedLineTemplateDraft ?? lineTemplates.find(
    (template) => String(template.id) === lineTemplateId
  ) ?? null;
  const selectedCatalogLineKey = resolveVariantCatalogKey(
    selectedLineTemplate,
    form.catalogLineKey,
    form.referencia
  );
  const selectedLineIsSodalL25 =
    isSodalL25CatalogKey(
      resolveEffectiveSodalL25CatalogKey({
        catalogLineKey: selectedCatalogLineKey,
        catalogKey: selectedLineTemplate?.catalogKey,
        nombre: selectedLineTemplate?.nombre ?? form.referencia,
      })
    ) ||
    /(?:^|\b)(?:l25|serie\s*25|linea\s*25)(?:\b|$)/i.test(
      `${selectedLineTemplate?.nombre ?? ""} ${form.referencia ?? ""} ${item.lineaComercial ?? ""}`
    );
  const selectedRecipeTypology =
    inferirTipologiaFabricacionPieza({
      tipo: form.tipo,
      sistema: form.sistema,
      configuracion: form.configuracion,
      nombre: selectedLineTemplate?.nombre,
      descripcion: form.descripcion,
    }) ||
    inferirTipologiaFabricacionPieza({
      tipo: form.tipo,
      sistema: form.sistema,
      configuracion: form.configuracion,
      nombre,
      descripcion: form.descripcion,
    }) ||
    (selectedCatalogLineKey === "ventora:l20" ||
    selectedCatalogLineKey === "ventora:l25" ||
    selectedCatalogLineKey === "ventora:l5000" ||
    selectedCatalogLineKey === "ventora:serie-4000-corredera-2h" ||
    selectedCatalogLineKey === "ventora:serie-15-corredera-2h"
      ? "corredera"
      : selectedCatalogLineKey === "ventora:l20-fijos"
        ? "pano_fijo"
        : selectedCatalogLineKey === "ventora:l32" || selectedCatalogLineKey === "ventora:l42"
          ? "proyectante"
          : selectedCatalogLineKey === "ventora:serie-45-puerta"
            ? "puerta_abatible"
            : null) ||
    form.fabricacionTipologia ||
    null;
  const selectedRecipeLeaves = resolveComponentFabricacionHojas({
    tipo: form.tipo,
    sistema: form.sistema,
    configuracion: form.configuracion,
    sheetScheme: form.sheetScheme,
    fabricacionHojas: form.fabricacionHojas,
    fabricacionVariante: form.fabricacionVariante,
    referencia: selectedLineTemplate?.nombre ?? form.referencia,
    catalogLineKey: selectedCatalogLineKey,
    hojasBase: form.hojasBase,
    guidedVisualConfig: form.guidedVisualConfig,
  }) ?? inferLeavesFromLineLabel(`${selectedLineTemplate?.nombre ?? ""} ${form.referencia ?? ""}`);
  const sodalL25Leaves =
    inferLeavesFromLineLabel(
      `${selectedLineTemplate?.nombre ?? ""} ${form.referencia ?? ""} ${item.lineaComercial ?? ""}`
    ) ??
    selectedRecipeLeaves ??
    form.fabricacionHojas ??
    inferLeavesFromLineLabel(form.referencia);
  const selectedRecipeLineTemplateId = Number(lineTemplateId);
  const canLoadSelectedLineRecipes = Boolean(
    selectedLineTemplate &&
      Number.isInteger(selectedRecipeLineTemplateId) &&
      selectedRecipeLineTemplateId > 0
  );
  const {
    organizationId: recipeOrganizationId,
    recipes: selectedLineRecipes,
    isLoading: isLoadingSelectedLineRecipes,
  } = useFabricationRecipes({
    enabled: canLoadSelectedLineRecipes,
    lineTemplateId: canLoadSelectedLineRecipes ? selectedRecipeLineTemplateId : undefined,
    skipStructuralSeed: true,
  });
  const inlineRecipeResolution = useMemo(() => {
    if (
      !canLoadSelectedLineRecipes ||
      isLoadingSelectedLineRecipes ||
      !selectedRecipeTypology
    ) {
      return null;
    }
    const exactResolution = resolveFabricationRecipe(selectedLineRecipes, {
      organizationId: recipeOrganizationId,
      lineTemplateId: selectedRecipeLineTemplateId,
      catalogKey: selectedCatalogLineKey,
      tipologia: selectedRecipeTypology,
      hojas: selectedRecipeLeaves,
      modulos: form.fabricacionModulos,
      apertura: form.fabricacionApertura || resolveLineCompatibilityOpeningType(form.sistema, form.configuracion, form.guidedVisualConfig),
      herraje: form.fabricacionHerraje,
      variante: (sodalL25ConfigDraft?.fabricacionVariante ?? form.fabricacionVariante) || null,
      configurationId: form.fabricacionConfiguracionId || null,
      compositionId: form.fabricacionComposicionId || null,
      preferredRecipeId: form.fabricationRecipeId || null,
      glassName: vidrioDraft ?? form.vidrio,
      glazing: (sodalL25ConfigDraft?.fabricacionGlazing ?? form.fabricacionGlazing) as
        | SodalL25GlazingSlug
        | undefined,
      leg: (sodalL25ConfigDraft?.fabricacionLeg ?? form.fabricacionLeg) as
        | SodalL25LegSlug
        | undefined,
      reinforcement:
        (sodalL25ConfigDraft?.fabricacionReinforcement ?? form.fabricacionReinforcement) as
          | SodalL25ReinforcementSlug
          | undefined,
      atributosTecnicos: {
        lineTemplateId: selectedRecipeLineTemplateId,
        typology: selectedRecipeTypology,
        leaves: selectedRecipeLeaves,
        opening: form.fabricacionApertura || resolveLineCompatibilityOpeningType(form.sistema, form.configuracion, form.guidedVisualConfig),
        hardware: form.fabricacionHerraje || null,
        variant: (sodalL25ConfigDraft?.fabricacionVariante ?? form.fabricacionVariante) || null,
        configurationId: form.fabricacionConfiguracionId || null,
        compositionId: form.fabricacionComposicionId || null,
        glass: vidrioDraft ?? form.vidrio,
        glazing: sodalL25ConfigDraft?.fabricacionGlazing ?? form.fabricacionGlazing,
        leg: sodalL25ConfigDraft?.fabricacionLeg ?? form.fabricacionLeg,
        reinforcement:
          sodalL25ConfigDraft?.fabricacionReinforcement ?? form.fabricacionReinforcement,
      },
      previewListaParaProbar: true,
    });
    return exactResolution;
  }, [
    canLoadSelectedLineRecipes,
    isLoadingSelectedLineRecipes,
    recipeOrganizationId,
    selectedCatalogLineKey,
    selectedLineRecipes,
    selectedRecipeLeaves,
    selectedRecipeLineTemplateId,
    selectedRecipeTypology,
    sodalL25ConfigDraft,
    vidrioDraft,
    form.vidrio,
    form.fabricacionGlazing,
    form.fabricacionLeg,
    form.fabricacionReinforcement,
    form.fabricacionModulos,
    form.fabricacionApertura,
    form.fabricacionHerraje,
    form.fabricacionVariante,
    form.fabricacionConfiguracionId,
    form.fabricacionComposicionId,
    form.fabricationRecipeId,
    form.sistema,
    form.configuracion,
    form.guidedVisualConfig,
  ]);
  const universalRecipeCandidates = useMemo(() => {
    if (
      !canLoadSelectedLineRecipes ||
      !selectedCatalogLineKey ||
      !selectedRecipeTypology
    ) {
      return [];
    }

    return resolveUniversalPricedLineFallbacks({
      catalogKey: selectedCatalogLineKey,
      lineTemplateId: selectedRecipeLineTemplateId,
      organizationId: recipeOrganizationId,
      lineName: selectedLineTemplate?.nombre ?? form.referencia ?? nombre,
      variant: null,
      leavesCount: selectedRecipeLeaves,
      typology: selectedRecipeTypology,
      glassName: vidrioDraft ?? form.vidrio,
      includeDocumentedVariants: true,
      recipes: selectedLineRecipes,
    });
  }, [
    canLoadSelectedLineRecipes,
    form.referencia,
    form.vidrio,
    vidrioDraft,
    nombre,
    recipeOrganizationId,
    selectedCatalogLineKey,
    selectedLineTemplate?.nombre,
    selectedLineRecipes,
    selectedRecipeLeaves,
    selectedRecipeLineTemplateId,
    selectedRecipeTypology,
  ]);
  const inlineRecipeCandidates = useMemo(
    () =>
      resolveConstructorRecipeCandidates({
        storedCandidates: inlineRecipeResolution?.candidatas ?? [],
        universalFallbackCandidates: universalRecipeCandidates,
        preferredRecipeId: form.fabricationRecipeId,
        catalogKey: selectedCatalogLineKey,
      }),
    [form.fabricationRecipeId, inlineRecipeResolution?.candidatas, selectedCatalogLineKey, universalRecipeCandidates]
  );
  const l20VariantSlots = useMemo(() => {
    if (selectedCatalogLineKey !== "ventora:l20" && selectedCatalogLineKey !== "ventora:l20-fijos") {
      return [];
    }
    return getLineVariantSlots(selectedCatalogLineKey).filter(
      (slot) => slot.typology === selectedRecipeTypology
    );
  }, [selectedCatalogLineKey, selectedRecipeTypology]);
  const showFabricationVariant = inlineRecipeCandidates.length > 0 || l20VariantSlots.length > 0;
  const existingRecipeSelection = form.fabricationRecipeId && inlineRecipeCandidates.some(
    (recipe) => recipe.id === form.fabricationRecipeId,
  )
    ? `recipe:${form.fabricationRecipeId}`
    : form.fabricacionVariante
      ? `variant:${form.fabricacionVariante}`
      : "";
  const currentRecipeCandidate = resolveConstructorRecipeSelection({
    selection: existingRecipeSelection,
    candidates: inlineRecipeCandidates,
  });
  const currentFabricationSelection = currentRecipeCandidate
    ? `recipe:${currentRecipeCandidate.id}`
    : form.fabricacionVariante
      ? `variant:${form.fabricacionVariante}`
      : "";
  const fabricationSelection = fabricationSelectionDraft ?? currentFabricationSelection;
  const supplierRecipe = resolveConstructorRecipeSelection({
    selection: fabricationSelection,
    candidates: inlineRecipeCandidates,
  }) ?? (fabricationSelection === "" ? inlineRecipeResolution?.receta ?? null : null);
  const supplierLineTemplate = selectedLineTemplate ??
    VENTORA_DEFAULT_LINE_CATALOG.find((line) => line.catalogKey === selectedCatalogLineKey) ?? null;
  const supplierFamilyKey = resolveSupplierFamilyKeyForLineTemplate(supplierLineTemplate);
  const supplierResolutionRequest = useMemo(() => {
    const technicalCodes = [...new Set((supplierRecipe?.definition.perfiles ?? [])
      .map((profile) => profile.codigoPerfil.trim()).filter(Boolean))];
    if (!selectedCatalogLineKey || !supplierFamilyKey || technicalCodes.length === 0) return null;
    return {
      itemId: String(item.id),
      catalogLineKey: selectedCatalogLineKey,
      familyKey: supplierFamilyKey,
      finishName: resolveSupplierFinishName(form.catalogTerminacion, colorHexDraft ?? form.colorHex),
      technicalCodes,
      providerKey: supplierProviderKeyDraft !== null ? supplierProviderKeyDraft : form.supplierProviderKey || null,
    };
  }, [colorHexDraft, form.catalogTerminacion, form.colorHex, form.supplierProviderKey, item.id, selectedCatalogLineKey, supplierFamilyKey, supplierProviderKeyDraft, supplierRecipe]);
  const supplierResolutionKey = JSON.stringify(supplierResolutionRequest);
  useEffect(() => {
    if (!supplierResolutionRequest) return;
    let active = true;
    void resolveSupplierPresentationsForQuote([supplierResolutionRequest], { includeProviderOptions: true }).then((result) => {
      if (active) setSupplierProviderResolution({
        key: supplierResolutionKey,
        options: result?.providerOptions?.[String(item.id)] ?? [],
        familyPreferenceProviderKey: result?.familyPreferences?.[String(supplierResolutionRequest.familyKey)] ?? null,
        canManageFamilyPreferences: result?.canManageFamilyPreferences === true,
        error: result?.itemErrors?.[String(item.id)] ?? null,
      });
    });
    return () => { active = false; };
  }, [item.id, supplierResolutionKey, supplierResolutionRequest]);
  const supplierOptions = supplierProviderResolution?.key === supplierResolutionKey
    ? supplierProviderResolution.options
    : [];
  const isLoadingSupplierOptions = Boolean(supplierResolutionRequest && supplierProviderResolution?.key !== supplierResolutionKey);
  const storedSupplierProviderKey = supplierProviderKeyDraft ?? form.supplierProviderKey;
  const requestedFamilyPreference = supplierProviderResolution?.key === supplierResolutionKey
    ? supplierProviderResolution.familyPreferenceProviderKey
    : null;
  const effectiveFamilyPreference = familyPreferenceOverride && familyPreferenceOverride.familyKey === supplierResolutionRequest?.familyKey
    ? familyPreferenceOverride.providerKey
    : requestedFamilyPreference;
  const selectedSupplierProviderKey = supplierProviderKeyDraft !== null
    ? supplierProviderKeyDraft
    : storedSupplierProviderKey || effectiveFamilyPreference || "";
  const selectedSupplierOption = supplierOptions.find((option) => option.providerKey === selectedSupplierProviderKey) ?? null;
  const canManageFamilyPreferences = supplierProviderResolution?.key === supplierResolutionKey && supplierProviderResolution.canManageFamilyPreferences;
  const saveFamilyPreference = async (providerKey: string | null) => {
    if (!supplierResolutionRequest || !providerKey && !effectiveFamilyPreference) return;
    setFamilyPreferenceSaving(true);
    setFamilyPreferenceError(null);
    try {
      const response = await fetch("/api/proveedor-catalogos/preferencias-familia", {
        method: providerKey ? "PUT" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(providerKey
          ? { familyKey: supplierResolutionRequest.familyKey, providerKey }
          : { familyKey: supplierResolutionRequest.familyKey }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        if (response.status === 503) {
          throw new Error("El proveedor habitual no está disponible todavía. Esta pieza seguirá usando la resolución automática.");
        }
        throw new Error(payload?.error || "No se pudo guardar el proveedor habitual.");
      }
      setFamilyPreferenceOverride({ familyKey: supplierResolutionRequest.familyKey, providerKey });
      // Clear any old per-piece override so the saved family default becomes effective.
      setSupplierProviderKeyDraft("");
    } catch (error) {
      setFamilyPreferenceError(error instanceof Error ? error.message : "No se pudo actualizar el proveedor habitual.");
    } finally {
      setFamilyPreferenceSaving(false);
    }
  };
  const vidrio = vidrioDraft ?? form.vidrio;
  const colorHex = colorHexDraft ?? form.colorHex;
  const materialColorOptions = getColorOptionsForMaterial(materialDraft);
  const currentColor =
    materialColorOptions.find((color) => color.hex.toLowerCase() === colorHex.toLowerCase()) ??
    { label: "Color actual", hex: colorHex };
  const colorOptions = materialColorOptions.some(
    (color) => color.hex.toLowerCase() === colorHex.toLowerCase()
  )
    ? materialColorOptions
    : [currentColor, ...materialColorOptions];

  const buildLocalForm = (): ComponentFormState => ({
    ...form,
    nombre,
    ancho,
    alto,
    cantidad: cantidad.trim() || "1",
    lineTemplateId,
    vidrio,
    material: materialDraft,
    colorHex,
    costoProveedorUnitario: precio,
  });

  const getSuggestedPriceForTemplate = (templateId: string) => {
    const template = lineTemplates.find((candidate) => String(candidate.id) === templateId);
    if (!template) return "";

    const pricedForm = applyLineTemplateToComponentForm(buildLocalForm(), template);
    const summary = buildComponentFormLinePricingSummary(pricedForm);
    return summary.precioUnitarioSugerido !== null
      ? String(Math.round(summary.precioUnitarioSugerido))
      : "";
  };

  const buildPendingChanges = (): QuoteConstructorItemPatch => {
    const patch: QuoteConstructorItemPatch = {
      nombre: nombre.trim().slice(0, 120) || item.nombre,
      ancho: ancho.trim(),
      alto: alto.trim(),
      cantidad: cantidad.trim() || "1",
      lineTemplateId,
      vidrio,
      material: materialDraft,
      colorHex,
      supplierProviderKey: selectedSupplierProviderKey,
    };
    if (lineTemplateIdDraft !== null) {
      patch.catalogLineKey = lineTemplateId ? selectedCatalogLineKey ?? "" : "";
    }
    if (sodalL25ConfigDraft) {
      Object.assign(patch, {
        ...sodalL25ConfigDraft,
        fabricacionSnapshot: null,
        cubicationSnapshot: null,
      });
    }
    if (fabricationSelectionDraft !== null || lineTemplateIdDraft !== null) {
      const requestedFabricationSelection = fabricationSelectionDraft ?? "";
      const selectedRecipe = resolveConstructorRecipeSelection({
        // On a newly selected commercial line, persist the sole unambiguous
        // validated recipe (Ventora for Ventora catalog lines). Ambiguous
        // candidates remain unselected until the user chooses one.
        selection: requestedFabricationSelection,
        candidates: inlineRecipeCandidates,
      });
      const selectedVariant = requestedFabricationSelection.startsWith("variant:")
        ? requestedFabricationSelection.slice("variant:".length)
        : "";
      const selectedVariantSlot = l20VariantSlots.find(
        (slot) => slot.variantSlug === selectedVariant
      );
      if (selectedRecipe) {
        const identity = selectedRecipe.definition.identidad;
        Object.assign(patch, {
          fabricationRecipeId: selectedRecipe.id,
          fabricacionTipologia: identity.tipologia,
          fabricacionHojas: identity.hojas,
          fabricacionModulos: identity.modulos,
          fabricacionApertura: identity.apertura ?? "",
          fabricacionHerraje: identity.herraje ?? "",
          fabricacionVariante: identity.variante,
          fabricacionSnapshot: null,
          cubicationSnapshot: null,
        });
      } else if (selectedVariantSlot) {
        Object.assign(patch, {
          fabricationRecipeId: "",
          fabricacionTipologia: selectedVariantSlot.typology,
          fabricacionHojas: selectedVariantSlot.leavesCount,
          fabricacionModulos: selectedVariantSlot.modulesCount,
          fabricacionApertura: selectedVariantSlot.apertura ?? "",
          fabricacionHerraje: selectedVariantSlot.herraje ?? "",
          fabricacionVariante: selectedVariantSlot.variantSlug,
          fabricacionSnapshot: null,
          cubicationSnapshot: null,
        });
      } else {
        const fallbackTypology = selectedRecipeTypology ?? "";
        const fallbackLeaves =
          selectedRecipeLeaves ??
          (fallbackTypology === "shower" ? 2 : fallbackTypology === "proyectante" ? 1 : null);
        Object.assign(patch, {
          fabricationRecipeId: "",
          fabricacionTipologia: fallbackTypology,
          fabricacionHojas: fallbackLeaves,
          fabricacionModulos: fallbackLeaves,
          fabricacionApertura:
            selectedCatalogLineKey === "ventora:serie-12-shower-corredera"
              ? "shower"
              : fallbackTypology === "corredera"
                ? "corredera"
                : "",
          fabricacionHerraje: "",
          fabricacionVariante: "",
          fabricacionSnapshot: null,
          cubicationSnapshot: null,
        });
      }
    }
    if (precio.trim()) {
      patch.costoProveedorUnitario = precio.trim();
      if (precioEditedManually) {
        patch.markPriceManual = true;
      }
    }
    return patch;
  };

  const handleSave = () => onSave(buildPendingChanges());

  const handleLineTemplateChange = (
    nextLineTemplateId: string,
    selectedTemplate?: CotizacionLineTemplate | null
  ) => {
    setLineTemplateIdDraft(nextLineTemplateId);
    setSelectedLineTemplateDraft(selectedTemplate ?? null);
    setFabricationSelectionDraft("");
    const nextCatalogLineKey = resolveVariantCatalogKey(
      selectedTemplate ?? null,
      form.catalogLineKey,
      form.referencia
    );
    setSodalL25ConfigDraft(
      isSodalL25CatalogKey(
        resolveEffectiveSodalL25CatalogKey({
          catalogLineKey: nextCatalogLineKey,
          catalogKey: selectedTemplate?.catalogKey,
          nombre: selectedTemplate?.nombre,
        })
      )
        ? {
            catalogLineKey: "ventora:l25",
            fabricacionGlazing: "",
            fabricacionLeg: "",
            fabricacionReinforcement: "",
            fabricacionVariante: "",
          }
        : null
    );
    setPrecioDraft(nextLineTemplateId ? getSuggestedPriceForTemplate(nextLineTemplateId) : "");
    setPrecioEditedManually(false);
  };

  const handleVidrioChange = (nextVidrio: string) => {
    setVidrioDraft(nextVidrio);
  };

  const handleMaterialChange = (nextMaterial: ProfileMaterial) => {
    setMaterialDraft(nextMaterial);
    setShowColorChoices(false);

    const nextColorOptions = getColorOptionsForMaterial(nextMaterial);
    const keepsCurrentColor = nextColorOptions.some(
      (color) => color.hex.toLowerCase() === colorHex.toLowerCase()
    );
    if (!keepsCurrentColor && nextColorOptions[0]) {
      setColorHexDraft(nextColorOptions[0].hex);
    }
    setLineTemplateIdDraft("");
    setSelectedLineTemplateDraft(null);
    setPrecioDraft(null);
    setPrecioEditedManually(false);
  };

  const handleColorChange = (nextColorHex: string) => {
    setColorHexDraft(nextColorHex);
  };

  return (
    <div className={s.sheetRoot} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" className={s.sheetScrim} aria-label="Cerrar" onClick={onClose} />
      <div className={s.sheetPanel}>
        <div className={s.sheetHandle} aria-hidden />
        <div className={s.sheetHeader}>
          <div>
            <h2 id={titleId} className={s.sheetTitle}>
              Editar pieza
            </h2>
            <p className={s.sheetSub}>{item.tipo || "Componente"} - se guarda al confirmar</p>
          </div>
          <button type="button" className={s.iconBtn} aria-label="Cerrar" onClick={onClose}>
            <LuX size={18} />
          </button>
        </div>

        <div className={s.sheetBody}>
          <section className={s.sheetSection} aria-label="Datos basicos">
            <div className={s.sheetSectionHead}>
              <strong>Datos base</strong>
              <span>Medidas y cantidad de esta pieza.</span>
            </div>

            <label className={s.field}>
              <span className={s.fieldLabel}>Nombre</span>
              <input
                className={s.fieldInput}
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                autoComplete="off"
              />
            </label>

            <div className={s.fieldRow}>
              <label className={s.field}>
                <span className={s.fieldLabel}>{measureDimensionFieldLabel("ancho", measureUnit)}</span>
                <MeasureDimensionInput
                  className={s.fieldInput}
                  unit={measureUnit}
                  valueMm={ancho}
                  onChangeMm={setAncho}
                  placeholder={measureDimensionPlaceholder("ancho", measureUnit)}
                />
              </label>
              <label className={s.field}>
                <span className={s.fieldLabel}>{measureDimensionFieldLabel("alto", measureUnit)}</span>
                <MeasureDimensionInput
                  className={s.fieldInput}
                  unit={measureUnit}
                  valueMm={alto}
                  onChangeMm={setAlto}
                  placeholder={measureDimensionPlaceholder("alto", measureUnit)}
                />
              </label>
            </div>

            <label className={s.field}>
              <span className={s.fieldLabel}>Cantidad</span>
              <input
                className={s.fieldInput}
                inputMode="numeric"
                value={cantidad}
                onChange={(event) => setCantidad(event.target.value.replace(/[^\d]/g, ""))}
              />
            </label>

            <div className={s.qtyChips} role="group" aria-label="Cantidad rapida">
              {QUICK_QTY.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`${s.qtyChip} ${cantidad === String(value) ? s.qtyChipActive : ""}`}
                  onClick={() => setCantidad(String(value))}
                >
                  x{value}
                </button>
              ))}
            </div>
          </section>

          <section className={`${s.sheetSection} ${s.profileSection}`} aria-label="Perfil">
            <div className={s.sheetSectionHead}>
              <strong>Perfil</strong>
              <span>Material y color visible antes de elegir linea.</span>
            </div>
            <div className={s.materialField}>
              <span className={s.fieldLabel}>Material del perfil</span>
              <div className={s.materialToggle} role="group" aria-label="Elegir material del perfil">
                {PROFILE_MATERIALS.map((material) => (
                  <button
                    key={material}
                    type="button"
                    className={`${s.materialOption} ${
                      materialDraft === material ? s.materialOptionActive : ""
                    }`}
                    aria-pressed={materialDraft === material}
                    onClick={() => handleMaterialChange(material)}
                  >
                    {material}
                  </button>
                ))}
              </div>
            </div>

            <div className={s.field}>
              <span className={s.fieldLabel}>Color del perfil</span>
              <div className={s.colorSummary}>
                <div className={s.colorSelected}>
                  <span
                    className={s.colorSwatchDot}
                    style={{ backgroundColor: currentColor.hex }}
                    aria-hidden
                  />
                  <span>{currentColor.label}</span>
                </div>
                <button
                  type="button"
                  className={s.colorChangeBtn}
                  onClick={() => setShowColorChoices((value) => !value)}
                >
                  {showColorChoices ? "Ocultar" : "Cambiar"}
                </button>
              </div>
              {showColorChoices ? (
                <div className={s.colorGrid} role="group" aria-label="Colores principales">
                  {colorOptions.map((color) => {
                    const active = color.hex.toLowerCase() === colorHex.toLowerCase();
                    return (
                      <button
                        key={color.hex}
                        type="button"
                        className={`${s.colorSwatch} ${active ? s.colorSwatchActive : ""}`}
                        aria-label={color.label}
                        aria-pressed={active}
                        onClick={() => {
                          handleColorChange(color.hex);
                          setShowColorChoices(false);
                        }}
                      >
                        <span
                          className={s.colorSwatchDot}
                          style={{ backgroundColor: color.hex }}
                          aria-hidden
                        />
                        <span className={s.colorName}>{color.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </section>

          <section className={s.sheetSection} aria-label="Linea y precio">
            <div className={s.sheetSectionHead}>
              <strong>Linea y precio</strong>
              <span>La línea define el precio de venta; la composición define el despiece.</span>
            </div>
            <div className={s.compactPicker}>
              <LineTemplatePicker
                templates={lineTemplates}
                value={lineTemplateId}
                onChange={handleLineTemplateChange}
                onTemplatePriceUpdated={(template) => {
                  onTemplatePriceUpdated?.(item.id, template);
                  setSelectedLineTemplateDraft(template);
                }}
                onTemplateChange={setSelectedLineTemplateDraft}
                mode="profile"
                preferredMaterial={materialDraft}
                compatibilityContext={{
                  componentType: form.tipo,
                  openingType: resolveLineCompatibilityOpeningType(form.sistema, form.configuracion, form.guidedVisualConfig),
                  leavesCount: selectedRecipeLeaves,
                  material: materialDraft,
                }}
                ariaLabel="Elegir linea de esta pieza"
              />
            </div>
            {!selectedLineIsSodalL25 && showFabricationVariant ? (
              <QuoteFabricationVariantPicker
                title="Fabricación"
                candidates={inlineRecipeCandidates}
                selectedRecipeId={fabricationSelection.startsWith("recipe:") ? fabricationSelection.slice("recipe:".length) : null}
                onSelectRecipe={(recipe) => setFabricationSelectionDraft(`recipe:${recipe.id}`)}
                legacyOptions={l20VariantSlots.map((slot) => ({
                  value: slot.variantSlug,
                  label: slot.variantLabel,
                  detail: `${slot.leavesCount} ${slot.leavesCount === 1 ? "hoja" : "hojas"}${slot.pendingFields.length ? " · Datos técnicos pendientes" : ""}`,
                }))}
                selectedLegacyValue={fabricationSelection.startsWith("variant:") ? fabricationSelection.slice("variant:".length) : null}
                onSelectLegacy={(value) => setFabricationSelectionDraft(`variant:${value}`)}
              />
            ) : null}

            {supplierResolutionRequest ? (
              <details className={s.supplierDisclosure}>
                <summary>
                  <span>Proveedor de compra</span>
                  <strong>
                    {selectedSupplierOption?.label ??
                      (selectedSupplierProviderKey ? "Proveedor guardado · revisar cobertura" : "Automático")}
                  </strong>
                </summary>
                <div className={s.supplierDisclosureBody}>
                  <label className={s.field}>
                    <span className={s.fieldLabel}>Cambiar proveedor para esta pieza</span>
                    <select
                      className={s.fieldInput}
                      aria-label="Proveedor para precio de perfiles"
                      value={selectedSupplierProviderKey}
                      onChange={(event) => setSupplierProviderKeyDraft(event.target.value)}
                    >
                      <option value="">Automático · comportamiento anterior</option>
                      {selectedSupplierProviderKey && !supplierOptions.some((option) => option.providerKey === selectedSupplierProviderKey) ? (
                        <option value={selectedSupplierProviderKey}>Proveedor guardado · sin precio para esta composición</option>
                      ) : null}
                      {supplierOptions.map((option) => (
                        <option key={option.providerKey} value={option.providerKey}>
                          {option.label}{option.isReference ? " · Referencia" : ""} · {option.pricedProfileCount}/{option.totalProfileCount} perfiles con precio
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className={s.variantSourceHint}>
                    Cambia el costo de compra; la línea conserva el precio de venta.
                    {selectedSupplierProviderKey && !selectedSupplierOption ? " No se reemplazará por otro proveedor si faltan perfiles." : ""}
                  </span>
                {canManageFamilyPreferences && (selectedSupplierProviderKey || effectiveFamilyPreference) ? (
                  <span className={s.supplierPreferenceActions}>
                    {effectiveFamilyPreference ? <span>Habitual: {supplierOptions.find((option) => option.providerKey === effectiveFamilyPreference)?.label ?? effectiveFamilyPreference}</span> : null}
                    {selectedSupplierProviderKey ? <button type="button" disabled={familyPreferenceSaving} onClick={() => void saveFamilyPreference(selectedSupplierProviderKey)}>
                      {effectiveFamilyPreference === selectedSupplierProviderKey ? "Proveedor habitual de esta línea" : "Usar como proveedor habitual"}
                    </button> : null}
                    {effectiveFamilyPreference ? (
                      <button type="button" disabled={familyPreferenceSaving} onClick={() => void saveFamilyPreference(null)}>Quitar preferencia</button>
                    ) : null}
                  </span>
                ) : null}
                {isLoadingSupplierOptions ? <span className={s.variantSourceHint}>Buscando listas de precios compatibles…</span> : null}
                {supplierProviderResolution?.key === supplierResolutionKey && supplierProviderResolution.error ? (
                  <span className={s.preferenceError} role="status">{supplierProviderResolution.error}</span>
                ) : null}
                {!isLoadingSupplierOptions && supplierOptions.length === 0 ? (
                  <span className={s.variantSourceHint}>No hay precios compatibles para los perfiles de esta composición.</span>
                ) : null}
                  {familyPreferenceError ? <span className={s.preferenceError} role="status">{familyPreferenceError}</span> : null}
                </div>
              </details>
            ) : null}
            {supplierRecipe?.definition.perfiles.length && !supplierFamilyKey ? (
              <p className={s.variantSourceHint} role="status">
                Proveedor pendiente: esta línea todavía no tiene familia de compra configurada.
              </p>
            ) : null}

            {selectedLineIsSodalL25 ? (
              <SodalL25QuoteConfigPanel
                compact
                componentForm={{
                  ...form,
                  lineTemplateId,
                  fabricacionHojas: sodalL25Leaves,
                  catalogLineKey:
                    sodalL25ConfigDraft?.catalogLineKey ?? selectedCatalogLineKey ?? "ventora:l25",
                  fabricacionGlazing:
                    sodalL25ConfigDraft?.fabricacionGlazing ?? form.fabricacionGlazing,
                  fabricacionLeg:
                    sodalL25ConfigDraft?.fabricacionLeg ?? form.fabricacionLeg,
                  fabricacionReinforcement:
                    sodalL25ConfigDraft?.fabricacionReinforcement ?? form.fabricacionReinforcement,
                  fabricacionVariante:
                    sodalL25ConfigDraft?.fabricacionVariante ?? form.fabricacionVariante,
                  vidrio,
                }}
                selectedTemplate={selectedLineTemplate}
                onFabricacionL25ConfigChange={(value) => {
                  setSodalL25ConfigDraft(value);
                  setFabricationSelectionDraft("");
                }}
              />
            ) : null}

            <label className={s.field}>
              <span className={s.fieldLabel}>Precio unitario</span>
              <input
                className={s.fieldInput}
                inputMode="numeric"
                value={precio ? formatCurrencyInput(precio) : ""}
                onChange={(event) => {
                  setPrecioDraft(event.target.value.replace(/[^\d]/g, ""));
                  setPrecioEditedManually(true);
                }}
                placeholder="CLP"
              />
            </label>

            <div className={s.technicalNote}>
              <strong>Cubicacion y pauta de corte</strong>
              <span>Se revisa desde la pauta de fabricación.</span>
            </div>
          </section>

          <section className={s.sheetSection} aria-label="Vidrio">
            <div className={s.sheetSectionHead}>
              <strong>Vidrio</strong>
              <span>Tipo de vidrio para esta pieza.</span>
            </div>
            <div className={s.compactPicker}>
              <GlassOptionPicker
                options={glassOptions}
                value={vidrio}
                onChange={handleVidrioChange}
                ariaLabel="Elegir tipo de vidrio"
                placeholder="Elegir vidrio"
              />
            </div>
          </section>

          <button
            type="button"
            className={s.constructorLink}
            onClick={() => onOpenConstructor(buildPendingChanges())}
          >
            <span>
              <p className={s.constructorLinkTitle}>Forma y apertura</p>
              <p className={s.constructorLinkHelp}>
                Parte modulos, cambia apertura, redondeos y palillos.
              </p>
            </span>
            <LuArrowRight size={18} aria-hidden />
          </button>

          <div className={s.sheetActions}>
            <button type="button" className={s.secondaryBtn} onClick={onDuplicate}>
              Duplicar
            </button>
            <button type="button" className={s.dangerBtn} onClick={onRemove}>
              Eliminar
            </button>
          </div>
        </div>

        <div className={s.sheetFooter}>
          <button type="button" className={s.primaryBtn} onClick={handleSave}>
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

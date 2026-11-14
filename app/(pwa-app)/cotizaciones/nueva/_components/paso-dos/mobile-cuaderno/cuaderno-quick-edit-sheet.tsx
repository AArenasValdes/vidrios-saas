"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { LuArrowRight, LuInfo, LuStar, LuX } from "react-icons/lu";

import { LineTemplatePicker } from "@/features/cotizaciones/line-templates/components/line-template-picker";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { resolveLineCompatibilityContext, resolveLineCompatibilityOpeningType } from "@/features/cotizaciones/line-templates/services/line-template-compatibility.service";
import { resolveSupplierFamilyKeyForLineTemplate } from "@/features/cotizaciones/line-templates/services/line-template-family.service";
import { VENTORA_DEFAULT_LINE_CATALOG } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import {
  ALUMINUM_COLOR_OPTIONS,
  applyGlassSelectionToComponentForm,
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
import { isSodalL25ZetaValidatedRecipe, resolveFabricationRecipe } from "@/features/fabricacion/services/fabricacion-receta-resolver.service";
import { resolveUniversalPricedLineFallbacks } from "@/features/fabricacion/services/fabricacion-receta-universal-fallback.service";
import { inferirTipologiaFabricacionPieza } from "@/features/fabricacion/services/fabricacion-contexto-pieza.service";
import { QuoteFabricationVariantPicker } from "@/features/fabricacion/components/quote-fabrication-variant-picker";
import { getLineVariantSlots } from "@/features/fabricacion/fixtures/line-base-variant-catalog";
import {
  buildSodalL25VariantSlug,
  type SodalL25GlazingSlug,
  type SodalL25LegSlug,
  type SodalL25ReinforcementSlug,
} from "@/features/fabricacion/fixtures/sodal-l25-zeta-catalog";
import {
  findSodalL25LineRecipe,
  inferSodalL25GlazingFromGlass,
  resolveSodalL25QuoteConfig,
  selectSodalL25LineRecipes,
} from "@/features/fabricacion/services/sodal-l25-context.service";
import { isSodalL25CatalogKey, resolveEffectiveSodalL25CatalogKey } from "@/features/fabricacion/services/sodal-l25-presentation.service";
import { useOrganizationMeasureUnit } from "@/features/organization-profile/hooks/use-organization-measure-unit";
import { resolveSupplierFinishName } from "@/features/proveedor-catalogos/services/supplier-presentation-resolution.service";
import { resolveSupplierPresentationsForQuote, type SupplierPriceProviderOption } from "@/features/proveedor-catalogos/services/supplier-presentations.client";
import {
  resolveQuoteSupplierProfileReferences,
  type SupplierProfilePricePreview,
} from "@/features/proveedor-catalogos/services/supplier-presentation-resolution.service";
import { getLineTemplateWorkshopProfiles } from "@/features/cotizaciones/line-templates/types/line-profile-references";
import { SupplierProfilePricePreview as SupplierProfilePricePreviewComponent } from "@/features/proveedor-catalogos/components/supplier-profile-price-preview";
import { QuoteProfileCosts } from "@/features/proveedor-catalogos/components/quote-profile-costs";
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
  const supplierDisclosureRef = useRef<HTMLDetailsElement>(null);
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
  const [glassProductIdDraft, setGlassProductIdDraft] = useState<string | null>(null);
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
    profilePrices: SupplierProfilePricePreview[];
    optionsByFinish: Record<string, SupplierPriceProviderOption[]>;
    profilePricesByFinish: Record<string, SupplierProfilePricePreview[]>;
    familyPreferenceProviderKey: string | null;
    canManageFamilyPreferences: boolean;
    canManageSupplierPrices: boolean;
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
      | "fabricationRecipeId"
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
  const sodalL25Leaves = selectedRecipeLeaves ??
    inferLeavesFromLineLabel(
      `${selectedLineTemplate?.nombre ?? ""} ${form.referencia ?? ""} ${item.lineaComercial ?? ""}`
    ) ?? form.fabricacionHojas ?? inferLeavesFromLineLabel(form.referencia);
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
    // L25's confirmed Zeta recipes can be shared with line_template_id NULL.
    // Query the full scoped set and apply the same family filter as its panel.
    lineTemplateId: canLoadSelectedLineRecipes && !selectedLineIsSodalL25
      ? selectedRecipeLineTemplateId
      : undefined,
    skipStructuralSeed: true,
  });
  const effectiveSelectedLineRecipes = useMemo(() => selectedLineIsSodalL25
    ? selectSodalL25LineRecipes({
        recipes: selectedLineRecipes,
        lineTemplateId: selectedRecipeLineTemplateId,
        lineName: selectedLineTemplate?.nombre ?? form.referencia ?? "L25",
      })
    : selectedLineRecipes, [
      form.referencia,
      selectedLineIsSodalL25,
      selectedLineRecipes,
      selectedLineTemplate?.nombre,
      selectedRecipeLineTemplateId,
    ]);
  const effectiveSodalL25Config = useMemo(() => selectedLineIsSodalL25
    ? resolveSodalL25QuoteConfig({
        catalogKey: selectedCatalogLineKey,
        presentation: {
          fabricacionGlazing: sodalL25ConfigDraft?.fabricacionGlazing ?? form.fabricacionGlazing ?? "",
          fabricacionLeg: sodalL25ConfigDraft?.fabricacionLeg ?? form.fabricacionLeg ?? "",
          fabricacionReinforcement: sodalL25ConfigDraft?.fabricacionReinforcement ?? form.fabricacionReinforcement ?? "",
          fabricacionVariante: sodalL25ConfigDraft?.fabricacionVariante ?? form.fabricacionVariante ?? "",
          fabricacionHojas: sodalL25Leaves,
          sheetScheme: form.sheetScheme,
        },
        vidrio: vidrioDraft ?? form.vidrio,
        fabricacionHojas: sodalL25Leaves,
        sheetScheme: form.sheetScheme,
      })
    : null, [
      form.fabricacionGlazing,
      form.fabricacionLeg,
      form.fabricacionReinforcement,
      form.fabricacionVariante,
      form.sheetScheme,
      form.vidrio,
      selectedCatalogLineKey,
      selectedLineIsSodalL25,
      sodalL25ConfigDraft,
      sodalL25Leaves,
      vidrioDraft,
    ]);
  const exactSodalL25Recipe = useMemo(() => {
    if (!effectiveSodalL25Config?.complete) return null;
    const candidate = findSodalL25LineRecipe(effectiveSelectedLineRecipes, {
      hojas: effectiveSodalL25Config.hojas,
      glazing: effectiveSodalL25Config.glazing,
      leg: effectiveSodalL25Config.leg,
      reinforcement: effectiveSodalL25Config.reinforcement,
    });
    return candidate && isSodalL25ZetaValidatedRecipe(candidate) ? candidate : null;
  }, [effectiveSodalL25Config, effectiveSelectedLineRecipes]);
  const inlineRecipeResolution = useMemo(() => {
    if (
      !canLoadSelectedLineRecipes ||
      isLoadingSelectedLineRecipes ||
      !selectedRecipeTypology
    ) {
      return null;
    }
    const l25Variant = effectiveSodalL25Config?.complete
      ? effectiveSodalL25Config.variantSlug
      : "";
    const variant = selectedLineIsSodalL25
      ? l25Variant || null
      : (sodalL25ConfigDraft?.fabricacionVariante ?? form.fabricacionVariante) || null;
    const exactResolution = resolveFabricationRecipe(effectiveSelectedLineRecipes, {
      organizationId: recipeOrganizationId,
      lineTemplateId: selectedRecipeLineTemplateId,
      catalogKey: selectedCatalogLineKey,
      tipologia: selectedRecipeTypology,
      hojas: selectedRecipeLeaves,
      modulos: form.fabricacionModulos,
      apertura: form.fabricacionApertura || resolveLineCompatibilityOpeningType(form.sistema, form.configuracion, form.guidedVisualConfig),
      herraje: form.fabricacionHerraje,
      variante: variant,
      configurationId: form.fabricacionConfiguracionId || null,
      compositionId: form.fabricacionComposicionId || null,
      preferredRecipeId: selectedLineIsSodalL25 && sodalL25ConfigDraft
        ? null
        : form.fabricationRecipeId || null,
      glassName: vidrioDraft ?? form.vidrio,
      glazing: (effectiveSodalL25Config?.glazing ?? sodalL25ConfigDraft?.fabricacionGlazing ?? form.fabricacionGlazing) as
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
        variant,
        configurationId: form.fabricacionConfiguracionId || null,
        compositionId: form.fabricacionComposicionId || null,
        glass: vidrioDraft ?? form.vidrio,
        glazing: effectiveSodalL25Config?.glazing ?? sodalL25ConfigDraft?.fabricacionGlazing ?? form.fabricacionGlazing,
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
    effectiveSelectedLineRecipes,
    selectedLineIsSodalL25,
    selectedRecipeLeaves,
    selectedRecipeLineTemplateId,
    selectedRecipeTypology,
    sodalL25ConfigDraft,
    effectiveSodalL25Config,
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
      recipes: effectiveSelectedLineRecipes,
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
    effectiveSelectedLineRecipes,
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
  const effectiveSupplierRecipe = selectedLineIsSodalL25
    ? exactSodalL25Recipe
    : supplierRecipe;
  const isResolvingL25Recipe = selectedLineIsSodalL25 &&
    (isLoadingSelectedLineRecipes || !recipeOrganizationId);
  const supplierLineTemplate = selectedLineTemplate ??
    VENTORA_DEFAULT_LINE_CATALOG.find((line) => line.catalogKey === selectedCatalogLineKey) ?? null;
  const supplierFamilyKey = resolveSupplierFamilyKeyForLineTemplate(supplierLineTemplate);
  const supplierProfileReferences = useMemo(() => {
    const documentedProfiles = getLineTemplateWorkshopProfiles(supplierLineTemplate?.catalogMetadata)?.profiles
      .filter((profile) => profile.codeStatus === "catalog_reference" && profile.code?.trim())
      .map((profile) => ({ code: profile.code!, name: profile.name })) ?? [];
    const recipeProfiles = (effectiveSupplierRecipe?.definition.perfiles ?? []).map((profile) => ({
      code: profile.codigoPerfil,
      name: profile.nombrePerfil,
    }));
    return resolveQuoteSupplierProfileReferences({
      recipeProfiles,
      documentedProfiles,
      requireExactRecipe: selectedLineIsSodalL25,
    });
  }, [effectiveSupplierRecipe, selectedLineIsSodalL25, supplierLineTemplate?.catalogMetadata]);
  const activeSupplierFinishName = resolveSupplierFinishName(form.catalogTerminacion, colorHexDraft ?? form.colorHex);
  const supplierPreviewFinishNames = useMemo(() => {
    if (!selectedLineIsSodalL25) return [];
    return [...new Set(ALUMINUM_COLOR_OPTIONS.map((option) => resolveSupplierFinishName(option.label, option.hex))
      .filter((finishName): finishName is string => Boolean(finishName)))];
  }, [selectedLineIsSodalL25]);
  const supplierResolutionFinishName = selectedLineIsSodalL25 ? null : activeSupplierFinishName;
  // The resolver response includes profile price previews for every compatible
  // provider. Selecting Arquetipo/Alumco is presentation state, so it must not
  // invalidate this request and repeat the full catalog resolution.
  const supplierResolutionRequest = useMemo(() => {
    const documentedCodes = getLineTemplateWorkshopProfiles(supplierLineTemplate?.catalogMetadata)?.profiles
      .filter((profile) => profile.codeStatus === "catalog_reference" && profile.code?.trim())
      .map((profile) => profile.code!.trim()) ?? [];
    // L25 costs describe exact recipe requirements, not general catalog
    // references. Do not request or display a definitive list without a recipe.
    if (selectedLineIsSodalL25 && !effectiveSupplierRecipe) return null;
    const technicalCodes = supplierProfileReferences.length > 0
      ? supplierProfileReferences.map((profile) => profile.technicalCode)
      : documentedCodes;
    if (!selectedCatalogLineKey || !supplierFamilyKey || technicalCodes.length === 0) return null;
    return {
      itemId: String(item.id),
      catalogLineKey: selectedCatalogLineKey,
      familyKey: supplierFamilyKey,
      // Fetch provider and finish options once. Color selection is local display
      // state; it must not invalidate the catalog request or flash an empty list.
      finishName: supplierResolutionFinishName,
      previewFinishNames: supplierPreviewFinishNames,
      technicalCodes,
    };
  }, [effectiveSupplierRecipe, item.id, selectedCatalogLineKey, selectedLineIsSodalL25, supplierFamilyKey, supplierLineTemplate?.catalogMetadata, supplierPreviewFinishNames, supplierProfileReferences, supplierResolutionFinishName]);
  const supplierResolutionKey = JSON.stringify(supplierResolutionRequest);
  useEffect(() => {
    if (!supplierResolutionRequest) return;
    let active = true;
    void resolveSupplierPresentationsForQuote([supplierResolutionRequest], { includeProviderOptions: true }).then((result) => {
      if (active) setSupplierProviderResolution({
        key: supplierResolutionKey,
        options: result?.providerOptions?.[String(item.id)] ?? [],
        profilePrices: result?.profilePrices?.[String(item.id)] ?? [],
        optionsByFinish: result?.providerOptionsByFinish?.[String(item.id)] ?? {},
        profilePricesByFinish: result?.profilePricesByFinish?.[String(item.id)] ?? {},
        familyPreferenceProviderKey: result?.familyPreferences?.[String(supplierResolutionRequest.familyKey)] ?? null,
        canManageFamilyPreferences: result?.canManageFamilyPreferences === true,
        canManageSupplierPrices: result?.canManageSupplierPrices === true,
        error: result
          ? result.itemErrors?.[String(item.id)] ?? null
          : "No se pudo cargar la lista de proveedores. Intenta de nuevo en unos segundos.",
      });
    });
    return () => { active = false; };
  }, [item.id, supplierResolutionKey, supplierResolutionRequest]);
  const supplierOptions = supplierProviderResolution?.key === supplierResolutionKey
    ? supplierProviderResolution.optionsByFinish[activeSupplierFinishName ?? ""] ?? supplierProviderResolution.options
    : [];
  const supplierProfilePrices = supplierProviderResolution?.key === supplierResolutionKey
    ? supplierProviderResolution.profilePricesByFinish[activeSupplierFinishName ?? ""] ?? supplierProviderResolution.profilePrices
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
  const automaticSupplierLabel = effectiveFamilyPreference
    ? supplierOptions.find((option) => option.providerKey === effectiveFamilyPreference)?.label ?? effectiveFamilyPreference
    : supplierOptions.find((option) => option.providerKey === "arquetipo")?.label ?? "Arquetipo 2026";
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
      if (providerKey && supplierDisclosureRef.current) {
        supplierDisclosureRef.current.open = false;
      }
    } catch (error) {
      setFamilyPreferenceError(error instanceof Error ? error.message : "No se pudo actualizar el proveedor habitual.");
    } finally {
      setFamilyPreferenceSaving(false);
    }
  };
  const vidrio = vidrioDraft ?? form.vidrio;
  const selectedGlassProductId = glassProductIdDraft ?? (vidrioDraft === null ? form.vidrioLineTemplateId : "");
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

  const buildLocalForm = (): ComponentFormState => applyGlassSelectionToComponentForm({
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
  }, { displayName: vidrio, productId: selectedGlassProductId }, lineTemplates);

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
      vidrioLineTemplateId: buildLocalForm().vidrioLineTemplateId,
      glassTechnicalSpec: buildLocalForm().glassTechnicalSpec,
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
          fabricacionVariante: selectedLineIsSodalL25
            ? sodalL25ConfigDraft?.fabricacionVariante ?? ""
            : "",
          fabricacionSnapshot: null,
          cubicationSnapshot: null,
        });
      }
    }
    if (selectedLineIsSodalL25) {
      const config = effectiveSodalL25Config;
      Object.assign(patch, {
        catalogLineKey: "ventora:l25",
        fabricacionTipologia: "corredera",
        fabricacionHojas: sodalL25Leaves,
        fabricacionModulos: form.fabricacionModulos ?? sodalL25Leaves,
        fabricacionApertura: "corredera",
        fabricacionHerraje: "",
        fabricacionGlazing: config?.glazing ?? sodalL25ConfigDraft?.fabricacionGlazing ?? form.fabricacionGlazing ?? "",
        fabricacionLeg: config?.leg ?? sodalL25ConfigDraft?.fabricacionLeg ?? form.fabricacionLeg ?? "",
        fabricacionReinforcement: config?.reinforcement ?? sodalL25ConfigDraft?.fabricacionReinforcement ?? form.fabricacionReinforcement ?? "",
        fabricacionVariante: exactSodalL25Recipe ? config?.variantSlug ?? "" : "",
        fabricationRecipeId: exactSodalL25Recipe?.id ?? "",
        fabricacionSnapshot: null,
        cubicationSnapshot: null,
      });
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
            fabricationRecipeId: "",
          }
        : null
    );
    setPrecioDraft(nextLineTemplateId ? getSuggestedPriceForTemplate(nextLineTemplateId) : "");
    setPrecioEditedManually(false);
  };

  const handleVidrioChange = (nextVidrio: string) => {
    setVidrioDraft(nextVidrio);
    setGlassProductIdDraft("");
    if (!selectedLineIsSodalL25) return;
    const glazing = inferSodalL25GlazingFromGlass({
      vidrio: nextVidrio,
      catalogEspesor: selectedLineTemplate?.catalogMetadata
        ? String((selectedLineTemplate.catalogMetadata as Record<string, unknown>).espesor ?? "")
        : "",
      catalogTerminacion: selectedLineTemplate?.nombre ?? "",
    });
    const leg = sodalL25ConfigDraft?.fabricacionLeg ?? form.fabricacionLeg ?? "";
    const reinforcement = sodalL25ConfigDraft?.fabricacionReinforcement ?? form.fabricacionReinforcement ?? "";
    const variantSlug = leg && reinforcement
      ? buildSodalL25VariantSlug({
          glazing,
          leg: leg as SodalL25LegSlug,
          reinforcement: reinforcement as SodalL25ReinforcementSlug,
        })
      : "";
    setSodalL25ConfigDraft({
      catalogLineKey: "ventora:l25",
      fabricacionGlazing: glazing,
      fabricacionLeg: leg,
      fabricacionReinforcement: reinforcement,
      fabricacionVariante: variantSlug,
      fabricationRecipeId: "",
    });
    setFabricationSelectionDraft("");
  };

  const handleGlassProductChange = (productId: string) => {
    const template = lineTemplates.find((candidate) => String(candidate.id) === productId && candidate.categoria === "vidrio");
    if (template) {
      handleVidrioChange(template.nombre);
      setGlassProductIdDraft(String(template.id));
    } else {
      setGlassProductIdDraft("");
    }
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
                compatibilityContext={resolveLineCompatibilityContext({
                  componentType: form.tipo,
                  system: form.sistema,
                  configuration: form.configuracion,
                  componentLabel: `${form.nombre ?? ""} ${form.referencia ?? ""}`,
                  leavesCount: selectedRecipeLeaves,
                  material: materialDraft,
                  guidedVisualConfig: form.guidedVisualConfig,
                })}
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
              <details ref={supplierDisclosureRef} className={s.supplierDisclosure}>
                <summary>
                  <span>Proveedor de compra</span>
                  <strong>
                    {selectedSupplierOption?.label ??
                      (selectedSupplierProviderKey ? "Proveedor guardado · revisar cobertura" : `${automaticSupplierLabel} · predeterminado`)}
                  </strong>
                </summary>
                <div className={s.supplierDisclosureBody}>
                  <label className={s.field}>
                    <span className={s.fieldLabel}>Proveedor para esta pieza</span>
                    <select
                      className={s.fieldInput}
                      aria-label="Proveedor para precio de perfiles"
                      value={selectedSupplierProviderKey}
                      onChange={(event) => setSupplierProviderKeyDraft(event.target.value)}
                    >
                      <option value="">Predeterminado · {automaticSupplierLabel}</option>
                      {selectedSupplierProviderKey && !supplierOptions.some((option) => option.providerKey === selectedSupplierProviderKey) ? (
                        <option value={selectedSupplierProviderKey}>Proveedor guardado · sin precio para esta composición</option>
                      ) : null}
                      {supplierOptions.map((option) => (
                        <option key={option.providerKey} value={option.providerKey}>
                          {option.label} · {selectedLineIsSodalL25 && !effectiveSupplierRecipe
                            ? "precios de familia; perfiles pendientes de determinar"
                            : `${option.pricedProfileCount}/${option.totalProfileCount} perfiles con precio`}{option.baseReferenceProfileCount ? ` · ${option.baseReferenceProfileCount} con base Titanio (presentación pendiente)` : ""}{option.otherAvailableFinishNames?.length ? ` · precio en ${option.otherAvailableFinishNames.slice(0, 2).join(", ")}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className={s.variantSourceHint}>
                    Este cambio aplica a esta pieza y conserva el precio de venta de la línea.
                    {selectedSupplierProviderKey && !selectedSupplierOption ? " No se reemplazará por otro proveedor si faltan perfiles." : ""}
                  </span>
                  {canManageFamilyPreferences && (selectedSupplierProviderKey || effectiveFamilyPreference) ? (
                    <div className={s.supplierPreferenceActions}>
                      {selectedSupplierProviderKey && effectiveFamilyPreference !== selectedSupplierProviderKey ? (
                        <button
                          type="button"
                          className={s.supplierDefaultButton}
                          disabled={familyPreferenceSaving}
                          onClick={() => void saveFamilyPreference(selectedSupplierProviderKey)}
                        >
                          <LuStar size={16} aria-hidden="true" />
                          {familyPreferenceSaving
                            ? "Guardando…"
                            : `Dejar ${selectedSupplierOption?.label ?? selectedSupplierProviderKey} como predeterminado`}
                        </button>
                      ) : effectiveFamilyPreference ? (
                        <span className={s.supplierDefaultStatus} role="status">
                          {familyPreferenceSaving
                            ? "Guardando proveedor predeterminado…"
                            : `Predeterminado para esta línea: ${supplierOptions.find((option) => option.providerKey === effectiveFamilyPreference)?.label ?? effectiveFamilyPreference}`}
                        </span>
                      ) : null}
                      <span className={s.supplierChangeNote} role="note">
                        <LuInfo size={14} aria-hidden="true" />
                        <span>Puedes cambiar el proveedor cuando quieras.</span>
                      </span>
                      {effectiveFamilyPreference ? (
                        <button
                          type="button"
                          className={s.supplierPreferenceRemove}
                          disabled={familyPreferenceSaving}
                          onClick={() => void saveFamilyPreference(null)}
                        >
                          Quitar predeterminado
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  {supplierResolutionRequest ? selectedLineIsSodalL25 && supplierResolutionRequest.familyKey === "universal:aluminio:l25" ? (
                    <QuoteProfileCosts
                      lineTemplateId={Number(lineTemplateId)}
                      familyKey={supplierResolutionRequest.familyKey}
                      providerKey={selectedSupplierProviderKey || effectiveFamilyPreference || "arquetipo"}
                      finishName={activeSupplierFinishName}
                      references={supplierProfileReferences}
                      prices={supplierProfilePrices}
                      canManagePrice={supplierProviderResolution?.key === supplierResolutionKey && supplierProviderResolution.canManageSupplierPrices}
                      onUseWorkshopCost={(providerKey) => setSupplierProviderKeyDraft(providerKey)}
                      onPricesSaved={async () => {
                        if (!supplierResolutionRequest) return;
                        const result = await resolveSupplierPresentationsForQuote([supplierResolutionRequest], { includeProviderOptions: true });
                        setSupplierProviderResolution({
                          key: supplierResolutionKey,
                          options: result?.providerOptions?.[String(item.id)] ?? [],
                          profilePrices: result?.profilePrices?.[String(item.id)] ?? [],
                          optionsByFinish: result?.providerOptionsByFinish?.[String(item.id)] ?? {},
                          profilePricesByFinish: result?.profilePricesByFinish?.[String(item.id)] ?? {},
                          familyPreferenceProviderKey: result?.familyPreferences?.[String(supplierResolutionRequest.familyKey)] ?? null,
                          canManageFamilyPreferences: result?.canManageFamilyPreferences === true,
                          canManageSupplierPrices: result?.canManageSupplierPrices === true,
                          error: result?.itemErrors?.[String(item.id)] ?? null,
                        });
                      }}
                    />
                  ) : (
                    <SupplierProfilePricePreviewComponent
                      prices={supplierProfilePrices}
                      providerKey={selectedSupplierProviderKey || effectiveFamilyPreference || "arquetipo"}
                      familyKey={supplierResolutionRequest.familyKey}
                      finishName={activeSupplierFinishName}
                      canManagePrice={supplierProviderResolution?.key === supplierResolutionKey && supplierProviderResolution.canManageSupplierPrices}
                      onPriceSaved={async () => {
                        if (!supplierResolutionRequest) return;
                        const result = await resolveSupplierPresentationsForQuote([supplierResolutionRequest], { includeProviderOptions: true });
                        setSupplierProviderResolution({
                          key: supplierResolutionKey,
                          options: result?.providerOptions?.[String(item.id)] ?? [],
                          profilePrices: result?.profilePrices?.[String(item.id)] ?? [],
                          optionsByFinish: result?.providerOptionsByFinish?.[String(item.id)] ?? {},
                          profilePricesByFinish: result?.profilePricesByFinish?.[String(item.id)] ?? {},
                          familyPreferenceProviderKey: result?.familyPreferences?.[String(supplierResolutionRequest.familyKey)] ?? null,
                          canManageFamilyPreferences: result?.canManageFamilyPreferences === true,
                          canManageSupplierPrices: result?.canManageSupplierPrices === true,
                          error: result?.itemErrors?.[String(item.id)] ?? null,
                        });
                      }}
                    />
                  ) : null}
                {isLoadingSupplierOptions ? <span className={s.variantSourceHint}>Buscando listas de precios compatibles…</span> : null}
                {supplierProviderResolution?.key === supplierResolutionKey && supplierProviderResolution.error ? (
                  <span className={s.preferenceError} role="status">{supplierProviderResolution.error}</span>
                ) : null}
                {!isLoadingSupplierOptions && supplierOptions.length === 0 && !supplierProviderResolution?.error ? (
                  <span className={s.variantSourceHint}>No hay precios compatibles para los perfiles de esta composición.</span>
                ) : null}
                  {familyPreferenceError ? <span className={s.preferenceError} role="status">{familyPreferenceError}</span> : null}
                </div>
              </details>
            ) : null}
            {selectedLineIsSodalL25 && isResolvingL25Recipe ? (
              <p className={s.variantSourceHint} role="status">Resolviendo receta exacta L25…</p>
            ) : selectedLineIsSodalL25 && !effectiveSodalL25Config?.complete ? (
              <p className={s.supplierPending} role="status">
                Elige vidrio, pierna y refuerzo para resolver la receta exacta.
              </p>
            ) : selectedLineIsSodalL25 && !effectiveSupplierRecipe ? (
              <p className={s.supplierPending} role="status">
                Esta combinación aún no tiene receta validada.
              </p>
            ) : selectedLineIsSodalL25 && effectiveSupplierRecipe ? (
              <p className={s.variantSourceHint} role="status">
                Receta L25 resuelta · versión {effectiveSupplierRecipe.version} · {effectiveSupplierRecipe.definition.identidad.variante}.
              </p>
            ) : effectiveSupplierRecipe?.definition.perfiles.length && !supplierFamilyKey ? (
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
                  setSodalL25ConfigDraft({ ...value, fabricationRecipeId: "" });
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
              <label className={s.fieldLabel} htmlFor="constructor-glass-catalog">Producto del catálogo</label>
              <select
                id="constructor-glass-catalog"
                className={s.fieldInput}
                aria-label="Vincular vidrio del catálogo"
                value={selectedGlassProductId}
                onChange={(event) => handleGlassProductChange(event.target.value)}
              >
                <option value="">Vidrio escrito o sin vínculo</option>
                {lineTemplates.filter((template) => template.categoria === "vidrio").map((template) => (
                  <option key={template.id} value={String(template.id)}>{template.nombre}</option>
                ))}
              </select>
              {selectedGlassProductId ? <small>Vinculado: {lineTemplates.find((template) => String(template.id) === selectedGlassProductId)?.nombre}</small> : vidrio ? <small>Este vidrio está guardado solo por nombre. Elige un producto para asociar su ficha técnica.</small> : null}
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

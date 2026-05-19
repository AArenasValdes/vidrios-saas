"use client";

import { useMemo, useState } from "react";

import {
  composeComponentReference,
  getSystemOptionsForComponent,
  splitComponentReference,
} from "@/features/cotizaciones/services/component-catalog.service";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { type PricingMode } from "@/features/cotizaciones/types/pricing-mode";
import {
  buildItemFromForm,
  formatCurrencyInput,
  mapItemToForm,
} from "@/features/cotizaciones/new-quote/workflow-ui";

type VariationBase = {
  ancho: string;
  alto: string;
  precio: string;
  sistema: string;
};

export type VariationFamily = {
  familyId: string;
  baseCode: string;
  tipo: string;
  pricingMode: PricingMode;
  configuracion: string;
  base: VariationBase;
  itemIds: string[];
};

type VariationQuickEditDraft = {
  familyId: string;
  sourceItemId: string;
  familyItemIds: string[];
  baseCode: string;
  tipo: string;
  pricingMode: PricingMode;
  configuracion: string;
  base: VariationBase;
  dirty: boolean;
  items: Array<{
    id: string;
    sourceItemId: string;
    ancho: string;
    alto: string;
    precio: string;
    sistema: string;
  }>;
};

type MaterializedVariationResult = {
  changed: boolean;
  family?: VariationFamily;
  nextItems: CotizacionWorkflowItem[];
  builtItemsByDraftId: Map<string, CotizacionWorkflowItem>;
};

type PendingForcedFullEdit = {
  familyId: string;
  targetItemId: string;
  originalItems: CotizacionWorkflowItem[];
  originalSourceItem: CotizacionWorkflowItem;
};

type Params = {
  items: CotizacionWorkflowItem[];
  setItems: (nextItems: CotizacionWorkflowItem[]) => void;
  openItemForEditing: (
    item: CotizacionWorkflowItem,
    nextItemsOverride?: CotizacionWorkflowItem[]
  ) => void;
  clearEditingState: () => void;
  clearUiState: () => void;
  openStepTwoTop: () => void;
  scrollToList: () => void;
};

const buildVariationMemberCode = (baseCode: string, index: number) =>
  index === 0 ? baseCode : `${baseCode}-${index + 1}`;

export function usePasoDosVariaciones({
  items,
  setItems,
  openItemForEditing,
  clearEditingState,
  clearUiState,
  openStepTwoTop,
  scrollToList,
}: Params) {
  const [variationFamilies, setVariationFamilies] = useState<VariationFamily[]>([]);
  const [variationQuickEditDraft, setVariationQuickEditDraft] =
    useState<VariationQuickEditDraft | null>(null);
  const [pendingForcedFullEdit, setPendingForcedFullEdit] =
    useState<PendingForcedFullEdit | null>(null);

  const isSameUnitConfiguration = (
    item: CotizacionWorkflowItem,
    originalSourceItem: CotizacionWorkflowItem
  ) => {
    const itemForm = mapItemToForm(item);
    const sourceForm = mapItemToForm(originalSourceItem);

    return (
      itemForm.tipo === sourceForm.tipo &&
      itemForm.material === sourceForm.material &&
      itemForm.referencia === sourceForm.referencia &&
      itemForm.lineTemplateId === sourceForm.lineTemplateId &&
      itemForm.pricingMode === sourceForm.pricingMode &&
      itemForm.vidrio === sourceForm.vidrio &&
      itemForm.nombre === sourceForm.nombre &&
      itemForm.descripcion === sourceForm.descripcion &&
      itemForm.ancho === sourceForm.ancho &&
      itemForm.alto === sourceForm.alto &&
      itemForm.costoProveedorUnitario === sourceForm.costoProveedorUnitario &&
      itemForm.margenPct === sourceForm.margenPct &&
      itemForm.precioPorM2 === sourceForm.precioPorM2 &&
      itemForm.minimoCobrable === sourceForm.minimoCobrable &&
      itemForm.redondeoPrecio === sourceForm.redondeoPrecio &&
      itemForm.precioPlantillaSugerido === sourceForm.precioPlantillaSugerido &&
      itemForm.precioAjustadoManual === sourceForm.precioAjustadoManual &&
      itemForm.origenPrecio === sourceForm.origenPrecio &&
      itemForm.observaciones === sourceForm.observaciones &&
      itemForm.colorHex === sourceForm.colorHex
    );
  };

  const openVariationQuickEdit = (item: CotizacionWorkflowItem) => {
    const parsed = mapItemToForm(item);
    const referenceParts = splitComponentReference(parsed.referencia, item.tipo);
    const unitDrafts = Array.from({ length: Math.max(1, item.cantidad) }, (_, index) => ({
      id: `${item.id}-unit-${index + 1}`,
      sourceItemId: item.id,
      ancho: parsed.ancho,
      alto: parsed.alto,
      precio: parsed.costoProveedorUnitario,
      sistema: referenceParts.sistema,
    }));

    setVariationQuickEditDraft({
      familyId: `group-${item.id}`,
      sourceItemId: item.id,
      familyItemIds: [item.id],
      baseCode: item.codigo,
      tipo: item.tipo,
      pricingMode: parsed.pricingMode,
      configuracion: referenceParts.configuracion,
      base: {
        ancho: parsed.ancho,
        alto: parsed.alto,
        precio: parsed.costoProveedorUnitario,
        sistema: referenceParts.sistema,
      },
      dirty: false,
      items: unitDrafts,
    });
    clearEditingState();
    clearUiState();
    openStepTwoTop();
  };

  const openVariationQuickEditForFamily = (
    family: VariationFamily,
    sourceItemId?: string
  ) => {
    const familyItems = family.itemIds
      .map((itemId) => items.find((item) => item.id === itemId) ?? null)
      .filter((item): item is CotizacionWorkflowItem => item !== null);

    if (familyItems.length === 0) {
      return;
    }

    setVariationQuickEditDraft({
      familyId: family.familyId,
      sourceItemId: sourceItemId ?? familyItems[0].id,
      familyItemIds: family.itemIds,
      baseCode: family.baseCode,
      tipo: family.tipo,
      pricingMode: family.pricingMode,
      configuracion: family.configuracion,
      base: family.base,
      dirty: false,
      items: familyItems.flatMap((item, itemIndex) => {
        const parsed = mapItemToForm(item);
        const referenceParts = splitComponentReference(parsed.referencia, item.tipo);

        return Array.from({ length: Math.max(1, item.cantidad) }, (_, unitIndex) => ({
          id: `${item.id}-unit-${itemIndex + 1}-${unitIndex + 1}`,
          sourceItemId: item.id,
          ancho: parsed.ancho,
          alto: parsed.alto,
          precio: parsed.costoProveedorUnitario,
          sistema: referenceParts.sistema,
        }));
      }),
    });
    clearEditingState();
    clearUiState();
    openStepTwoTop();
  };

  const materializeVariationQuickEdit = (
    force = false,
    forcedDraftId?: string
  ): MaterializedVariationResult | null => {
    if (!variationQuickEditDraft) {
      return null;
    }

    const familyItems = variationQuickEditDraft.familyItemIds
      .map((itemId) => items.find((item) => item.id === itemId) ?? null)
      .filter((item): item is CotizacionWorkflowItem => item !== null);

    if (familyItems.length === 0) {
      return null;
    }

    const baseGroupItem =
      familyItems.find((item) => item.cantidad > 1) ??
      familyItems.find((item) => item.id === variationQuickEditDraft.sourceItemId) ??
      familyItems[0];

    const parsed = mapItemToForm(baseGroupItem);
    const baseline = variationQuickEditDraft.base;
    const changedDrafts = variationQuickEditDraft.items.filter(
      (item) =>
        item.ancho !== baseline.ancho ||
        item.alto !== baseline.alto ||
        item.precio !== baseline.precio ||
        item.sistema !== baseline.sistema ||
        (force && item.id === forcedDraftId)
    );
    const hasChanges = changedDrafts.length > 0;

    if (!hasChanges && !force) {
      return {
        changed: false,
        nextItems: items,
        builtItemsByDraftId: new Map<string, CotizacionWorkflowItem>(),
      };
    }

    const firstFamilyIndex = items.findIndex((item) =>
      variationQuickEditDraft.familyItemIds.includes(item.id)
    );
    const itemsWithoutSource = items.filter(
      (item) => !variationQuickEditDraft.familyItemIds.includes(item.id)
    );
    const builtItemsByDraftId = new Map<string, CotizacionWorkflowItem>();
    const unchangedCount = variationQuickEditDraft.items.length - changedDrafts.length;
    const builtItems: CotizacionWorkflowItem[] = [];

    if (unchangedCount > 0) {
      const groupedForm = {
        ...parsed,
        codigo: variationQuickEditDraft.baseCode,
        cantidad: String(unchangedCount),
        ancho: baseline.ancho,
        alto: baseline.alto,
        costoProveedorUnitario: baseline.precio,
        referencia: composeComponentReference(
          baseline.sistema,
          variationQuickEditDraft.configuracion
        ),
      };
      const groupedItem = buildItemFromForm(groupedForm, itemsWithoutSource, null);
      itemsWithoutSource.push(groupedItem);
      builtItems.push(groupedItem);
    }

    changedDrafts.forEach((itemDraft, index) => {
      const originalIndex = variationQuickEditDraft.items.findIndex(
        (current) => current.id === itemDraft.id
      );
      const nextForm = {
        ...parsed,
        codigo:
          unchangedCount > 0
            ? `${variationQuickEditDraft.baseCode}-${index + 2}`
            : index === 0
              ? variationQuickEditDraft.baseCode
              : buildVariationMemberCode(variationQuickEditDraft.baseCode, originalIndex + 1),
        cantidad: "1",
        ancho: itemDraft.ancho,
        alto: itemDraft.alto,
        costoProveedorUnitario: itemDraft.precio,
        referencia: composeComponentReference(
          itemDraft.sistema,
          variationQuickEditDraft.configuracion
        ),
      };
      const nextItem = buildItemFromForm(nextForm, itemsWithoutSource, null);
      itemsWithoutSource.push(nextItem);
      builtItemsByDraftId.set(itemDraft.id, nextItem);
      builtItems.push(nextItem);
    });

    return {
      changed: true,
      family: {
        familyId: variationQuickEditDraft.familyId,
        baseCode: variationQuickEditDraft.baseCode,
        tipo: variationQuickEditDraft.tipo,
        pricingMode: variationQuickEditDraft.pricingMode,
        configuracion: variationQuickEditDraft.configuracion,
        base: variationQuickEditDraft.base,
        itemIds: builtItems.map((item) => item.id),
      },
      nextItems: [
        ...items
          .slice(0, Math.max(0, firstFamilyIndex))
          .filter((item) => !variationQuickEditDraft.familyItemIds.includes(item.id)),
        ...builtItems,
        ...items
          .slice(Math.max(0, firstFamilyIndex))
          .filter((item) => !variationQuickEditDraft.familyItemIds.includes(item.id)),
      ],
      builtItemsByDraftId,
    };
  };

  const syncMaterializedResult = (materialized: MaterializedVariationResult) => {
    setItems(materialized.nextItems);

    if (materialized.family && materialized.family.itemIds.length > 1) {
      setVariationFamilies((current) => {
        const others = current.filter(
          (family) => family.familyId !== materialized.family?.familyId
        );
        return [...others, materialized.family!];
      });
      return;
    }

    if (materialized.family) {
      setVariationFamilies((current) =>
        current.filter((family) => family.familyId !== materialized.family?.familyId)
      );
    }
  };

  const handleVariationQuickEditChange = (
    itemId: string,
    key: "ancho" | "alto" | "precio" | "sistema",
    value: string
  ) => {
    setVariationQuickEditDraft((current) =>
      current
        ? {
            ...current,
            dirty: true,
            items: current.items.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    [key]: value,
                  }
                : item
            ),
          }
        : current
    );
  };

  const handleEditVariationFull = (itemId: string) => {
    const shouldTrackForcedFullEdit =
      variationQuickEditDraft?.familyItemIds.length === 1 &&
      !variationQuickEditDraft.dirty;
    const materialized = materializeVariationQuickEdit(true, itemId);

    if (!materialized) {
      return;
    }

    const targetItem = materialized.builtItemsByDraftId.get(itemId);

    if (!targetItem) {
      return;
    }

    if (shouldTrackForcedFullEdit) {
      const originalSourceItem =
        items.find((item) => item.id === variationQuickEditDraft?.sourceItemId) ?? null;

      if (originalSourceItem && materialized.family) {
        setPendingForcedFullEdit({
          familyId: materialized.family.familyId,
          targetItemId: targetItem.id,
          originalItems: items,
          originalSourceItem,
        });
      }
    } else {
      setPendingForcedFullEdit(null);
    }

    syncMaterializedResult(materialized);
    setVariationQuickEditDraft(null);
    openItemForEditing(targetItem, materialized.nextItems);
  };

  const restorePendingForcedFullEditIfNeeded = (editingItemId: string | null) => {
    if (!pendingForcedFullEdit || pendingForcedFullEdit.targetItemId !== editingItemId) {
      return false;
    }

    setItems(pendingForcedFullEdit.originalItems);
    setVariationFamilies((current) =>
      current.filter((family) => family.familyId !== pendingForcedFullEdit.familyId)
    );
    setPendingForcedFullEdit(null);
    return true;
  };

  const resolveItemsAfterFullEditSave = (
    editingItemId: string | null,
    nextItems: CotizacionWorkflowItem[]
  ) => {
    if (!pendingForcedFullEdit || pendingForcedFullEdit.targetItemId !== editingItemId) {
      return nextItems;
    }

    const savedTarget =
      nextItems.find((item) => item.id === pendingForcedFullEdit.targetItemId) ?? null;

    if (
      savedTarget &&
      isSameUnitConfiguration(savedTarget, pendingForcedFullEdit.originalSourceItem)
    ) {
      setVariationFamilies((current) =>
        current.filter((family) => family.familyId !== pendingForcedFullEdit.familyId)
      );
      setPendingForcedFullEdit(null);
      return pendingForcedFullEdit.originalItems;
    }

    setPendingForcedFullEdit(null);
    return nextItems;
  };

  const handleCloseVariationQuickEdit = () => {
    if (variationQuickEditDraft && !variationQuickEditDraft.dirty) {
      setVariationQuickEditDraft(null);
      clearUiState();
      scrollToList();
      return;
    }

    const materialized = materializeVariationQuickEdit(false);

    if (materialized?.changed) {
      syncMaterializedResult(materialized);
    }

    setVariationQuickEditDraft(null);
    clearUiState();
    scrollToList();
  };

  const handleItemRemoved = (itemId: string) => {
    if (variationQuickEditDraft?.sourceItemId === itemId) {
      setVariationQuickEditDraft(null);
    }

    setVariationFamilies((current) =>
      current
        .map((family) => ({
          ...family,
          itemIds: family.itemIds.filter((currentId) => currentId !== itemId),
        }))
        .filter((family) => family.itemIds.length > 1)
    );
  };

  const variationQuickEdit = useMemo(() => {
    if (!variationQuickEditDraft) {
      return null;
    }

    return {
      baseCode: variationQuickEditDraft.baseCode,
      tipo: variationQuickEditDraft.tipo,
      totalItems: variationQuickEditDraft.items.length,
      priceLabel:
        variationQuickEditDraft.pricingMode === "precio_directo"
          ? "Valor unitario"
          : "Costo proveedor",
      items: variationQuickEditDraft.items.map((item, index) => ({
        ...item,
        label: `Pieza ${index + 1}`,
        precio: formatCurrencyInput(item.precio),
      })),
      systemOptions: getSystemOptionsForComponent(variationQuickEditDraft.tipo),
    };
  }, [variationQuickEditDraft]);

  const adjustedItems = useMemo(
    () =>
      Object.fromEntries(
        variationFamilies.flatMap((family) =>
          family.itemIds
            .map((itemId) => items.find((item) => item.id === itemId) ?? null)
            .filter((item): item is CotizacionWorkflowItem => item !== null)
            .filter((item) => item.cantidad === 1)
            .map((item) => [item.id, family.baseCode] as const)
        )
      ),
    [items, variationFamilies]
  );

  const resetVariationState = () => {
    setVariationFamilies([]);
    setVariationQuickEditDraft(null);
    setPendingForcedFullEdit(null);
  };

  return {
    adjustedItems,
    variationFamilies,
    variationQuickEdit,
    variationQuickEditDraft,
    openVariationQuickEdit,
    openVariationQuickEditForFamily,
    handleVariationQuickEditChange,
    handleEditVariationFull,
    handleCloseVariationQuickEdit,
    handleItemRemoved,
    restorePendingForcedFullEditIfNeeded,
    resolveItemsAfterFullEditSave,
    resetVariationState,
    setVariationQuickEditDraft,
  };
}

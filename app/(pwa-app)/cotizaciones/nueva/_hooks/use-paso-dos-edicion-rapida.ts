"use client";

import { useCallback, useMemo, useState } from "react";

import {
  buildItemFromForm,
  buildQuickEditDraft,
  isWorkflowItemEffectivelyComplete,
  mapItemToForm,
  type ComponentFormState,
  type QuickEditBatchTarget,
  type QuickEditDraftState,
  type QuickEditFieldKey,
  applyQuickEditDraftStatesToItems,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import type {
  CotizacionWorkflowDraft,
  CotizacionWorkflowItem,
} from "@/features/cotizaciones/types/cotizacion-workflow";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import {
  normalizeQuotePricingMode,
  type QuotePricingMode,
} from "@/features/cotizaciones/types/quote-pricing-mode";

type UsePasoDosEdicionRapidaParams = {
  items: CotizacionWorkflowItem[];
  quotePricingMode?: QuotePricingMode;
  setDraft: React.Dispatch<React.SetStateAction<CotizacionWorkflowDraft>>;
  setGlobalError: React.Dispatch<React.SetStateAction<string | null>>;
};

export function usePasoDosEdicionRapida(params: UsePasoDosEdicionRapidaParams) {
  const quotePricingMode = normalizeQuotePricingMode(params.quotePricingMode);
  const [itemExpandidoId, setItemExpandidoId] = useState<string | null>(null);
  const [campoFocoExpandido, setCampoFocoExpandido] = useState<QuickEditFieldKey | null>("ancho");
  const [mostrarSoloPendientes, setMostrarSoloPendientes] = useState(false);
  const [borradoresRapidos, setBorradoresRapidos] = useState<Record<string, QuickEditDraftState>>(
    {}
  );
  const [itemOrigenSeleccionLoteId, setItemOrigenSeleccionLoteId] = useState<string | null>(null);
  const [idsSeleccionLote, setIdsSeleccionLote] = useState<string[]>([]);

  const borradoresRapidosSincronizados = useMemo(() => {
    const siguientes: Record<string, QuickEditDraftState> = {};

    params.items.forEach((item) => {
      siguientes[item.id] = borradoresRapidos[item.id] ?? buildQuickEditDraft(item);
    });

    return siguientes;
  }, [borradoresRapidos, params.items]);

  const itemsEfectivos = useMemo(
    () =>
      applyQuickEditDraftStatesToItems(
        params.items,
        borradoresRapidosSincronizados,
        quotePricingMode
      ),
    [borradoresRapidosSincronizados, params.items, quotePricingMode]
  );

  const cantidadCompletos = useMemo(
    () =>
      params.items.filter((item) =>
        isWorkflowItemEffectivelyComplete(
          item,
          borradoresRapidosSincronizados[item.id],
          quotePricingMode
        )
      ).length,
    [borradoresRapidosSincronizados, params.items, quotePricingMode]
  );

  const cantidadPendientes = params.items.length - cantidadCompletos;
  const mostrarSoloPendientesEfectivo = mostrarSoloPendientes && cantidadPendientes > 0;

  const indiceItemPorId = useMemo(
    () => new Map(params.items.map((item, index) => [item.id, index])),
    [params.items]
  );

  const itemExpandidoResueltoId = useMemo(() => {
    const editableItems = params.items.filter((item) => item.tipoItem !== "item_libre_con_valor");

    if (editableItems.length === 0) {
      return null;
    }

    const baseSeleccionadoId =
      itemExpandidoId && editableItems.some((item) => item.id === itemExpandidoId)
        ? itemExpandidoId
        : editableItems[0]?.id ?? null;

    if (!mostrarSoloPendientesEfectivo || !baseSeleccionadoId) {
      return baseSeleccionadoId;
    }

    const itemSeleccionado =
      params.items.find((item) => item.id === baseSeleccionadoId) ?? null;

    if (
      itemSeleccionado &&
      !isWorkflowItemEffectivelyComplete(
        itemSeleccionado,
        borradoresRapidosSincronizados[itemSeleccionado.id],
        quotePricingMode
      )
    ) {
      return baseSeleccionadoId;
    }

    return (
      editableItems.find(
        (item) =>
          !isWorkflowItemEffectivelyComplete(
            item,
            borradoresRapidosSincronizados[item.id],
            quotePricingMode
          )
      )?.id ?? baseSeleccionadoId
    );
  }, [
    borradoresRapidosSincronizados,
    itemExpandidoId,
    mostrarSoloPendientesEfectivo,
    params.items,
    quotePricingMode,
  ]);

  const indiceSeleccionado =
    itemExpandidoResueltoId ? indiceItemPorId.get(itemExpandidoResueltoId) ?? -1 : -1;

  const itemSeleccionado = indiceSeleccionado >= 0 ? params.items[indiceSeleccionado] ?? null : null;
  const itemVistaSeleccionado =
    indiceSeleccionado >= 0 ? itemsEfectivos[indiceSeleccionado] ?? null : null;
  const borradorSeleccionado = itemSeleccionado
    ? borradoresRapidosSincronizados[itemSeleccionado.id] ?? buildQuickEditDraft(itemSeleccionado)
    : null;

  const targetsSeleccionMismoTipo = useMemo(() => {
    if (!itemSeleccionado) {
      return [] as QuickEditBatchTarget[];
    }

    return params.items
      .filter(
        (item) =>
          item.tipoItem !== "item_libre_con_valor" &&
          item.id !== itemSeleccionado.id &&
          item.tipo === itemSeleccionado.tipo &&
          !isWorkflowItemEffectivelyComplete(
            item,
            borradoresRapidosSincronizados[item.id],
            quotePricingMode
          )
      )
      .map((item) => ({
        id: item.id,
        code: item.codigo,
        title: item.nombre,
      }));
  }, [borradoresRapidosSincronizados, itemSeleccionado, params.items, quotePricingMode]);

  const cantidadPendientesMismoTipo = targetsSeleccionMismoTipo.length;

  const idsSeleccionLoteEfectivos = useMemo(() => {
    if (!itemSeleccionado || itemOrigenSeleccionLoteId !== itemSeleccionado.id) {
      return [];
    }

    return idsSeleccionLote.filter((itemId) =>
      targetsSeleccionMismoTipo.some((target) => target.id === itemId)
    );
  }, [idsSeleccionLote, itemOrigenSeleccionLoteId, itemSeleccionado, targetsSeleccionMismoTipo]);

  const seleccionLoteAbierta =
    Boolean(itemSeleccionado) &&
    itemOrigenSeleccionLoteId === itemSeleccionado?.id &&
    targetsSeleccionMismoTipo.length > 0;

  const etiquetaPrecioSeleccionado =
    itemVistaSeleccionado &&
    decodeCotizacionItemPresentationMeta(itemVistaSeleccionado.observaciones).pricingMode ===
      "precio_directo"
      ? "Precio final"
      : "Precio base";

  const seleccionarItemEdicionRapida = useCallback(
    (itemId: string | null, focusField: QuickEditFieldKey | null = "ancho") => {
      setItemExpandidoId(itemId);
      setCampoFocoExpandido(focusField);
    },
    []
  );

  const aplicarBootstrapEdicionRapida = useCallback(
    (input: {
      itemId: string | null;
      focusField?: QuickEditFieldKey | null;
    }) => {
      setItemExpandidoId(input.itemId);
      setCampoFocoExpandido(input.focusField ?? "ancho");
    },
    []
  );

  const actualizarCampoBorradorRapido = useCallback(
    (itemId: string, key: keyof QuickEditDraftState, value: string) => {
      setBorradoresRapidos((current) => {
        const base = current[itemId] ?? {
          ancho: "",
          alto: "",
          costoProveedorUnitario: "",
        };

        if (base[key] === value) {
          return current;
        }

        return {
          ...current,
          [itemId]: {
            ...base,
            [key]: value,
          },
        };
      });
    },
    []
  );

  const aplicarBorradoresRapidosAItems = useCallback(
    (items: CotizacionWorkflowItem[]) =>
      applyQuickEditDraftStatesToItems(
        items,
        borradoresRapidosSincronizados,
        quotePricingMode
      ),
    [borradoresRapidosSincronizados, quotePricingMode]
  );

  const flushBorradoresRapidos = useCallback(() => {
    const siguientesItems = aplicarBorradoresRapidosAItems(params.items);

    params.setDraft((current) => ({ ...current, items: siguientesItems }));

    return siguientesItems;
  }, [aplicarBorradoresRapidosAItems, params]);

  const confirmarBorradorRapido = useCallback(
    (itemId: string, draftOverride?: QuickEditDraftState) => {
      const draftResuelto = draftOverride ?? borradoresRapidosSincronizados[itemId];

      if (!draftResuelto) {
        return;
      }

      if (draftOverride) {
        setBorradoresRapidos((current) => {
          const existingDraft = current[itemId];

          if (
            existingDraft &&
            existingDraft.ancho === draftOverride.ancho &&
            existingDraft.alto === draftOverride.alto &&
            existingDraft.costoProveedorUnitario === draftOverride.costoProveedorUnitario
          ) {
            return current;
          }

          return {
            ...current,
            [itemId]: draftOverride,
          };
        });
      }

      params.setDraft((current) => {
        const target = current.items.find((item) => item.id === itemId);

        if (!target) {
          return current;
        }

        try {
          const currentDraft = buildQuickEditDraft(target);
          const currentForm = mapItemToForm(target);

          if (
            currentDraft.ancho === draftResuelto.ancho &&
            currentDraft.alto === draftResuelto.alto &&
            currentDraft.costoProveedorUnitario === draftResuelto.costoProveedorUnitario
          ) {
            return current;
          }

          const nextForm = {
            ...currentForm,
            ancho: draftResuelto.ancho,
            alto: draftResuelto.alto,
            costoProveedorUnitario: draftResuelto.costoProveedorUnitario,
            precioAjustadoManual:
              currentForm.precioAjustadoManual ||
              (Boolean(currentForm.referencia.trim() && currentForm.precioPorM2.trim()) &&
                currentDraft.costoProveedorUnitario !== draftResuelto.costoProveedorUnitario),
          } as ComponentFormState;
          const nextItem = buildItemFromForm(nextForm, current.items, target.id, {
            quotePricingMode,
          });

          return {
            ...current,
            items: current.items.map((item) => (item.id === itemId ? nextItem : item)),
          };
        } catch {
          return current;
        }
      });
    },
    [borradoresRapidosSincronizados, params, quotePricingMode]
  );

  const iniciarSeleccionLote = useCallback(() => {
    if (!itemSeleccionado || targetsSeleccionMismoTipo.length === 0) {
      return;
    }

    setItemOrigenSeleccionLoteId(itemSeleccionado.id);
    setIdsSeleccionLote(targetsSeleccionMismoTipo.map((target) => target.id));
    params.setGlobalError(null);
  }, [itemSeleccionado, params, targetsSeleccionMismoTipo]);

  const alternarTargetSeleccionLote = useCallback((itemId: string) => {
    setIdsSeleccionLote((current) =>
      current.includes(itemId)
        ? current.filter((currentId) => currentId !== itemId)
        : [...current, itemId]
    );
  }, []);

  const cancelarSeleccionLote = useCallback(() => {
    setItemOrigenSeleccionLoteId(null);
    setIdsSeleccionLote([]);
  }, []);

  const aplicarEdicionRapidaMismoTipo = useCallback(() => {
    if (!itemSeleccionado || !borradorSeleccionado) {
      return;
    }

    const targetIds =
      idsSeleccionLoteEfectivos.length > 0
        ? idsSeleccionLoteEfectivos
        : targetsSeleccionMismoTipo.map((target) => target.id);

    if (targetIds.length === 0) {
      params.setGlobalError("Selecciona al menos un componente para copiar las medidas.");
      return;
    }

    const targetIdSet = new Set(targetIds);
    const draftCompartido: QuickEditDraftState = {
      ancho: borradorSeleccionado.ancho,
      alto: borradorSeleccionado.alto,
      costoProveedorUnitario: borradorSeleccionado.costoProveedorUnitario,
    };

    const itemsFlusheados = flushBorradoresRapidos();
    const siguientesItems = itemsFlusheados.map((item) => {
      if (!targetIdSet.has(item.id) || item.id === itemSeleccionado.id) {
        return item;
      }

      const nextForm = {
        ...mapItemToForm(item),
        ...draftCompartido,
        precioAjustadoManual: Boolean(
          mapItemToForm(item).referencia.trim() &&
            mapItemToForm(item).precioPorM2.trim() &&
            draftCompartido.costoProveedorUnitario
        ),
      } as ComponentFormState;

      return buildItemFromForm(nextForm, itemsFlusheados, item.id, { quotePricingMode });
    });

    params.setDraft((current) => ({ ...current, items: siguientesItems }));
    setBorradoresRapidos((current) => {
      const siguientes = { ...current };

      itemsFlusheados.forEach((item) => {
        if (targetIdSet.has(item.id)) {
          siguientes[item.id] = { ...draftCompartido };
        }
      });

      return siguientes;
    });
    setItemOrigenSeleccionLoteId(null);
    setIdsSeleccionLote([]);
    params.setGlobalError(null);
  }, [
    borradorSeleccionado,
    flushBorradoresRapidos,
    idsSeleccionLoteEfectivos,
    itemSeleccionado,
    params,
    quotePricingMode,
    targetsSeleccionMismoTipo,
  ]);

  const navegarEdicionRapida = useCallback(
    (
      direction: -1 | 1,
      focusField: QuickEditFieldKey = "ancho",
      options?: { preferIncomplete?: boolean }
    ) => {
      if (indiceSeleccionado < 0) {
        return;
      }

      const candidateIndexes =
        direction === 1
          ? params.items.map((_, index) => index).slice(indiceSeleccionado + 1)
          : params.items
              .map((_, index) => index)
              .slice(0, indiceSeleccionado)
              .reverse();

      const shouldPreferIncomplete =
        options?.preferIncomplete ?? mostrarSoloPendientesEfectivo;
      const nextPreferredIndex = shouldPreferIncomplete
        ? candidateIndexes.find(
            (index) =>
              !isWorkflowItemEffectivelyComplete(
                params.items[index],
                borradoresRapidosSincronizados[params.items[index].id],
                quotePricingMode
              )
          )
        : undefined;
      const nextIndex = nextPreferredIndex ?? candidateIndexes[0];

      if (nextIndex === undefined) {
        return;
      }

      seleccionarItemEdicionRapida(params.items[nextIndex].id, focusField);
    },
    [
      borradoresRapidosSincronizados,
      indiceSeleccionado,
      mostrarSoloPendientesEfectivo,
      params.items,
      quotePricingMode,
      seleccionarItemEdicionRapida,
    ]
  );

  const resolverSeleccionDespuesDeEliminar = useCallback(
    (itemEliminadoId: string, nextItems: CotizacionWorkflowItem[]) => {
      const nextExpandedItemId =
        itemExpandidoId === itemEliminadoId ? nextItems[0]?.id ?? null : itemExpandidoId;

      setItemExpandidoId(nextExpandedItemId);
      setCampoFocoExpandido("ancho");

      if (itemOrigenSeleccionLoteId === itemEliminadoId) {
        setItemOrigenSeleccionLoteId(null);
        setIdsSeleccionLote([]);
      } else {
        setIdsSeleccionLote((current) =>
          current.filter((currentId) => currentId !== itemEliminadoId)
        );
      }

      return nextExpandedItemId;
    },
    [itemExpandidoId, itemOrigenSeleccionLoteId]
  );

  return {
    itemExpandidoId,
    campoFocoExpandido,
    mostrarSoloPendientes,
    cantidadCompletos,
    cantidadPendientes,
    mostrarSoloPendientesEfectivo,
    borradoresRapidosSincronizados,
    itemsEfectivos,
    indiceSeleccionado,
    itemSeleccionado,
    itemVistaSeleccionado,
    borradorSeleccionado,
    etiquetaPrecioSeleccionado,
    targetsSeleccionMismoTipo,
    cantidadPendientesMismoTipo,
    idsSeleccionLoteEfectivos,
    seleccionLoteAbierta,
    aplicarBootstrapEdicionRapida,
    seleccionarItemEdicionRapida,
    actualizarCampoBorradorRapido,
    confirmarBorradorRapido,
    aplicarBorradoresRapidosAItems,
    flushBorradoresRapidos,
    iniciarSeleccionLote,
    alternarTargetSeleccionLote,
    cancelarSeleccionLote,
    aplicarEdicionRapidaMismoTipo,
    navegarEdicionRapida,
    resolverSeleccionDespuesDeEliminar,
    toggleMostrarSoloPendientes: () => setMostrarSoloPendientes((current) => !current),
  };
}

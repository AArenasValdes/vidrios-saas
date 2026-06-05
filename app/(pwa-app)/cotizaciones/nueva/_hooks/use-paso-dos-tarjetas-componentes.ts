"use client";

import { useMemo } from "react";

import {
  CLP,
  type ComponentListCardViewModel,
  type QuickEditDraftState,
  isWorkflowItemEffectivelyComplete,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import { generateComponentSVG } from "@/utils/window-drawings";

type UsePasoDosTarjetasComponentesParams = {
  items: CotizacionWorkflowItem[];
  borradoresRapidos: Record<string, QuickEditDraftState>;
  quotePricingMode: QuotePricingMode;
};

export function usePasoDosTarjetasComponentes(params: UsePasoDosTarjetasComponentesParams) {
  return useMemo<ComponentListCardViewModel[]>(
    () =>
      params.items.map((item) => {
        const { colorHex, referencia, material, pricingMode, displayMode } =
          decodeCotizacionItemPresentationMeta(item.observaciones);
        const effectiveDraft = params.borradoresRapidos[item.id];
        const effectiveItem = item;
        const isFreeValueItem =
          item.tipoItem === "item_libre_con_valor" || displayMode === "item_libre";

        if (isFreeValueItem) {
          return {
            id: item.id,
            source: item,
            colorHex,
            title: `${item.codigo} · ${item.nombre}`,
            price: CLP(effectiveItem.precioTotal),
            priceLabel: "Valor",
            compactMeta: item.descripcion || "Item libre",
            metaPrimary: "Item libre con valor directo",
            metaSecondary: item.descripcion || "Sin descripcion adicional",
            metaTertiary: "",
            quickEditPriceLabel: "Valor",
            isComplete: true,
            svgMarkup: "",
          };
        }

        return {
          id: item.id,
          source: item,
          colorHex,
          title: `${item.codigo} · ${item.tipo}`,
          price:
            pricingMode === "precio_directo"
              ? CLP(effectiveItem.precioTotal)
              : CLP(effectiveItem.costoProveedorTotal),
          priceLabel: pricingMode === "precio_directo" ? "Valor" : "Costo",
          compactMeta: `${material} · ${
            effectiveItem.ancho && effectiveItem.alto
              ? `${effectiveItem.ancho}x${effectiveItem.alto} mm`
              : "Sin medidas"
          }`,
          metaPrimary: `${material} · ${effectiveItem.cantidad} ${
            effectiveItem.cantidad === 1 ? "ud." : "uds."
          }`,
          metaSecondary: `${
            effectiveItem.ancho && effectiveItem.alto
              ? `${effectiveItem.ancho}x${effectiveItem.alto} mm`
              : "Sin medidas"
          } · ${effectiveItem.vidrio || "Sin vidrio"} · ${
            pricingMode === "precio_directo"
              ? "precio directo"
              : `margen ${effectiveItem.margenPct}%`
          }`,
          metaTertiary:
            pricingMode === "precio_directo"
              ? referencia
                ? `Ref. ${referencia}`
                : ""
              : [referencia ? `Ref. ${referencia}` : null, `Venta ${CLP(effectiveItem.precioTotal)}`]
                  .filter(Boolean)
                  .join(" · "),
          quickEditPriceLabel: pricingMode === "precio_directo" ? "Valor" : "Costo",
          isComplete: isWorkflowItemEffectivelyComplete(
            item,
            effectiveDraft,
            params.quotePricingMode
          ),
          svgMarkup:
            effectiveItem.tipo === "Trabajo personalizado"
              ? ""
              : generateComponentSVG({
                  tipo: effectiveItem.tipo,
                  referencia,
                  ancho: effectiveItem.ancho,
                  alto: effectiveItem.alto,
                  colorHex,
                  maxW: 46,
                  maxH: 46,
                }),
        };
      }),
    [params.borradoresRapidos, params.items, params.quotePricingMode]
  );
}

"use client";

import { useMemo } from "react";

import {
  CLP,
  type ComponentListCardViewModel,
  type QuickEditDraftState,
  isWorkflowItemEffectivelyComplete,
  resolveWorkflowItemDisplayName,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import { generateComponentSVG } from "@/utils/window-drawings";
import { renderGuidedVisualSvg } from "@/features/cotizaciones/visual-composer/services/guided-visual-renderer.service";
import { describeGuidedVisualConfig } from "@/features/cotizaciones/visual-composer/types/guided-visual-config";

type UsePasoDosTarjetasComponentesParams = {
  items: CotizacionWorkflowItem[];
  borradoresRapidos: Record<string, QuickEditDraftState>;
  quotePricingMode: QuotePricingMode;
  isDesktopQuoteStudio?: boolean;
};

function buildDesktopListMeasures(item: CotizacionWorkflowItem) {
  if (item.ancho && item.alto) {
    return `${String(item.ancho).replace(/\.0+$/, "")} x ${String(item.alto).replace(/\.0+$/, "")} mm`;
  }

  return "Sin medidas";
}

function buildDesktopListConfiguration(input: {
  configuracion?: string;
  sistema?: string;
  referencia?: string;
  lineaComercial?: string;
  descripcion?: string;
}) {
  const parts = [
    input.configuracion?.trim(),
    input.sistema?.trim(),
    input.referencia?.trim() || input.lineaComercial?.trim(),
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(" · ");
  }

  return input.descripcion?.trim() || "Sin configuración";
}

export function usePasoDosTarjetasComponentes(params: UsePasoDosTarjetasComponentesParams) {
  const desktopSvgWidth = params.isDesktopQuoteStudio ? 76 : 46;
  const desktopSvgHeight = params.isDesktopQuoteStudio ? 58 : 46;

  return useMemo<ComponentListCardViewModel[]>(
    () =>
      params.items.map((item) => {
        const {
          colorHex,
          referencia,
          sistema,
          configuracion,
          sheetScheme,
          sheetVariant,
          customSchemeDescription,
          isCustomScheme,
          material,
          pricingMode,
          displayMode,
          mirrorFormat,
          mirrorPaneCount,
          mirrorPaneDirection,
          mirrorInteriorLine,
          guidedVisualConfig,
        } =
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
            listCode: item.codigo,
            listName: item.nombre,
            listMeasures: "Trabajo libre",
            listConfiguration: item.descripcion?.trim() || "Sin detalle",
            listQuantity: `${item.cantidad} ${item.cantidad === 1 ? "ud." : "uds."}`,
          };
        }

        const listMeasures = buildDesktopListMeasures(effectiveItem);
        const listConfiguration = guidedVisualConfig
          ? describeGuidedVisualConfig(guidedVisualConfig)
          : buildDesktopListConfiguration({
              configuracion,
              sistema,
              referencia,
              lineaComercial: effectiveItem.lineaComercial,
              descripcion: effectiveItem.descripcion,
            });
        const measuresLabel =
          effectiveItem.ancho && effectiveItem.alto
            ? `${effectiveItem.ancho} × ${effectiveItem.alto} mm`
            : "Sin medidas";

        return {
          id: item.id,
          source: item,
          colorHex,
          title: guidedVisualConfig
            ? `${item.codigo} · ${item.tipo} personalizada`
            : `${item.codigo} · ${item.tipo}`,
          price:
            pricingMode === "precio_directo"
              ? CLP(effectiveItem.precioTotal)
              : CLP(effectiveItem.costoProveedorTotal),
          priceLabel: pricingMode === "precio_directo" ? "Valor" : "Costo",
          compactMeta: guidedVisualConfig
            ? `${measuresLabel} · Personalizada`
            : `${material} · ${
            effectiveItem.ancho && effectiveItem.alto
              ? `${effectiveItem.ancho}x${effectiveItem.alto} mm`
              : "Sin medidas"
          }`,
          metaPrimary: guidedVisualConfig
            ? `${measuresLabel}${referencia ? ` · ${referencia}` : ""}`
            : `${material} · ${effectiveItem.cantidad} ${
            effectiveItem.cantidad === 1 ? "ud." : "uds."
          }`,
          metaSecondary: guidedVisualConfig
            ? `${listConfiguration} · ${effectiveItem.vidrio || "Sin vidrio"}`
            : `${
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
              : guidedVisualConfig
                ? renderGuidedVisualSvg(guidedVisualConfig, {
                    maxW: desktopSvgWidth,
                    maxH: desktopSvgHeight,
                    colorHex,
                    variant: "thumbnail",
                    showSelection: false,
                    showLabels: false,
                    showDimensions: false,
                  })
                : generateComponentSVG({
                  tipo: effectiveItem.tipo,
                  sistema,
                  configuracion,
                  referencia,
                  sheetScheme,
                  sheetVariant,
                  customSchemeDescription,
                  isCustomScheme,
                  ancho: effectiveItem.ancho,
                  alto: effectiveItem.alto,
                  colorHex,
                  maxW: desktopSvgWidth,
                  maxH: desktopSvgHeight,
                  mirrorFormat,
                  mirrorPaneCount,
                  mirrorPaneDirection,
                  mirrorInteriorLine,
                }),
          listCode: effectiveItem.codigo,
          listName: resolveWorkflowItemDisplayName({
            tipo: effectiveItem.tipo,
            nombre: effectiveItem.nombre,
            codigo: effectiveItem.codigo,
          }),
          listMeasures,
          listConfiguration,
          listQuantity: `${effectiveItem.cantidad} ${effectiveItem.cantidad === 1 ? "ud." : "uds."}`,
        };
      }),
    [
      desktopSvgHeight,
      desktopSvgWidth,
      params.borradoresRapidos,
      params.items,
      params.quotePricingMode,
    ]
  );
}

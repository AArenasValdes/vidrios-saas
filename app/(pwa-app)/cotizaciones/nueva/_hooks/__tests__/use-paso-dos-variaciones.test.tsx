/** @jest-environment jsdom */

import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";

import { buildItemFromForm } from "@/features/cotizaciones/new-quote/workflow-ui";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";

import { usePasoDosVariaciones } from "../use-paso-dos-variaciones";

function createGroupedItem(): CotizacionWorkflowItem {
  return buildItemFromForm(
    {
      codigo: "V1",
      tipo: "Ventana",
      material: "Aluminio",
      referencia: "Corredera",
      sistema: "Corredera",
      configuracion: "",
      sheetScheme: "",
      sheetVariant: "",
      customSchemeDescription: "",
      isCustomScheme: false,
      lineTemplateId: "",
      pricingMode: "margen",
      vidrio: "Incoloro monolítico 5mm",
      nombre: "Ventana",
      descripcion: "",
      ancho: "800",
      alto: "1500",
      cantidad: "2",
      costoProveedorUnitario: "120000",
      margenPct: "100",
      precioPorM2: "",
      minimoCobrable: "",
      redondeoPrecio: "1000",
      precioPlantillaSugerido: "",
      precioAjustadoManual: false,
      origenPrecio: "margen",
      observaciones: "",
      colorHex: "#a8a8a8",
      loteCantidad: "1",
    },
    [],
    null
  );
}

function ProbeVariaciones() {
  const [items, setItems] = React.useState<CotizacionWorkflowItem[]>([createGroupedItem()]);
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);

  const variaciones = usePasoDosVariaciones({
    items,
    setItems,
    openItemForEditing: (item) => {
      setEditingItemId(item.id);
    },
    clearEditingState: () => {
      setEditingItemId(null);
    },
    clearUiState: () => undefined,
    openStepTwoTop: () => undefined,
    scrollToList: () => undefined,
  });

  const firstItem = items[0];
  const firstDraftId = variaciones.variationQuickEdit?.items[0]?.id ?? null;
  const firstFamily = variaciones.variationFamilies[0] ?? null;

  return (
    <div>
      <span data-testid="items">
        {items.map((item) => `${item.codigo}:${item.cantidad}`).join("|")}
      </span>
      <span data-testid="abierto">{variaciones.variationQuickEdit ? "si" : "no"}</span>
      <span data-testid="editando">{editingItemId ?? ""}</span>
      <span data-testid="familias">{String(variaciones.variationFamilies.length)}</span>
      <span data-testid="piezas-overlay">
        {String(variaciones.variationQuickEdit?.items.length ?? 0)}
      </span>
      <button type="button" onClick={() => variaciones.openVariationQuickEdit(firstItem)}>
        abrir
      </button>
      <button type="button" onClick={() => variaciones.handleCloseVariationQuickEdit()}>
        cerrar
      </button>
      <button
        type="button"
        onClick={() => {
          if (firstDraftId) {
            variaciones.handleVariationQuickEditChange(firstDraftId, "ancho", "900");
          }
        }}
      >
        cambiar-ancho
      </button>
      <button
        type="button"
        onClick={() => {
          if (firstDraftId) {
            variaciones.handleEditVariationFull(firstDraftId);
          }
        }}
      >
        editar-completa
      </button>
      <button type="button" onClick={() => setEditingItemId(null)}>
        cerrar-edicion
      </button>
      <button
        type="button"
        onClick={() => {
          variaciones.restorePendingForcedFullEditIfNeeded(editingItemId);
          setEditingItemId(null);
        }}
      >
        cancelar-edicion
      </button>
      <button
        type="button"
        onClick={() => {
          if (firstFamily) {
            variaciones.openVariationQuickEditForFamily(firstFamily);
          }
        }}
      >
        reabrir-familia
      </button>
    </div>
  );
}

describe("usePasoDosVariaciones", () => {
  it("no debe separar el lote si cierras sin cambios", () => {
    render(<ProbeVariaciones />);

    act(() => {
      fireEvent.click(screen.getByText("abrir"));
    });

    expect(screen.getByTestId("abierto")).toHaveTextContent("si");

    act(() => {
      fireEvent.click(screen.getByText("cerrar"));
    });

    expect(screen.getByTestId("abierto")).toHaveTextContent("no");
    expect(screen.getByTestId("items")).toHaveTextContent("V1:2");
  });

  it("debe mantener el grupo base y separar solo la pieza ajustada", () => {
    render(<ProbeVariaciones />);

    act(() => {
      fireEvent.click(screen.getByText("abrir"));
    });

    act(() => {
      fireEvent.click(screen.getByText("cambiar-ancho"));
    });

    act(() => {
      fireEvent.click(screen.getByText("cerrar"));
    });

    expect(screen.getByTestId("items")).toHaveTextContent("V1:1");
    expect(screen.getByTestId("items")).toHaveTextContent("V1-2:1");
  });

  it("debe materializar la pieza y abrir edicion completa sobre la ajustada", () => {
    render(<ProbeVariaciones />);

    act(() => {
      fireEvent.click(screen.getByText("abrir"));
    });

    act(() => {
      fireEvent.click(screen.getByText("cambiar-ancho"));
    });

    act(() => {
      fireEvent.click(screen.getByText("editar-completa"));
    });

    expect(screen.getByTestId("items")).toHaveTextContent("V1:1");
    expect(screen.getByTestId("items")).toHaveTextContent("V1-2:1");
    expect(screen.getByTestId("editando")).not.toHaveTextContent("");
  });

  it("debe permitir volver a abrir overlay de familia despues de edicion completa", () => {
    render(<ProbeVariaciones />);

    act(() => {
      fireEvent.click(screen.getByText("abrir"));
    });

    act(() => {
      fireEvent.click(screen.getByText("cambiar-ancho"));
    });

    act(() => {
      fireEvent.click(screen.getByText("editar-completa"));
    });

    expect(screen.getByTestId("familias")).toHaveTextContent("1");
    expect(screen.getByTestId("editando")).not.toHaveTextContent("");

    act(() => {
      fireEvent.click(screen.getByText("cerrar-edicion"));
      fireEvent.click(screen.getByText("reabrir-familia"));
    });

    expect(screen.getByTestId("abierto")).toHaveTextContent("si");
    expect(screen.getByTestId("piezas-overlay")).toHaveTextContent("2");
  });

  it("debe recomponer el lote si abres edicion completa sin cambios y cancelas", () => {
    render(<ProbeVariaciones />);

    act(() => {
      fireEvent.click(screen.getByText("abrir"));
    });

    act(() => {
      fireEvent.click(screen.getByText("editar-completa"));
    });

    expect(screen.getByTestId("items")).toHaveTextContent("V1:1");
    expect(screen.getByTestId("items")).toHaveTextContent("V1-2:1");

    act(() => {
      fireEvent.click(screen.getByText("cancelar-edicion"));
    });

    expect(screen.getByTestId("items")).toHaveTextContent("V1:2");
    expect(screen.getByTestId("items")).not.toHaveTextContent("V1-2:1");
    expect(screen.getByTestId("familias")).toHaveTextContent("0");
  });
});

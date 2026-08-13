/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";

import { PublicQuoteDocument } from "../documento/public-quote-document";
import { PublicQuotePreview, type PublicPreviewQuote } from "../public-quote-preview";
import { createQuoteRegionSnapshot } from "@/features/organization-region/services/quote-region-snapshot.service";

const quote: PublicPreviewQuote = {
  codigo: "COT-040626-001",
  clienteNombre: "Roberto Fuentes",
  obra: "Casa Coquimbo",
  validez: "15 dias",
  observaciones: "",
  subtotal: 600000,
  descuentoPct: 0,
  iva: 0,
  flete: 0,
  total: 600000,
  pricingMode: "total_global",
  createdAt: "2026-06-04T10:00:00.000Z",
  updatedAt: "2026-06-04T10:00:00.000Z",
  items: [
    {
      id: "item-0",
      codigo: "LIBRE-1",
      tipoItem: "item_libre_con_valor",
      tipo: "Trabajo libre / Mantencion",
      nombre: "Mantencion general",
      descripcion: "Ajuste, limpieza y sellado perimetral",
      cantidad: 1,
      unidad: "servicio",
      vidrio: "",
      ancho: null,
      alto: null,
      precioUnitario: 0,
      precioTotal: 0,
      observaciones: "",
    },
    {
      id: "item-1",
      codigo: "V1",
      tipo: "Ventana",
      nombre: "Ventana corredera",
      descripcion: "Ventana corredera linea 5000",
      cantidad: 3,
      unidad: "unidad",
      vidrio: "Incoloro monolitico 5mm",
      ancho: 1500,
      alto: 2000,
      precioUnitario: 0,
      precioTotal: 0,
      observaciones: "",
    },
  ],
  organizationProfile: {
    empresaNombre: "Ventora Aluminios",
    empresaLogoUrl: null,
    responsableComercial: "Juan Perez",
    empresaDireccion: "Av. Vidrios 123",
    empresaTelefono: "+56 9 1234 5678",
    empresaEmail: "ventas@ventora.test",
    brandColor: "#1E88FF",
    formaPago: "Transferencia",
  },
};

describe("public quote total global", () => {
  it("no muestra precios por item en la vista publica", () => {
    render(<PublicQuotePreview quote={quote} />);

    expect(screen.getByText("Ventana corredera")).toBeInTheDocument();
    expect(screen.getByText("Cotiza: Juan Perez")).toBeInTheDocument();
    expect(screen.getAllByText("Subtotal").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Descuento").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Neto").length).toBeGreaterThan(0);
    expect(screen.getAllByText("IVA 19%").length).toBeGreaterThan(0);
    expect(screen.queryByText("Carpinteria total")).not.toBeInTheDocument();
    expect(screen.queryByText("Precio unitario")).not.toBeInTheDocument();
    expect(screen.queryByText(/margen/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/utilidad/i)).not.toBeInTheDocument();
  });

  it("no muestra precios por item en el documento publico", () => {
    render(
      <PublicQuoteDocument
        quote={quote}
        backHref="/presupuesto/token"
        downloadOnLoad={false}
        embedded
      />
    );

    expect(screen.getByText("Ventana corredera")).toBeInTheDocument();
    expect(screen.getByText("Cotiza: Juan Perez")).toBeInTheDocument();
    expect(screen.getAllByText("Subtotal").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Descuento").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Neto").length).toBeGreaterThan(0);
    expect(screen.getAllByText("IVA 19%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sin IVA").length).toBeGreaterThan(0);
    expect(screen.queryByText("Carpinteria total")).not.toBeInTheDocument();
    expect(screen.queryByText("Precio unitario")).not.toBeInTheDocument();
    expect(screen.queryByText(/margen/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/utilidad/i)).not.toBeInTheDocument();
  });

  it("muestra el impuesto congelado del presupuesto", () => {
    render(
      <PublicQuotePreview
        quote={{
          ...quote,
          regionalSnapshot: createQuoteRegionSnapshot({ region: { countryCode: "PE" } }),
        }}
      />
    );

    expect(screen.getAllByText("IGV 18%").length).toBeGreaterThan(0);
  });
});

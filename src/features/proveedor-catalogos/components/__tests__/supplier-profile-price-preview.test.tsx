/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("../../services/mis-precios.client.service", () => ({
  saveQuotePresentationPrice: jest.fn().mockResolvedValue(undefined),
}));

import { saveQuotePresentationPrice } from "../../services/mis-precios.client.service";
import { SupplierProfilePricePreview } from "../supplier-profile-price-preview";

const missingPrice = {
  technicalCode: "KOM 802",
  profileName: "Marco monorriel",
  providerKey: "thermowin-kompen",
  providerLabel: "Thermowin Kompen",
  presentationId: "f14599eb-5ec8-480d-a919-779329ab8590",
  supplierSku: "802-0003",
  presentationDescription: "Marco monorriel · Blanco",
  purchaseUnit: "TR",
  commercialLengthMm: 6000,
  netPrice: null,
  currency: "CLP",
  priceSource: null,
  status: "missing_price" as const,
};

describe("SupplierProfilePricePreview price entry", () => {
  beforeEach(() => jest.clearAllMocks());

  it("actualiza los precios visibles al cambiar de proveedor con los datos ya cargados", () => {
    const prices = [
      { ...missingPrice, providerKey: "arquetipo", providerLabel: "Arquetipo · junio 2026", status: "priced" as const, netPrice: 40000 },
      { ...missingPrice, providerKey: "alumco", providerLabel: "Alumco · 2026", status: "priced" as const, netPrice: 32000 },
    ];
    const { rerender } = render(
      <SupplierProfilePricePreview prices={prices} providerKey="arquetipo" />,
    );

    fireEvent.click(screen.getByText("Ver precios de 1 perfiles"));
    expect(screen.getByText("$40.000")).toBeInTheDocument();

    rerender(<SupplierProfilePricePreview prices={prices} providerKey="alumco" />);

    expect(screen.getByText("$32.000")).toBeInTheDocument();
    expect(screen.queryByText("$40.000")).not.toBeInTheDocument();
  });

  it("saves a missing confirmed provider presentation as an organization override", async () => {
    const onPriceSaved = jest.fn();
    render(
      <SupplierProfilePricePreview
        prices={[missingPrice]}
        providerKey="thermowin-kompen"
        familyKey="thermowin:kom-800"
        finishName="Blanco"
        canManagePrice
        onPriceSaved={onPriceSaved}
      />,
    );

    fireEvent.click(screen.getByText("Ver precios de 1 perfiles"));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Precio neto KOM 802" }), { target: { value: "42000" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar en Mis precios" }));

    await waitFor(() => expect(saveQuotePresentationPrice).toHaveBeenCalledWith({
      providerKey: "thermowin-kompen",
      presentationId: missingPrice.presentationId,
      familyKey: "thermowin:kom-800",
      technicalCode: "KOM 802",
      finishName: "Blanco",
      netPrice: 42000,
      currency: "CLP",
    }));
    await waitFor(() => expect(onPriceSaved).toHaveBeenCalledTimes(1));
  });

  it("does not offer editing for an ambiguous or unselected provider presentation", () => {
    render(
      <SupplierProfilePricePreview
        prices={[{ ...missingPrice, presentationId: "", status: "ambiguous" }]}
        familyKey="thermowin:kom-800"
        finishName="Blanco"
        canManagePrice
      />,
    );

    fireEvent.click(screen.getByText("Ver precios de 1 perfiles"));
    expect(screen.queryByLabelText("Precio neto KOM 802")).not.toBeInTheDocument();
    expect(saveQuotePresentationPrice).not.toHaveBeenCalled();
  });
});

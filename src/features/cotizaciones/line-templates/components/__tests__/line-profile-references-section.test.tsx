/** @jest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/react";

import { LineProfileReferencesSection } from "@/features/cotizaciones/line-templates/components/line-profile-references-section";
import { getVentoraProfileReferencesForCatalogKey } from "@/features/cotizaciones/line-templates/fixtures/ventora-profile-references";

describe("LineProfileReferencesSection", () => {
  it("muestra resumen colapsado y expande la misma información en desktop y móvil", () => {
    const metadata = {
      workshopProfiles: getVentoraProfileReferencesForCatalogKey("ventora:l5000"),
    };

    const { rerender } = render(
      <LineProfileReferencesSection catalogMetadata={metadata} variant="desktop" />
    );

    expect(screen.getByText(/7 perfiles/)).toBeInTheDocument();
    expect(screen.getByText("Ver perfiles")).toBeInTheDocument();
    expect(screen.queryByText("5001")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Perfiles de referencia/i }));

    expect(screen.getByText("5001")).toBeInTheDocument();
    expect(screen.getByText("Riel inferior")).toBeInTheDocument();
    expect(
      screen.getByText("Estas referencias son informativas. La pauta de corte se configura por separado.")
    ).toBeInTheDocument();

    rerender(
      <LineProfileReferencesSection catalogMetadata={metadata} variant="mobile" />
    );

    if (!screen.queryByText("5001")) {
      fireEvent.click(screen.getByRole("button", { name: /Perfiles de referencia/i }));
    }
    expect(screen.getByText("5001")).toBeInTheDocument();
    expect(screen.getByText("Riel inferior")).toBeInTheDocument();
  });

  it("resume perfiles pendientes sin abrir la lista", () => {
    const metadata = {
      workshopProfiles: getVentoraProfileReferencesForCatalogKey(
        "ventora:winhouse-s60"
      ),
    };

    render(<LineProfileReferencesSection catalogMetadata={metadata} variant="mobile" />);

    expect(screen.getByText(/0 configurados/)).toBeInTheDocument();
    expect(screen.queryByText("Pendiente")).not.toBeInTheDocument();
  });
});

/** @jest-environment jsdom */

import { render, screen } from "@testing-library/react";

import { FabricacionProfileList } from "@/features/fabricacion/components/mobile/fabricacion-profile-list";
import { crearRecetaFabricacionVacia } from "@/features/fabricacion/services/fabricacion-receta-editor.service";

describe("FabricacionProfileList", () => {
  it("keeps catalog references out of a second profile list", () => {
    render(
      <FabricacionProfileList
        recipe={crearRecetaFabricacionVacia({ recipeIdentityId: "r1", lineName: "EKO 130" })}
        onSelectProfile={() => undefined}
      />
    );

    expect(screen.queryByText(/Elegir perfiles del catálogo/)).not.toBeInTheDocument();
    expect(screen.getByText(/Aún no hay perfiles activos/)).toBeInTheDocument();
  });
});

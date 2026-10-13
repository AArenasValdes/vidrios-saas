/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { FabricacionProfileEditSheet } from "@/features/fabricacion/components/mobile/fabricacion-profile-edit-sheet";
import { RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO } from "@/features/fabricacion/fixtures/receta-corredera-dos-hojas.fixture";

jest.mock("@/features/fabricacion/components/mobile/fabricacion-profile-fields", () => ({
  FabricacionProfileFields: ({ onRemove }: { onRemove?: (profileId: string) => void }) => (
    <button type="button" onClick={() => onRemove?.("profile-1")}>
      Eliminar perfil
    </button>
  ),
}));

jest.mock("@/features/fabricacion/components/mobile/use-mobile-sheet-chrome", () => ({
  useMobileSheetChrome: () => undefined,
}));

describe("FabricacionProfileEditSheet", () => {
  it("confirms and persists removal of a profile from any line recipe", async () => {
    const recipe = {
      ...RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO,
      perfiles: [
        { ...RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO.perfiles[0]!, id: "profile-1" },
        { ...RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO.perfiles[1]!, id: "profile-2" },
      ],
    };
    const onClose = jest.fn();
    const onRecipeChange = jest.fn();
    const onPersist = jest.fn(async () => undefined);

    render(
      <FabricacionProfileEditSheet
        recipe={recipe}
        profileId="profile-1"
        profileIds={["profile-1", "profile-2"]}
        sourceType="manual"
        sourceReference={null}
        lineName="Línea de prueba"
        workshopRecipes={[recipe]}
        onClose={onClose}
        onSelectProfile={() => undefined}
        onRecipeChange={onRecipeChange}
        onPersist={onPersist}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Eliminar perfil" }));
    expect(screen.getByText("Se quitará este perfil de la receta de esta línea.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Quitar perfil" }));

    await waitFor(() => expect(onPersist).toHaveBeenCalledTimes(1));
    const persistedRecipe = onPersist.mock.calls[0]?.[0];
    expect(persistedRecipe.perfiles.map((profile) => profile.id)).toEqual(["profile-2"]);
    expect(onRecipeChange).toHaveBeenCalledWith(persistedRecipe);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

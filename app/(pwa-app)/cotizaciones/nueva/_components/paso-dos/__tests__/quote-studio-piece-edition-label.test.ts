import {
  QUOTE_STUDIO_PIECE_NOT_IN_BUDGET_HINT,
  resolveQuoteStudioPieceEditionHeadline,
} from "../quote-studio-piece-edition-label";

describe("quote-studio-piece-edition-label", () => {
  it("resuelve estados de pieza en edicion", () => {
    expect(resolveQuoteStudioPieceEditionHeadline({})).toBe("Nueva pieza");
    expect(
      resolveQuoteStudioPieceEditionHeadline({ duplicateSourceCode: "V1" })
    ).toBe("Copia de V1");
    expect(
      resolveQuoteStudioPieceEditionHeadline({
        isEditingExisting: true,
        editingPieceCode: "V2",
      })
    ).toBe("Editando V2");
  });

  it("expone el hint de pieza pendiente", () => {
    expect(QUOTE_STUDIO_PIECE_NOT_IN_BUDGET_HINT).toBe(
      "Aún no agregada al presupuesto"
    );
  });
});

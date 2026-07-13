import {
  hasQuoteStudioCompletedPieces,
  isQuoteStudioDesktopPieceInEdition,
  QUOTE_STUDIO_FINISH_PIECE_REVIEW_HINT,
  QUOTE_STUDIO_NO_COMPLETED_PIECES_HINT,
} from "../quote-studio-desktop-edition";

describe("quote-studio-desktop-edition", () => {
  it("detecta pieza en edicion en desktop quote studio", () => {
    expect(
      isQuoteStudioDesktopPieceInEdition({
        isDesktopQuoteStudio: true,
        isMobileViewport: false,
        activeDraftCard: { headline: "Nueva pieza", componentType: "Ventana", stepLabel: "Paso 1 de 4", missingLabel: "" },
      })
    ).toBe(true);

    expect(
      isQuoteStudioDesktopPieceInEdition({
        isDesktopQuoteStudio: true,
        isMobileViewport: false,
        editingItemId: "item-1",
      })
    ).toBe(true);

    expect(
      isQuoteStudioDesktopPieceInEdition({
        isDesktopQuoteStudio: true,
        isMobileViewport: false,
        isAddGroupWizardOpen: true,
      })
    ).toBe(true);
  });

  it("no marca edicion fuera de desktop quote studio", () => {
    expect(
      isQuoteStudioDesktopPieceInEdition({
        isDesktopQuoteStudio: false,
        isMobileViewport: false,
        activeDraftCard: { headline: "Nueva pieza", componentType: "Ventana", stepLabel: "Paso 1 de 4", missingLabel: "" },
      })
    ).toBe(false);

    expect(
      isQuoteStudioDesktopPieceInEdition({
        isDesktopQuoteStudio: true,
        isMobileViewport: true,
        activeDraftCard: { headline: "Nueva pieza", componentType: "Ventana", stepLabel: "Paso 1 de 4", missingLabel: "" },
      })
    ).toBe(false);
  });

  it("expone los mensajes de navegacion al resumen", () => {
    expect(QUOTE_STUDIO_FINISH_PIECE_REVIEW_HINT).toBe(
      "Finaliza la pieza para continuar con la revisión"
    );
    expect(QUOTE_STUDIO_NO_COMPLETED_PIECES_HINT).toBe(
      "Agrega al menos una pieza terminada para ir al resumen."
    );
  });

  it("detecta piezas terminadas disponibles para ir al resumen", () => {
    expect(hasQuoteStudioCompletedPieces(0)).toBe(false);
    expect(hasQuoteStudioCompletedPieces(2)).toBe(true);
  });
});

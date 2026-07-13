type QuoteStudioDesktopEditionInput = {
  isDesktopQuoteStudio?: boolean;
  isMobileViewport: boolean;
  activeDraftCard?: unknown;
  editingItemId?: string | null;
  isAddGroupWizardOpen?: boolean;
};

export function isQuoteStudioDesktopPieceInEdition(
  input: QuoteStudioDesktopEditionInput
) {
  return (
    Boolean(input.isDesktopQuoteStudio) &&
    !input.isMobileViewport &&
    (Boolean(input.activeDraftCard) ||
      Boolean(input.editingItemId) ||
      Boolean(input.isAddGroupWizardOpen))
  );
}

export const QUOTE_STUDIO_FINISH_PIECE_REVIEW_HINT =
  "Finaliza la pieza para continuar con la revisión";

export const QUOTE_STUDIO_NO_COMPLETED_PIECES_HINT =
  "Agrega al menos una pieza terminada para ir al resumen.";

export const QUOTE_STUDIO_DISCARDED_UNFINISHED_PIECE_TOAST =
  "La pieza sin finalizar no fue agregada.";

export function hasQuoteStudioCompletedPieces(completedItemsCount: number) {
  return completedItemsCount > 0;
}

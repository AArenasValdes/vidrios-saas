export const QUOTE_STUDIO_PIECE_NOT_IN_BUDGET_HINT =
  "Aún no agregada al presupuesto";

export type QuoteStudioPieceEditionHeadlineInput = {
  duplicateSourceCode?: string | null;
  editingPieceCode?: string | null;
  isEditingExisting?: boolean;
};

export function resolveQuoteStudioPieceEditionHeadline(
  input: QuoteStudioPieceEditionHeadlineInput
): string {
  if (input.isEditingExisting && input.editingPieceCode?.trim()) {
    return `Editando ${input.editingPieceCode.trim()}`;
  }

  if (input.duplicateSourceCode?.trim()) {
    return `Copia de ${input.duplicateSourceCode.trim()}`;
  }

  return "Nueva pieza";
}

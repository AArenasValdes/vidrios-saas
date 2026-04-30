const BROKEN_TEXT_REPLACEMENTS: Array<[string, string]> = [
  ["ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡", "á"],
  ["ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©", "é"],
  ["ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­", "í"],
  ["ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³", "ó"],
  ["ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âº", "ú"],
  ["ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±", "ñ"],
  ["ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â", "Á"],
  ["ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°", "É"],
  ["ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â", "Í"],
  ["ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ", "Ó"],
  ["ÃƒÆ’Ã†â€™Ãƒâ€¦Ã‚Â¡", "Ú"],
  ["ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“", "Ñ"],
  ["ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿", "¿"],
  ["ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡", "¡"],
  ["ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â", "×"],
  ["ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦", "..."],
  ["ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã‚Â¡Ãƒâ€šÃ‚Â ", "⚠"],
  ["ÃƒÆ’Ã‚Â¢Ãƒâ€¹Ã…â€œÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦", "★"],
  ["Ãƒâ€šÃ‚Â·", "·"],
  ["paÃ±os", "paños"],
  ["monolitico", "monolítico"],
];

export function repairBrokenText(value: string) {
  return BROKEN_TEXT_REPLACEMENTS.reduce(
    (current, [broken, fixed]) => current.replaceAll(broken, fixed),
    value
  );
}

export function normalizeBrokenText(value: string) {
  return repairBrokenText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

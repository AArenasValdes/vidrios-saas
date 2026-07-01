export const COMPONENT_COLOR_NAMES: Record<string, string> = {
  "#a8a8a8": "Aluminio mate",
  "#ffffff": "Blanco",
  "#f0eeeb": "Blanco",
  "#b7bcc4": "Gris",
  "#b7834a": "Roble Dorado",
  "#6f4a34": "Nogal",
  "#dfd5c4": "Blanco hueso",
  "#4f555d": "Gris Antracita",
  "#2a2a2a": "Negro",
  "#444444": "Negro mate",
  "#8b5e3c": "Madera",
  "#7d8791": "Titanio",
  "#1f8c5a": "Verde (Eléctrico)",
  "#2968c8": "Azul (Alta presión)",
  "#e7842a": "Naranja (Ventilación)",
};

export function resolveComponentColorName(colorHex: string) {
  return COMPONENT_COLOR_NAMES[colorHex.toLowerCase()] ?? "Color a definir";
}

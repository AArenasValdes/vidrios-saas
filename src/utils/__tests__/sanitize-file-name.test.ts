import { sanitizeFileName, sanitizeFileNamePart } from "../sanitize-file-name";

describe("sanitizeFileName", () => {
  it("convierte a minusculas", () => {
    expect(sanitizeFileName("MiArchivo")).toBe("miarchivo");
  });

  it("elimina diacriticos", () => {
    expect(sanitizeFileName("añejo-café")).toBe("anejo-cafe");
  });

  it("reemplaza caracteres no validos por guion", () => {
    expect(sanitizeFileName("mi archivo (2)")).toBe("mi-archivo-2-");
  });

  it("colapsa guiones consecutivos", () => {
    expect(sanitizeFileName("a---b")).toBe("a-b");
  });

  it("preserva puntos y guiones bajos", () => {
    expect(sanitizeFileName("mi_foto.jpg")).toBe("mi_foto.jpg");
  });

  it("recorta espacios al inicio y final", () => {
    expect(sanitizeFileName(" nombre ")).toBe("nombre");
  });

  it("retorna string vacio con input vacio", () => {
    expect(sanitizeFileName("")).toBe("");
  });

  it("normaliza nombre con espacios y mayusculas", () => {
    expect(sanitizeFileName("Ventana Baño")).toBe("ventana-bano");
  });
});

describe("sanitizeFileNamePart", () => {
  it("elimina puntos y guiones bajos", () => {
    expect(sanitizeFileNamePart("mi_foto.jpg")).toBe("mi-foto-jpg");
  });

  it("elimina guiones al inicio y final", () => {
    expect(sanitizeFileNamePart("-nombre-")).toBe("nombre");
  });

  it("trunca a 50 caracteres por defecto", () => {
    const longName = "a".repeat(80);
    expect(sanitizeFileNamePart(longName)).toHaveLength(50);
  });

  it("respeta maxLength personalizado", () => {
    const longName = "a".repeat(80);
    expect(sanitizeFileNamePart(longName, 20)).toHaveLength(20);
  });

  it("elimina diacriticos y convierte a minusculas", () => {
    expect(sanitizeFileNamePart("Añejo Café")).toBe("anejo-cafe");
  });

  it("colapsa guiones consecutivos", () => {
    expect(sanitizeFileNamePart("a---b")).toBe("a-b");
  });

  it("retorna string vacio con input vacio", () => {
    expect(sanitizeFileNamePart("")).toBe("");
  });

  it("retorna string vacio si solo tiene guiones", () => {
    expect(sanitizeFileNamePart("---")).toBe("");
  });

  it("trunca despues de sanitizar", () => {
    const input = "A".repeat(60);
    const result = sanitizeFileNamePart(input, 30);
    expect(result).toBe("a".repeat(30));
  });
});

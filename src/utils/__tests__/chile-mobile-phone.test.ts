import {
  formatChileMobilePhone,
  isValidChileMobilePhone,
  normalizeChileMobilePhone,
} from "../chile-mobile-phone";

describe("chile mobile phone utils", () => {
  it("normaliza 8 digitos locales", () => {
    expect(normalizeChileMobilePhone("87654321")).toBe("+56987654321");
  });

  it("normaliza numero con 9 inicial", () => {
    expect(normalizeChileMobilePhone("987654321")).toBe("+56987654321");
  });

  it("normaliza 569 directo", () => {
    expect(normalizeChileMobilePhone("56987654321")).toBe("+56987654321");
  });

  it("normaliza numero ya internacional", () => {
    expect(normalizeChileMobilePhone("+56987654321")).toBe("+56987654321");
  });

  it("normaliza numero con espacios", () => {
    expect(normalizeChileMobilePhone("+56 9 8765 4321")).toBe("+56987654321");
    expect(normalizeChileMobilePhone("9 8765 4321")).toBe("+56987654321");
  });

  it("limpia letras y simbolos si igual alcanza formato valido", () => {
    expect(normalizeChileMobilePhone("cel: 9-8765-4321")).toBe("+56987654321");
  });

  it("marca invalido si faltan digitos", () => {
    expect(normalizeChileMobilePhone("98765")).toBeNull();
    expect(isValidChileMobilePhone("98765")).toBe(false);
  });

  it("no duplica prefijo", () => {
    expect(normalizeChileMobilePhone("+56 9 8765 4321")).toBe("+56987654321");
    expect(formatChileMobilePhone("+56 9 8765 4321")).toBe("8765 4321");
  });
});


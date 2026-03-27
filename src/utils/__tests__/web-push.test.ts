import { base64UrlToUint8Array } from "../web-push";

describe("web push utils", () => {
  it("debe decodificar una clave base64url valida aunque tenga espacios o saltos", () => {
    const bytes = base64UrlToUint8Array("  AQIDBA \n ");

    expect(Array.from(bytes)).toEqual([1, 2, 3, 4]);
  });

  it("debe decodificar una clave envuelta en comillas", () => {
    const bytes = base64UrlToUint8Array('"AQIDBA"');

    expect(Array.from(bytes)).toEqual([1, 2, 3, 4]);
  });

  it("debe fallar con un mensaje claro cuando la clave no es valida", () => {
    expect(() => base64UrlToUint8Array("***")).toThrow(
      "La clave publica de notificaciones no tiene un formato valido."
    );
  });
});


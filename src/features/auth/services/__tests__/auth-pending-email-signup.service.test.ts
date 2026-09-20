import {
  isAuthEmailConfirmed,
  readPendingEmailSignup,
} from "../auth-pending-email-signup.service";

describe("readPendingEmailSignup", () => {
  it("lee metadata version 1", () => {
    expect(
      readPendingEmailSignup({
        ventora_signup: {
          version: 1,
          nombre: "Milton Farias",
          empresaNombre: "Vidrieria FyH",
          whatsapp: "+56993956962",
          ciudadComuna: "Codegua",
          countryCode: "CL",
          consentimientoAceptado: true,
        },
      })
    ).toEqual({
      nombre: "Milton Farias",
      empresaNombre: "Vidrieria FyH",
      whatsapp: "+56993956962",
      ciudadComuna: "Codegua",
      countryCode: "CL",
      consentimientoAceptado: true,
    });
  });

  it("ignora metadata incompleta", () => {
    expect(readPendingEmailSignup({ ventora_signup: { version: 2 } })).toBeNull();
    expect(readPendingEmailSignup({})).toBeNull();
  });
});

describe("isAuthEmailConfirmed", () => {
  it("acepta email_verified en metadata", () => {
    expect(
      isAuthEmailConfirmed({
        user_metadata: { email_verified: true },
      })
    ).toBe(true);
  });

  it("rechaza correo no confirmado", () => {
    expect(isAuthEmailConfirmed({ user_metadata: {} })).toBe(false);
  });
});

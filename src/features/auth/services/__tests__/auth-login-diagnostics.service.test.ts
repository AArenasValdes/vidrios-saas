/** @jest-environment jsdom */

import { authLoginDiagnosticsService } from "../auth-login-diagnostics.service";

describe("authLoginDiagnosticsService", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("guarda diagnosticos con correo enmascarado", () => {
    authLoginDiagnosticsService.record({
      type: "failure",
      code: "invalid_credentials",
      email: "sanmarcoaluminios@gmail.com",
      nextPath: "/dashboard",
      detail: "Invalid login credentials",
    });

    const entries = authLoginDiagnosticsService.readRecent();

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      type: "failure",
      code: "invalid_credentials",
      nextPath: "/dashboard",
    });
    expect(entries[0].emailMask.startsWith("sa")).toBe(true);
    expect(entries[0].emailMask.endsWith("@gmail.com")).toBe(true);
  });

  it("mantiene el historial mas reciente al principio", () => {
    authLoginDiagnosticsService.record({
      type: "attempt",
      code: "none",
      email: "uno@test.cl",
    });
    authLoginDiagnosticsService.record({
      type: "success",
      code: "none",
      email: "dos@test.cl",
    });

    const entries = authLoginDiagnosticsService.readRecent();

    expect(entries[0].emailMask).toBe("do*@test.cl");
    expect(entries[1].emailMask).toBe("un*@test.cl");
  });

  it("arma un snapshot corto para soporte", () => {
    const entry = authLoginDiagnosticsService.record({
      type: "failure",
      code: "unknown",
      email: "sanmarcoaluminios@gmail.com",
      nextPath: "/dashboard",
      detail: "SecurityError: Failed to read localStorage",
    });

    const snapshot = authLoginDiagnosticsService.buildSupportSnapshot(entry);

    expect(snapshot).toContain("codigo=unknown");
    expect(snapshot).toContain("detalle=SecurityError: Failed to read localStorage");
  });
});

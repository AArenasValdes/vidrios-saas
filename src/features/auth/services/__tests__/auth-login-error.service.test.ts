import {
  AUTH_COOKIE_NOT_READY_SENTINEL,
  AUTH_LOGIN_TIMEOUT_SENTINEL,
  classifyAuthLoginError,
  getAuthLoginErrorDiagnosticDetail,
  getAuthLoginErrorCopy,
} from "../auth-login-error.service";

describe("auth-login-error.service", () => {
  it("clasifica credenciales invalidas", () => {
    const error = classifyAuthLoginError(
      new Error("Invalid login credentials")
    );

    expect(error.code).toBe("invalid_credentials");
    expect(error.message).toBe(getAuthLoginErrorCopy("invalid_credentials"));
  });

  it("clasifica timeout de login", () => {
    const error = classifyAuthLoginError(new Error(AUTH_LOGIN_TIMEOUT_SENTINEL));

    expect(error.code).toBe("login_timeout");
  });

  it("clasifica cookie no lista", () => {
    const error = classifyAuthLoginError(
      new Error(AUTH_COOKIE_NOT_READY_SENTINEL)
    );

    expect(error.code).toBe("cookie_not_ready");
  });

  it("clasifica usuario sin empresa", () => {
    const error = classifyAuthLoginError(
      new Error("Tu usuario existe, pero no esta vinculado a una empresa en Ventora.")
    );

    expect(error.code).toBe("profile_missing");
  });

  it("clasifica bloqueo de storage local", () => {
    const error = classifyAuthLoginError(
      new Error("SecurityError: Failed to read the 'localStorage' property")
    );

    expect(error.code).toBe("device_storage_blocked");
  });

  it("extrae un detalle tecnico corto para diagnostico", () => {
    const detail = getAuthLoginErrorDiagnosticDetail(
      new Error("SecurityError: Failed to read the 'localStorage' property from 'Window'")
    );

    expect(detail).toContain("SecurityError");
    expect(detail).toContain("localStorage");
  });
});

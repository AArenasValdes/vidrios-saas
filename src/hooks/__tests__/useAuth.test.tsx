/** @jest-environment jsdom */

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { User } from "@supabase/supabase-js";
import { __resetAuthHookTestState, useAuth } from "../useAuth";
import type { AuthSignInInput, AuthUserState } from "@/types/auth";

const getCurrentAuthState: jest.MockedFunction<() => Promise<AuthUserState>> = jest.fn();
const subscribeToAuthChanges: jest.MockedFunction<(listener: () => void) => () => void> =
  jest.fn();
const signIn: jest.MockedFunction<(credentials: AuthSignInInput) => Promise<void>> = jest.fn();
const signOut: jest.MockedFunction<() => Promise<void>> = jest.fn();

jest.mock("@/services/auth.service", () => ({
  authService: {
    getCurrentAuthState: () => getCurrentAuthState(),
    subscribeToAuthChanges: (listener: () => void) => subscribeToAuthChanges(listener),
    signIn: (credentials: AuthSignInInput) => signIn(credentials),
    signOut: () => signOut(),
  },
}));

function createUser(email = "dueno@vidrios.cl") {
  return {
    id: "user-1",
    email,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-03-12T00:00:00.000Z",
  } as User;
}

function ProbeAuth() {
  const {
    user,
    organizacionId,
    rol,
    cargando,
    signIn: login,
    signOut: logout,
  } = useAuth();

  return (
    <div>
      <span data-testid="estado">{cargando ? "cargando" : "listo"}</span>
      <span data-testid="email">{user?.email ?? "anon"}</span>
      <span data-testid="org">{organizacionId ?? "sin-org"}</span>
      <span data-testid="rol">{rol ?? "sin-rol"}</span>
      <button
        type="button"
        onClick={() =>
          void login({
            email: "ventas@vidrios.cl",
            password: "secreta123",
          })
        }
      >
        entrar
      </button>
      <button type="button" onClick={() => void logout()}>
        salir
      </button>
    </div>
  );
}

describe("useAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetAuthHookTestState();
  });

  it("debe cargar la sesion, reaccionar a cambios y cerrar sesion sin romper el estado", async () => {
    const usuarioInicial = createUser();
    const usuarioActualizado = createUser("ventas@vidrios.cl");
    let authListener: (() => void) | null = null;

    getCurrentAuthState
      .mockResolvedValueOnce({
        user: usuarioInicial,
        organizacionId: 17,
        rol: "admin",
        cargando: false,
      })
      .mockResolvedValueOnce({
        user: usuarioActualizado,
        organizacionId: 21,
        rol: "viewer",
        cargando: false,
      });

    subscribeToAuthChanges.mockImplementation((listener) => {
      authListener = listener;
      return jest.fn();
    });
    signOut.mockResolvedValue();

    render(<ProbeAuth />);

    expect(screen.getByTestId("estado")).toHaveTextContent("cargando");

    await waitFor(() => {
      expect(screen.getByTestId("estado")).toHaveTextContent("listo");
      expect(screen.getByTestId("email")).toHaveTextContent("dueno@vidrios.cl");
      expect(screen.getByTestId("org")).toHaveTextContent("17");
      expect(screen.getByTestId("rol")).toHaveTextContent("admin");
    });

    expect(authListener).not.toBeNull();

    await act(async () => {
      authListener?.();
    });

    await waitFor(() => {
      expect(screen.getByTestId("email")).toHaveTextContent("ventas@vidrios.cl");
      expect(screen.getByTestId("org")).toHaveTextContent("21");
      expect(screen.getByTestId("rol")).toHaveTextContent("viewer");
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "salir" }));
    });

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("estado")).toHaveTextContent("listo");
      expect(screen.getByTestId("email")).toHaveTextContent("anon");
      expect(screen.getByTestId("org")).toHaveTextContent("sin-org");
      expect(screen.getByTestId("rol")).toHaveTextContent("sin-rol");
    });
  });

  it("debe esperar la rehidratacion completa al iniciar sesion", async () => {
    const usuarioAutenticado = createUser("ventas@vidrios.cl");

    getCurrentAuthState
      .mockResolvedValueOnce({
        user: null,
        organizacionId: null,
        rol: null,
        cargando: false,
      })
      .mockResolvedValueOnce({
        user: usuarioAutenticado,
        organizacionId: 21,
        rol: "admin",
        cargando: false,
      });

    subscribeToAuthChanges.mockImplementation(() => jest.fn());
    signIn.mockResolvedValue();

    render(<ProbeAuth />);

    await waitFor(() => {
      expect(screen.getByTestId("estado")).toHaveTextContent("listo");
      expect(screen.getByTestId("email")).toHaveTextContent("anon");
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "entrar" }));
    });

    expect(signIn).toHaveBeenCalledWith({
      email: "ventas@vidrios.cl",
      password: "secreta123",
    });

    await waitFor(() => {
      expect(screen.getByTestId("estado")).toHaveTextContent("listo");
      expect(screen.getByTestId("email")).toHaveTextContent("ventas@vidrios.cl");
      expect(screen.getByTestId("org")).toHaveTextContent("21");
      expect(screen.getByTestId("rol")).toHaveTextContent("admin");
    });
  });

  it("debe reutilizar el estado persistido valido sin bloquear toda la interfaz", async () => {
    const usuarioPersistido = createUser("persistido@vidrios.cl");

    window.sessionStorage.setItem(
      "vidrios-saas:auth-state",
      JSON.stringify({
        user: usuarioPersistido,
        organizacionId: 33,
        rol: "admin",
        cargando: false,
      } satisfies AuthUserState)
    );

    getCurrentAuthState.mockResolvedValue({
      user: usuarioPersistido,
      organizacionId: 33,
      rol: "admin",
      cargando: false,
    });
    subscribeToAuthChanges.mockImplementation(() => jest.fn());

    render(<ProbeAuth />);

    expect(screen.getByTestId("estado")).toHaveTextContent("listo");
    expect(screen.getByTestId("email")).toHaveTextContent("persistido@vidrios.cl");
    expect(screen.getByTestId("org")).toHaveTextContent("33");
  });

  it("debe cerrar sesion en la interfaz de forma inmediata aunque el signOut real siga en curso", async () => {
    const usuarioInicial = createUser();
    let resolveSignOut: (() => void) | null = null;

    getCurrentAuthState.mockResolvedValue({
      user: usuarioInicial,
      organizacionId: 17,
      rol: "admin",
      cargando: false,
    });
    subscribeToAuthChanges.mockImplementation(() => jest.fn());
    signOut.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSignOut = resolve;
        })
    );

    render(<ProbeAuth />);

    await waitFor(() => {
      expect(screen.getByTestId("estado")).toHaveTextContent("listo");
      expect(screen.getByTestId("email")).toHaveTextContent("dueno@vidrios.cl");
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "salir" }));
    });

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("estado")).toHaveTextContent("listo");
    expect(screen.getByTestId("email")).toHaveTextContent("anon");
    expect(screen.getByTestId("org")).toHaveTextContent("sin-org");
    expect(screen.getByTestId("rol")).toHaveTextContent("sin-rol");

    await act(async () => {
      resolveSignOut?.();
    });
  });
});

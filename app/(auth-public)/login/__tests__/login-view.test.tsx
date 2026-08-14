/** @jest-environment jsdom */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import LoginView from "../login-view";
import { authLoginRateLimitService } from "@/features/auth/services/auth-login-rate-limit.service";

const mockSignIn = jest.fn();
const mockSignInWithGoogle = jest.fn();
const mockPrefetch = jest.fn();
const mockResetCurrentDeviceAppState = jest.fn();

jest.mock("next/image", () => {
  return function MockImage(
    props: React.ImgHTMLAttributes<HTMLImageElement> & { alt: string }
  ) {
    const { priority: _priority, fill: _fill, ...rest } = props as typeof props & {
      priority?: boolean;
      fill?: boolean;
    };
    void _priority;
    void _fill;

    // eslint-disable-next-line @next/next/no-img-element
    return <img {...rest} alt={props.alt} />;
  };
});

jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: React.ReactNode;
  }) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  };
});

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    prefetch: mockPrefetch,
  }),
}));

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    signInWithGoogle: mockSignInWithGoogle,
  }),
}));

jest.mock("@/features/auth/services/auth-device-recovery.service", () => ({
  authDeviceRecoveryService: {
    resetCurrentDeviceAppState: () => mockResetCurrentDeviceAppState(),
  },
}));

describe("LoginView", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    authLoginRateLimitService.clear();
    mockSignIn.mockResolvedValue(undefined);
    mockSignInWithGoogle.mockResolvedValue(undefined);
    mockPrefetch.mockClear();
    mockResetCurrentDeviceAppState.mockResolvedValue(undefined);
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: false,
        media: "(display-mode: standalone)",
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: () => "sb-test-auth-token=ok",
    });
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("usa los valores reales del formulario cuando autofill no dispara onChange", async () => {
    mockSignIn.mockImplementation(() => new Promise(() => undefined));
    render(
      <LoginView
        oauthError={false}
        oauthNoEmailError={false}
        identityConflictError={false}
        nextPath={null}
        appResetDone={false}
      />
    );

    const emailInput = screen.getByLabelText("Correo") as HTMLInputElement;
    const passwordInput = screen.getByLabelText("Contrasena") as HTMLInputElement;

    emailInput.value = "admin@test.com";
    passwordInput.value = "1234";

    fireEvent.submit(emailInput.closest("form") as HTMLFormElement);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: "admin@test.com",
        password: "1234",
      });
    });
  });

  it("muestra un mensaje mas preciso cuando las credenciales no coinciden", async () => {
    mockSignIn.mockRejectedValueOnce(new Error("Invalid login credentials"));

    render(
      <LoginView
        oauthError={false}
        oauthNoEmailError={false}
        identityConflictError={false}
        nextPath={null}
        appResetDone={false}
      />
    );

    fireEvent.change(screen.getByLabelText("Correo"), {
      target: { value: "sanmarcoaluminios@gmail.com" },
    });
    fireEvent.change(screen.getByLabelText("Contrasena"), {
      target: { value: "clave-mala" },
    });

    fireEvent.submit(screen.getByLabelText("Contrasena").closest("form") as HTMLFormElement);

    expect(
      await screen.findByText(/Revisa tu correo y contrasena\./i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Codigo de acceso: invalid_credentials/i)).toBeInTheDocument();
  });

  it("permite ver y ocultar la contrasena", () => {
    render(
      <LoginView
        oauthError={false}
        oauthNoEmailError={false}
        identityConflictError={false}
        nextPath={null}
        appResetDone={false}
      />
    );

    const passwordInput = screen.getByLabelText("Contrasena") as HTMLInputElement;
    const toggle = screen.getByRole("button", { name: /Mostrar/i });

    expect(passwordInput.type).toBe("password");

    fireEvent.click(toggle);

    expect(passwordInput.type).toBe("text");
    expect(screen.getByRole("button", { name: /Ocultar/i })).toBeInTheDocument();
  });

  it("permite reiniciar la app local del dispositivo", async () => {
    render(
      <LoginView
        oauthError={false}
        oauthNoEmailError={false}
        identityConflictError={false}
        nextPath={null}
        appResetDone={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Reiniciar esta app/i }));

    await waitFor(() => {
      expect(mockResetCurrentDeviceAppState).toHaveBeenCalledTimes(1);
    });
  });

  it("muestra diagnostico y accion de copia cuando el error queda como unknown", async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });

    mockSignIn.mockRejectedValueOnce(
      new Error("SecurityError: Failed to read the 'localStorage' property")
    );

    render(
      <LoginView
        oauthError={false}
        oauthNoEmailError={false}
        identityConflictError={false}
        nextPath={null}
        appResetDone={false}
      />
    );

    fireEvent.change(screen.getByLabelText("Correo"), {
      target: { value: "sanmarcoaluminios@gmail.com" },
    });
    fireEvent.change(screen.getByLabelText("Contrasena"), {
      target: { value: "cristianar1" },
    });

    fireEvent.submit(screen.getByLabelText("Contrasena").closest("form") as HTMLFormElement);

    expect(await screen.findByText(/Codigo de acceso: device_storage_blocked/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Copiar diagnostico/i })).toBeInTheDocument();
  });

  it("ignora dobles submits antes de que React alcance a deshabilitar el boton", async () => {
    mockSignIn.mockImplementation(
      () => new Promise<void>(() => undefined)
    );

    render(
      <LoginView
        oauthError={false}
        oauthNoEmailError={false}
        identityConflictError={false}
        nextPath={null}
        appResetDone={false}
      />
    );

    fireEvent.change(screen.getByLabelText("Correo"), {
      target: { value: "sanmarcoaluminios@gmail.com" },
    });
    fireEvent.change(screen.getByLabelText("Contrasena"), {
      target: { value: "cristianar1" },
    });

    const form = screen.getByLabelText("Contrasena").closest("form") as HTMLFormElement;

    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledTimes(1);
    });
  });

  it("no activa countdown local en el primer rate limit", async () => {
    mockSignIn.mockRejectedValueOnce(new Error("Request rate limit reached"));

    render(
      <LoginView
        oauthError={false}
        oauthNoEmailError={false}
        identityConflictError={false}
        nextPath={null}
        appResetDone={false}
      />
    );

    fireEvent.change(screen.getByLabelText("Correo"), {
      target: { value: "sanmarcoaluminios@gmail.com" },
    });
    fireEvent.change(screen.getByLabelText("Contrasena"), {
      target: { value: "cristianar1" },
    });

    fireEvent.submit(screen.getByLabelText("Contrasena").closest("form") as HTMLFormElement);

    expect(
      await screen.findByText(/Ese intento fue rechazado por limite temporal/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Espera/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Iniciar sesion/i })).toBeEnabled();
    expect(screen.queryByText(/Espera y vuelve a intentar sin repetir toques/i)).not.toBeInTheDocument();
  });

  it("activa countdown local en el segundo rate limit dentro de la ventana", async () => {
    mockSignIn
      .mockRejectedValueOnce(new Error("Request rate limit reached"))
      .mockRejectedValueOnce(new Error("Request rate limit reached"));

    render(
      <LoginView
        oauthError={false}
        oauthNoEmailError={false}
        identityConflictError={false}
        nextPath={null}
        appResetDone={false}
      />
    );

    fireEvent.change(screen.getByLabelText("Correo"), {
      target: { value: "sanmarcoaluminios@gmail.com" },
    });
    fireEvent.change(screen.getByLabelText("Contrasena"), {
      target: { value: "cristianar1" },
    });

    const form = screen.getByLabelText("Contrasena").closest("form") as HTMLFormElement;

    fireEvent.submit(form);
    await screen.findByText(/Ese intento fue rechazado por limite temporal/i);

    fireEvent.submit(form);

    expect(
      await screen.findByText(/Hay demasiados intentos desde este celular/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Espera/i })).toBeDisabled();
    expect(screen.getByText(/Espera y vuelve a intentar sin repetir toques/i)).toBeInTheDocument();
  });

  it("dispara signInWithGoogle al pulsar Continuar con Google", async () => {
    render(
      <LoginView
        oauthError={false}
        oauthNoEmailError={false}
        identityConflictError={false}
        nextPath="/cotizaciones"
        appResetDone={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Continuar con Google/i }));

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalledWith({
        intent: "login",
        nextPath: "/cotizaciones",
      });
    });
  });
});

/** @jest-environment jsdom */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import LoginView from "../login-view";

const mockSignIn = jest.fn();
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
  }),
}));

jest.mock("@/features/auth/services/auth-device-recovery.service", () => ({
  authDeviceRecoveryService: {
    resetCurrentDeviceAppState: () => mockResetCurrentDeviceAppState(),
  },
}));

describe("LoginView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignIn.mockResolvedValue(undefined);
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
  });

  it("usa los valores reales del formulario cuando autofill no dispara onChange", async () => {
    render(<LoginView oauthError={false} nextPath={null} appResetDone={false} />);

    const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
    const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;

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

    render(<LoginView oauthError={false} nextPath={null} appResetDone={false} />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "sanmarcoaluminios@gmail.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "clave-mala" },
    });

    fireEvent.submit(screen.getByLabelText("Password").closest("form") as HTMLFormElement);

    expect(
      await screen.findByText(/Revisa tu correo y contrasena\./i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Codigo de acceso: invalid_credentials/i)).toBeInTheDocument();
  });

  it("permite ver y ocultar la contrasena", () => {
    render(<LoginView oauthError={false} nextPath={null} appResetDone={false} />);

    const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
    const toggle = screen.getByRole("button", { name: /Mostrar/i });

    expect(passwordInput.type).toBe("password");

    fireEvent.click(toggle);

    expect(passwordInput.type).toBe("text");
    expect(screen.getByRole("button", { name: /Ocultar/i })).toBeInTheDocument();
  });

  it("permite reiniciar la app local del dispositivo", async () => {
    render(<LoginView oauthError={false} nextPath={null} appResetDone={false} />);

    fireEvent.click(screen.getByRole("button", { name: /Reiniciar esta app/i }));

    await waitFor(() => {
      expect(mockResetCurrentDeviceAppState).toHaveBeenCalledTimes(1);
    });
  });
});

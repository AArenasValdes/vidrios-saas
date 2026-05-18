/** @jest-environment jsdom */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import LoginView from "../login-view";

const mockPush = jest.fn();
const mockRefresh = jest.fn();
const mockSignIn = jest.fn();

jest.mock("next/image", () => {
  return function MockImage(
    props: React.ImgHTMLAttributes<HTMLImageElement> & { alt: string }
  ) {
    return <img {...props} alt={props.alt} />;
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
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    signIn: mockSignIn,
  }),
}));

describe("LoginView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignIn.mockResolvedValue(undefined);
  });

  it("usa los valores reales del formulario cuando autofill no dispara onChange", async () => {
    render(<LoginView oauthError={false} nextPath={null} />);

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

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});

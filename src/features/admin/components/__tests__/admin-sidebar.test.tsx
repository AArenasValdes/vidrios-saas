/** @jest-environment jsdom */

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { AdminSidebar } from "../admin-sidebar";

const mockWindowLocationReplace = jest.fn();
let currentPathname = "/admin";

jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
    prefetch: _prefetch,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: React.ReactNode;
    prefetch?: boolean;
  }) {
    void _prefetch;

    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  };
});

jest.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
}));

jest.mock("@/features/auth/services/logout-navigation.service", () => ({
  navigateToLogoutRoute: () => mockWindowLocationReplace("/auth/logout"),
}));

describe("AdminSidebar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentPathname = "/admin";
  });

  it("no expone un Link prefetchable a /auth/logout", () => {
    render(<AdminSidebar mobileOpen={false} />);

    expect(
      document.querySelector('a[href="/auth/logout"]')
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cerrar sesión/i })).toBeInTheDocument();
  });

  it("cierra sesion con hard nav al pulsar Cerrar sesión", () => {
    const onNavigate = jest.fn();

    render(<AdminSidebar mobileOpen onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole("button", { name: /Cerrar sesión/i }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(mockWindowLocationReplace).toHaveBeenCalledWith("/auth/logout");
  });
});

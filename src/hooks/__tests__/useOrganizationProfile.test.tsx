/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useOrganizationProfile } from "../useOrganizationProfile";
import type { AuthUserState } from "@/types/auth";
import type { OrganizationProfile } from "@/types/organization-profile";

let authState: AuthUserState = {
  user: null,
  organizacionId: 1,
  rol: "admin",
  cargando: false,
};

const getByOrganizationId = jest.fn<Promise<OrganizationProfile>, [string | number]>();
const updateByOrganizationId = jest.fn();
const uploadLogo = jest.fn();

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => authState,
}));

jest.mock("@/services/organization-profile.service", () => ({
  organizationProfileService: {
    getByOrganizationId: (organizationId: string | number) =>
      getByOrganizationId(organizationId),
    updateByOrganizationId: (...args: unknown[]) => updateByOrganizationId(...args),
    uploadLogo: (...args: unknown[]) => uploadLogo(...args),
  },
}));

function createProfile(
  organizationId: string | number,
  empresaNombre: string
): OrganizationProfile {
  return {
    organizationId,
    empresaNombre,
    empresaLogoUrl: null,
    empresaDireccion: "",
    empresaTelefono: "",
    empresaEmail: "",
    brandColor: "#335ea9",
    formaPago: "",
    creadoEn: "2026-03-20T00:00:00.000Z",
    actualizadoEn: "2026-03-20T00:00:00.000Z",
  };
}

function ProbeOrganizationProfile() {
  const { profile, isReady, refreshProfile } = useOrganizationProfile();

  return (
    <div>
      <span data-testid="ready">{isReady ? "si" : "no"}</span>
      <span data-testid="nombre">{profile?.empresaNombre ?? "sin-perfil"}</span>
      <button type="button" onClick={() => void refreshProfile()}>
        refrescar
      </button>
    </div>
  );
}

describe("useOrganizationProfile", () => {
  beforeEach(() => {
    authState = {
      user: null,
      organizacionId: 1,
      rol: "admin",
      cargando: false,
    };
    jest.clearAllMocks();
  });

  it("debe refrescar el perfil y limpiar el estado al cambiar de organizacion", async () => {
    getByOrganizationId
      .mockResolvedValueOnce(createProfile(1, "Vidrios Uno"))
      .mockResolvedValueOnce(createProfile(2, "Vidrios Dos"))
      .mockResolvedValueOnce(createProfile(2, "Vidrios Dos Actualizado"));

    const view = render(<ProbeOrganizationProfile />);

    await waitFor(() => {
      expect(screen.getByTestId("ready")).toHaveTextContent("si");
      expect(screen.getByTestId("nombre")).toHaveTextContent("Vidrios Uno");
    });

    authState = {
      ...authState,
      organizacionId: 2,
    };
    view.rerender(<ProbeOrganizationProfile />);

    await waitFor(() => {
      expect(screen.getByTestId("nombre")).toHaveTextContent("Vidrios Dos");
    });

    fireEvent.click(screen.getByRole("button", { name: "refrescar" }));

    await waitFor(() => {
      expect(screen.getByTestId("nombre")).toHaveTextContent("Vidrios Dos Actualizado");
    });

    expect(getByOrganizationId).toHaveBeenNthCalledWith(1, 1);
    expect(getByOrganizationId).toHaveBeenNthCalledWith(2, 2);
    expect(getByOrganizationId).toHaveBeenNthCalledWith(3, 2);
  });
});

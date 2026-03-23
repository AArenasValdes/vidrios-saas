/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { __resetClientesHookTestState, useClientes } from "../useClientes";
import type { AuthUserState } from "@/types/auth";
import type { ClienteDetalle, ClienteResumen } from "@/types/cliente";

let authState: AuthUserState = {
  user: null,
  organizacionId: 1,
  rol: "admin",
  cargando: false,
};

const listResumenByOrganizationId = jest.fn<Promise<ClienteResumen[]>, [string | number]>();
const getDetalleById = jest.fn<Promise<ClienteDetalle | null>, [string, string | number]>();
const createClient = jest.fn();
const updateClient = jest.fn();
const updateProjectStatus = jest.fn();
const deleteClient = jest.fn();

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => authState,
}));

jest.mock("@/services/clientes.service", () => ({
  clientesService: {
    listResumenByOrganizationId: (organizationId: string | number) =>
      listResumenByOrganizationId(organizationId),
    getDetalleById: (id: string, organizationId: string | number) =>
      getDetalleById(id, organizationId),
    createClient: (...args: unknown[]) => createClient(...args),
    updateClient: (...args: unknown[]) => updateClient(...args),
    updateProjectStatus: (...args: unknown[]) => updateProjectStatus(...args),
    deleteClient: (...args: unknown[]) => deleteClient(...args),
  },
}));

function createResumen(id: string, nombre: string): ClienteResumen {
  return {
    id,
    nombre,
    telefono: null,
    direccion: "Santiago centro 123",
    referencia: "Obra principal",
    obras: 1,
    ultimaGestion: "20 mar 2026",
    ultimaGestionAt: "2026-03-20T00:00:00.000Z",
    estado: "activo",
  };
}

function createDetalle(id: string, nombre: string): ClienteDetalle {
  return {
    cliente: {
      id,
      organizationId: authState.organizacionId ?? 0,
      nombre,
      telefono: null,
      direccion: null,
      correo: null,
      creadoEn: "2026-03-20T00:00:00.000Z",
      actualizadoEn: "2026-03-20T00:00:00.000Z",
      eliminadoEn: null,
    },
    resumen: createResumen(id, nombre),
    proyectos: [],
    cotizaciones: [],
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function ProbeClientes() {
  const {
    clientes,
    error,
    isReady,
    isRefreshing,
    refreshClientes,
    getClienteDetalleById,
    loadClienteDetalleById,
  } = useClientes();
  const detalle = getClienteDetalleById("cliente-1");

  return (
    <div>
      <span data-testid="ready">{isReady ? "si" : "no"}</span>
      <span data-testid="clientes">{clientes.map((cliente) => cliente.nombre).join(",") || "vacio"}</span>
      <span data-testid="detalle">{detalle?.cliente.nombre ?? "sin-detalle"}</span>
      <span data-testid="error">{error ?? "sin-error"}</span>
      <span data-testid="refreshing">{isRefreshing ? "si" : "no"}</span>
      <button type="button" onClick={() => void loadClienteDetalleById("cliente-1")}>
        cargar-detalle
      </button>
      <button type="button" onClick={() => void refreshClientes()}>
        refrescar
      </button>
    </div>
  );
}

describe("useClientes", () => {
  beforeEach(() => {
    authState = {
      user: null,
      organizacionId: 1,
      rol: "admin",
      cargando: false,
    };
    window.sessionStorage.clear();
    __resetClientesHookTestState();
    listResumenByOrganizationId.mockReset();
    getDetalleById.mockReset();
    createClient.mockReset();
    updateClient.mockReset();
    updateProjectStatus.mockReset();
    deleteClient.mockReset();
  });

  it("debe permitir refrescar clientes y limpiar detalle al cambiar de organizacion", async () => {
    const secondRefresh = createDeferred<ClienteResumen[]>();
    listResumenByOrganizationId
      .mockResolvedValueOnce([createResumen("cliente-1", "Cliente Uno")])
      .mockImplementationOnce(() => secondRefresh.promise)
      .mockResolvedValueOnce([createResumen("cliente-2", "Cliente Dos Actualizado")]);
    getDetalleById.mockResolvedValue(createDetalle("cliente-1", "Cliente Uno"));

    const view = render(<ProbeClientes />);

    await waitFor(() => {
      expect(screen.getByTestId("ready")).toHaveTextContent("si");
      expect(screen.getByTestId("clientes")).toHaveTextContent("Cliente Uno");
    });

    fireEvent.click(screen.getByRole("button", { name: "cargar-detalle" }));

    await waitFor(() => {
      expect(screen.getByTestId("detalle")).toHaveTextContent("Cliente Uno");
    });

    authState = {
      ...authState,
      organizacionId: 2,
    };
    view.rerender(<ProbeClientes />);

    await waitFor(() => {
      expect(screen.getByTestId("ready")).toHaveTextContent("no");
      expect(screen.getByTestId("clientes")).toHaveTextContent("vacio");
      expect(screen.getByTestId("detalle")).toHaveTextContent("sin-detalle");
    });

    secondRefresh.resolve([createResumen("cliente-2", "Cliente Dos")]);

    await waitFor(() => {
      expect(screen.getByTestId("ready")).toHaveTextContent("si");
      expect(screen.getByTestId("clientes")).toHaveTextContent("Cliente Dos");
    });

    fireEvent.click(screen.getByRole("button", { name: "refrescar" }));

    await waitFor(() => {
      expect(screen.getByTestId("clientes")).toHaveTextContent("Cliente Dos Actualizado");
    });

    expect(listResumenByOrganizationId).toHaveBeenNthCalledWith(1, 1);
    expect(listResumenByOrganizationId).toHaveBeenNthCalledWith(2, 2);
    expect(listResumenByOrganizationId).toHaveBeenNthCalledWith(3, 2);
    expect(getDetalleById).toHaveBeenCalledWith("cliente-1", 1);
  });

  it("debe exponer error si la carga de clientes falla", async () => {
    authState = {
      ...authState,
      organizacionId: 99,
    };
    listResumenByOrganizationId.mockRejectedValueOnce(new Error("RLS roto"));

    render(<ProbeClientes />);

    await waitFor(() => {
      expect(screen.getByTestId("ready")).toHaveTextContent("si");
      expect(screen.getByTestId("clientes")).toHaveTextContent("vacio");
      expect(screen.getByTestId("error")).toHaveTextContent("RLS roto");
    });
  });

  it("debe deduplicar refresh cuando ya hay una carga de clientes en curso", async () => {
    const deferredResumen = createDeferred<ClienteResumen[]>();
    listResumenByOrganizationId.mockImplementation(() => deferredResumen.promise);

    render(<ProbeClientes />);

    fireEvent.click(screen.getByRole("button", { name: "refrescar" }));

    expect(listResumenByOrganizationId).toHaveBeenCalledTimes(1);

    deferredResumen.resolve([createResumen("cliente-1", "Cliente Uno")]);

    await waitFor(() => {
      expect(screen.getByTestId("ready")).toHaveTextContent("si");
      expect(screen.getByTestId("clientes")).toHaveTextContent("Cliente Uno");
    });
  });

  it("debe quedar listo aunque la primera carga de clientes siga en progreso", async () => {
    const deferredResumen = createDeferred<ClienteResumen[]>();
    listResumenByOrganizationId.mockImplementation(() => deferredResumen.promise);

    render(<ProbeClientes />);

    await waitFor(() => {
      expect(screen.getByTestId("ready")).toHaveTextContent("no");
      expect(screen.getByTestId("refreshing")).toHaveTextContent("si");
      expect(screen.getByTestId("clientes")).toHaveTextContent("vacio");
    });

    deferredResumen.resolve([createResumen("cliente-1", "Cliente Uno")]);

    await waitFor(() => {
      expect(screen.getByTestId("clientes")).toHaveTextContent("Cliente Uno");
    });
  });

  it("debe eliminar un cliente y refrescar el listado", async () => {
    const deletedCounts = {
      deletedProjects: 1,
      deletedCotizaciones: 2,
    };
    deleteClient.mockResolvedValue(deletedCounts);
    listResumenByOrganizationId
      .mockResolvedValueOnce([createResumen("cliente-1", "Cliente Uno")])
      .mockResolvedValueOnce([]);

    function ProbeDeleteCliente() {
      const { clientes, deleteCliente } = useClientes();

      return (
        <div>
          <span data-testid="clientes-delete">
            {clientes.map((cliente) => cliente.nombre).join(",") || "vacio"}
          </span>
          <button type="button" onClick={() => void deleteCliente("cliente-1")}>
            eliminar
          </button>
        </div>
      );
    }

    render(<ProbeDeleteCliente />);

    await waitFor(() => {
      expect(screen.getByTestId("clientes-delete")).toHaveTextContent("Cliente Uno");
    });

    fireEvent.click(screen.getByRole("button", { name: "eliminar" }));

    await waitFor(() => {
      expect(deleteClient).toHaveBeenCalledWith("cliente-1", 1);
      expect(screen.getByTestId("clientes-delete")).toHaveTextContent("vacio");
    });
  });

  it("debe actualizar el estado de una obra y reflejarlo en el detalle cacheado", async () => {
    updateProjectStatus.mockResolvedValue({
      id: "project-1",
      titulo: "Obra central",
      descripcion: null,
      clienteId: "cliente-1",
      organizationId: 1,
      creadoEn: "2026-03-20T00:00:00.000Z",
      estado: "terminado",
      actualizadoEn: "2026-03-21T00:00:00.000Z",
      eliminadoEn: null,
    });
    getDetalleById.mockResolvedValue({
      ...createDetalle("cliente-1", "Cliente Uno"),
      proyectos: [
        {
          id: "project-1",
          titulo: "Obra central",
          estado: "activo",
          cotizaciones: 1,
          ultimaActividadAt: "2026-03-20T00:00:00.000Z",
        },
      ],
    });
    listResumenByOrganizationId.mockResolvedValue([createResumen("cliente-1", "Cliente Uno")]);

    function ProbeProyectoEstado() {
      const { loadClienteDetalleById, getClienteDetalleById, updateProjectStatus } =
        useClientes();
      const detalle = getClienteDetalleById("cliente-1");

      return (
        <div>
          <span data-testid="project-state">
            {detalle?.proyectos[0]?.estado ?? "sin-estado"}
          </span>
          <button type="button" onClick={() => void loadClienteDetalleById("cliente-1")}>
            cargar
          </button>
          <button
            type="button"
            onClick={() => void updateProjectStatus("project-1", "terminado")}
          >
            actualizar-obra
          </button>
        </div>
      );
    }

    render(<ProbeProyectoEstado />);

    await waitFor(() => {
      expect(screen.getByTestId("project-state")).toHaveTextContent("sin-estado");
    });

    fireEvent.click(screen.getByRole("button", { name: "cargar" }));

    await waitFor(() => {
      expect(screen.getByTestId("project-state")).toHaveTextContent("activo");
    });

    fireEvent.click(screen.getByRole("button", { name: "actualizar-obra" }));

    await waitFor(() => {
      expect(updateProjectStatus).toHaveBeenCalledWith("project-1", 1, "terminado");
      expect(screen.getByTestId("project-state")).toHaveTextContent("terminado");
    });
  });
});

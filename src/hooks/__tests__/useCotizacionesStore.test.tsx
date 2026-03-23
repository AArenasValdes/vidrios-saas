/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  __resetCotizacionesStoreTestState,
  useCotizacionesStore,
} from "../useCotizacionesStore";
import type { AuthUserState } from "@/types/auth";
import type { Cliente } from "@/types/cliente";
import type { CotizacionWorkflowRecord } from "@/types/cotizacion-workflow";

let authState: AuthUserState = {
  user: null,
  organizacionId: 1,
  rol: "admin",
  cargando: false,
};

const listWorkflowByOrganizationId = jest.fn<
  Promise<CotizacionWorkflowRecord[]>,
  [string | number]
>();
const listClientsByOrganizationId = jest.fn<Promise<Cliente[]>, [string | number]>();
const saveWorkflow = jest.fn();
const deleteWorkflow = jest.fn();
const getWorkflowById = jest.fn();
const updateManualResponseStatus = jest.fn();

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => authState,
}));

jest.mock("@/services/cotizaciones.service", () => ({
  cotizacionesAppService: {
    listWorkflowByOrganizationId: (organizationId: string | number) =>
      listWorkflowByOrganizationId(organizationId),
    listClientsByOrganizationId: (organizationId: string | number) =>
      listClientsByOrganizationId(organizationId),
    saveWorkflow: (...args: unknown[]) => saveWorkflow(...args),
    deleteWorkflow: (...args: unknown[]) => deleteWorkflow(...args),
    getWorkflowById: (...args: unknown[]) => getWorkflowById(...args),
    updateManualResponseStatus: (...args: unknown[]) => updateManualResponseStatus(...args),
  },
}));

function createCliente(id: string, organizationId: string | number, nombre: string): Cliente {
  return {
    id,
    organizationId,
    nombre,
    telefono: null,
    direccion: null,
    correo: null,
    creadoEn: "2026-03-20T00:00:00.000Z",
    actualizadoEn: "2026-03-20T00:00:00.000Z",
    eliminadoEn: null,
  };
}

function createWorkflow(id: string, codigo: string, updatedAt: string): CotizacionWorkflowRecord {
  return {
    id,
    codigo,
    clientId: "cliente-1",
    projectId: "proyecto-1",
    clienteNombre: "Cliente Uno",
    clienteTelefono: "",
    obra: "Obra principal",
    direccion: "",
    validez: "15 dias",
    descuentoPct: 0,
    observaciones: "",
    estado: "creada",
    approvalToken: null,
    approvalTokenExpiresAt: null,
    clienteVioEn: null,
    clienteRespondioEn: null,
    clienteRespuestaCanal: null,
    createdAt: updatedAt,
    updatedAt,
    items: [],
    subtotal: 1000,
    descuentoValor: 0,
    neto: 1000,
    iva: 190,
    flete: 0,
    total: 1190,
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

function ProbeCotizacionesStore() {
  const {
    cotizaciones,
    clientes,
    ensureClientesLoaded,
    error,
    isReady,
    isRefreshing,
    saveWorkflow,
    refreshCotizaciones,
  } = useCotizacionesStore();

  return (
    <div>
      <span data-testid="ready">{isReady ? "si" : "no"}</span>
      <span data-testid="cotizaciones">
        {cotizaciones.map((item) => item.codigo).join(",") || "vacio"}
      </span>
      <span data-testid="clientes">{clientes.map((item) => item.nombre).join(",") || "vacio"}</span>
      <span data-testid="error">{error ?? "sin-error"}</span>
      <span data-testid="refreshing">{isRefreshing ? "si" : "no"}</span>
      <button type="button" onClick={() => void refreshCotizaciones()}>
        refrescar
      </button>
      <button type="button" onClick={() => void ensureClientesLoaded()}>
        cargar-clientes
      </button>
      <button
        type="button"
        onClick={() =>
          void saveWorkflow({
            draft: {
              client: {
                id: "cliente-1",
                nombre: "Cliente Uno",
                telefono: "",
              },
              obra: "Obra principal",
              direccion: "",
              validez: "15 dias",
              descuentoPct: 0,
              observaciones: "",
              componentes: [],
              flete: 0,
            },
            estado: "creada",
          })
        }
      >
        guardar
      </button>
    </div>
  );
}

describe("useCotizacionesStore", () => {
  beforeEach(() => {
    authState = {
      user: null,
      organizacionId: 1,
      rol: "admin",
      cargando: false,
    };
    window.sessionStorage.clear();
    __resetCotizacionesStoreTestState();
    listWorkflowByOrganizationId.mockReset();
    listClientsByOrganizationId.mockReset();
    saveWorkflow.mockReset();
    deleteWorkflow.mockReset();
    getWorkflowById.mockReset();
    updateManualResponseStatus.mockReset();
  });

  it("debe refrescar cotizaciones y limpiar datos al cambiar de organizacion", async () => {
    const secondCotizaciones = createDeferred<CotizacionWorkflowRecord[]>();
    listWorkflowByOrganizationId
      .mockResolvedValueOnce([createWorkflow("cot-1", "COT-001", "2026-03-20T00:00:00.000Z")])
      .mockImplementationOnce(() => secondCotizaciones.promise)
      .mockResolvedValueOnce([
        createWorkflow("cot-3", "COT-003", "2026-03-22T00:00:00.000Z"),
      ]);
    listClientsByOrganizationId
      .mockResolvedValueOnce([createCliente("cliente-1", 1, "Cliente Uno")])
      .mockResolvedValueOnce([createCliente("cliente-2", 2, "Cliente Dos Actualizado")]);

    const view = render(<ProbeCotizacionesStore />);

    await waitFor(() => {
      expect(screen.getByTestId("ready")).toHaveTextContent("si");
      expect(screen.getByTestId("cotizaciones")).toHaveTextContent("COT-001");
      expect(screen.getByTestId("clientes")).toHaveTextContent("vacio");
    });

    fireEvent.click(screen.getByRole("button", { name: "cargar-clientes" }));

    await waitFor(() => {
      expect(screen.getByTestId("clientes")).toHaveTextContent("Cliente Uno");
    });

    authState = {
      ...authState,
      organizacionId: 2,
    };
    view.rerender(<ProbeCotizacionesStore />);

    await waitFor(() => {
      expect(screen.getByTestId("ready")).toHaveTextContent("no");
      expect(screen.getByTestId("cotizaciones")).toHaveTextContent("vacio");
      expect(screen.getByTestId("clientes")).toHaveTextContent("vacio");
    });

    secondCotizaciones.resolve([
      createWorkflow("cot-2", "COT-002", "2026-03-21T00:00:00.000Z"),
    ]);

    await waitFor(() => {
      expect(screen.getByTestId("ready")).toHaveTextContent("si");
      expect(screen.getByTestId("cotizaciones")).toHaveTextContent("COT-002");
      expect(screen.getByTestId("clientes")).toHaveTextContent("vacio");
    });

    fireEvent.click(screen.getByRole("button", { name: "refrescar" }));

    await waitFor(() => {
      expect(screen.getByTestId("cotizaciones")).toHaveTextContent("COT-003");
      expect(screen.getByTestId("clientes")).toHaveTextContent("Cliente Dos Actualizado");
    });

    expect(listWorkflowByOrganizationId).toHaveBeenNthCalledWith(1, 1);
    expect(listWorkflowByOrganizationId).toHaveBeenNthCalledWith(2, 2);
    expect(listWorkflowByOrganizationId).toHaveBeenNthCalledWith(3, 2);
    expect(listClientsByOrganizationId).toHaveBeenNthCalledWith(1, 1);
    expect(listClientsByOrganizationId).toHaveBeenNthCalledWith(2, 2);
  });

  it("debe exponer error cuando falla la carga de cotizaciones", async () => {
    authState = {
      ...authState,
      organizacionId: 99,
    };
    listWorkflowByOrganizationId.mockRejectedValueOnce(new Error("Fallo RLS"));
    listClientsByOrganizationId.mockResolvedValue([]);

    render(<ProbeCotizacionesStore />);

    await waitFor(() => {
      expect(screen.getByTestId("ready")).toHaveTextContent("si");
      expect(screen.getByTestId("cotizaciones")).toHaveTextContent("vacio");
      expect(screen.getByTestId("error")).toHaveTextContent("Fallo RLS");
    });
  });

  it("debe quedar listo aunque la primera carga siga en progreso", async () => {
    const deferredCotizaciones = createDeferred<CotizacionWorkflowRecord[]>();
    listWorkflowByOrganizationId.mockImplementation(() => deferredCotizaciones.promise);
    listClientsByOrganizationId.mockResolvedValue([]);

    render(<ProbeCotizacionesStore />);

    await waitFor(() => {
      expect(screen.getByTestId("ready")).toHaveTextContent("no");
      expect(screen.getByTestId("refreshing")).toHaveTextContent("si");
      expect(screen.getByTestId("cotizaciones")).toHaveTextContent("vacio");
    });

    deferredCotizaciones.resolve([createWorkflow("cot-1", "COT-001", "2026-03-20T00:00:00.000Z")]);

    await waitFor(() => {
      expect(screen.getByTestId("cotizaciones")).toHaveTextContent("COT-001");
    });
  });

  it("debe deduplicar la carga de clientes cuando se solicita mas de una vez", async () => {
    const deferredClientes = createDeferred<Cliente[]>();
    listWorkflowByOrganizationId.mockResolvedValueOnce([
      createWorkflow("cot-1", "COT-001", "2026-03-20T00:00:00.000Z"),
    ]);
    listClientsByOrganizationId.mockImplementation(() => deferredClientes.promise);

    render(<ProbeCotizacionesStore />);

    await waitFor(() => {
      expect(screen.getByTestId("ready")).toHaveTextContent("si");
    });

    fireEvent.click(screen.getByRole("button", { name: "cargar-clientes" }));
    fireEvent.click(screen.getByRole("button", { name: "cargar-clientes" }));

    expect(listClientsByOrganizationId).toHaveBeenCalledTimes(1);

    deferredClientes.resolve([createCliente("cliente-1", 1, "Cliente Uno")]);

    await waitFor(() => {
      expect(screen.getByTestId("clientes")).toHaveTextContent("Cliente Uno");
    });
  });

  it("debe conservar las cotizaciones ya cargadas al guardar una nueva mientras sincroniza clientes", async () => {
    listWorkflowByOrganizationId.mockResolvedValueOnce([
      createWorkflow("cot-1", "COT-001", "2026-03-20T00:00:00.000Z"),
      createWorkflow("cot-2", "COT-002", "2026-03-19T00:00:00.000Z"),
    ]);
    listClientsByOrganizationId.mockResolvedValue([
      createCliente("cliente-1", 1, "Cliente Uno"),
    ]);
    saveWorkflow.mockResolvedValue(
      createWorkflow("cot-3", "COT-003", "2026-03-21T00:00:00.000Z")
    );

    render(<ProbeCotizacionesStore />);

    await waitFor(() => {
      expect(screen.getByTestId("cotizaciones")).toHaveTextContent("COT-001,COT-002");
    });

    fireEvent.click(screen.getByRole("button", { name: "guardar" }));

    await waitFor(() => {
      expect(screen.getByTestId("cotizaciones")).toHaveTextContent(
        "COT-003,COT-001,COT-002"
      );
    });
  });
});

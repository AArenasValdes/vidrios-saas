const resolveAuthenticatedRouteContext = jest.fn();

jest.mock("@/features/auth/services/auth-route-access.service", () => ({
  AuthRouteAccessError: class AuthRouteAccessError extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  resolveAuthenticatedRouteContext: (...args: unknown[]) =>
    resolveAuthenticatedRouteContext(...args),
}));

import { POST } from "../route";

const validProposal = {
  resumen: "Se detecto un riel superior.",
  componentes: [
    {
      categoria: "perfil",
      nombre: "Riel superior",
      codigo: null,
      funcion: "Riel superior",
      medidaBase: "ancho_total",
      medidaAltoBase: null,
      multiplicador: 1,
      ajusteMm: -12,
      cantidadTipo: null,
      cantidad: null,
      largoComercialMm: null,
      observaciones: "",
      faltantes: ["Cantidad", "Codigo", "Largo comercial"],
      explicito: {
        codigo: false,
        medida: true,
        ajuste: true,
        cantidad: false,
        largoComercial: false,
      },
    },
  ],
  preguntas: ["Cuantos rieles superiores utiliza?"],
  datosDesconocidos: ["Cantidad", "Codigo", "Largo comercial"],
};

function request() {
  return new Request("http://localhost/api/fabricacion/asistente-texto", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      texto:
        "El riel superior descuenta 12 mm. Falta confirmar cantidad y codigo.",
      contexto: {
        proveedor: "ALAR",
        linea: "L20",
        tipologia: "corredera",
      },
    }),
  });
}

describe("POST /api/fabricacion/asistente-texto", () => {
  const originalKey = process.env.DEEPSEEK_API_KEY;

  beforeEach(() => {
    jest.restoreAllMocks();
    resolveAuthenticatedRouteContext.mockResolvedValue({
      user: { id: "user-1" },
      profile: { organizationId: 10 },
    });
  });

  afterAll(() => {
    process.env.DEEPSEEK_API_KEY = originalKey;
  });

  it("no llama al proveedor si falta configuracion", async () => {
    delete process.env.DEEPSEEK_API_KEY;
    const fetchSpy = jest.spyOn(global, "fetch");

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("valida la salida estructurada antes de devolverla", async () => {
    process.env.DEEPSEEK_API_KEY = "test-key";
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                role: "assistant",
                content: JSON.stringify(validProposal),
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.propuesta).toEqual(validProposal);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.deepseek.com/chat/completions",
      expect.objectContaining({ method: "POST" })
    );
    const providerRequest = JSON.parse(
      String((fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined)?.body)
    );
    expect(providerRequest.model).toBe("deepseek-v4-flash");
    expect(providerRequest.response_format).toEqual({ type: "json_object" });
    expect(providerRequest.messages[0].content).toContain("JSON");
  });
});

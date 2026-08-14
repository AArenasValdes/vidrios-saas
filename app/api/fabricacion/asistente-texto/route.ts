import { NextResponse } from "next/server";
import { z } from "zod";

import {
  AuthRouteAccessError,
  resolveAuthenticatedRouteContext,
} from "@/features/auth/services/auth-route-access.service";
import {
  fabricacionAsistenteRespuestaSchema,
} from "@/features/fabricacion/schemas/fabricacion-asistente.schema";
import {
  createSlidingWindowRateLimiter,
  isRateLimitUnavailableError,
  isRequestBodyTooLargeError,
  parseJsonObjectBody,
} from "@/features/solicitudes/services/solicitudes-public-http.service";

export const dynamic = "force-dynamic";

const assistantRateLimiter = createSlidingWindowRateLimiter({
  namespace: "fabricacion-asistente-texto",
  windowMs: 60 * 60 * 1000,
  maxRequests: 30,
});

const requestSchema = z
  .object({
    texto: z.string().trim().min(20).max(6000),
    contexto: z
      .object({
        proveedor: z.string().max(120),
        linea: z.string().max(120),
        tipologia: z.string().max(80),
      })
      .strict(),
  })
  .strict();

const SYSTEM_INSTRUCTIONS = `Eres un extractor tecnico para recetas de fabricacion de ventanas.
Devuelve solo JSON valido con las claves resumen, componentes, preguntas y datosDesconocidos.
Cada componente debe incluir categoria, nombre, codigo, funcion, medidaBase, medidaAltoBase, multiplicador, ajusteMm, cantidadTipo, cantidad, largoComercialMm, observaciones, faltantes y explicito.
No inventes codigos, cantidades, ajustes, largos, perfiles ni reglas.
Marca un campo como explicito solo si aparece literalmente en el texto del usuario.
Si falta un dato, usa null, agregalo a faltantes y formula una pregunta puntual.
No marques ninguna receta como validada. No calcules un despiece final.
Mapea operaciones simples al contrato: dividir por 2 es multiplicador 0.5; restar 12 mm es ajusteMm -12; sumar 3 mm es ajusteMm 3.
Para vidrio se requieren medidaBase y medidaAltoBase; si el texto no entrega ambas, dejalas en null.
Las cantidades permitidas son fija, por_hoja o por_modulo. No deduzcas cantidades por conocimiento general.
Ejemplo JSON: {"resumen":"faltan datos","componentes":[],"preguntas":["Falta confirmar el codigo"],"datosDesconocidos":["codigo"]}`;

function extractOutputText(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const response = value as Record<string, unknown>;
  const choices = response.choices;
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== "object") {
    return null;
  }
  const message = (choices[0] as Record<string, unknown>).message;
  if (!message || typeof message !== "object") return null;
  const content = (message as Record<string, unknown>).content;
  return typeof content === "string" ? content : null;
}

export async function POST(request: Request) {
  let userId = "";
  try {
    const context = await resolveAuthenticatedRouteContext();
    userId = context.user.id;
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: "No pudimos validar la organizacion activa." },
      { status: 500 }
    );
  }

  try {
    if (await assistantRateLimiter.isRateLimited(`user:${userId}`)) {
      return NextResponse.json(
        { error: "Alcanzaste el limite temporal del asistente. Intenta mas tarde." },
        { status: 429 }
      );
    }
  } catch (error) {
    if (isRateLimitUnavailableError(error)) {
      return NextResponse.json(
        { error: "El control de uso no esta disponible. Intenta nuevamente." },
        { status: 503 }
      );
    }
    throw error;
  }

  let requestBody: Record<string, unknown> | null;
  try {
    requestBody = await parseJsonObjectBody(request, { maxBytes: 16 * 1024 });
  } catch (error) {
    if (isRequestBodyTooLargeError(error)) {
      return NextResponse.json(
        { error: "La explicacion es demasiado grande." },
        { status: 413 }
      );
    }
    throw error;
  }
  const parsedBody = requestSchema.safeParse(requestBody);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "La explicacion debe tener entre 20 y 6000 caracteres." },
      { status: 400 }
    );
  }

  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "El asistente de recetas no esta configurado." },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(
      process.env.DEEPSEEK_API_BASE_URL?.trim() ||
        "https://api.deepseek.com/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model:
            process.env.DEEPSEEK_FABRICATION_MODEL?.trim() || "deepseek-v4-flash",
          messages: [
            { role: "system", content: SYSTEM_INSTRUCTIONS },
            {
              role: "user",
              content: `Contexto: ${JSON.stringify(parsedBody.data.contexto)}\n\nExplicacion del taller:\n${parsedBody.data.texto}`,
            },
          ],
          response_format: { type: "json_object" },
          max_tokens: 4000,
        }),
        signal: AbortSignal.timeout(45_000),
      }
    );

    if (!response.ok) {
      console.error("[fabricacion-asistente] DeepSeek", response.status);
      return NextResponse.json(
        { error: "No pudimos analizar la explicacion en este momento." },
        { status: 502 }
      );
    }

    const raw = await response.json();
    const outputText = extractOutputText(raw);
    const proposal = fabricacionAsistenteRespuestaSchema.safeParse(
      outputText ? JSON.parse(outputText) : null
    );
    if (!proposal.success) {
      return NextResponse.json(
        { error: "La propuesta recibida no cumple el esquema de receta." },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { propuesta: proposal.data },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("[fabricacion-asistente] request", error);
    return NextResponse.json(
      { error: "No pudimos analizar la explicacion en este momento." },
      { status: 502 }
    );
  }
}

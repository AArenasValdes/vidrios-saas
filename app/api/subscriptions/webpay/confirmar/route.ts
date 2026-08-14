import { NextResponse } from "next/server";

import { webpaySuscripcionService } from "@/features/subscriptions/services/webpay-suscripcion.service";
import { parseBoundedFormData } from "@/features/solicitudes/services/solicitudes-public-http.service";

export const dynamic = "force-dynamic";

const WEBPAY_PARAM_KEYS = [
  "token_ws",
  "TBK_TOKEN",
  "TBK_ORDEN_COMPRA",
  "TBK_ID_SESION",
] as const;

function redirectTo(path: string, request: Request): NextResponse {
  return NextResponse.redirect(new URL(path, request.url));
}

function paramsToRecord(params: URLSearchParams): Record<string, string> {
  const record: Record<string, string> = {};

  for (const key of WEBPAY_PARAM_KEYS) {
    const value = params.get(key);

    if (value) {
      record[key] = value.slice(0, 160);
    }
  }

  return record;
}

async function extractReturnParams(request: Request): Promise<URLSearchParams> {
  const params = new URL(request.url).searchParams;

  if (request.method !== "POST") {
    return params;
  }

  try {
    const formData = await parseBoundedFormData(request, 8 * 1024);

    if (!formData) {
      return params;
    }

    for (const key of WEBPAY_PARAM_KEYS) {
      const value = formData.get(key);

      if (typeof value === "string") {
        params.set(key, value);
      }
    }
  } catch {
    // Webpay retorna form-data en POST. Si el body no viene parseable,
    // seguimos con query params para no romper el retorno del usuario.
  }

  return params;
}

async function handleWebpayReturn(request: Request): Promise<NextResponse> {
  try {
    const params = await extractReturnParams(request);
    const tokenWs = params.get("token_ws");

    if (tokenWs) {
      const result = await webpaySuscripcionService.confirmarPago(tokenWs);
      return redirectTo(result.redirect, request);
    }

    const reason = params.get("TBK_TOKEN")
      ? "ABORTED"
      : params.get("TBK_ORDEN_COMPRA")
        ? "TIMEOUT"
        : "WEBPAY_FORM_ERROR";

    const result =
      await webpaySuscripcionService.registrarRetornoIncompleto({
        token: params.get("TBK_TOKEN"),
        buyOrder: params.get("TBK_ORDEN_COMPRA"),
        sessionId: params.get("TBK_ID_SESION"),
        reason,
        rawParams: paramsToRecord(params),
      });

    return redirectTo(result.redirect, request);
  } catch (error) {
    console.error("[webpay:confirmar]", error);
    return redirectTo("/cuenta-vencida?pago_fallido=1", request);
  }
}

export async function GET(request: Request) {
  return handleWebpayReturn(request);
}

export async function POST(request: Request) {
  return handleWebpayReturn(request);
}

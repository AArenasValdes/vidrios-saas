import { NextResponse } from "next/server";

import { getPaymentProvider } from "@/features/billing/services/payment-provider-registry";
import type { ProviderReturnInput } from "@/features/billing/types/payment-provider";
import { parseBoundedFormData } from "@/features/solicitudes/services/solicitudes-public-http.service";

export const dynamic = "force-dynamic";

const FLOW_PARAM_KEYS = ["token"] as const;

function redirectTo(path: string, request: Request): NextResponse {
  return NextResponse.redirect(new URL(path, request.url));
}

function resolveSource(request: Request): ProviderReturnInput["source"] {
  const source = new URL(request.url).searchParams.get("source");
  return source === "confirmation" ? "confirmation" : "return";
}

async function extractToken(request: Request): Promise<string | null> {
  const params = new URL(request.url).searchParams;
  const queryToken = params.get("token");

  if (queryToken || request.method !== "POST") {
    return queryToken;
  }

  try {
    const formData = await parseBoundedFormData(request, 8 * 1024);

    if (!formData) {
      return null;
    }

    for (const key of FLOW_PARAM_KEYS) {
      const value = formData.get(key);

      if (typeof value === "string") {
        return value;
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function handleFlowReturn(request: Request): Promise<NextResponse> {
  const source = resolveSource(request);

  try {
    const token = await extractToken(request);
    const result = await getPaymentProvider("flow").handleReturnOrWebhook({
      token,
      source,
    });

    if (source === "confirmation") {
      return NextResponse.json({ ok: true, status: result.status });
    }

    return redirectTo(result.redirectPath, request);
  } catch (error) {
    console.error("[billing:flow:confirmar]", error);

    if (source === "confirmation") {
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    return redirectTo("/cuenta-vencida?pago_fallido=1", request);
  }
}

export async function GET(request: Request) {
  return handleFlowReturn(request);
}

export async function POST(request: Request) {
  return handleFlowReturn(request);
}

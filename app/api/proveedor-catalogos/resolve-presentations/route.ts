import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthRouteAccessError, resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import { readConfirmedSupplierPresentations } from "@/features/proveedor-catalogos/repositories/costo-tecnico-parcial.repository";
import { getSupplierCatalogQuoteLineKeys } from "@/features/proveedor-catalogos/services/proveedor-catalogo-qa.service";
import { resolveSupplierPresentationsForQuoteItem } from "@/features/proveedor-catalogos/services/supplier-presentation-resolution.service";
import { VENTORA_DEFAULT_LINE_CATALOG } from "@/features/cotizaciones/line-templates/services/default-line-catalog";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  items: z.array(z.object({
    itemId: z.string().trim().min(1).max(100),
    catalogLineKey: z.string().trim().min(1).max(180),
    familyKey: z.string().trim().min(1).max(180),
    finishName: z.string().trim().max(100).nullable(),
    technicalCodes: z.array(z.string().trim().min(1).max(100)).max(100),
  })).max(100),
});

export async function POST(request: Request) {
  try {
    const auth = await resolveAuthenticatedRouteContext();
    const supportedCatalogLineKeys = getSupplierCatalogQuoteLineKeys();
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "La solicitud de presentaciones no es válida." }, { status: 400 });
    const familyByCatalogLineKey = new Map(VENTORA_DEFAULT_LINE_CATALOG.flatMap((line) => {
      const familyKey = line.catalogMetadata?.familyKey;
      return line.catalogKey && typeof familyKey === "string" ? [[line.catalogKey, familyKey] as const] : [];
    }));
    if (parsed.data.items.some((item) =>
      !supportedCatalogLineKeys.has(item.catalogLineKey) ||
      familyByCatalogLineKey.get(item.catalogLineKey) !== item.familyKey
    )) {
      return NextResponse.json({ enabled: false }, { status: 404 });
    }

    const presentations = await readConfirmedSupplierPresentations(Number(auth.profile.organizationId));
    const selections = Object.fromEntries(parsed.data.items.map((item) => [item.itemId,
      resolveSupplierPresentationsForQuoteItem({
        request: {
          ...item,
          configurationKey: VENTORA_DEFAULT_LINE_CATALOG.find((line) => line.catalogKey === item.catalogLineKey)?.catalogMetadata?.configurationKey as string | undefined,
        },
        presentations,
      }),
    ]));
    return NextResponse.json({ enabled: true, selections }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthRouteAccessError) return NextResponse.json({ enabled: false }, { status: error.status });
    console.error("[API] resolver presentaciones proveedor", error);
    return NextResponse.json({ error: "No pudimos resolver las presentaciones comerciales." }, { status: 500 });
  }
}

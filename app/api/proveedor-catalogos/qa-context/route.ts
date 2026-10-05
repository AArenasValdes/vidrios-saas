import { NextResponse } from "next/server";

import {
  AuthRouteAccessError,
  resolveAuthenticatedRouteContext,
} from "@/features/auth/services/auth-route-access.service";
import { getSupplierCatalogQaConfig } from "@/features/proveedor-catalogos/services/proveedor-catalogo-qa.service";
import { isSupplierCatalogQaEnabledForIdentity } from "@/features/proveedor-catalogos/services/proveedor-catalogo-qa.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const context = await resolveAuthenticatedRouteContext();
    const enabled = isSupplierCatalogQaEnabledForIdentity({
      organizationId: context.profile.organizationId,
      role: context.profile.rol,
      userEmail: context.user.email,
      config: getSupplierCatalogQaConfig(),
    });
    if (!enabled) return NextResponse.json({ enabled: false }, { status: 404 });
    return NextResponse.json({ enabled: true, allowPreliminaryRecipeSnapshots: true }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json({ enabled: false }, { status: error.status });
    }
    console.error("[API] proveedor catalogos QA context", error);
    return NextResponse.json({ enabled: false }, { status: 500 });
  }
}

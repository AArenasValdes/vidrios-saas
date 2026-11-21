import { NextResponse } from "next/server";
import {
  AuthRouteAccessError,
  resolveAuthenticatedRouteContext,
} from "@/features/auth/services/auth-route-access.service";
import {
  createWorkshopGlassCutPresentation,
  listOrganizationGlassProducts,
  listWorkshopGlassCutPresentations,
  updateWorkshopGlassCutPresentation,
  WorkshopPresentationConflictError,
  WorkshopPresentationsSchemaMissingError,
} from "@/features/proveedor-catalogos/repositories/workshop-presentations.repository";
import {
  workshopGlassCutInputSchema,
  workshopGlassCutUpdateSchema,
} from "@/features/proveedor-catalogos/schemas/workshop-presentation.schema";
import {
  canManageSupplierCatalog,
  canReadSupplierCatalog,
} from "@/features/proveedor-catalogos/services/supplier-catalog-access.service";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  if (error instanceof AuthRouteAccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof WorkshopPresentationsSchemaMissingError) {
    return NextResponse.json(
      { error: "Falta aplicar la migración de precios de vidrio al corte del taller." },
      { status: 503 }
    );
  }
  if (error instanceof WorkshopPresentationConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  console.error("[API] presentaciones de vidrio del taller", error);
  return NextResponse.json(
    { error: "No pudimos cargar o guardar los precios de vidrio al corte." },
    { status: 500 }
  );
}

export async function GET() {
  try {
    const auth = await resolveAuthenticatedRouteContext();
    if (!canReadSupplierCatalog(auth.profile.organizationId)) {
      return NextResponse.json({ error: "No disponible." }, { status: 404 });
    }
    const organizationId = Number(auth.profile.organizationId);
    const [glassProducts, glassState] = await Promise.all([
      listOrganizationGlassProducts(organizationId),
      listWorkshopGlassCutPresentations(organizationId),
    ]);
    return NextResponse.json(
      {
        glassProducts,
        presentations: glassState.presentations,
        schemaPending: glassState.schemaPending,
        canManage: canManageSupplierCatalog(auth.profile.rol),
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await resolveAuthenticatedRouteContext();
    if (!canManageSupplierCatalog(auth.profile.rol)) {
      return NextResponse.json(
        { error: "Solo administradores y maestros pueden configurar precios de compra de vidrio." },
        { status: 403 }
      );
    }
    if (!canReadSupplierCatalog(auth.profile.organizationId)) {
      return NextResponse.json({ error: "No disponible." }, { status: 404 });
    }
    const parsed = workshopGlassCutInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos de vidrio inválidos." },
        { status: 400 }
      );
    }
    const organizationId = Number(auth.profile.organizationId);
    const row = await createWorkshopGlassCutPresentation({
      organizationId,
      glassLineTemplateId: parsed.data.glassLineTemplateId ?? null,
      glassProductId: parsed.data.glassProductId ?? null,
      category: parsed.data.category,
      thicknessMm: parsed.data.thicknessMm,
      description: parsed.data.description,
      providerKey: parsed.data.providerKey ?? null,
      supplierName: parsed.data.supplierName,
      netPricePerM2: parsed.data.netPricePerM2,
      minBillableM2PerPane: parsed.data.minBillableM2PerPane ?? null,
      currency: parsed.data.currency,
      validFrom: parsed.data.validFrom ?? null,
      validUntil: parsed.data.validUntil ?? null,
      userId: auth.user.id,
    });
    return NextResponse.json({ row }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await resolveAuthenticatedRouteContext();
    if (!canManageSupplierCatalog(auth.profile.rol)) {
      return NextResponse.json(
        { error: "Solo administradores y maestros pueden configurar precios de compra de vidrio." },
        { status: 403 }
      );
    }
    if (!canReadSupplierCatalog(auth.profile.organizationId)) {
      return NextResponse.json({ error: "No disponible." }, { status: 404 });
    }
    const parsed = workshopGlassCutUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos de actualización inválidos." },
        { status: 400 }
      );
    }
    const organizationId = Number(auth.profile.organizationId);
    const row = await updateWorkshopGlassCutPresentation({
      organizationId,
      presentationId: parsed.data.presentationId,
      expectedRevision: parsed.data.expectedRevision,
      supplierName: parsed.data.supplierName,
      netPricePerM2: parsed.data.netPricePerM2,
      minBillableM2PerPane: parsed.data.minBillableM2PerPane ?? null,
      currency: parsed.data.currency,
      validFrom: parsed.data.validFrom ?? null,
      validUntil: parsed.data.validUntil ?? null,
    });
    return NextResponse.json({ row });
  } catch (error) {
    return errorResponse(error);
  }
}

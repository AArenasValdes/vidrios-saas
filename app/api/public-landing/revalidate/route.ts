import { NextResponse } from "next/server";

import { findActiveUserProfile } from "@/features/auth/services/active-user-profile.service";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePublicLandingCaches } from "@/features/solicitudes/services/solicitudes-public-cache-revalidation.server";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization")?.trim() ?? "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice(7).trim() || null;
}

export async function POST(request: Request) {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const admin = createAdminClient();
  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const profile = await findActiveUserProfile(admin, {
    authUserId: user.id,
    email: user.email,
  });

  const organizationId = profile?.organization_id;

  if (!organizationId) {
    return NextResponse.json(
      { error: "No pudimos identificar la organizacion activa." },
      { status: 403 }
    );
  }

  const { data, error } = await admin
    .from("organization_profile")
    .select("solicitud_publica_slug")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "No pudimos refrescar la landing publica." },
      { status: 500 }
    );
  }

  const row = data as { solicitud_publica_slug?: string | null } | null;
  const slug =
    typeof row?.solicitud_publica_slug === "string"
      ? row.solicitud_publica_slug.trim()
      : "";

  revalidatePublicLandingCaches(slug || null);

  return NextResponse.json({
    ok: true,
    slug: slug || null,
  });
}

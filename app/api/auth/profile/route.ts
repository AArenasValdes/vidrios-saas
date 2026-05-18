import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { findActiveUserProfile } from "@/features/auth/services/active-user-profile.service";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization")?.trim() ?? "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice(7).trim() || null;
}

export async function GET(request: Request) {
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

  return NextResponse.json({
    profile: profile
      ? {
          organizacionId: profile.organization_id,
          rol: profile.rol,
        }
      : null,
  });
}

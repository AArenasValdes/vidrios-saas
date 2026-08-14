import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
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

  let user = null;

  if (accessToken) {
    const admin = createAdminClient();
    const bearerResult = await admin.auth.getUser(accessToken);

    if (!bearerResult.error && bearerResult.data.user) {
      user = bearerResult.data.user;
    }
  }

  if (!user) {
    const supabase = await createServerSupabaseClient();
    const cookieResult = await supabase.auth.getUser();

    if (!cookieResult.error && cookieResult.data.user) {
      user = cookieResult.data.user;
    }
  }

  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const admin = createAdminClient();
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

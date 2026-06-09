import { NextResponse } from "next/server";

import {
  OrganizationProvisionError,
  provisionOrganizationAccount,
} from "@/features/admin/services/organization-provision.service";
import { resolveVentoraAdminRouteContext } from "@/features/admin/services/admin-route-access.service";
import { AuthRouteAccessError } from "@/features/auth/services/auth-route-access.service";

type ProvisionBody = {
  email?: string;
  password?: string;
  empresaNombre?: string;
  isTestAccount?: boolean;
};

export async function POST(request: Request) {
  try {
    await resolveVentoraAdminRouteContext();
    const body = (await request.json().catch(() => null)) as ProvisionBody | null;

    const result = await provisionOrganizationAccount({
      email: body?.email ?? "",
      password: body?.password ?? "",
      empresaNombre: body?.empresaNombre ?? "",
      isTestAccount: body?.isTestAccount === true,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof OrganizationProvisionError) {
      const status =
        error.code === "email_taken"
          ? 409
          : error.code === "invalid_input"
            ? 400
            : 500;

      return NextResponse.json({ error: error.message }, { status });
    }

    console.error("Fallo el provision admin.", error);
    return NextResponse.json(
      { error: "No pudimos crear la cuenta." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";

import {
  OrganizationProvisionError,
  provisionOrganizationAccount,
} from "@/features/admin/services/organization-provision.service";
import { assertAuthRegisterRateLimit } from "@/features/auth/services/auth-register-rate-limit.service";

type RegisterBody = {
  email?: string;
  password?: string;
  empresaNombre?: string;
};

function parseRegisterBody(value: unknown): RegisterBody | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as RegisterBody;
}

export async function POST(request: Request) {
  try {
    await assertAuthRegisterRateLimit(request);
  } catch {
    return NextResponse.json(
      {
        error:
          "Demasiados intentos de registro desde esta red. Espera un momento e intenta de nuevo.",
      },
      { status: 429 }
    );
  }

  let body: RegisterBody | null = null;

  try {
    body = parseRegisterBody(await request.json());
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  if (!body) {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  try {
    const result = await provisionOrganizationAccount({
      email: body.email ?? "",
      password: body.password ?? "",
      empresaNombre: body.empresaNombre ?? "",
    });

    return NextResponse.json({
      ok: true,
      organizationId: result.organizationId,
      email: result.email,
    });
  } catch (error) {
    if (error instanceof OrganizationProvisionError) {
      const status =
        error.code === "email_taken"
          ? 409
          : error.code === "invalid_input"
            ? 400
            : 500;

      return NextResponse.json({ error: error.message }, { status });
    }

    console.error("Fallo el registro publico.", error);
    return NextResponse.json(
      { error: "No pudimos crear tu cuenta. Intenta de nuevo." },
      { status: 500 }
    );
  }
}

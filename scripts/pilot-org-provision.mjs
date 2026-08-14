#!/usr/bin/env node

import process from "node:process";
import {
  createAnonClient,
  exitWithError,
  loadPilotRuntime,
  normalizeEmail,
  parseArgs,
  resolvePilotOptions,
} from "./pilot-shared.mjs";

const PROVISION_OPTION_MAP = {
  positionals: ["email", "password"],
  trailingPositionalKey: "empresa",
  env: {
    PILOT_EMAIL: "email",
    PILOT_PASSWORD: "password",
    PILOT_EMPRESA: "empresa",
  },
};

function printHelp() {
  console.log(`
Uso (recomendado con pnpm):
  pnpm pilot:org:provision --email correo@empresa.cl --password clave123 --empresa "Mi Empresa"
  pnpm pilot:org:provision correo@empresa.cl clave123 "Mi Empresa"

Forma alternativa con flags (si tu terminal los respeta):
  pnpm pilot:org:provision -- --email correo@empresa.cl --password clave123 --empresa "Mi Empresa"

Variables de entorno:
  PILOT_EMAIL, PILOT_PASSWORD, PILOT_EMPRESA

Otros comandos:
  pnpm pilot:org:audit-trials
  pnpm pilot:org:fix-trials [--dry-run]

Notas:
  En Windows, npm run puede perder flags --email. Usa pnpm o argumentos posicionales.
  Los datos de empresa se completan en Ventora: /configuracion/empresa
`);
}

function resolveProvisionOptions(argv) {
  return resolvePilotOptions(argv, PROVISION_OPTION_MAP);
}

async function listMisconfiguredTrials(supabase) {
  const { data, error } = await supabase
    .from("organization_profile")
    .select(
      "organization_id, empresa_nombre, subscription_status, plan_code, trial_ends_at"
    )
    .eq("plan_code", "quote_only")
    .in("subscription_status", [
      "trial_active",
      "trial_expiring",
      "trial_expired",
    ]);

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function fixMisconfiguredTrials(supabase, dryRun) {
  const rows = await listMisconfiguredTrials(supabase);

  if (rows.length === 0) {
    console.log("OK: no hay trials con plan_code quote_only.");
    return;
  }

  if (dryRun) {
    console.log("[dry-run] Se corregirian estas organizaciones:");
    console.table(rows);
    return;
  }

  const { data, error } = await supabase
    .from("organization_profile")
    .update({
      plan_code: "trial",
      plan_type: "trial",
      billing_period: "none",
      payment_method: "none",
      actualizado_en: new Date().toISOString(),
    })
    .eq("plan_code", "quote_only")
    .in("subscription_status", [
      "trial_active",
      "trial_expiring",
      "trial_expired",
    ])
    .select("organization_id, empresa_nombre");

  if (error) {
    throw error;
  }

  console.log(`OK: ${data?.length ?? 0} organizacion(es) corregida(s) a trial.`);
  if (data?.length) {
    console.table(data);
  }
}

async function verifyProvisionedAccess({
  supabaseUrl,
  anonKey,
  appUrl,
  email,
  password,
  expectedOrganizationId,
}) {
  const client = createAnonClient(supabaseUrl, anonKey);
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    throw new Error(
      `La cuenta ${email} no pudo iniciar sesion: ${error?.message ?? "sin sesion"}`
    );
  }

  try {
    const response = await fetch(`${appUrl}/api/auth/profile`, {
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Perfil respondio ${response.status}: ${body || "sin detalle"}`);
    }

    const payload = await response.json();
    const organizationId = Number(payload?.profile?.organizacionId);

    if (!organizationId) {
      throw new Error("No se resolvio organization_id en la app.");
    }

    if (organizationId !== expectedOrganizationId) {
      throw new Error(
        `Se esperaba organization_id ${expectedOrganizationId}, llego ${organizationId}.`
      );
    }
  } finally {
    await client.auth.signOut().catch(() => undefined);
  }
}

async function runProvision(runtime, options) {
  const email = normalizeEmail(options.email);
  const password = options.password?.trim() ?? "";
  const empresaNombre =
    options.empresa?.trim().replace(/\s+/gu, " ") || "Mi empresa";
  const dryRun = options["dry-run"] === "true";

  if (!email) {
    exitWithError(
      'Debes indicar el correo. Ejemplo: pnpm pilot:org:provision dueno@vidrio.cl <secreto-seguro> "Vidrios del Sur"'
    );
  }

  if (!password || password.length < 8) {
    exitWithError(
      "Debes indicar una contrasena de al menos 8 caracteres como segundo argumento o con --password."
    );
  }

  if (dryRun) {
    console.log("[dry-run] Crear organizacion y cuenta:", {
      email,
      empresaNombre,
    });
    return;
  }

  const { data: existingUser, error: existingUserError } = await runtime.supabase
    .from("users")
    .select("id, eliminado_en")
    .ilike("correo", email)
    .maybeSingle();

  if (existingUserError) {
    throw existingUserError;
  }

  if (existingUser && !existingUser.eliminado_en) {
    exitWithError(`Ya existe una cuenta activa con correo ${email}.`);
  }

  const { data: organization, error: organizationError } = await runtime.supabase
    .from("organizations")
    .insert({
      nombre: empresaNombre,
      correo: email,
    })
    .select("id, nombre")
    .single();

  if (organizationError || !organization) {
    throw organizationError ?? new Error("No se creo la organizacion.");
  }

  const organizationId = Number(organization.id);
  let authUserId = null;

  try {
    const { data: authData, error: authError } =
      await runtime.supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      throw authError ?? new Error("No se creo el auth user.");
    }

    authUserId = authData.user.id;

    const { error: publicUserError } = await runtime.supabase.from("users").insert({
      correo: email,
      organization_id: organizationId,
      rol: "admin",
      auth_user_id: authUserId,
    });

    if (publicUserError) {
      throw publicUserError;
    }

    const { data: profile, error: profileError } = await runtime.supabase
      .from("organization_profile")
      .select("plan_code, subscription_status, trial_ends_at")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (profile?.plan_code !== "trial") {
      throw new Error(
        `Trial invalido: plan_code=${profile?.plan_code ?? "null"}`
      );
    }

    await verifyProvisionedAccess({
      supabaseUrl: runtime.supabaseUrl,
      anonKey: runtime.anonKey,
      appUrl: runtime.appUrl,
      email,
      password,
      expectedOrganizationId: organizationId,
    });

    console.log("OK: cuenta piloto creada con trial Founder Full.");
    console.table([
      {
        organizationId,
        email,
        empresaNombre: organization.nombre,
        planCode: profile.plan_code,
        trialEndsAt: profile.trial_ends_at,
        loginUrl: `${runtime.appUrl}/login`,
        configUrl: `${runtime.appUrl}/configuracion/empresa`,
      },
    ]);
  } catch (error) {
    if (authUserId) {
      await runtime.supabase.auth.admin
        .deleteUser(authUserId)
        .catch(() => undefined);
    }

    await runtime.supabase
      .from("organizations")
      .delete()
      .eq("id", organizationId);

    throw error;
  }
}

async function main() {
  const [command, ...restArgs] = process.argv.slice(2);

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  const runtime = loadPilotRuntime(parseArgs(restArgs));

  if (command === "audit-trials") {
    const rows = await listMisconfiguredTrials(runtime.supabase);

    if (rows.length === 0) {
      console.log("OK: no hay trials con plan_code quote_only.");
      return;
    }

    console.log("Organizaciones en trial con plan_code quote_only:");
    console.table(rows);
    process.exitCode = 2;
    return;
  }

  if (command === "fix-trials") {
    const fixOptions = parseArgs(restArgs);
    await fixMisconfiguredTrials(
      runtime.supabase,
      fixOptions["dry-run"] === "true"
    );
    return;
  }

  if (command === "provision") {
    await runProvision(runtime, resolveProvisionOptions(restArgs));
    return;
  }

  exitWithError(`Comando desconocido: ${command}`);
}

main().catch((error) => {
  console.error("Fallo el script de provision de organizaciones.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

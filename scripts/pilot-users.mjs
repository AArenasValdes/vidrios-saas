#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_APP_URL = "https://www.ventorap.cl";

function loadEnvFile(filename) {
  const filePath = path.resolve(process.cwd(), filename);

  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/gu, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      continue;
    }

    const [rawKey, inlineValue] = token.slice(2).split("=", 2);
    const nextValue =
      inlineValue ??
      (argv[index + 1] && !argv[index + 1].startsWith("--")
        ? argv[++index]
        : "true");

    options[rawKey] = nextValue;
  }

  return options;
}

function printHelp() {
  console.log(`
Uso:
  npm run pilot:user:audit
  npm run pilot:user:create -- --email correo@empresa.cl --password clave123 --organization-id 3 [--role admin] [--reset-password] [--app-url https://www.ventorap.cl] [--dry-run]
  npm run pilot:user:repair -- --email correo@empresa.cl --password clave123 --organization-id 3 [--role admin] [--reset-password] [--app-url https://www.ventorap.cl] [--dry-run]
  npm run pilot:user:reset-password -- --email correo@empresa.cl --password clave123 [--dry-run]

Comandos:
  audit            Lista usuarios de Auth/Public rotos o desalineados.
  create           Crea o vincula una cuenta piloto completa y la verifica.
  repair           Repara una cuenta existente y valida login + perfil.
  reset-password   Cambia la contrasena de un auth user existente.

Flags create/repair:
  --email              Correo del usuario piloto.
  --password           Contrasena inicial o final a validar.
  --organization-id    ID de la empresa duenia de la cuenta.
  --role               Rol en public.users. Default: admin
  --reset-password     Si el usuario ya existe en Auth, actualiza su contrasena.
  --app-url            URL base de la app para verificar /api/auth/profile.
  --dry-run            Muestra lo que haria sin escribir nada.
`);
}

function exitWithError(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function normalizeEmail(value) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeAppUrl(value) {
  const candidate =
    value?.trim() || process.env.VENTORA_APP_URL || DEFAULT_APP_URL;

  try {
    const url = new URL(candidate);
    url.pathname = "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/u, "");
  } catch {
    exitWithError(`La URL base de la app no es valida: ${candidate}`);
  }
}

function createServiceRoleClient(supabaseUrl, serviceRoleKey) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function createAnonClient(supabaseUrl, anonKey) {
  return createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function listAllAuthUsers(supabase) {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw error;
    }

    const pageUsers = data?.users ?? [];
    users.push(...pageUsers);

    if (pageUsers.length < 200) {
      return users;
    }

    page += 1;
  }
}

async function findAuthUserByEmail(supabase, email) {
  const users = await listAllAuthUsers(supabase);
  return (
    users.find(
      (candidate) => normalizeEmail(candidate.email) === normalizeEmail(email)
    ) ?? null
  );
}

async function getOrganization(supabase, organizationId) {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, nombre, eliminado_en")
    .eq("id", organizationId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data || data.eliminado_en) {
    exitWithError(`La organizacion ${organizationId} no existe o esta eliminada.`);
  }

  return data;
}

async function getPublicUserByEmail(supabase, email) {
  const { data, error } = await supabase
    .from("users")
    .select("id, correo, organization_id, rol, auth_user_id, eliminado_en")
    .ilike("correo", email)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function runAudit(supabase) {
  const [authUsers, publicUsersResult] = await Promise.all([
    listAllAuthUsers(supabase),
    supabase
      .from("users")
      .select("id, correo, organization_id, rol, auth_user_id, eliminado_en"),
  ]);

  if (publicUsersResult.error) {
    throw publicUsersResult.error;
  }

  const publicUsers = publicUsersResult.data ?? [];
  const publicByEmail = new Map(
    publicUsers.map((row) => [normalizeEmail(row.correo), row])
  );
  const authByEmail = new Map(
    authUsers
      .filter((candidate) => normalizeEmail(candidate.email))
      .map((candidate) => [normalizeEmail(candidate.email), candidate])
  );

  const findings = [];

  for (const authUser of authUsers) {
    const email = normalizeEmail(authUser.email);

    if (!email) {
      continue;
    }

    const publicUser = publicByEmail.get(email);

    if (!publicUser) {
      findings.push({
        email,
        issue: "falta_public_users",
      });
      continue;
    }

    if (publicUser.eliminado_en) {
      findings.push({
        email,
        issue: "public_user_eliminado",
        publicUserId: publicUser.id,
      });
      continue;
    }

    if (publicUser.auth_user_id !== authUser.id) {
      findings.push({
        email,
        issue: "auth_user_id_desalineado",
        publicUserId: publicUser.id,
        expectedAuthUserId: authUser.id,
        currentAuthUserId: publicUser.auth_user_id,
      });
    }
  }

  for (const publicUser of publicUsers) {
    if (publicUser.eliminado_en) {
      continue;
    }

    const email = normalizeEmail(publicUser.correo);
    const authUser = authByEmail.get(email);

    if (!authUser) {
      findings.push({
        email,
        issue: "falta_auth_user",
        publicUserId: publicUser.id,
      });
      continue;
    }

    if (publicUser.auth_user_id && publicUser.auth_user_id !== authUser.id) {
      findings.push({
        email,
        issue: "public_user_apunta_a_auth_distinto",
        publicUserId: publicUser.id,
        expectedAuthUserId: authUser.id,
        currentAuthUserId: publicUser.auth_user_id,
      });
    }
  }

  if (findings.length === 0) {
    console.log("OK: no hay usuarios rotos entre auth.users y public.users.");
    return;
  }

  console.log("Usuarios que requieren reparacion:");
  console.table(findings);
  process.exitCode = 2;
}

async function verifyPilotUserAccess({
  supabaseUrl,
  anonKey,
  appUrl,
  email,
  password,
  expectedOrganizationId,
  expectedRole,
}) {
  const client = createAnonClient(supabaseUrl, anonKey);
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session || !data.user) {
    throw new Error(
      `La cuenta ${email} no pudo iniciar sesion en Auth: ${error?.message ?? "sin sesion"}`
    );
  }

  try {
    const accessToken = data.session.access_token;
    let targetUrl = `${appUrl}/api/auth/profile`;
    let response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      redirect: "manual",
    });

    if (
      response.status >= 300 &&
      response.status < 400 &&
      response.headers.get("location")
    ) {
      targetUrl = new URL(response.headers.get("location"), targetUrl).toString();
      response = await fetch(targetUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `La app respondio ${response.status} al verificar el perfil: ${body || "sin detalle"}`
      );
    }

    const payload = await response.json();
    const profile = payload?.profile;

    if (!profile?.organizacionId) {
      throw new Error("La app autentico, pero no resolvio organization_id.");
    }

    if (Number(profile.organizacionId) !== expectedOrganizationId) {
      throw new Error(
        `La app resolvio organization_id ${profile.organizacionId}, pero se esperaba ${expectedOrganizationId}.`
      );
    }

    if ((profile.rol ?? null) !== expectedRole) {
      throw new Error(
        `La app resolvio rol ${profile.rol ?? "null"}, pero se esperaba ${expectedRole}.`
      );
    }

    return {
      authUserId: data.user.id,
      organizationId: Number(profile.organizacionId),
      role: profile.rol,
      appUrl: targetUrl.replace(/\/api\/auth\/profile$/u, ""),
    };
  } finally {
    await client.auth.signOut().catch(() => undefined);
  }
}

async function ensurePilotUser({
  supabase,
  options,
  allowCreateAuthUser,
}) {
  const email = normalizeEmail(options.email);
  const password = options.password?.trim() ?? "";
  const role = options.role?.trim() || "admin";
  const organizationId = Number(options["organization-id"]);
  const dryRun = options["dry-run"] === "true";
  const shouldResetPassword = options["reset-password"] === "true";

  if (!email) {
    exitWithError("Debes indicar --email.");
  }

  if (!password) {
    exitWithError("Debes indicar --password.");
  }

  if (!Number.isInteger(organizationId) || organizationId <= 0) {
    exitWithError("Debes indicar un --organization-id valido.");
  }

  const organization = await getOrganization(supabase, organizationId);
  let authUser = await findAuthUserByEmail(supabase, email);

  if (!authUser && dryRun) {
    authUser = { id: "dry-run-auth-user-id", email };
  }

  if (!authUser) {
    if (!allowCreateAuthUser) {
      exitWithError(
        `No existe auth user para ${email}. Usa create o crea la cuenta en Auth primero.`
      );
    }

    const actionLabel = `Crear auth user para ${email}`;

    if (dryRun) {
      console.log(`[dry-run] ${actionLabel}`);
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (error) {
        throw error;
      }

      authUser = data.user;
      console.log(`OK: auth user creado para ${email}.`);
    }
  } else if (shouldResetPassword) {
    const actionLabel = `Resetear contrasena de ${email}`;

    if (dryRun) {
      console.log(`[dry-run] ${actionLabel}`);
    } else {
      const { error } = await supabase.auth.admin.updateUserById(authUser.id, {
        password,
      });

      if (error) {
        throw error;
      }

      console.log(`OK: contrasena actualizada para ${email}.`);
    }
  }

  if (!authUser?.id) {
    exitWithError("No fue posible resolver el auth user.");
  }

  const publicUser = await getPublicUserByEmail(supabase, email);

  if (publicUser?.eliminado_en) {
    exitWithError(
      `Ya existe un usuario eliminado con correo ${email}. Reactivalo manualmente antes de reutilizarlo.`
    );
  }

  if (publicUser && Number(publicUser.organization_id) !== organizationId) {
    exitWithError(
      `El correo ${email} ya esta vinculado a la organizacion ${publicUser.organization_id}. No se rebindea automaticamente por seguridad.`
    );
  }

  if (publicUser?.auth_user_id && publicUser.auth_user_id !== authUser.id) {
    exitWithError(
      `El correo ${email} ya tiene auth_user_id distinto en public.users. Revisa el usuario antes de continuar.`
    );
  }

  const payload = {
    correo: email,
    organization_id: organizationId,
    rol: role,
    auth_user_id: authUser.id,
  };

  if (!publicUser) {
    if (dryRun) {
      console.log("[dry-run] Insertar fila en public.users:", payload);
    } else {
      const { error } = await supabase.from("users").insert(payload);

      if (error) {
        throw error;
      }

      console.log(`OK: fila creada en public.users para ${email}.`);
    }
  } else {
    const updateNeeded =
      Number(publicUser.organization_id) !== organizationId ||
      publicUser.rol !== role ||
      publicUser.auth_user_id !== authUser.id;

    if (!updateNeeded) {
      console.log(`OK: ${email} ya estaba vinculado correctamente.`);
    } else if (dryRun) {
      console.log(
        `[dry-run] Actualizar public.users ${publicUser.id} con:`,
        payload
      );
    } else {
      const { error } = await supabase
        .from("users")
        .update(payload)
        .eq("id", publicUser.id);

      if (error) {
        throw error;
      }

      console.log(`OK: fila actualizada en public.users para ${email}.`);
    }
  }

  return {
    email,
    organizationId,
    organizationName: organization.nombre,
    role,
    authUserId: authUser.id,
    dryRun,
  };
}

async function runCreate(supabase, runtime, options) {
  const summary = await ensurePilotUser({
    supabase,
    options,
    allowCreateAuthUser: true,
  });

  if (summary.dryRun) {
    console.log("Resumen:");
    console.table([summary]);
    return;
  }

  const verification = await verifyPilotUserAccess({
    supabaseUrl: runtime.supabaseUrl,
    anonKey: runtime.anonKey,
    appUrl: runtime.appUrl,
    email: summary.email,
    password: options.password.trim(),
    expectedOrganizationId: summary.organizationId,
    expectedRole: summary.role,
  });

  console.log("OK: acceso verificado contra Auth y /api/auth/profile.");
  console.table([{ ...summary, verifiedAppUrl: verification.appUrl }]);
}

async function runRepair(supabase, runtime, options) {
  const summary = await ensurePilotUser({
    supabase,
    options,
    allowCreateAuthUser: false,
  });

  if (summary.dryRun) {
    console.log("Resumen:");
    console.table([summary]);
    return;
  }

  const verification = await verifyPilotUserAccess({
    supabaseUrl: runtime.supabaseUrl,
    anonKey: runtime.anonKey,
    appUrl: runtime.appUrl,
    email: summary.email,
    password: options.password.trim(),
    expectedOrganizationId: summary.organizationId,
    expectedRole: summary.role,
  });

  console.log("OK: cuenta reparada y validada contra la app.");
  console.table([{ ...summary, verifiedAppUrl: verification.appUrl }]);
}

async function runResetPassword(supabase, options) {
  const email = normalizeEmail(options.email);
  const password = options.password?.trim() ?? "";
  const dryRun = options["dry-run"] === "true";

  if (!email) {
    exitWithError("Debes indicar --email.");
  }

  if (!password) {
    exitWithError("Debes indicar --password.");
  }

  const authUser = await findAuthUserByEmail(supabase, email);

  if (!authUser?.id) {
    exitWithError(`No existe auth user para ${email}.`);
  }

  if (dryRun) {
    console.log(`[dry-run] Resetear contrasena de ${email}`);
    return;
  }

  const { error } = await supabase.auth.admin.updateUserById(authUser.id, {
    password,
  });

  if (error) {
    throw error;
  }

  console.log(`OK: contrasena actualizada para ${email}.`);
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    exitWithError(
      "Faltan NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY/SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY en el entorno."
    );
  }

  const [command, ...restArgs] = process.argv.slice(2);

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  const options = parseArgs(restArgs);
  const runtime = {
    supabaseUrl,
    anonKey,
    appUrl: normalizeAppUrl(options["app-url"]),
  };
  const supabase = createServiceRoleClient(supabaseUrl, serviceRoleKey);

  if (command === "audit") {
    await runAudit(supabase);
    return;
  }

  if (command === "create") {
    await runCreate(supabase, runtime, options);
    return;
  }

  if (command === "repair") {
    await runRepair(supabase, runtime, options);
    return;
  }

  if (command === "reset-password") {
    await runResetPassword(supabase, options);
    return;
  }

  exitWithError(`Comando desconocido: ${command}`);
}

main().catch((error) => {
  console.error("Fallo el script de usuarios piloto.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

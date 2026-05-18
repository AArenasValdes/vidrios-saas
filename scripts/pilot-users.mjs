#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

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
      inlineValue ?? (argv[index + 1] && !argv[index + 1].startsWith("--")
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
  npm run pilot:user:create -- --email correo@empresa.cl --password clave123 --organization-id 3 [--role admin] [--reset-password] [--dry-run]

Comandos:
  audit   Lista usuarios de Auth sin fila valida en public.users o con auth_user_id desalineado.
  create  Crea o vincula una cuenta piloto completa en Auth + public.users.

Flags create:
  --email              Correo del usuario piloto.
  --password           Contrasena inicial.
  --organization-id    ID de la empresa dueña de la cuenta.
  --role               Rol en public.users. Default: admin
  --reset-password     Si el usuario ya existe en Auth, actualiza su contrasena.
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

  if (findings.length === 0) {
    console.log("OK: no hay usuarios rotos entre auth.users y public.users.");
    return;
  }

  console.log("Usuarios que requieren reparacion:");
  console.table(findings);
  process.exitCode = 2;
}

async function runCreate(supabase, options) {
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

  if (
    publicUser &&
    Number(publicUser.organization_id) !== organizationId
  ) {
    exitWithError(
      `El correo ${email} ya esta vinculado a la organizacion ${publicUser.organization_id}. No se rebindea automaticamente por seguridad.`
    );
  }

  if (
    publicUser?.auth_user_id &&
    publicUser.auth_user_id !== authUser.id
  ) {
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

  console.log("Resumen:");
  console.table([
    {
      email,
      organizationId,
      organizationName: organization.nombre,
      role,
      authUserId: authUser.id,
      dryRun,
    },
  ]);
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    exitWithError(
      "Faltan NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno."
    );
  }

  const [command, ...restArgs] = process.argv.slice(2);

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  const options = parseArgs(restArgs);
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  if (command === "audit") {
    await runAudit(supabase);
    return;
  }

  if (command === "create") {
    await runCreate(supabase, options);
    return;
  }

  exitWithError(`Comando desconocido: ${command}`);
}

main().catch((error) => {
  console.error("Fallo el script de usuarios piloto.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

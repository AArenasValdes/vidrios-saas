#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

export const DEFAULT_APP_URL = "https://www.ventorap.cl";

export function loadEnvFile(filename) {
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

export function parseArgs(argv) {
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

export function getPositionalArgs(argv) {
  return argv.filter((token) => token && !token.startsWith("--"));
}

/**
 * En Windows, npm run a veces pierde flags --email/--password.
 * Este helper combina flags, argumentos posicionales y variables de entorno.
 */
export function resolvePilotOptions(argv, envMap) {
  const options = parseArgs(argv);
  const positionals = getPositionalArgs(argv);
  const resolved = { ...options };

  for (const [index, key] of envMap.positionals.entries()) {
    if (!resolved[key] && positionals[index]) {
      resolved[key] = positionals[index];
    }
  }

  if (envMap.trailingPositionalKey && positionals.length > envMap.positionals.length) {
    const trailing = positionals.slice(envMap.positionals.length).join(" ").trim();
    if (!resolved[envMap.trailingPositionalKey] && trailing) {
      resolved[envMap.trailingPositionalKey] = trailing;
    }
  }

  for (const [envName, key] of Object.entries(envMap.env ?? {})) {
    if (!resolved[key] && process.env[envName]?.trim()) {
      resolved[key] = process.env[envName].trim();
    }
  }

  return resolved;
}

export function exitWithError(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

export function normalizeEmail(value) {
  return value?.trim().toLowerCase() ?? "";
}

export function normalizeAppUrl(value) {
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

export function createServiceRoleClient(supabaseUrl, serviceRoleKey) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function createAnonClient(supabaseUrl, anonKey) {
  return createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function loadPilotRuntime(options = {}) {
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

  return {
    supabaseUrl,
    anonKey,
    serviceRoleKey,
    appUrl: normalizeAppUrl(options["app-url"]),
    supabase: createServiceRoleClient(supabaseUrl, serviceRoleKey),
  };
}

export function addMonths(date, months) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

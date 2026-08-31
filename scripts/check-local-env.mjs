#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function loadEnvFile(filename) {
  const filePath = path.resolve(process.cwd(), filename);

  if (!fs.existsSync(filePath)) {
    return false;
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

  return true;
}

function classifySecret(value) {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    return "vacio";
  }

  if (trimmed.startsWith("vck_")) {
    return "cifrado de Vercel (vck_) — no sirve";
  }

  if (trimmed.startsWith("sb_publishable_")) {
    return "sb_publishable (anon moderna)";
  }

  if (trimmed.startsWith("sb_secret_")) {
    return "sb_secret (service_role moderna)";
  }

  if (trimmed.startsWith("eyJ") && trimmed.split(".").length === 3) {
    return "JWT de Supabase";
  }

  return `formato desconocido (largo ${trimmed.length})`;
}

function hostOf(urlValue) {
  try {
    return new URL(urlValue).host;
  } catch {
    return "URL invalida";
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const envLocalExists = fs.existsSync(path.resolve(process.cwd(), ".env.local"));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

console.log("Diagnostico de entorno local (sin imprimir secretos)\n");
console.log(`  .env.local: ${envLocalExists ? "presente" : "NO EXISTE"}`);
console.log(`  Supabase URL: ${url ? hostOf(url) : "falta"}`);
console.log(`  ANON_KEY: ${classifySecret(anon)}`);
console.log(`  SERVICE_ROLE_KEY: ${classifySecret(serviceRole)}`);
console.log("");

const problems = [];

if (!envLocalExists) {
  problems.push("Crea .env.local. No copies el archivo entre PCs; pega las claves desde Dashboard.");
}

if (!url) {
  problems.push("Falta NEXT_PUBLIC_SUPABASE_URL.");
}

if (!anon) {
  problems.push("Falta NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

if (!serviceRole || serviceRole.startsWith("vck_")) {
  problems.push(
    "SUPABASE_SERVICE_ROLE_KEY no es usable. En Supabase Dashboard → Project Settings → API copia service_role (JWT eyJ... o sb_secret_...). Si hiciste vercel env pull y el valor empieza con vck_, ese secreto no se descifro."
  );
}

console.log("Para entrar en localhost:");
console.log("  1. Localhost usa la MISMA Auth que produccion. No hay usuarios de prueba aparte.");
console.log(
  "  2. Si en ventorap.cl entras con Google, en Authentication → URL Configuration agrega:"
);
console.log("       http://localhost:3000/auth/callback");
console.log("       http://127.0.0.1:3000/auth/callback");
console.log("     Luego en /login usa Continuar con Google (no el formulario de contrasena).");
console.log(
  "  3. El formulario correo/contrasena solo funciona si esa cuenta tiene password en Auth."
);
console.log("     Muchas cuentas founder solo tienen Google. Invalid_credentials = no es la clave de Auth.");
console.log(
  "  4. Con SERVICE_ROLE_KEY valida puedes definir una clave local con:"
);
console.log(
  "       pnpm run pilot:user:reset-password -- --email tu@correo --password 'elige-una-clave'"
);
console.log("  5. Reinicia pnpm run dev despues de cambiar .env.local (las NEXT_PUBLIC_* van al bundle).");
console.log("");

if (problems.length > 0) {
  console.log("Problemas:");
  for (const problem of problems) {
    console.log(`  - ${problem}`);
  }
  process.exit(1);
}

console.log("Claves de formato OK. Si Google sigue fallando, falta el redirect de localhost en Auth.");
process.exit(0);

#!/usr/bin/env node

import process from "node:process";
import {
  exitWithError,
  loadPilotRuntime,
  resolvePilotOptions,
} from "./pilot-shared.mjs";

const EXTEND_OPTION_MAP = {
  positionals: ["organization-id", "days"],
  env: {
    PILOT_ORGANIZATION_ID: "organization-id",
    PILOT_TRIAL_EXTRA_DAYS: "days",
  },
};

function printHelp() {
  console.log(`
Uso (recomendado con pnpm):
  pnpm pilot:trial:extend --organization-id 12
  pnpm pilot:trial:extend --organization-id 12 --days 7
  pnpm pilot:trial:extend 12 7

Variables de entorno:
  PILOT_ORGANIZATION_ID, PILOT_TRIAL_EXTRA_DAYS

Opciones:
  --dry-run   Muestra el cambio sin escribir en la base

Notas:
  - Por defecto suma 7 dias al trial actual (o desde hoy si ya vencio).
  - No aplica si la cuenta tiene suscripcion pagada activa.
  - Necesitas SUPABASE_SERVICE_ROLE_KEY en .env.local
`);
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

async function runExtend(runtime, options) {
  const organizationId = Number(options["organization-id"]);
  const extraDays = Number(options.days ?? 7);
  const dryRun = options["dry-run"] === "true";

  if (!Number.isInteger(organizationId) || organizationId <= 0) {
    exitWithError("Debes indicar --organization-id valido.");
  }

  if (!Number.isInteger(extraDays) || extraDays <= 0 || extraDays > 30) {
    exitWithError("days debe estar entre 1 y 30.");
  }

  const { data: organization, error: organizationError } = await runtime.supabase
    .from("organizations")
    .select("id, nombre, eliminado_en")
    .eq("id", organizationId)
    .maybeSingle();

  if (organizationError) {
    throw organizationError;
  }

  if (!organization || organization.eliminado_en) {
    exitWithError(`La organizacion ${organizationId} no existe o esta eliminada.`);
  }

  const { data: profile, error: profileError } = await runtime.supabase
    .from("organization_profile")
    .select(
      "organization_id, empresa_nombre, subscription_status, trial_ends_at, plan_code, subscription_ends_at"
    )
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profile) {
    exitWithError("La organizacion no tiene organization_profile.");
  }

  if (
    profile.subscription_status === "active" &&
    profile.subscription_ends_at &&
    new Date(profile.subscription_ends_at).getTime() > Date.now()
  ) {
    exitWithError("La cuenta ya tiene una suscripcion activa pagada.");
  }

  const currentTrialEnd = profile.trial_ends_at
    ? new Date(profile.trial_ends_at)
    : new Date();
  const base =
    currentTrialEnd.getTime() > Date.now() ? currentTrialEnd : new Date();
  const nextTrialEnd = new Date(base);
  nextTrialEnd.setUTCDate(nextTrialEnd.getUTCDate() + extraDays);

  if (dryRun) {
    console.log("[dry-run] Extender trial:");
    console.table([
      {
        organizationId,
        empresa: profile.empresa_nombre ?? organization.nombre,
        trialActual: formatDate(profile.trial_ends_at),
        trialNuevo: formatDate(nextTrialEnd.toISOString()),
        diasSumados: extraDays,
      },
    ]);
    return;
  }

  const { error: updateError } = await runtime.supabase
    .from("organization_profile")
    .update({
      subscription_status: "trial_active",
      plan_code: "trial",
      plan_type: "trial",
      billing_period: "none",
      payment_method: "none",
      trial_ends_at: nextTrialEnd.toISOString(),
      actualizado_en: new Date().toISOString(),
    })
    .eq("organization_id", organizationId);

  if (updateError) {
    throw updateError;
  }

  console.log("OK: trial extendido.");
  console.table([
    {
      organizationId,
      empresa: profile.empresa_nombre ?? organization.nombre,
      trialAnterior: formatDate(profile.trial_ends_at),
      trialHasta: formatDate(nextTrialEnd.toISOString()),
      diasSumados: extraDays,
    },
  ]);
}

async function main() {
  const argv = process.argv.slice(2);
  const options = resolvePilotOptions(argv, EXTEND_OPTION_MAP);

  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    return;
  }

  if (!options["organization-id"]) {
    printHelp();
    process.exitCode = 1;
    return;
  }

  const runtime = loadPilotRuntime(options);
  await runExtend(runtime, options);
}

main().catch((error) => {
  console.error("Fallo el script de extension de trial.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

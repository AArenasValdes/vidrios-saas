import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  buildEvidenceSidecar,
  evidenceSidecarPath,
  type ZetaEvidenceSidecar,
} from "./evidence-sidecar.ts";
import { loadConfirmedRecipes } from "./inventory.ts";
import { EVIDENCE_DIR, repoRelative, ensureDir } from "./paths.ts";

async function writeSidecar(sidecar: ZetaEvidenceSidecar): Promise<string> {
  const absolute = evidenceSidecarPath(sidecar.system, sidecar.recipeId);
  await ensureDir(join(absolute, ".."));
  await writeFile(absolute, `${JSON.stringify(sidecar, null, 2)}\n`, "utf8");
  return repoRelative(absolute);
}

async function writeIndex(sidecars: ZetaEvidenceSidecar[]): Promise<void> {
  const complete = sidecars.filter((item) => item.traceabilityStatus === "complete_1_1");
  const partial = sidecars.filter((item) => item.traceabilityStatus === "partial");
  const blocked = sidecars.filter((item) => item.traceabilityStatus === "blocked");
  const lines = [
    "# Sidecars de evidencia Zeta",
    "",
    "Generado por `pnpm zeta:build-evidence-sidecars`. No modifica `confirmed/`.",
    "",
    "| Estado | Cantidad |",
    "|---|---:|",
    `| complete_1_1 | ${complete.length} |`,
    `| partial | ${partial.length} |`,
    `| blocked | ${blocked.length} |`,
    "",
    "## Registro",
    "",
    ...sidecars.map(
      (item) =>
        `- \`${item.recipeId}\` (${item.system}) → \`${repoRelative(
          evidenceSidecarPath(item.system, item.recipeId),
        )}\` · **${item.traceabilityStatus}** · pendientes: ${item.datosPendientes.length}`,
    ),
    "",
  ];
  await writeFile(join(EVIDENCE_DIR, "INDEX.md"), lines.join("\n"), "utf8");
}

async function main(): Promise<void> {
  const generatedAt = new Date().toISOString();
  const loaded = await loadConfirmedRecipes();
  const sidecars: ZetaEvidenceSidecar[] = [];

  for (const item of loaded) {
    const sidecar = buildEvidenceSidecar({
      recipe: item.recipe,
      confirmedPath: repoRelative(item.filePath),
      confirmedRaw: item.raw as Record<string, unknown>,
      generatedAt,
    });
    const path = await writeSidecar(sidecar);
    sidecars.push(sidecar);
    console.log(`${sidecar.recipeId}: ${sidecar.traceabilityStatus} → ${path}`);
  }

  await writeIndex(sidecars);
  const complete = sidecars.filter((item) => item.traceabilityStatus === "complete_1_1").length;
  const partial = sidecars.filter((item) => item.traceabilityStatus === "partial").length;
  console.log(
    `Sidecars generados: ${sidecars.length} (complete_1_1=${complete}, partial=${partial}, blocked=${sidecars.length - complete - partial})`,
  );
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/scripts/zeta/build-evidence-sidecars.ts")) {
  await main();
}

import { mkdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = resolve(here, "..", "..");
export const ZETA_DOCS = join(REPO_ROOT, "docs", "fabricacion", "zeta");
export const CONFIRMED_DIR = join(ZETA_DOCS, "confirmed");
export const PENDING_DIR = join(ZETA_DOCS, "pending");
export const CONFLICTS_DIR = join(ZETA_DOCS, "conflicts");
export const RAW_DIR = join(ZETA_DOCS, "raw");
export const DERIVED_DIR = join(ZETA_DOCS, "derived");
export const EVIDENCE_DIR = join(ZETA_DOCS, "evidence");
export const RUNS_DIR = join(ZETA_DOCS, "runs");
export const TARGETS_PATH = join(ZETA_DOCS, "targets.json");
export const COVERAGE_PATH = join(ZETA_DOCS, "coverage.json");
export const INDEX_PATH = join(ZETA_DOCS, "INDEX.md");
export const AUDIT_PATH = join(ZETA_DOCS, "AUDIT.md");
export const README_PATH = join(ZETA_DOCS, "README.md");
export const SOURCE_DOC_PATH = join(REPO_ROOT, "docs", "SODAL_LINEA25_ZETA_2026-09-18.md");
export const AUTH_DIR = join(REPO_ROOT, "tmp", "zeta-auth");
export const AUTH_STATE_PATH = join(AUTH_DIR, "storage-state.json");
export const AUTH_PROFILE_DIR = join(AUTH_DIR, "profile");
export const EXTRACT_LOCK_PATH = join(AUTH_DIR, "extract.lock");
export const FIXTURES_DIR = join(here, "fixtures");

export const DEFAULT_EXTRACT_LIMIT = 5;
export const LEGACY_SOURCE_DATE = "2026-09-18T00:00:00.000Z";

export function repoRelative(absolutePath: string): string {
  return relative(REPO_ROOT, absolutePath).replaceAll("\\", "/");
}

export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

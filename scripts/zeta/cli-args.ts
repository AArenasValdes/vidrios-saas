import { DEFAULT_EXTRACT_LIMIT } from "./paths.ts";
import type { CliFlags, RecipeStatus } from "./types.ts";
import { RECIPE_STATUSES } from "./types.ts";

function readValue(flag: string, argv: string[], index: number): { value: string; next: number } {
  if (flag.includes("=")) {
    return { value: flag.slice(flag.indexOf("=") + 1), next: index };
  }
  const nextValue = argv[index + 1];
  if (!nextValue || nextValue.startsWith("--")) {
    throw new Error(`La bandera ${flag} requiere un valor.`);
  }
  return { value: nextValue, next: index + 1 };
}

export function parseCliFlags(argv: string[]): CliFlags {
  const flags: CliFlags = {
    dryRun: false,
    live: false,
    selfCheck: false,
    login: false,
    limit: DEFAULT_EXTRACT_LIMIT,
    includeGeometry: false,
    writeConfirmed: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;

    if (token === "--dry-run") {
      flags.dryRun = true;
      continue;
    }
    if (token === "--live") {
      flags.live = true;
      continue;
    }
    if (token === "--self-check") {
      flags.selfCheck = true;
      continue;
    }
    if (token === "--login") {
      flags.login = true;
      continue;
    }
    if (token === "--include-geometry") {
      flags.includeGeometry = true;
      continue;
    }
    if (token === "--no-write-confirmed") {
      flags.writeConfirmed = false;
      continue;
    }
    const [name] = token.replace(/^--/, "").split("=");
    if (name === "limit") {
      const { value, next } = readValue(token, argv, index);
      flags.limit = Number(value);
      index = next;
      continue;
    }
    if (name === "manufacturer") {
      const { value, next } = readValue(token, argv, index);
      flags.manufacturer = value;
      index = next;
      continue;
    }
    if (name === "system") {
      const { value, next } = readValue(token, argv, index);
      flags.system = value;
      index = next;
      continue;
    }
    if (name === "line") {
      const { value, next } = readValue(token, argv, index);
      flags.line = value;
      index = next;
      continue;
    }
    if (name === "leaves") {
      const { value, next } = readValue(token, argv, index);
      flags.leaves = Number(value);
      index = next;
      continue;
    }
    if (name === "status") {
      const { value, next } = readValue(token, argv, index);
      if (!RECIPE_STATUSES.includes(value as RecipeStatus)) {
        throw new Error(`Estado no soportado: ${value}`);
      }
      flags.status = value as RecipeStatus;
      index = next;
      continue;
    }
    if (name === "compare-confirmed") {
      const { value, next } = readValue(token, argv, index);
      flags.compareConfirmed = value;
      flags.selfCheck = true;
      index = next;
      continue;
    }
  }

  if (!Number.isInteger(flags.limit) || flags.limit < 1) {
    throw new Error("`--limit` debe ser un entero >= 1.");
  }

  return flags;
}

export function matchesFilter(
  flags: Pick<CliFlags, "manufacturer" | "system" | "line" | "leaves" | "status">,
  item: {
    manufacturer: string;
    system: string;
    line: string;
    leaves: number;
    status: string;
  },
): boolean {
  if (flags.manufacturer && flags.manufacturer.toLowerCase() !== item.manufacturer.toLowerCase()) {
    return false;
  }
  if (flags.system && flags.system.toLowerCase() !== item.system.toLowerCase()) {
    return false;
  }
  if (flags.line && flags.line.toLowerCase() !== item.line.toLowerCase()) {
    return false;
  }
  if (flags.leaves != null && flags.leaves !== item.leaves) {
    return false;
  }
  if (flags.status && flags.status !== item.status) {
    return false;
  }
  return true;
}

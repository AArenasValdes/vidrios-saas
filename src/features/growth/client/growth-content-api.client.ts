import type {
  CreateGrowthContentItemInput,
  GrowthContentItem,
  UpdateGrowthContentItemInput,
} from "@/features/growth/types/growth-content";

async function contentFetch<T>(init?: RequestInit): Promise<T> {
  const response = await fetch("/api/admin/marketing/content", {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "No pudimos completar la acción editorial.");
  }

  return payload;
}

export const growthContentApiClient = {
  list() {
    return contentFetch<{ items: GrowthContentItem[] }>().then(({ items }) => items);
  },
  create(input: CreateGrowthContentItemInput) {
    return contentFetch<{ item: GrowthContentItem }>({
      method: "POST",
      body: JSON.stringify(input),
    }).then(({ item }) => item);
  },
  update(input: UpdateGrowthContentItemInput) {
    return contentFetch<{ item: GrowthContentItem }>({
      method: "PATCH",
      body: JSON.stringify(input),
    }).then(({ item }) => item);
  },
};

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  PRODUCT_FEEDBACK_CATEGORIES,
  isProductFeedbackCategory,
  isProductFeedbackStatus,
  type AdminProductFeedbackWorkspace,
  type ProductFeedbackCategory,
  type ProductFeedbackRecord,
  type ProductFeedbackStatus,
} from "@/features/product-feedback/types/product-feedback";

/**
 * Esquema local y acotado para la tabla creada por la migración de sugerencias.
 * El cliente admin compartido todavía no tipa esta tabla nueva.
 */
type AdminProductFeedbackDatabase = {
  __InternalSupabase: { PostgrestVersion: "14.1" };
  public: {
    Tables: {
      product_feedback: {
        Row: {
          id: string;
          organization_id: number;
          auth_user_id: string;
          category: string;
          description: string | null;
          page_path: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: number;
          auth_user_id: string;
          category: ProductFeedbackCategory;
          description?: string | null;
          page_path?: string | null;
          status?: ProductFeedbackStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: number;
          auth_user_id?: string;
          category?: ProductFeedbackCategory;
          description?: string | null;
          page_path?: string | null;
          status?: ProductFeedbackStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organizations: {
        Row: { id: number; nombre: string | null };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type ProductFeedbackRow =
  AdminProductFeedbackDatabase["public"]["Tables"]["product_feedback"]["Row"];
type ProductFeedbackListRow = Pick<
  ProductFeedbackRow,
  | "id"
  | "organization_id"
  | "category"
  | "description"
  | "page_path"
  | "status"
  | "created_at"
  | "updated_at"
>;
type OrganizationRow =
  AdminProductFeedbackDatabase["public"]["Tables"]["organizations"]["Row"];

function createProductFeedbackAdminClient() {
  return createAdminClient() as unknown as SupabaseClient<AdminProductFeedbackDatabase>;
}

const FEEDBACK_PAGE_SIZE = 500;

export async function getAdminProductFeedbackWorkspace(): Promise<AdminProductFeedbackWorkspace> {
  const supabase = createProductFeedbackAdminClient();
  const rows: ProductFeedbackListRow[] = [];

  for (let from = 0; ; from += FEEDBACK_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("product_feedback")
      .select("id, organization_id, category, description, page_path, status, created_at, updated_at")
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + FEEDBACK_PAGE_SIZE - 1);

    if (error) {
      throw new Error("No pudimos consultar las sugerencias.");
    }

    const page: ProductFeedbackListRow[] = data ?? [];
    rows.push(...page);
    if (page.length < FEEDBACK_PAGE_SIZE) break;
  }

  const organizationIds = [...new Set(rows.map((row) => row.organization_id))];
  const organizationsById = new Map<number, string>();

  if (organizationIds.length > 0) {
    const { data: organizations, error } = await supabase
      .from("organizations")
      .select("id, nombre")
      .in("id", organizationIds);

    if (error) {
      throw new Error("No pudimos cargar los talleres de las sugerencias.");
    }

    for (const organization of (organizations ?? []) as OrganizationRow[]) {
      organizationsById.set(organization.id, organization.nombre?.trim() || "Taller sin nombre");
    }
  }

  const validRows = rows.filter(
    (row) => isProductFeedbackCategory(row.category) && isProductFeedbackStatus(row.status)
  );

  const summary = PRODUCT_FEEDBACK_CATEGORIES.map(({ value, label }) => {
    const matchingRows = validRows.filter((row) => row.category === value);
    return {
      category: value,
      label,
      mentions: matchingRows.length,
      workshops: new Set(matchingRows.map((row) => row.organization_id)).size,
    };
  });

  const suggestions: ProductFeedbackRecord[] = validRows.map((row) => ({
    id: row.id,
    organizationName: organizationsById.get(row.organization_id) ?? "Taller sin nombre",
    category: row.category as ProductFeedbackRecord["category"],
    description: row.description,
    pagePath: row.page_path,
    status: row.status as ProductFeedbackStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return { summary, suggestions };
}

export async function updateAdminProductFeedbackStatus(
  id: string,
  status: ProductFeedbackStatus
) {
  const supabase = createProductFeedbackAdminClient();
  const { data, error } = await supabase
    .from("product_feedback")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new Error("No pudimos actualizar el estado de la sugerencia.");
  }
}

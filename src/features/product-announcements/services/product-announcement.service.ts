import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminProductFeedbackWorkspace } from "@/features/product-feedback/services/admin-product-feedback.service";
import {
  isProductAnnouncementCategory,
  type AdminProductAnnouncement,
  type AdminProductAnnouncementWorkspace,
  type ProductAnnouncement,
  type ProductAnnouncementInput,
  type ProductAnnouncementStatus,
} from "@/features/product-announcements/types/product-announcement";

type AnnouncementDatabase = {
  __InternalSupabase: { PostgrestVersion: "14.1" };
  public: {
    Tables: {
      product_announcements: {
        Row: {
          id: string;
          title: string;
          summary: string;
          body: string;
          category: string;
          status: string;
          published_at: string | null;
          action_label: string | null;
          action_href: string | null;
          related_feedback_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          summary: string;
          body: string;
          category: string;
          status?: string;
          published_at?: string | null;
          action_label?: string | null;
          action_href?: string | null;
          related_feedback_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          summary?: string;
          body?: string;
          category?: string;
          status?: string;
          published_at?: string | null;
          action_label?: string | null;
          action_href?: string | null;
          related_feedback_id?: string | null;
          created_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_announcement_reads: {
        Row: {
          announcement_id: string;
          organization_id: number;
          auth_user_id: string;
          read_at: string;
        };
        Insert: {
          announcement_id: string;
          organization_id: number;
          auth_user_id: string;
          read_at?: string;
        };
        Update: {
          announcement_id?: string;
          organization_id?: number;
          auth_user_id?: string;
          read_at?: string;
        };
        Relationships: [];
      };
      product_feedback: {
        Row: { id: string; status: string };
        Insert: { id?: string; status: string };
        Update: { status?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type AnnouncementRow = AnnouncementDatabase["public"]["Tables"]["product_announcements"]["Row"];
type AnnouncementReadRow = AnnouncementDatabase["public"]["Tables"]["product_announcement_reads"]["Row"];

function createAnnouncementAdminClient() {
  return createAdminClient() as unknown as SupabaseClient<AnnouncementDatabase>;
}

async function assertCompletedFeedbackLink(
  relatedFeedbackId: string | null,
  supabase: SupabaseClient<AnnouncementDatabase>
) {
  if (!relatedFeedbackId) return;
  const { data, error } = await supabase
    .from("product_feedback")
    .select("id")
    .eq("id", relatedFeedbackId)
    .eq("status", "done")
    .maybeSingle();
  if (error || !data) {
    throw new Error("Solo puedes asociar una propuesta que ya esté implementada.");
  }
}

function toAdminAnnouncement(row: AnnouncementRow): AdminProductAnnouncement | null {
  if (!isProductAnnouncementCategory(row.category)) return null;
  const status = row.status;
  if (status !== "draft" && status !== "published" && status !== "archived") return null;
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    body: row.body,
    category: row.category,
    status,
    publishedAt: row.published_at,
    actionLabel: row.action_label,
    actionHref: row.action_href,
    relatedFeedbackId: row.related_feedback_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPublishedAnnouncement(
  row: AnnouncementRow,
  isRead: boolean
): ProductAnnouncement | null {
  const adminRecord = toAdminAnnouncement(row);
  if (!adminRecord || adminRecord.status !== "published") return null;
  return {
    id: adminRecord.id,
    title: adminRecord.title,
    summary: adminRecord.summary,
    body: adminRecord.body,
    category: adminRecord.category,
    status: adminRecord.status,
    publishedAt: adminRecord.publishedAt,
    actionLabel: adminRecord.actionLabel,
    actionHref: adminRecord.actionHref,
    isRead,
    createdAt: adminRecord.createdAt,
  };
}

export async function getAdminProductAnnouncementWorkspace(): Promise<AdminProductAnnouncementWorkspace> {
  const supabase = createAnnouncementAdminClient();
  const [{ data, error }, feedbackWorkspace] = await Promise.all([
    supabase
      .from("product_announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
    getAdminProductFeedbackWorkspace(),
  ]);

  if (error) throw new Error("No pudimos cargar las novedades de Ventora.");

  return {
    announcements: ((data ?? []) as AnnouncementRow[])
      .map(toAdminAnnouncement)
      .filter((row): row is AdminProductAnnouncement => Boolean(row)),
    completedSuggestions: feedbackWorkspace.suggestions
      .filter((suggestion) => suggestion.status === "done")
      .map((suggestion) => ({
        id: suggestion.id,
        label: `${suggestion.organizationName} · ${suggestion.description?.slice(0, 90) || "Propuesta implementada"}`,
        description: suggestion.description,
      })),
  };
}

export async function createAdminProductAnnouncement(
  input: ProductAnnouncementInput,
  createdBy: string
) {
  const supabase = createAnnouncementAdminClient();
  await assertCompletedFeedbackLink(input.relatedFeedbackId, supabase);
  const { data, error } = await supabase
    .from("product_announcements")
    .insert({
      title: input.title,
      summary: input.summary,
      body: input.body,
      category: input.category,
      status: "draft",
      action_label: input.actionLabel,
      action_href: input.actionHref,
      related_feedback_id: input.relatedFeedbackId,
      created_by: createdBy,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error("No pudimos guardar el borrador de la novedad.");
  return data.id;
}

export async function updateAdminProductAnnouncement(
  id: string,
  input: ProductAnnouncementInput,
  status: ProductAnnouncementStatus
) {
  const supabase = createAnnouncementAdminClient();
  await assertCompletedFeedbackLink(input.relatedFeedbackId, supabase);
  const { data: existing, error: existingError } = await supabase
    .from("product_announcements")
    .select("published_at")
    .eq("id", id)
    .maybeSingle();
  if (existingError || !existing) throw new Error("No pudimos encontrar la novedad.");

  const update = {
    title: input.title,
    summary: input.summary,
    body: input.body,
    category: input.category,
    action_label: input.actionLabel,
    action_href: input.actionHref,
    related_feedback_id: input.relatedFeedbackId,
    status,
    published_at:
      status === "published"
        ? existing.published_at ?? new Date().toISOString()
        : status === "archived"
          ? existing.published_at
          : null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("product_announcements")
    .update(update)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("No pudimos actualizar la novedad.");
}

async function listPublishedRows() {
  const supabase = createAnnouncementAdminClient();
  const { data, error } = await supabase
    .from("product_announcements")
    .select("*")
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("No pudimos cargar las novedades.");
  return (data ?? []) as AnnouncementRow[];
}

async function listPublishedIds() {
  const supabase = createAnnouncementAdminClient();
  const { data, error } = await supabase
    .from("product_announcements")
    .select("id")
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("No pudimos consultar las novedades.");
  return (data ?? []).map((row) => row.id);
}

async function getUserReadRows(
  announcementIds: string[],
  organizationId: number,
  authUserId: string
): Promise<AnnouncementReadRow[]> {
  if (announcementIds.length === 0) return [];
  const supabase = createAnnouncementAdminClient();
  const { data, error } = await supabase
    .from("product_announcement_reads")
    .select("announcement_id, organization_id, auth_user_id, read_at")
    .eq("organization_id", organizationId)
    .eq("auth_user_id", authUserId)
    .in("announcement_id", announcementIds);
  if (error) throw new Error("No pudimos consultar el estado de lectura.");
  return (data ?? []) as AnnouncementReadRow[];
}

export async function getPublishedProductAnnouncements(
  organizationId: number,
  authUserId: string
) {
  const rows = await listPublishedRows();
  const readRows = await getUserReadRows(
    rows.map((row) => row.id),
    organizationId,
    authUserId
  );
  const readIds = new Set(readRows.map((row) => row.announcement_id));
  const announcements = rows
    .map((row) => toPublishedAnnouncement(row, readIds.has(row.id)))
    .filter((row): row is ProductAnnouncement => Boolean(row));
  return {
    announcements,
    unreadCount: announcements.filter((announcement) => !announcement.isRead).length,
  };
}

export async function getProductAnnouncementUnreadCount(
  organizationId: number,
  authUserId: string
) {
  const announcementIds = await listPublishedIds();
  const readRows = await getUserReadRows(announcementIds, organizationId, authUserId);
  const readIds = new Set(readRows.map((row) => row.announcement_id));
  return announcementIds.filter((id) => !readIds.has(id)).length;
}

export async function markProductAnnouncementRead(
  announcementId: string,
  organizationId: number,
  authUserId: string
) {
  const supabase = createAnnouncementAdminClient();
  const { data: announcement, error: announcementError } = await supabase
    .from("product_announcements")
    .select("id")
    .eq("id", announcementId)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .maybeSingle();
  if (announcementError || !announcement) {
    throw new Error("La novedad no está disponible.");
  }

  const { error } = await supabase
    .from("product_announcement_reads")
    .upsert(
      { announcement_id: announcementId, organization_id: organizationId, auth_user_id: authUserId },
      { onConflict: "announcement_id,organization_id,auth_user_id", ignoreDuplicates: true }
    );
  if (error) throw new Error("No pudimos guardar que leíste esta novedad.");
}

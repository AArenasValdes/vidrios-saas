import { AdminClientDetailWorkspace } from "@/features/admin/components/admin-client-detail-workspace";
import { getAdminClientDetail } from "@/features/admin/services/admin-clients.service";
import { notFound } from "next/navigation";

type AdminClientDetailPageProps = {
  params: Promise<{ organizationId: string }>;
  searchParams: Promise<{ solicitud?: string }>;
};

export default async function AdminClientDetailPage({
  params,
  searchParams,
}: AdminClientDetailPageProps) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const organizationId = Number(resolvedParams.organizationId);

  if (!Number.isInteger(organizationId) || organizationId <= 0) {
    notFound();
  }

  const client = await getAdminClientDetail(organizationId);

  if (!client) {
    notFound();
  }

  return (
    <AdminClientDetailWorkspace
      client={client}
      highlightSolicitudId={resolvedSearch.solicitud ?? null}
    />
  );
}

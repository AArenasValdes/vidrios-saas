import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminClientActions } from "@/features/admin/components/admin-client-actions";
import { AdminClientTestToggle } from "@/features/admin/components/admin-client-test-toggle";
import { ClientStatusBadge } from "@/features/admin/components/client-status-badge";
import { getAdminClientDetail } from "@/features/admin/services/admin-clients.service";
import { getPlanLabel } from "@/features/subscriptions/types/subscription-summary";
import s from "../../admin.module.css";

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatClp(value: number | null) {
  if (!value) {
    return "—";
  }

  return `$${value.toLocaleString("es-CL")}`;
}

type AdminClientDetailPageProps = {
  params: Promise<{
    organizationId: string;
  }>;
};

export default async function AdminClientDetailPage({
  params,
}: AdminClientDetailPageProps) {
  const resolvedParams = await params;
  const organizationId = Number(resolvedParams.organizationId);

  if (!Number.isInteger(organizationId) || organizationId <= 0) {
    notFound();
  }

  const client = await getAdminClientDetail(organizationId);

  if (!client) {
    notFound();
  }

  const displayName =
    client.profile.empresaNombre ?? client.organizationName;

  return (
    <div className={s.page}>
      <header className={s.pageHeader}>
        <div>
          <Link href="/admin/clientes" className={s.backLink}>
            ← Clientes
          </Link>
          <h1 className={s.pageTitle}>
            #{client.organizationId} · {displayName}
          </h1>
          <div className={s.inlineMeta}>
            <ClientStatusBadge status={client.subscription.effectiveStatus} />
            <span className={s.subtle}>
              {getPlanLabel(client.subscription.planCode)}
            </span>
            {client.isTestAccount ? (
              <span className={s.testBadge}>Cuenta de prueba</span>
            ) : null}
          </div>
        </div>

        <div className={s.quickLinks}>
          {client.quickLinks.publicPageUrl ? (
            <Link href={client.quickLinks.publicPageUrl} className={s.secondaryLink}>
              Página pública
            </Link>
          ) : null}
          {client.quickLinks.whatsappUrl ? (
            <Link href={client.quickLinks.whatsappUrl} className={s.secondaryLink}>
              WhatsApp
            </Link>
          ) : null}
        </div>
      </header>

      <div className={s.detailGrid}>
        <section className={s.panel}>
          <h2 className={s.panelTitle}>Tipo de cuenta</h2>
          <AdminClientTestToggle
            organizationId={client.organizationId}
            initialIsTestAccount={client.isTestAccount}
          />
        </section>

        <section className={s.panel}>
          <h2 className={s.panelTitle}>Acciones</h2>
          <AdminClientActions
            organizationId={client.organizationId}
            empresaNombre={displayName}
          />
        </section>
      </div>

      <div className={s.detailGrid}>
        <section className={s.panel}>
          <h2 className={s.panelTitle}>Suscripción</h2>
          <div className={s.detailList}>
            <div className={s.detailRow}>
              <span className={s.label}>Trial hasta</span>
              <span className={s.value}>
                {formatDate(client.subscription.trialEndsAt)}
              </span>
            </div>
            <div className={s.detailRow}>
              <span className={s.label}>Activo hasta</span>
              <span className={s.value}>
                {formatDate(client.subscription.subscriptionEndsAt)}
              </span>
            </div>
            <div className={s.detailRow}>
              <span className={s.label}>Último pago</span>
              <span className={s.value}>
                {formatDate(client.subscription.lastPaymentAt)}
              </span>
            </div>
          </div>
        </section>
      </div>

      <div className={s.detailGrid}>
        <section className={s.panel}>
          <h2 className={s.panelTitle}>Contacto</h2>
          <div className={s.detailList}>
            <div className={s.detailRow}>
              <span className={s.label}>Correo principal</span>
              <span className={s.value}>
                {client.principalUser?.correo ??
                  client.profile.empresaEmail ??
                  client.organizationEmail ??
                  "—"}
              </span>
            </div>
            <div className={s.detailRow}>
              <span className={s.label}>Teléfono</span>
              <span className={s.value}>
                {client.profile.empresaTelefono ??
                  client.organizationPhone ??
                  "—"}
              </span>
            </div>
            <div className={s.detailRow}>
              <span className={s.label}>Slug público</span>
              <span className={s.value}>
                {client.profile.solicitudPublicaSlug ?? "No configurado"}
              </span>
            </div>
          </div>
        </section>

        <section className={s.panel}>
          <h2 className={s.panelTitle}>Pagos</h2>
          {client.payments.length === 0 ? (
            <p className={s.muted}>Sin pagos registrados.</p>
          ) : (
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {client.payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{getPlanLabel(payment.planCode)}</td>
                      <td>{formatClp(payment.amountClp)}</td>
                      <td>{payment.status}</td>
                      <td>{formatDate(payment.paidAt ?? payment.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

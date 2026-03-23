import type { CotizacionWorkflowRecord } from "@/types/cotizacion-workflow";

export type CotizacionAlertKind = "aprobada" | "rechazada" | "vista";

export type CotizacionAlert = {
  id: string;
  cotizacionId: string;
  codigo: string;
  href: string;
  kind: CotizacionAlertKind;
  title: string;
  message: string;
  occurredAt: string;
};

type BuildCotizacionAlertsOptions = {
  now?: Date;
  recentResponseDays?: number;
  limit?: number;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_RECENT_RESPONSE_DAYS = 21;

function getTimestamp(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function isRecent(value: string, now: Date, maxAgeDays: number) {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return false;
  }

  return now.getTime() - timestamp <= maxAgeDays * MS_PER_DAY;
}

function buildAlertFromRecord(
  record: CotizacionWorkflowRecord,
  now: Date,
  recentResponseDays: number
): CotizacionAlert | null {
  if (record.estado === "aprobada" && record.clienteRespondioEn) {
    if (!isRecent(record.clienteRespondioEn, now, recentResponseDays)) {
      return null;
    }

    return {
      id: `aprobada-${record.id}`,
      cotizacionId: record.id,
      codigo: record.codigo,
      href: `/cotizaciones/${record.id}`,
      kind: "aprobada",
      title: "Cotizacion aprobada",
      message: `${record.clienteNombre} acepto ${record.codigo}${record.obra ? ` para ${record.obra}` : ""}.`,
      occurredAt: record.clienteRespondioEn,
    };
  }

  if (record.estado === "rechazada" && record.clienteRespondioEn) {
    if (!isRecent(record.clienteRespondioEn, now, recentResponseDays)) {
      return null;
    }

    return {
      id: `rechazada-${record.id}`,
      cotizacionId: record.id,
      codigo: record.codigo,
      href: `/cotizaciones/${record.id}`,
      kind: "rechazada",
      title: "Cotizacion rechazada",
      message: `${record.clienteNombre} rechazo ${record.codigo}${record.obra ? ` para ${record.obra}` : ""}.`,
      occurredAt: record.clienteRespondioEn,
    };
  }

  if (record.clienteVioEn && !record.clienteRespondioEn) {
    return {
      id: `vista-${record.id}`,
      cotizacionId: record.id,
      codigo: record.codigo,
      href: `/cotizaciones/${record.id}`,
      kind: "vista",
      title: "Cotizacion vista sin respuesta",
      message: `${record.clienteNombre} abrio ${record.codigo} y aun no responde.`,
      occurredAt: record.clienteVioEn,
    };
  }

  return null;
}

export function buildCotizacionAlerts(
  records: CotizacionWorkflowRecord[],
  options: BuildCotizacionAlertsOptions = {}
) {
  const now = options.now ?? new Date();
  const recentResponseDays =
    options.recentResponseDays ?? DEFAULT_RECENT_RESPONSE_DAYS;
  const limit = options.limit ?? Number.POSITIVE_INFINITY;
  const alerts: CotizacionAlert[] = [];

  for (const record of records) {
    const alert = buildAlertFromRecord(record, now, recentResponseDays);

    if (!alert) {
      continue;
    }

    const alertTimestamp = getTimestamp(alert.occurredAt);
    let insertIndex = alerts.findIndex(
      (currentAlert) => alertTimestamp > getTimestamp(currentAlert.occurredAt)
    );

    if (insertIndex === -1) {
      insertIndex = alerts.length;
    }

    alerts.splice(insertIndex, 0, alert);

    if (alerts.length > limit) {
      alerts.pop();
    }
  }

  return alerts;
}

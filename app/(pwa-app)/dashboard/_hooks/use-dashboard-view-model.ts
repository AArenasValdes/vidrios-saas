"use client";

import { useMemo } from "react";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { resolveCotizacionWorkflowState } from "@/features/cotizaciones/services/cotizacion-display-state.service";
import { formatCotizacionDate } from "@/features/cotizaciones/services/cotizaciones-workflow.service";
import { hasMeaningfulMonthlyTrend } from "@/features/dashboard/services/dashboard-monthly-totals.service";
import {
  resolvePendingSendAction,
  type DashboardPendingSendAction,
} from "@/features/dashboard/services/dashboard-pending-send.service";
import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import { useDashboardSummary } from "./use-dashboard-summary";

export type DashboardQuoteStateColor = "success" | "warning" | "destructive" | "neutral" | "info";

export type DashboardQuoteCard = {
  id: string;
  href: string;
  name: string;
  code: string;
  amount: string;
  date: string;
  stateLabel: string;
  stateColor: DashboardQuoteStateColor;
  onPrefetchDetail?: () => void;
};

export type DashboardPendingSendRow = {
  id: string;
  href: string;
  pdfHref: string;
  clientName: string;
  obra: string;
  amount: string;
  amountValue: number;
  date: string;
  stateLabel: string;
  stateColor: DashboardQuoteStateColor;
  action: DashboardPendingSendAction;
  actionLabel: string;
  clientPhone: string;
  approvalToken: string | null;
  codigo: string;
};

export type DashboardMonthlyTrendPoint = {
  key: string;
  label: string;
  total: number;
  totalLabel: string;
};

export type DashboardResponseItem = {
  id: string;
  href: string;
  kind: "aprobada" | "rechazada";
  title: string;
  message: string;
};

export type DashboardMobileProps = {
  greetingLabel: string;
  greetingName: string;
  mobileDateLabel: string;
  newQuoteHref: string;
  summaryHref: string;
  summaryTitle: string;
  summarySubtitle: string;
  quotedTotalLabel: string;
  totalCount: number;
  pdfGeneratedCount: number;
  approvedCount: number;
  approvedTodayCount: number;
  monthCount: number;
  quotesHref: string;
  quoteCards: DashboardQuoteCard[];
  responseAlerts: Array<{ href: string; title: string }>;
  isLoading: boolean;
  isEmpty: boolean;
};

export type DashboardDesktopProps = {
  greetingLabel: string;
  greetingName: string;
  subtitle: string;
  companyName: string;
  companyInitials: string;
  periodLabel: string;
  newQuoteHref: string;
  quotesHref: string;
  pendingSendHref: string;
  quotedMonthTotalLabel: string;
  approvedTotalLabel: string;
  pdfGeneratedCount: number;
  approvedCount: number;
  monthCount: number;
  pendingSendCount: number;
  monthlyTrend: DashboardMonthlyTrendPoint[];
  hasMonthlyTrend: boolean;
  pendingSendRows: DashboardPendingSendRow[];
  recentQuoteCards: DashboardQuoteCard[];
  responseItems: DashboardResponseItem[];
  responseAlertCount: number;
  isLoading: boolean;
  isEmpty: boolean;
  hasPendingSend: boolean;
};

export type DashboardViewModel = {
  mobile: DashboardMobileProps;
  desktop: DashboardDesktopProps;
};

function formatClp(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMobileDateLabel(value: string) {
  const normalized = value.replace(",", " -");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getChileHour(date = new Date()) {
  const hour = new Intl.DateTimeFormat("es-CL", {
    hour: "numeric",
    hour12: false,
    timeZone: "America/Santiago",
  }).format(date);

  return Number.parseInt(hour, 10);
}

function getGreetingLabel(date = new Date()) {
  const chileHour = getChileHour(date);

  return chileHour >= 12 ? "Buenas tardes" : "Buenos días";
}

function mapDisplayStateToColor(cls: string): DashboardQuoteStateColor {
  if (cls === "stAprobada") return "success";
  if (cls === "stRechazada") return "destructive";
  if (cls === "stTerminada" || cls === "stCreada" || cls === "stSinCierre") return "neutral";
  if (cls === "stPdfGenerado" || cls === "stEnviada") return "info";
  return "warning";
}

function resolvePersonName(input: {
  email?: string | null;
  companyName: string;
}) {
  const emailLocal = input.email?.split("@")[0]?.trim() ?? "";
  if (emailLocal) {
    const cleaned = emailLocal.replace(/[._-]+/g, " ").trim();
    const first = cleaned.split(/\s+/)[0] ?? "";
    if (first.length >= 2) {
      return first.charAt(0).toUpperCase() + first.slice(1);
    }
  }
  return input.companyName;
}

function buildInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "VE";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function useDashboardViewModel(): DashboardViewModel {
  const { organizacionId, user } = useAuth();
  const { profile } = useOrganizationProfile();
  const dashboardSummary = useDashboardSummary(organizacionId);

  const companyName = profile?.empresaNombre?.trim() || "Mi empresa";
  const greetingLabel = useMemo(() => getGreetingLabel(), []);
  const greetingName = useMemo(
    () => resolvePersonName({ email: user?.email, companyName }),
    [companyName, user?.email]
  );
  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("es-CL", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date()),
    []
  );
  const subtitle = "Resumen comercial de tu taller.";
  const mobileDateLabel = formatMobileDateLabel(todayLabel);
  const quotedTotalLabel = formatClp(dashboardSummary.quotedTotal);
  const quotedMonthTotalLabel = formatClp(dashboardSummary.quotedMonthTotal);
  const approvedTotalLabel = formatClp(dashboardSummary.approvedTotal);
  const summaryTitle = "Valor cotizado";
  const summarySubtitle = `${dashboardSummary.totalCount} cotizacion${
    dashboardSummary.totalCount === 1 ? "" : "es"
  } · ${dashboardSummary.pdfGeneratedCount} PDF${
    dashboardSummary.pdfGeneratedCount === 1 ? "" : "s"
  } · ${dashboardSummary.approvedCount} aprobada${
    dashboardSummary.approvedCount === 1 ? "" : "s"
  }`;

  const quoteCards = useMemo<DashboardQuoteCard[]>(() => {
    return [...dashboardSummary.recentRecords]
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      .slice(0, 3)
      .map((record) => {
        const displayState = resolveCotizacionWorkflowState({
          estado: record.estado,
          pdfDescargadoEn: record.pdfDescargadoEn,
        });

        return {
          id: record.id,
          href: `/cotizaciones/${record.id}`,
          name: record.clienteNombre || "Cliente",
          code: record.codigo,
          amount: formatClp(record.total ?? 0),
          date: formatCotizacionDate(record.updatedAt),
          stateLabel: displayState.label.toUpperCase(),
          stateColor: mapDisplayStateToColor(displayState.cls),
        };
      });
  }, [dashboardSummary.recentRecords]);

  const recentQuoteCards = useMemo<DashboardQuoteCard[]>(() => {
    return [...dashboardSummary.recentRecords]
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      .slice(0, 5)
      .map((record) => {
        const displayState = resolveCotizacionWorkflowState({
          estado: record.estado,
          pdfDescargadoEn: record.pdfDescargadoEn,
        });

        return {
          id: record.id,
          href: `/cotizaciones/${record.id}`,
          name: record.clienteNombre || "Cliente",
          code: record.codigo,
          amount: formatClp(record.total ?? 0),
          date: formatCotizacionDate(record.updatedAt),
          stateLabel: displayState.label,
          stateColor: mapDisplayStateToColor(displayState.cls),
        };
      });
  }, [dashboardSummary.recentRecords]);

  const pendingSendRows = useMemo<DashboardPendingSendRow[]>(() => {
    return dashboardSummary.pendingSendRecords.slice(0, 6).map((record) => {
      const displayState = resolveCotizacionWorkflowState({
        estado: record.estado,
        pdfDescargadoEn: record.pdfDescargadoEn,
      });
      const action = resolvePendingSendAction({
        pdfDescargadoEn: record.pdfDescargadoEn,
      });

      return {
        id: record.id,
        href: `/cotizaciones/${record.id}`,
        pdfHref: `/print/cotizaciones/${record.id}`,
        clientName: record.clienteNombre || "Cliente",
        obra: record.obra || "Cotización",
        amount: formatClp(record.total ?? 0),
        amountValue: record.total ?? 0,
        date: formatCotizacionDate(record.updatedAt),
        stateLabel: displayState.label,
        stateColor: mapDisplayStateToColor(displayState.cls),
        action,
        actionLabel: action === "pdf" ? "Generar PDF" : "Enviar por WhatsApp",
        clientPhone: record.clienteTelefono ?? "",
        approvalToken: record.approvalToken ?? null,
        codigo: record.codigo,
      };
    });
  }, [dashboardSummary.pendingSendRecords]);

  const monthlyTrend = useMemo<DashboardMonthlyTrendPoint[]>(() => {
    return dashboardSummary.monthlyQuotedTotals.map((point) => ({
      key: point.key,
      label: point.label,
      total: point.total,
      totalLabel: formatClp(point.total),
    }));
  }, [dashboardSummary.monthlyQuotedTotals]);

  const responseItems = useMemo<DashboardResponseItem[]>(() => {
    return dashboardSummary.alerts
      .filter(
        (alert): alert is typeof alert & { kind: "aprobada" | "rechazada" } =>
          alert.kind === "aprobada" || alert.kind === "rechazada"
      )
      .slice(0, 4)
      .map((alert) => ({
        id: alert.id,
        href: alert.href,
        kind: alert.kind,
        title: alert.title,
        message: alert.message,
      }));
  }, [dashboardSummary.alerts]);

  const responseAlerts = useMemo(
    () =>
      dashboardSummary.alerts.map((alert) => ({
        href: alert.href,
        title: alert.title,
      })),
    [dashboardSummary.alerts]
  );

  const isLoading = dashboardSummary.isLoading && dashboardSummary.recentRecords.length === 0;
  const isEmpty = !isLoading && dashboardSummary.isReady && dashboardSummary.totalCount === 0;
  const hasPendingSend = pendingSendRows.length > 0;

  return {
    mobile: {
      greetingLabel,
      greetingName: companyName,
      mobileDateLabel,
      newQuoteHref: "/cotizaciones/nueva",
      summaryHref: "/cotizaciones",
      summaryTitle,
      summarySubtitle,
      quotedTotalLabel,
      totalCount: dashboardSummary.totalCount,
      pdfGeneratedCount: dashboardSummary.pdfGeneratedCount,
      approvedCount: dashboardSummary.approvedCount,
      approvedTodayCount: dashboardSummary.approvedTodayCount,
      monthCount: dashboardSummary.monthCount,
      quotesHref: "/cotizaciones",
      quoteCards,
      responseAlerts,
      isLoading: isLoading || !dashboardSummary.isReady,
      isEmpty: !isLoading && dashboardSummary.isReady && quoteCards.length === 0,
    },
    desktop: {
      greetingLabel,
      greetingName,
      subtitle,
      companyName,
      companyInitials: buildInitials(companyName),
      periodLabel: "Este mes",
      newQuoteHref: "/cotizaciones/nueva",
      quotesHref: "/cotizaciones",
      pendingSendHref: "/cotizaciones",
      quotedMonthTotalLabel,
      approvedTotalLabel,
      pdfGeneratedCount: dashboardSummary.pdfGeneratedCount,
      approvedCount: dashboardSummary.approvedCount,
      monthCount: dashboardSummary.monthCount,
      pendingSendCount: dashboardSummary.pendingSendRecords.length,
      monthlyTrend,
      hasMonthlyTrend: hasMeaningfulMonthlyTrend(dashboardSummary.monthlyQuotedTotals),
      pendingSendRows,
      recentQuoteCards,
      responseItems,
      responseAlertCount: responseItems.length,
      isLoading: isLoading || !dashboardSummary.isReady,
      isEmpty,
      hasPendingSend,
    },
  };
}

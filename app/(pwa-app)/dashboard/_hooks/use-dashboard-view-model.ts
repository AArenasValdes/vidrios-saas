"use client";

import { useMemo } from "react";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { resolveCotizacionWorkflowState } from "@/features/cotizaciones/services/cotizacion-display-state.service";
import { formatCotizacionDate } from "@/features/cotizaciones/services/cotizaciones-workflow.service";
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
  newQuoteHref: string;
  quotedTotalLabel: string;
  totalCount: number;
  pdfGeneratedCount: number;
  approvedCount: number;
  monthCount: number;
  approvedTodayCount: number;
  quotesHref: string;
  quoteCards: DashboardQuoteCard[];
  isLoading: boolean;
  isEmpty: boolean;
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

function mapDisplayStateToColor(
  cls: string
): DashboardQuoteStateColor {
  if (cls === "stAprobada") return "success";
  if (cls === "stRechazada") return "destructive";
  if (cls === "stTerminada" || cls === "stCreada" || cls === "stSinCierre") return "neutral";
  if (cls === "stPdfGenerado" || cls === "stEnviada") return "info";
  return "warning";
}

export function useDashboardViewModel(): DashboardViewModel {
  const { organizacionId } = useAuth();
  const { profile } = useOrganizationProfile();
  const dashboardSummary = useDashboardSummary(organizacionId);

  const companyName = profile?.empresaNombre?.trim() || "Mi empresa";
  const greetingLabel = useMemo(() => getGreetingLabel(), []);
  const greetingName = companyName;
  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("es-CL", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date()),
    []
  );
  const subtitle = `${todayLabel} - ${companyName}`;
  const mobileDateLabel = formatMobileDateLabel(todayLabel);
  const quotedTotalLabel = formatClp(dashboardSummary.quotedTotal);
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

  const responseAlerts = useMemo(
    () =>
      dashboardSummary.alerts.map((alert) => ({
        href: alert.href,
        title: alert.title,
      })),
    [dashboardSummary.alerts]
  );

  const isLoading = dashboardSummary.isLoading && dashboardSummary.recentRecords.length === 0;
  const isEmpty = !isLoading && dashboardSummary.isReady && quoteCards.length === 0;

  return {
    mobile: {
      greetingLabel,
      greetingName,
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
      isEmpty,
    },
    desktop: {
      greetingLabel,
      greetingName,
      subtitle,
      newQuoteHref: "/cotizaciones/nueva",
      quotedTotalLabel,
      totalCount: dashboardSummary.totalCount,
      pdfGeneratedCount: dashboardSummary.pdfGeneratedCount,
      approvedCount: dashboardSummary.approvedCount,
      monthCount: dashboardSummary.monthCount,
      approvedTodayCount: dashboardSummary.approvedTodayCount,
      quotesHref: "/cotizaciones",
      quoteCards,
      isLoading: isLoading || !dashboardSummary.isReady,
      isEmpty,
    },
  };
}

"use client";

import { useMemo } from "react";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { formatCotizacionDate } from "@/features/cotizaciones/services/cotizaciones-workflow.service";
import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import { useDashboardSummary } from "./use-dashboard-summary";

export type DashboardQuoteStateColor = "success" | "warning" | "destructive";

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
  greetingName: string;
  mobileDateLabel: string;
  newQuoteHref: string;
  attentionHref: string;
  attentionTitle: string;
  totalCount: number;
  approvedTodayCount: number;
  monthCount: number;
  approvedMonthLabel: string;
  quotesHref: string;
  quoteCards: DashboardQuoteCard[];
  isLoading: boolean;
  isEmpty: boolean;
};

export type DashboardDesktopProps = {
  greetingName: string;
  subtitle: string;
  newQuoteHref: string;
  pendingCount: number;
  monthCount: number;
  approvedTodayCount: number;
  approvedMonthLabel: string;
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

function buildUserName(email: string | null | undefined) {
  const base = email?.split("@")[0]?.replace(/[._-]+/g, " ").trim();

  if (!base) return "admin";
  if (base.toLowerCase() === "admin") return "admin";

  return base.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMobileDateLabel(value: string) {
  const normalized = value.replace(",", " -");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function useDashboardViewModel(): DashboardViewModel {
  const { user, organizacionId } = useAuth();
  const { profile } = useOrganizationProfile();
  const dashboardSummary = useDashboardSummary(organizacionId);

  const companyName = profile?.empresaNombre?.trim() || "Mi empresa";
  const greetingName = buildUserName(user?.email) || companyName;
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
  const hasSeguimiento = dashboardSummary.alerts.some((a) => a.kind === "seguimiento");

  const attentionHref = dashboardSummary.alerts[0]?.href ?? "/cotizaciones?estado=pendientes";
  const attentionTitle = hasSeguimiento
    ? "Hay clientes esperando seguimiento"
    : dashboardSummary.alerts.length > 0
      ? `${dashboardSummary.alerts.length} respuesta${
          dashboardSummary.alerts.length === 1 ? "" : "s"
        } por revisar`
      : `${dashboardSummary.pendingCount} presupuesto${
          dashboardSummary.pendingCount === 1 ? "" : "s"
        } pendiente${dashboardSummary.pendingCount === 1 ? "" : "s"}`;

  const quoteCards = useMemo<DashboardQuoteCard[]>(() => {
    return [...dashboardSummary.recentRecords]
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      .slice(0, 3)
      .map((record) => {
        let stateLabel = "PENDIENTE";
        let stateColor: DashboardQuoteStateColor = "warning";

        if (record.estado === "aprobada") {
          stateLabel = "APROBADA";
          stateColor = "success";
        } else if (record.estado === "rechazada") {
          stateLabel = "RECHAZADA";
          stateColor = "destructive";
        }

        return {
          id: record.id,
          href: `/cotizaciones/${record.id}`,
          name: record.clienteNombre || "Cliente",
          code: record.codigo,
          amount: formatClp(record.total ?? 0),
          date: formatCotizacionDate(record.updatedAt),
          stateLabel,
          stateColor,
        };
      });
  }, [dashboardSummary.recentRecords]);

  const approvedMonthLabel = formatClp(dashboardSummary.approvedMonthTotal);
  const isLoading = dashboardSummary.isLoading && dashboardSummary.recentRecords.length === 0;
  const isEmpty = !isLoading && dashboardSummary.isReady && quoteCards.length === 0;

  return {
    mobile: {
      greetingName,
      mobileDateLabel,
      newQuoteHref: "/cotizaciones/nueva",
      attentionHref,
      attentionTitle,
      totalCount: dashboardSummary.totalCount,
      approvedTodayCount: dashboardSummary.approvedTodayCount,
      monthCount: dashboardSummary.monthCount,
      approvedMonthLabel,
      quotesHref: "/cotizaciones",
      quoteCards,
      isLoading: isLoading || !dashboardSummary.isReady,
      isEmpty,
    },
    desktop: {
      greetingName,
      subtitle,
      newQuoteHref: "/cotizaciones/nueva",
      pendingCount: dashboardSummary.pendingCount,
      monthCount: dashboardSummary.monthCount,
      approvedTodayCount: dashboardSummary.approvedTodayCount,
      approvedMonthLabel,
      quotesHref: "/cotizaciones",
      quoteCards,
      isLoading: isLoading || !dashboardSummary.isReady,
      isEmpty,
    },
  };
}

"use client";

import { useMemo } from "react";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useCotizacionesStore } from "@/features/cotizaciones/hooks/useCotizacionesStore";
import { buildCotizacionAlerts } from "@/features/cotizaciones/services/cotizacion-alerts.service";
import { formatCotizacionDate } from "@/features/cotizaciones/services/cotizaciones-workflow.service";
import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";

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
};

export type DashboardMobileProps = {
  greetingName: string;
  mobileDateLabel: string;
  newQuoteHref: string;
  attentionHref: string;
  attentionTitle: string;
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
  const { user } = useAuth();
  const { profile } = useOrganizationProfile();
  const { cotizaciones, isReady, isRefreshing } = useCotizacionesStore();

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

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const pendingQuotes = cotizaciones.filter((record) =>
      ["creada", "borrador", "enviada"].includes(record.estado)
    );
    const monthQuotes = cotizaciones.filter((record) => {
      const date = new Date(record.updatedAt);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    const approvedToday = cotizaciones.filter((record) => {
      if (record.estado !== "aprobada") return false;
      const date = new Date(record.updatedAt);
      return date.toDateString() === now.toDateString();
    });
    const approvedThisMonth = cotizaciones.filter((record) => {
      if (record.estado !== "aprobada") return false;
      const date = new Date(record.updatedAt);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    return {
      pendingCount: pendingQuotes.length,
      monthCount: monthQuotes.length,
      approvedTodayCount: approvedToday.length,
      totalApproved: approvedThisMonth.reduce((sum, record) => sum + record.total, 0),
    };
  }, [cotizaciones]);

  const alerts = useMemo(() => buildCotizacionAlerts(cotizaciones, { limit: 3 }), [cotizaciones]);
  const hasSeguimiento = alerts.some((a) => a.kind === "seguimiento");

  const attentionHref = alerts[0]?.href ?? "/cotizaciones?estado=pendientes";
  const attentionTitle = hasSeguimiento
    ? "Hay clientes esperando seguimiento"
    : alerts.length > 0
      ? `${alerts.length} respuesta${alerts.length === 1 ? "" : "s"} por revisar`
      : `${stats.pendingCount} presupuesto${stats.pendingCount === 1 ? "" : "s"} pendiente${
          stats.pendingCount === 1 ? "" : "s"
        }`;

  const quoteCards = useMemo<DashboardQuoteCard[]>(() => {
    return [...cotizaciones]
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      )
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
  }, [cotizaciones]);

  const approvedMonthLabel = formatClp(stats.totalApproved);
  const isLoading = isRefreshing && cotizaciones.length === 0;
  const isEmpty = !isLoading && isReady && quoteCards.length === 0;

  return {
    mobile: {
      greetingName,
      mobileDateLabel,
      newQuoteHref: "/cotizaciones/nueva",
      attentionHref,
      attentionTitle,
      approvedTodayCount: stats.approvedTodayCount,
      monthCount: stats.monthCount,
      approvedMonthLabel,
      quotesHref: "/cotizaciones",
      quoteCards,
      isLoading: isLoading || !isReady,
      isEmpty,
    },
    desktop: {
      greetingName,
      subtitle,
      newQuoteHref: "/cotizaciones/nueva",
      pendingCount: stats.pendingCount,
      monthCount: stats.monthCount,
      approvedTodayCount: stats.approvedTodayCount,
      approvedMonthLabel,
      quotesHref: "/cotizaciones",
      quoteCards,
      isLoading: isLoading || !isReady,
      isEmpty,
    },
  };
}

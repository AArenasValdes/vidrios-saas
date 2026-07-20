"use client";

import { memo, useState } from "react";

import type { DashboardMonthlyTrendPoint } from "../../_hooks/use-dashboard-view-model";
import styles from "./page.desktop.module.css";

type DashboardMonthlyTrendChartProps = {
  points: DashboardMonthlyTrendPoint[];
  hasData: boolean;
};

export const DashboardMonthlyTrendChart = memo(function DashboardMonthlyTrendChart({
  points,
  hasData,
}: DashboardMonthlyTrendChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (!hasData || points.length === 0) {
    return (
      <div className={styles.chartEmpty}>
        <p className={styles.chartEmptyTitle}>Sin historial suficiente</p>
        <p className={styles.chartEmptySub}>
          El gráfico aparece cuando hay cotizaciones en los últimos meses.
        </p>
      </div>
    );
  }

  const maxTotal = Math.max(...points.map((point) => point.total), 1);
  const lastIndex = points.length - 1;
  const tooltipPoint = activeIndex === null ? null : points[activeIndex] ?? null;
  const tooltipLeft =
    activeIndex === null
      ? "50%"
      : `clamp(52px, ${((activeIndex + 0.5) / points.length) * 100}%, calc(100% - 52px))`;

  return (
    <div
      className={styles.chartWrap}
      onMouseLeave={() => {
        setActiveIndex(null);
      }}
    >
      <div className={styles.chartHeader}>
        <div>
          <span className={styles.chartLabel}>Valor cotizado por mes</span>
          <span className={styles.chartHint}>Últimos 6 meses</span>
        </div>
      </div>
      <div
        className={styles.chartBars}
        role="img"
        aria-label="Valor cotizado durante los últimos seis meses"
      >
        {points.map((point, index) => {
          const isCurrent = index === lastIndex;
          const heightPercent =
            point.total > 0 ? Math.max(8, (point.total / maxTotal) * 100) : 2;

          return (
            <div
              key={point.key}
              className={styles.chartBarColumn}
              tabIndex={0}
              aria-label={`${point.label}: ${point.totalLabel}`}
              onMouseEnter={() => {
                setActiveIndex(index);
              }}
              onFocus={() => {
                setActiveIndex(index);
              }}
              onBlur={() => {
                setActiveIndex(null);
              }}
            >
              <span className={styles.chartBarValue}>
                {isCurrent && activeIndex !== index ? point.totalLabel : ""}
              </span>
              <span className={styles.chartBarTrack} aria-hidden>
                <span
                  className={`${styles.chartBar}${
                    isCurrent ? ` ${styles.chartBarCurrent}` : ""
                  }`}
                  style={{
                    height: `${heightPercent}%`,
                    animationDelay: `${index * 35}ms`,
                  }}
                />
              </span>
              <span
                className={`${styles.chartMonth}${
                  isCurrent ? ` ${styles.chartMonthCurrent}` : ""
                }`}
              >
                {point.label}
              </span>
            </div>
          );
        })}
        {tooltipPoint ? (
          <div className={styles.chartTooltip} style={{ left: tooltipLeft }}>
            <span className={styles.chartTooltipLabel}>{tooltipPoint.label}</span>
            {tooltipPoint.totalLabel}
          </div>
        ) : null}
      </div>
    </div>
  );
});

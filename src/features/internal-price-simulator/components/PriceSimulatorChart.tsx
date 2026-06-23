"use client";

import { useId, useMemo } from "react";

import type { PriceSimulatorChartPoint } from "@/features/internal-price-simulator/types/price-simulator.types";
import { formatCurrency } from "@/utils/formatCurrency";

import s from "./internal-price-simulator-page.module.css";

type Props = {
  points: PriceSimulatorChartPoint[];
  minPricePerM2: number;
  maxPricePerM2: number;
  optimumPricePerM2: number;
  optimumUtility: number;
};

const VIEWBOX_WIDTH = 640;
const VIEWBOX_HEIGHT = 280;
const PADDING = { top: 24, right: 20, bottom: 44, left: 56 };

function formatAxisCurrency(value: number) {
  if (!Number.isFinite(value)) {
    return "$0";
  }

  const abs = Math.abs(value);

  if (abs >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }

  if (abs >= 1_000) {
    return `$${Math.round(value / 1_000)}k`;
  }

  return formatCurrency(value);
}

export function PriceSimulatorChart({
  points,
  minPricePerM2,
  maxPricePerM2,
  optimumPricePerM2,
  optimumUtility,
}: Props) {
  const gradientId = useId();
  const chart = useMemo(() => {
    if (points.length < 2) {
      return null;
    }

    const plotWidth = VIEWBOX_WIDTH - PADDING.left - PADDING.right;
    const plotHeight = VIEWBOX_HEIGHT - PADDING.top - PADDING.bottom;
    const utilities = points.map((point) => point.utility);
    const minUtility = Math.min(0, ...utilities);
    const maxUtility = Math.max(...utilities);
    const utilitySpan = maxUtility - minUtility || 1;

    const toX = (pricePerM2: number) =>
      PADDING.left +
      ((pricePerM2 - minPricePerM2) / (maxPricePerM2 - minPricePerM2 || 1)) *
        plotWidth;

    const toY = (utility: number) =>
      PADDING.top +
      plotHeight -
      ((utility - minUtility) / utilitySpan) * plotHeight;

    const polyline = points
      .map((point) => `${toX(point.pricePerM2)},${toY(point.utility)}`)
      .join(" ");

    const optimumX = toX(optimumPricePerM2);
    const optimumY = toY(optimumUtility);
    const zeroY = toY(0);

    const yTicks = [minUtility, minUtility + utilitySpan / 2, maxUtility];
    const xTicks = [
      minPricePerM2,
      (minPricePerM2 + maxPricePerM2) / 2,
      maxPricePerM2,
    ];

    return {
      polyline,
      optimumX,
      optimumY,
      zeroY,
      yTicks,
      xTicks,
      toX,
      toY,
    };
  }, [
    maxPricePerM2,
    minPricePerM2,
    optimumPricePerM2,
    optimumUtility,
    points,
  ]);

  if (!chart) {
    return null;
  }

  return (
    <div className={s.chartSection}>
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        role="img"
        aria-label="Gráfico de utilidad según precio por m²"
        className="h-auto w-full"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1E88FF" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#1E88FF" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <line
          x1={PADDING.left}
          y1={chart.zeroY}
          x2={VIEWBOX_WIDTH - PADDING.right}
          y2={chart.zeroY}
          stroke="var(--border)"
          strokeDasharray="4 4"
        />

        {chart.yTicks.map((tick) => (
          <g key={`y-${tick}`}>
            <line
              x1={PADDING.left}
              y1={chart.toY(tick)}
              x2={VIEWBOX_WIDTH - PADDING.right}
              y2={chart.toY(tick)}
              stroke="var(--border)"
              strokeOpacity="0.55"
            />
            <text
              x={PADDING.left - 8}
              y={chart.toY(tick) + 4}
              textAnchor="end"
              fontSize="11"
              fill="var(--muted-foreground)"
            >
              {formatAxisCurrency(tick)}
            </text>
          </g>
        ))}

        {chart.xTicks.map((tick) => (
          <text
            key={`x-${tick}`}
            x={chart.toX(tick)}
            y={VIEWBOX_HEIGHT - 14}
            textAnchor="middle"
            fontSize="11"
            fill="var(--muted-foreground)"
          >
            {formatAxisCurrency(tick)}
          </text>
        ))}

        <polyline
          points={chart.polyline}
          fill="none"
          stroke="#1E88FF"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <circle
          cx={chart.optimumX}
          cy={chart.optimumY}
          r="6"
          fill="#1E88FF"
          stroke="#ffffff"
          strokeWidth="2"
        />

        <text
          x={chart.optimumX}
          y={chart.optimumY - 12}
          textAnchor="middle"
          fontSize="11"
          fontWeight="600"
          fill="#1E88FF"
        >
          Máximo
        </text>

        <text
          x={VIEWBOX_WIDTH / 2}
          y={VIEWBOX_HEIGHT - 2}
          textAnchor="middle"
          fontSize="12"
          fill="var(--muted-foreground)"
        >
          Precio por m² (CLP)
        </text>

        <text
          x={14}
          y={VIEWBOX_HEIGHT / 2}
          textAnchor="middle"
          fontSize="12"
          fill="var(--muted-foreground)"
          transform={`rotate(-90 14 ${VIEWBOX_HEIGHT / 2})`}
        >
          Utilidad U(p)
        </text>
      </svg>
      <p className={s.chartCaption}>
        Curva U(p) según precio por m². El punto azul marca el precio recomendado.
      </p>
    </div>
  );
}

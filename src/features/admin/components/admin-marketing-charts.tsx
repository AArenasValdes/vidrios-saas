import type {
  MarketingChannelRow,
  MarketingFunnelStep,
  MarketingPublicUtmRow,
  MarketingTrendPoint,
} from "@/features/admin/types/admin-marketing";
import s from "./admin-marketing-dashboard.module.css";

const CHANNEL_COLORS: Record<string, string> = {
  instagram: "#ec4899",
  facebook: "#3b82f6",
  whatsapp: "#22c55e",
  referidos: "#34d399",
  pagina_ventora: "#60a5fa",
  grupos: "#a78bfa",
  otro: "#94a3b8",
  sin_origen: "#64748b",
};

const TREND_SERIES = [
  { key: "prospects" as const, label: "Prospectos", color: "#1e88ff" },
  { key: "trials" as const, label: "Trials", color: "#a78bfa" },
  { key: "paid" as const, label: "Pagos", color: "#fbbf24" },
];

const FUNNEL_COLORS = ["#1e88ff", "#8b5cf6", "#22c55e", "#eab308", "#f59e0b"];

function channelColor(id: string) {
  return CHANNEL_COLORS[id] ?? "#94a3b8";
}

function buildAreaPath(values: number[], width: number, height: number, max: number) {
  if (values.length === 0) return "";
  const step = values.length === 1 ? width : width / (values.length - 1);
  const points = values.map((value, index) => {
    const x = index * step;
    const y = height - (value / max) * height;
    return `${x},${y}`;
  });
  return `M0,${height} L${points.join(" L")} L${width},${height} Z`;
}

function buildLinePath(values: number[], width: number, height: number, max: number) {
  if (values.length === 0) return "";
  const step = values.length === 1 ? width : width / (values.length - 1);
  return values
    .map((value, index) => {
      const x = index * step;
      const y = height - (value / max) * height;
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

export function MarketingTrendChart({ series }: { series: MarketingTrendPoint[] }) {
  const width = 420;
  const height = 168;
  const max = Math.max(
    1,
    ...series.flatMap((point) => [point.prospects, point.trials, point.paid])
  );
  const hasSignal = series.some((point) => point.prospects + point.trials + point.paid > 0);
  const ticks = series.filter((_, index) => {
    if (series.length <= 8) return true;
    const step = Math.ceil(series.length / 6);
    return index % step === 0 || index === series.length - 1;
  });

  if (!hasSignal) {
    return <p className={s.emptyNote}>Sin actividad comercial en el período.</p>;
  }

  return (
    <div className={s.chartFrame}>
      <svg viewBox={`0 0 ${width} ${height}`} className={s.trendSvg} role="img" aria-label="Actividad comercial diaria">
        {TREND_SERIES.map((item) => {
          const values = series.map((point) => point[item.key]);
          return (
            <g key={item.key}>
              <path
                className={s.trendArea}
                d={buildAreaPath(values, width, height, max)}
                fill={item.color}
              />
              <path
                className={s.trendLine}
                d={buildLinePath(values, width, height, max)}
                stroke={item.color}
              />
            </g>
          );
        })}
      </svg>
      <div className={s.trendTicks}>
        {ticks.map((point) => (
          <span key={point.date}>{point.label}</span>
        ))}
      </div>
    </div>
  );
}

export function MarketingDonutChart({ rows }: { rows: MarketingChannelRow[] }) {
  const total = rows.reduce((sum, row) => sum + row.prospects, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  if (total === 0) {
    return <p className={s.emptyNote}>Aún no hay prospectos con origen en el período.</p>;
  }

  return (
    <div className={s.donutWrap}>
      <svg viewBox="0 0 120 120" className={s.donutSvg} role="img" aria-label="Prospectos por canal">
        <circle cx="60" cy="60" r={radius} className={s.donutTrack} transform="rotate(-90 60 60)" />
        {rows.map((row) => {
          const length = (row.prospects / total) * circumference;
          const circle = (
            <circle
              key={row.id}
              cx="60"
              cy="60"
              r={radius}
              stroke={channelColor(row.id)}
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-offset}
              className={s.donutSlice}
              transform="rotate(-90 60 60)"
            />
          );
          offset += length;
          return circle;
        })}
        <text x="60" y="56" className={s.donutTotal} textAnchor="middle">
          {total}
        </text>
        <text x="60" y="72" className={s.donutTotalLabel} textAnchor="middle">
          total
        </text>
      </svg>
      <ul className={s.legend}>
        {rows.map((row) => (
          <li key={row.id}>
            <span className={s.legendDot} style={{ background: channelColor(row.id) }} />
            <span>{row.label}</span>
            <strong>{Math.round((row.prospects / total) * 100)}%</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MarketingFunnelChart({
  steps,
  conversionPct,
}: {
  steps: MarketingFunnelStep[];
  conversionPct: number | null;
}) {
  const max = Math.max(1, ...steps.map((step) => step.count));
  if (!steps.some((step) => step.count > 0)) {
    return <p className={s.emptyNote}>Aún no hay prospectos en el período seleccionado.</p>;
  }

  return (
    <div className={s.funnel}>
      {steps.map((step, index) => (
        <div key={step.id} className={s.funnelStage}>
          <div
            className={s.funnelBar}
            style={{
              width: `${Math.max(28, (step.count / max) * 100)}%`,
              background: FUNNEL_COLORS[index] ?? "#1e88ff",
            }}
          >
            <span>{step.label}</span>
            <strong>{step.count}</strong>
          </div>
        </div>
      ))}
      <p className={s.funnelRate}>
        Conversión del cohort: {conversionPct === null ? "—" : `${conversionPct}%`}
      </p>
    </div>
  );
}

export function MarketingUtmBars({ rows }: { rows: MarketingPublicUtmRow[] }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  if (rows.length === 0) {
    return (
      <p className={s.emptyNote}>
        No hay solicitudes de páginas públicas con UTM en el período.
      </p>
    );
  }

  return (
    <ul className={s.barList}>
      {rows.map((row, index) => (
        <li key={row.id}>
          <div className={s.barMeta}>
            <span>{row.label}</span>
            <strong>{row.count}</strong>
          </div>
          <div className={s.barTrack}>
            <div
              className={s.barFill}
              style={{
                width: `${Math.max(6, (row.count / max) * 100)}%`,
                background: FUNNEL_COLORS[index] ?? "#64748b",
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

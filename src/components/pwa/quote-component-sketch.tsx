type QuoteComponentSketchProps = {
  tipo: string;
  ancho: number | null;
  alto: number | null;
  colorHex: string;
  maxW?: number;
  maxH?: number;
  label?: string;
  showMeasurements?: boolean;
  mirrorFormat?: "single" | "divided";
  mirrorPaneCount?: number | null;
  mirrorPaneDirection?: "vertical" | "horizontal";
  mirrorInteriorLine?: "fine" | "marked";
};

const WINDOW_SKETCH_ALUMINUM = "#6B7280";
const WINDOW_SKETCH_SECONDARY = "#5F6670";
const WINDOW_SKETCH_BLACK = "#2A2A2A";
const WINDOW_SKETCH_WHITE = "#FFFFFF";
const WINDOW_SKETCH_GLASS = "rgba(220,234,247,0.82)";
const WINDOW_SKETCH_GLASS_STROKE = "rgba(167,199,231,0.72)";

function isExplicitBlackProfile(colorHex: string) {
  return ["#000000", "#111827", "#1f2937", "#2a2a2a", "#444444"].includes(
    colorHex.trim().toLowerCase()
  );
}

function resolveWindowSketchColor(colorHex: string) {
  const normalized = colorHex.trim().toLowerCase();

  if (normalized === "#a8a8a8" || !/^#[0-9a-f]{6}$/i.test(normalized)) {
    return WINDOW_SKETCH_ALUMINUM;
  }

  if (normalized === "#f0eeeb" || normalized === "#ffffff") {
    return WINDOW_SKETCH_WHITE;
  }

  return isExplicitBlackProfile(normalized) ? WINDOW_SKETCH_BLACK : colorHex;
}

export function QuoteComponentSketch({
  tipo,
  ancho,
  alto,
  colorHex,
  maxW = 160,
  maxH = 140,
  label,
  showMeasurements = false,
  mirrorFormat = "single",
  mirrorPaneCount = null,
  mirrorPaneDirection = "vertical",
  mirrorInteriorLine = "fine",
}: QuoteComponentSketchProps) {
  const width = Math.max(ancho ?? 1200, 1);
  const height = Math.max(alto ?? 1000, 1);
  const ratio = width / height;

  let svgWidth: number;
  let svgHeight: number;

  if (ratio > maxW / maxH) {
    svgWidth = maxW;
    svgHeight = maxW / ratio;
  } else {
    svgHeight = maxH;
    svgWidth = maxH * ratio;
  }

  svgWidth = Math.max(36, Math.min(svgWidth, maxW));
  svgHeight = Math.max(36, Math.min(svgHeight, maxH));

  const frame = 5;
  const glass = "rgba(140,196,228,0.25)";
  const glassStroke = "rgba(140,196,228,0.5)";
  const middle = svgWidth / 2;
  const normalizedType = tipo.trim().toLowerCase();
  const isWindow = normalizedType.startsWith("vent");
  const profileColor = isWindow ? resolveWindowSketchColor(colorHex) : colorHex;
  const profileSecondary = isWindow
    ? profileColor === WINDOW_SKETCH_ALUMINUM
      ? WINDOW_SKETCH_SECONDARY
      : profileColor === WINDOW_SKETCH_WHITE
        ? "#D1D5DB"
        : profileColor
    : colorHex;
  const componentGlass = isWindow ? WINDOW_SKETCH_GLASS : glass;
  const componentGlassStroke = isWindow ? WINDOW_SKETCH_GLASS_STROKE : glassStroke;
  const paddingLeft = showMeasurements ? 38 : 12;
  const paddingRight = 14;
  const paddingTop = showMeasurements ? 32 : 12;
  const paddingBottom = 16;
  const totalWidth = svgWidth + paddingLeft + paddingRight;
  const totalHeight = svgHeight + paddingTop + paddingBottom;
  const measurementColor = "rgba(107, 114, 128, 0.7)";
  const hasMeasurements = showMeasurements && Boolean(ancho && alto);
  const isDividedMirror =
    normalizedType.startsWith("esp") &&
    mirrorFormat === "divided" &&
    mirrorPaneCount !== null &&
    mirrorPaneCount >= 2;

  function renderInterior() {
    if (isDividedMirror) {
      const paneCount = Math.max(2, Math.round(mirrorPaneCount ?? 2));
      const strokeWidth = mirrorInteriorLine === "marked" ? 1.7 : 0.8;
      const opacity = mirrorInteriorLine === "marked" ? 0.72 : 0.5;

      return (
        <>
          <rect
            x={frame}
            y={frame}
            width={svgWidth - frame * 2}
            height={svgHeight - frame * 2}
            fill="rgba(140,196,228,0.22)"
            stroke={glassStroke}
            strokeWidth={0.7}
          />
          {Array.from({ length: paneCount - 1 }, (_, index) => {
            const position = index + 1;
            if (mirrorPaneDirection === "horizontal") {
              const y = frame + ((svgHeight - frame * 2) / paneCount) * position;
              return (
                <line
                  key={`mirror-horizontal-${position}`}
                  x1={frame}
                  y1={y}
                  x2={svgWidth - frame}
                  y2={y}
                  stroke={colorHex}
                  strokeWidth={strokeWidth}
                  opacity={opacity}
                />
              );
            }

            const x = frame + ((svgWidth - frame * 2) / paneCount) * position;
            return (
              <line
                key={`mirror-vertical-${position}`}
                x1={x}
                y1={frame}
                x2={x}
                y2={svgHeight - frame}
                stroke={colorHex}
                strokeWidth={strokeWidth}
                opacity={opacity}
              />
            );
          })}
        </>
      );
    }

    if (normalizedType.startsWith("puert")) {
      return (
        <>
          <rect
            x={frame}
            y={frame}
            width={middle - frame - 1}
            height={svgHeight - frame * 2}
            fill={glass}
            stroke={glassStroke}
            strokeWidth={0.5}
          />
          <rect
            x={middle + 1}
            y={frame}
            width={middle - frame - 1}
            height={svgHeight - frame * 2}
            fill={glass}
            stroke={glassStroke}
            strokeWidth={0.5}
          />
          <line x1={middle} y1={frame} x2={middle} y2={svgHeight - frame} stroke={colorHex} strokeWidth={3.5} />
          <rect x={middle - 9} y={svgHeight / 2 - 16} width={7} height={32} rx={2} fill={colorHex} opacity={0.65} />
          <rect x={middle + 2} y={svgHeight / 2 - 16} width={7} height={32} rx={2} fill={colorHex} opacity={0.65} />
        </>
      );
    }

    if (normalizedType.startsWith("show")) {
      return (
        <>
          <rect
            x={frame}
            y={frame}
            width={svgWidth - frame * 2}
            height={svgHeight - frame * 2}
            fill={glass}
            stroke={glassStroke}
            strokeWidth={0.5}
          />
          <path
            d={`M${frame + 3} ${frame + 3} L${svgWidth - frame - 3} ${svgHeight / 2}`}
            fill="none"
            stroke={colorHex}
            strokeWidth={0.8}
            strokeDasharray="3 2"
            opacity={0.5}
          />
          <circle cx={svgWidth - frame - 10} cy={svgHeight / 2} r={3} fill={colorHex} opacity={0.65} />
        </>
      );
    }

    if (normalizedType.startsWith("cier")) {
      return (
        <>
          <rect
            x={frame}
            y={frame}
            width={svgWidth - frame * 2}
            height={svgHeight - frame * 2}
            fill={glass}
            stroke={glassStroke}
            strokeWidth={0.5}
          />
          <line
            x1={frame + 10}
            y1={frame + 10}
            x2={svgWidth - frame - 10}
            y2={frame + 10}
            stroke={glassStroke}
            strokeWidth={0.8}
          />
          <text
            x={svgWidth / 2}
            y={svgHeight / 2 + 5}
            textAnchor="middle"
            fontSize={8}
            fill={colorHex}
            opacity={0.4}
            fontFamily="sans-serif"
          >
            FIJO
          </text>
        </>
      );
    }

    return (
      <>
          <rect
            x={frame}
            y={frame}
            width={middle - frame - 1}
            height={svgHeight - frame * 2}
            fill={componentGlass}
            stroke={componentGlassStroke}
            strokeWidth={0.5}
          />
          <rect
            x={middle + 1}
            y={frame}
            width={middle - frame - 1}
            height={svgHeight - frame * 2}
            fill={componentGlass}
            stroke={componentGlassStroke}
            strokeWidth={0.5}
          />
          <line x1={middle} y1={frame} x2={middle} y2={svgHeight - frame} stroke={profileSecondary} strokeWidth={2.5} />
          <line
            x1={middle - 5}
            y1={svgHeight / 2 - 7}
            x2={middle - 5}
            y2={svgHeight / 2 + 7}
            stroke={profileColor}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        <line
          x1={middle + 5}
            y1={svgHeight / 2 - 7}
            x2={middle + 5}
            y2={svgHeight / 2 + 7}
            stroke={profileColor}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
      </>
    );
  }

  return (
    <svg
      width={totalWidth}
      height={totalHeight}
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <g transform={`translate(${paddingLeft},${paddingTop})`}>
        <rect x={0} y={0} width={svgWidth} height={svgHeight} fill="none" stroke={profileColor} strokeWidth={frame} rx={1} />
        {renderInterior()}
        {label ? (
          <text
            x={svgWidth / 2}
            y={svgHeight / 2 + 4}
            textAnchor="middle"
            fontSize={8}
            fontFamily="sans-serif"
            fill={profileColor}
            opacity={0.35}
          >
            {label}
          </text>
        ) : null}
      </g>

      {hasMeasurements ? (
        <>
          <line
            x1={paddingLeft}
            y1={paddingTop - 16}
            x2={paddingLeft + svgWidth}
            y2={paddingTop - 16}
            stroke={measurementColor}
            strokeWidth={1}
          />
          <line
            x1={paddingLeft}
            y1={paddingTop - 12}
            x2={paddingLeft}
            y2={paddingTop - 20}
            stroke={measurementColor}
            strokeWidth={1}
          />
          <line
            x1={paddingLeft + svgWidth}
            y1={paddingTop - 12}
            x2={paddingLeft + svgWidth}
            y2={paddingTop - 20}
            stroke={measurementColor}
            strokeWidth={1}
          />
          <path
            d={`M${paddingLeft + 6} ${paddingTop - 19} L${paddingLeft} ${paddingTop - 16} L${paddingLeft + 6} ${paddingTop - 13}`}
            fill="none"
            stroke={measurementColor}
            strokeWidth={1}
          />
          <path
            d={`M${paddingLeft + svgWidth - 6} ${paddingTop - 19} L${paddingLeft + svgWidth} ${paddingTop - 16} L${paddingLeft + svgWidth - 6} ${paddingTop - 13}`}
            fill="none"
            stroke={measurementColor}
            strokeWidth={1}
          />
          <text
            x={paddingLeft + svgWidth / 2}
            y={paddingTop - 21}
            textAnchor="middle"
            fontSize={9}
            fontFamily="sans-serif"
            fill={measurementColor}
          >
            {ancho} mm
          </text>

          <line
            x1={paddingLeft - 18}
            y1={paddingTop}
            x2={paddingLeft - 18}
            y2={paddingTop + svgHeight}
            stroke={measurementColor}
            strokeWidth={1}
          />
          <line
            x1={paddingLeft - 22}
            y1={paddingTop}
            x2={paddingLeft - 5}
            y2={paddingTop}
            stroke={measurementColor}
            strokeWidth={1}
          />
          <line
            x1={paddingLeft - 22}
            y1={paddingTop + svgHeight}
            x2={paddingLeft - 5}
            y2={paddingTop + svgHeight}
            stroke={measurementColor}
            strokeWidth={1}
          />
          <path
            d={`M${paddingLeft - 21} ${paddingTop + 6} L${paddingLeft - 18} ${paddingTop} L${paddingLeft - 15} ${paddingTop + 6}`}
            fill="none"
            stroke={measurementColor}
            strokeWidth={1}
          />
          <path
            d={`M${paddingLeft - 21} ${paddingTop + svgHeight - 6} L${paddingLeft - 18} ${paddingTop + svgHeight} L${paddingLeft - 15} ${paddingTop + svgHeight - 6}`}
            fill="none"
            stroke={measurementColor}
            strokeWidth={1}
          />
          <text
            x={paddingLeft - 25}
            y={paddingTop + svgHeight / 2}
            textAnchor="middle"
            fontSize={9}
            fontFamily="sans-serif"
            fill={measurementColor}
            transform={`rotate(-90 ${paddingLeft - 25} ${paddingTop + svgHeight / 2})`}
          >
            {alto} mm
          </text>
        </>
      ) : null}
    </svg>
  );
}

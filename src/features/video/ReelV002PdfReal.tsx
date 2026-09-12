import {
  AbsoluteFill,
  Easing,
  Img,
  OffthreadVideo,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

const FPS = 24;
const DURATION_IN_FRAMES = 10 * FPS;

const FLOW_CLIP = staticFile("video-assets/reel-v002-flow-ambient.mp4");
const REAL_QUOTE_SCREENSHOT = staticFile("video-assets/reel-v002-cotizacion-real.png");

export function ReelV002PdfReal() {
  const frame = useCurrentFrame();
  const phoneScale = interpolate(frame, [0, DURATION_IN_FRAMES - 1], [1, 1.04], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#090d14", overflow: "hidden" }}>
      <OffthreadVideo
        src={FLOW_CLIP}
        muted
        volume={0}
        style={{
          position: "absolute",
          inset: -24,
          width: "calc(100% + 48px)",
          height: "calc(100% + 48px)",
          objectFit: "cover",
          filter: "blur(12px) brightness(0.55) saturate(0.75)",
        }}
      />

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 42%, rgba(30,136,255,.12), transparent 48%), linear-gradient(180deg, rgba(5,5,5,.12), rgba(5,5,5,.44))",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 86,
          top: 64,
          width: 548,
          height: 1155,
          borderRadius: 74,
          padding: 14,
          boxSizing: "border-box",
          background: "linear-gradient(145deg, #303741 0%, #080a0e 26%, #050608 100%)",
          boxShadow: "0 34px 70px rgba(0,0,0,.56), 0 0 0 2px rgba(255,255,255,.12)",
          scale: phoneScale,
          transformOrigin: "50% 50%",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 61,
            overflow: "hidden",
            backgroundColor: "#f3f6f9",
            boxShadow: "inset 0 0 0 2px rgba(255,255,255,.16)",
          }}
        >
          <Img
            src={REAL_QUOTE_SCREENSHOT}
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        </div>
      </div>

    </AbsoluteFill>
  );
}

export const REEL_V002_PDF_REAL_FPS = FPS;
export const REEL_V002_PDF_REAL_DURATION = DURATION_IN_FRAMES;

import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  useCurrentFrame,
} from "remotion";

type StillSceneProps = {
  image: string;
  motionFrames: number;
  panStartX?: number;
  panEndX?: number;
  panStartY?: number;
  panEndY?: number;
};

export function StillScene({
  image,
  motionFrames,
  panStartX = -5,
  panEndX = 5,
  panStartY = 4,
  panEndY = -4,
}: StillSceneProps) {
  const frame = useCurrentFrame();
  const progress = {
    extrapolateLeft: "clamp" as const,
    extrapolateRight: "clamp" as const,
  };

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        backgroundColor: "#0B0F17",
        display: "flex",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div style={{ height: "100%", position: "relative", width: "100%" }}>
        <Img
          src={image}
          style={{
            display: "block",
            height: "100%",
            objectFit: "contain",
            scale: interpolate(
              frame,
              [0, motionFrames],
              [1, 1.012],
              {
                ...progress,
                easing: Easing.bezier(0.42, 0, 0.2, 1),
              },
            ),
            transformOrigin: "50% 50%",
            translate: `${interpolate(
              frame,
              [0, motionFrames],
              [panStartX, panEndX],
              progress,
            )}px ${interpolate(
              frame,
              [0, motionFrames],
              [panStartY, panEndY],
              progress,
            )}px`,
            width: "100%",
          }}
        />
      </div>
    </AbsoluteFill>
  );
}

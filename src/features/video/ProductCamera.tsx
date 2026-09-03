import React, { type ReactNode } from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";

export type CameraKeyframe = {
  frame: number;
  scale: number;
  x: number;
  y: number;
};

const CAMERA_EASING = Easing.bezier(0.16, 1, 0.3, 1);

export function ProductCamera({ children, keyframes }: { children: ReactNode; keyframes: readonly CameraKeyframe[] }) {
  const frame = useCurrentFrame();
  const points = keyframes.length ? keyframes : [{ frame: 0, scale: 1, x: 0, y: 0 }];
  let index = 0;

  for (let pointIndex = 0; pointIndex < points.length - 1; pointIndex += 1) {
    if (frame >= points[pointIndex + 1].frame) index = pointIndex + 1;
  }

  const current = points[index];
  const next = points[index + 1] ?? current;
  const progress = index === points.length - 1
    ? 0
    : interpolate(frame, [current.frame, next.frame], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: CAMERA_EASING,
      });

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#F5F7FA" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          scale: current.scale + (next.scale - current.scale) * progress,
          translate: `${current.x + (next.x - current.x) * progress}px ${current.y + (next.y - current.y) * progress}px`,
          transformOrigin: "50% 50%",
        }}
      >
        {children}
      </div>
    </div>
  );
}

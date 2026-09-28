import { staticFile } from "remotion";
import { StillScene } from "./StillScene";

export function Scene04Pending() {
  return (
    <StillScene
      image={staticFile(
        "Plan semanal 20-27/Primer video semanal/cotización_pendiente_al_anochecer.png",
      )}
      motionFrames={120}
      panStartX={5}
      panEndX={-5}
      panStartY={-4}
      panEndY={4}
    />
  );
}

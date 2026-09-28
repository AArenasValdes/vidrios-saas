import { staticFile } from "remotion";
import { StillScene } from "./StillScene";

export function Scene02Measurements() {
  return (
    <StillScene
      image={staticFile(
        "Plan semanal 20-27/Primer video semanal/medidas_de_ventora_en_la_libreta.png",
      )}
      motionFrames={90}
      panStartX={5}
      panEndX={-5}
      panStartY={-3}
      panEndY={3}
    />
  );
}

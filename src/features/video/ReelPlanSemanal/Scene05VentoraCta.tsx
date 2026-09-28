import { staticFile } from "remotion";
import { StillScene } from "./StillScene";

export function Scene05VentoraCta() {
  return (
    <StillScene
      image={staticFile(
        "Plan semanal 20-27/Primer video semanal/ventora_cotiza_desde_tu_celular.png",
      )}
      motionFrames={150}
      panStartX={0}
      panEndX={8}
      panStartY={0}
      panEndY={-12}
    />
  );
}

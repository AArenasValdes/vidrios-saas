import { staticFile } from "remotion";
import { StillScene } from "./StillScene";

export function Scene03Messages() {
  return (
    <StillScene
      image={staticFile(
        "Plan semanal 20-27/Primer video semanal/presupuestos_entre_mensajes_y_notas.png",
      )}
      motionFrames={90}
      panStartX={-5}
      panEndX={5}
      panStartY={3}
      panEndY={-3}
    />
  );
}

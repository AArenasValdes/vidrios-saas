import { Composition } from "remotion";
import { VentoraExplainer } from "../src/features/video/VentoraExplainer";
import { VENTORA_VIDEO_FPS } from "../src/features/video/video-assets";

const LANDSCAPE_WIDTH = 1920;
const LANDSCAPE_HEIGHT = 1080;
const PORTRAIT_WIDTH = 1080;
const PORTRAIT_HEIGHT = 1920;

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="VentoraExplainer"
        component={VentoraExplainer}
        durationInFrames={VENTORA_VIDEO_FPS * 56}
        fps={VENTORA_VIDEO_FPS}
        width={LANDSCAPE_WIDTH}
        height={LANDSCAPE_HEIGHT}
        defaultProps={{
          layout: "landscape",
        }}
      />
      <Composition
        id="VentoraExplainerVertical"
        component={VentoraExplainer}
        durationInFrames={VENTORA_VIDEO_FPS * 56}
        fps={VENTORA_VIDEO_FPS}
        width={PORTRAIT_WIDTH}
        height={PORTRAIT_HEIGHT}
        defaultProps={{
          layout: "portrait",
        }}
      />
    </>
  );
};

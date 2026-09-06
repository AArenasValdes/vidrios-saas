import { Composition } from "remotion";
import {
  VentoraDemoMaster,
  VENTORA_DEMO_MASTER_DURATION,
} from "../src/features/video/VentoraDemoMaster";
import { VentoraExplainer } from "../src/features/video/VentoraExplainer";
import {
  PrimerOnboardingPremium,
  PRIMER_ONBOARDING_DURATION,
} from "../src/features/video/PrimerOnboardingPremium";
import {
  OnboardingPcEnhancement,
  ONBOARDING_PC_ENHANCEMENT_DURATION,
  ONBOARDING_PC_ENHANCEMENT_FPS,
} from "../src/features/video/OnboardingPcEnhancement";
import {
  LineasOnboardingCombined,
  LINEAS_ONBOARDING_COMBINED_DURATION,
  LINEAS_ONBOARDING_FPS,
} from "../src/features/video/LineasOnboardingCombined";
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
      <Composition
        id="VentoraDemoMasterVertical"
        component={VentoraDemoMaster}
        durationInFrames={VENTORA_DEMO_MASTER_DURATION}
        fps={VENTORA_VIDEO_FPS}
        width={PORTRAIT_WIDTH}
        height={PORTRAIT_HEIGHT}
      />
      <Composition
        id="PrimerOnboardingPremium"
        component={PrimerOnboardingPremium}
        durationInFrames={PRIMER_ONBOARDING_DURATION}
        fps={VENTORA_VIDEO_FPS}
        width={PORTRAIT_WIDTH}
        height={PORTRAIT_HEIGHT}
      />
      <Composition
        id="OnboardingPcEnhancement"
        component={OnboardingPcEnhancement}
        durationInFrames={ONBOARDING_PC_ENHANCEMENT_DURATION}
        fps={ONBOARDING_PC_ENHANCEMENT_FPS}
        width={LANDSCAPE_WIDTH}
        height={LANDSCAPE_HEIGHT}
      />
      <Composition
        id="LineasOnboardingCombined"
        component={LineasOnboardingCombined}
        durationInFrames={LINEAS_ONBOARDING_COMBINED_DURATION}
        fps={LINEAS_ONBOARDING_FPS}
        width={LANDSCAPE_WIDTH}
        height={LANDSCAPE_HEIGHT}
      />
    </>
  );
};

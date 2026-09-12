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
import {
  Semana1Guiada,
  SEMANA_1_GUIADA_DURATION,
} from "../src/features/video/Semana1Guiada";
import {
  ReelV002PdfReal,
  REEL_V002_PDF_REAL_DURATION,
  REEL_V002_PDF_REAL_FPS,
} from "../src/features/video/ReelV002PdfReal";
import {
  ReelV002,
  ReelV002Portada,
  REEL_V002_DURATION,
  REEL_V002_FPS,
  REEL_V002_PORTADA_FPS,
} from "../src/features/video/ReelV002";
import {
  ReelV003,
  REEL_V003_DURATION,
  REEL_V003_FPS,
} from "../src/features/video/ReelV003";
import {
  ReelV004,
  REEL_V004_DURATION,
  REEL_V004_FPS,
} from "../src/features/video/ReelV004";

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
      <Composition
        id="VentoraSemana1Guiada"
        component={Semana1Guiada}
        durationInFrames={SEMANA_1_GUIADA_DURATION}
        fps={VENTORA_VIDEO_FPS}
        width={PORTRAIT_WIDTH}
        height={PORTRAIT_HEIGHT}
      />
      <Composition
        id="VentoraReelV002PdfReal"
        component={ReelV002PdfReal}
        durationInFrames={REEL_V002_PDF_REAL_DURATION}
        fps={REEL_V002_PDF_REAL_FPS}
        width={720}
        height={1280}
      />
      <Composition
        id="VentoraReelV002"
        component={ReelV002}
        durationInFrames={REEL_V002_DURATION}
        fps={REEL_V002_FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="VentoraReelV002Portada"
        component={ReelV002Portada}
        durationInFrames={1}
        fps={REEL_V002_PORTADA_FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="VentoraReelV003"
        component={ReelV003}
        durationInFrames={REEL_V003_DURATION}
        fps={REEL_V003_FPS}
        width={1080}
        height={1920}
        defaultProps={{
          maxScale: 1.02,
          musicVolume: 1.8,
          showSubtitles: true,
          sfxVolume: 2.2,
        }}
      />
      <Composition
        id="VentoraReelV004"
        component={ReelV004}
        durationInFrames={REEL_V004_DURATION}
        fps={REEL_V004_FPS}
        width={1080}
        height={1920}
        defaultProps={{
          maxScale: 1.02,
          musicVolume: 1.8,
          sfxVolume: 2.2,
        }}
      />
    </>
  );
};

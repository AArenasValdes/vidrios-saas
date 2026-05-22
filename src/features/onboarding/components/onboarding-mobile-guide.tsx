import { OnboardingStepCard } from "./onboarding-step-card";
import s from "./onboarding-guide.module.css";

export function OnboardingMobileGuide(props: {
  position?: "top" | "bottom";
  title: string;
  text: string;
  currentStep: number;
  totalSteps: number;
  primaryAction:
    | {
        kind: "link";
        label: string;
        href: string;
        openInNewTab?: boolean;
        disabled?: boolean;
      }
    | {
        kind: "button";
        label: string;
        onClick: () => void | Promise<void>;
        disabled?: boolean;
      };
  onClose: () => void;
  onDefer: () => void;
}) {
  const positionClass =
    props.position === "top" ? s.mobileRootTop : s.mobileRootBottom;

  return (
    <div className={`${s.mobileRoot} ${positionClass}`}>
      <OnboardingStepCard
        title={props.title}
        text={props.text}
        currentStep={props.currentStep}
        totalSteps={props.totalSteps}
        primaryAction={props.primaryAction}
        onClose={props.onClose}
        onDefer={props.onDefer}
      />
    </div>
  );
}

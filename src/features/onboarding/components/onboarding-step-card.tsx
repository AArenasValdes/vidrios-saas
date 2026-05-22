import Link from "next/link";
import { LuX } from "react-icons/lu";

import { OnboardingProgress } from "./onboarding-progress";
import s from "./onboarding-guide.module.css";

type ActionButton =
  | {
      kind: "link";
      label: string;
      href: string;
      openInNewTab?: boolean;
      disabled?: boolean;
      onClick?: never;
    }
  | {
      kind: "button";
      label: string;
      onClick: () => void | Promise<void>;
      disabled?: boolean;
      href?: never;
      openInNewTab?: never;
    };

type SharedStepCardProps = {
  title: string;
  text: string;
  currentStep: number;
  totalSteps: number;
  primaryAction: ActionButton;
  onClose: () => void;
  onDefer: () => void;
};

export function OnboardingStepCard(props: SharedStepCardProps) {
  return (
    <div className={`${s.sheetCard} ${s.sheetCardCompact}`}>
      <div className={s.cardBody}>
        <div className={s.cardTop}>
          <OnboardingProgress current={props.currentStep} total={props.totalSteps} />
          <button
            type="button"
            className={s.closeButton}
            onClick={props.onClose}
            aria-label="Cerrar onboarding"
          >
            <LuX aria-hidden />
          </button>
        </div>

        <div className={s.copy}>
          <strong className={s.title}>{props.title}</strong>
          <p className={s.text}>{props.text}</p>
        </div>

        <div className={s.actions}>
          <button type="button" className={s.secondaryButton} onClick={props.onDefer}>
            Despues
          </button>
          {props.primaryAction.kind === "link" ? (
            props.primaryAction.openInNewTab ? (
              <a
                href={props.primaryAction.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`${s.primaryButton} ${
                  props.primaryAction.disabled ? s.primaryButtonDisabled : ""
                }`}
                aria-disabled={props.primaryAction.disabled}
              >
                {props.primaryAction.label}
              </a>
            ) : (
              <Link
                href={props.primaryAction.href}
                className={`${s.primaryButton} ${
                  props.primaryAction.disabled ? s.primaryButtonDisabled : ""
                }`}
                aria-disabled={props.primaryAction.disabled}
              >
                {props.primaryAction.label}
              </Link>
            )
          ) : (
            <button
              type="button"
              className={`${s.primaryButton} ${
                props.primaryAction.disabled ? s.primaryButtonDisabled : ""
              }`}
              onClick={() => {
                const handleClick = props.primaryAction.onClick;
                if (handleClick) {
                  void handleClick();
                }
              }}
              disabled={props.primaryAction.disabled}
            >
              {props.primaryAction.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

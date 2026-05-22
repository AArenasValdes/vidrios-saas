import Link from "next/link";
import { LuX } from "react-icons/lu";

import { OnboardingProgress } from "./onboarding-progress";
import s from "./onboarding-guide.module.css";

type InlinePrimaryAction =
  | {
      kind: "link";
      label: string;
      href: string;
      openInNewTab?: boolean;
    }
  | {
      kind: "button";
      label: string;
      onClick: () => void | Promise<void>;
    };

export function OnboardingInlineHint({
  title,
  text,
  currentStep,
  totalSteps,
  primaryAction,
  onClose,
  onDefer,
}: {
  title: string;
  text: string;
  currentStep: number;
  totalSteps: number;
  primaryAction: InlinePrimaryAction;
  onClose: () => void;
  onDefer: () => void;
}) {
  return (
    <div className={s.inlineRoot}>
      <div className={s.inlineBody}>
        <div className={s.inlineHeader}>
          <div>
            <OnboardingProgress current={currentStep} total={totalSteps} />
            <strong className={s.inlineTitle}>{title}</strong>
            <p className={s.inlineText}>{text}</p>
          </div>

          <button
            type="button"
            className={s.closeButton}
            onClick={onClose}
            aria-label="Cerrar onboarding"
          >
            <LuX aria-hidden />
          </button>
        </div>

        <div className={s.inlineFooter}>
          <span className={s.inlinePill}>Guia operativa</span>
          <div className={s.inlineFooterActions}>
            <button type="button" className={s.secondaryButton} onClick={onDefer}>
              Despues
            </button>
            {primaryAction.kind === "link" ? (
              primaryAction.openInNewTab ? (
                <a
                  href={primaryAction.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={s.primaryButton}
                >
                  {primaryAction.label}
                </a>
              ) : (
                <Link href={primaryAction.href} className={s.primaryButton}>
                  {primaryAction.label}
                </Link>
              )
            ) : (
              <button
                type="button"
                className={s.primaryButton}
                onClick={() => {
                  void primaryAction.onClick();
                }}
              >
                {primaryAction.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

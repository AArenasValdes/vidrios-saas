"use client";

import s from "../../page.module.css";

type PasoDosDesktopWorkspaceHeaderProps = {
  modeLabel: string;
  onRequestSwitch: () => void;
};

export function PasoDosDesktopWorkspaceHeader({
  modeLabel,
  onRequestSwitch,
}: PasoDosDesktopWorkspaceHeaderProps) {
  return (
    <header className={s.stepTwoDesktopWorkspaceHeader}>
      <div className={s.stepTwoDesktopWorkspaceModeGroup}>
        <span className={s.stepTwoDesktopWorkspaceModeLabel}>{modeLabel}</span>
        <button
          className={s.stepTwoDesktopWorkspaceSwitch}
          onClick={onRequestSwitch}
          type="button"
        >
          Cambiar
        </button>
      </div>
    </header>
  );
}

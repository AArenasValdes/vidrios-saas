import s from "./onboarding-guide.module.css";

export function OnboardingProgress({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const progressPct = Math.max(0, Math.min(100, Math.round((current / total) * 100)));

  return (
    <div className={s.progress}>
      <span className={s.progressText}>
        Paso {current} de {total}
      </span>
      <span className={s.progressTrack} aria-hidden>
        <span className={s.progressFill} style={{ width: `${progressPct}%` }} />
      </span>
    </div>
  );
}

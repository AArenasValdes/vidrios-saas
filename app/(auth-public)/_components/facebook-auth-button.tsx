import s from "../login/login.module.css";

function FacebookMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        fill="#ffffff"
        d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97H15.83c-1.491 0-1.956.93-1.956 1.886v2.274h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"
      />
    </svg>
  );
}

type FacebookAuthButtonProps = {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export function FacebookAuthButton({
  label,
  loading = false,
  disabled = false,
  onClick,
}: FacebookAuthButtonProps) {
  return (
    <button
      type="button"
      className={s.facebookButton}
      onClick={onClick}
      disabled={disabled || loading}
    >
      <span className={s.buttonContent}>
        {loading ? <span className={s.spinner} aria-hidden /> : <FacebookMark />}
        {loading ? "Conectando con Facebook..." : label}
      </span>
    </button>
  );
}

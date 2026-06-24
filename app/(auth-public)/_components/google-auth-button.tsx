import s from "../login/login.module.css";

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2045c0-.638-.0573-1.2516-.1636-1.8409H9v3.4818h4.8436c-.2082 1.125-.8427 2.0782-1.7955 2.7164v2.2582h2.9082c1.7027-1.5673 2.6836-3.8741 2.6836-6.6155z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.4673-.8068 5.9564-2.1809l-2.9082-2.2582c-.8068.54-1.8373.8609-3.0482.8609-2.3441 0-4.3282-1.5832-5.0364-3.7109H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.9636 10.71c-.18-.54-.2823-1.1168-.2823-1.71s.1023-1.17.2823-1.71V4.9582H.9573C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9573 4.0418L3.9636 10.71z"
      />
      <path
        fill="#EA4335"
        d="M9 3.5795c1.3218 0 2.5077.4541 3.44 1.3459l2.5818-2.5818C13.4632.8918 11.4264 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.9636 7.29C4.6718 5.1623 6.6559 3.5795 9 3.5795z"
      />
    </svg>
  );
}

type GoogleAuthButtonProps = {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export function GoogleAuthButton({
  label,
  loading = false,
  disabled = false,
  onClick,
}: GoogleAuthButtonProps) {
  return (
    <button
      type="button"
      className={s.googleButton}
      onClick={onClick}
      disabled={disabled || loading}
    >
      <span className={s.buttonContent}>
        {loading ? <span className={s.spinner} aria-hidden /> : <GoogleMark />}
        {loading ? "Conectando con Google..." : label}
      </span>
    </button>
  );
}

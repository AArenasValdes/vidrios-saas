"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type PublicQuoteActionButtonProps = {
  className: string;
  contentClassName: string;
  pendingClassName: string;
  spinnerClassName: string;
  children: ReactNode;
  pendingLabel: string;
};

export function PublicQuoteActionButton({
  className,
  contentClassName,
  pendingClassName,
  spinnerClassName,
  children,
  pendingLabel,
}: PublicQuoteActionButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      className={`${className} ${pending ? pendingClassName : ""}`}
      type="submit"
      disabled={pending}
      aria-busy={pending}
    >
      <span className={contentClassName}>
        {pending ? (
          <>
            <span className={spinnerClassName} aria-hidden />
            {pendingLabel}
          </>
        ) : (
          children
        )}
      </span>
    </button>
  );
}

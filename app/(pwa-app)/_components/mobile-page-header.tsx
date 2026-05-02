"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LuChevronLeft, LuEllipsisVertical } from "react-icons/lu";

import s from "./mobile-page-header.module.css";

type Props = {
  backHref: string;
  backLabel: string;
  menuLabel: string;
  menuOpen: boolean;
  onToggleMenu: () => void;
  menuPanel?: ReactNode;
};

export function MobilePageHeader({
  backHref,
  backLabel,
  menuLabel,
  menuOpen,
  onToggleMenu,
  menuPanel,
}: Props) {
  return (
    <header className={s.header}>
      <Link href={backHref} className={s.backLink}>
        <span className={s.backIcon}>
          <LuChevronLeft aria-hidden />
        </span>
        <span>{backLabel}</span>
      </Link>

      <div className={s.menuWrap}>
        <button
          type="button"
          className={s.menuButton}
          aria-label={menuLabel}
          aria-expanded={menuOpen}
          onClick={onToggleMenu}
        >
          <LuEllipsisVertical aria-hidden />
        </button>

        {menuOpen && menuPanel ? <div className={s.menuPanel}>{menuPanel}</div> : null}
      </div>
    </header>
  );
}

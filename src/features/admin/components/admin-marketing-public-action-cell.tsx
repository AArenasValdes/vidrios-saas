"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { LuEllipsisVertical } from "react-icons/lu";

import {
  AdminFloatingMenu,
  adminFloatingMenuStyles as ms,
} from "@/features/admin/components/admin-floating-menu";
import type { MarketingPublicCompanyRow } from "@/features/admin/types/admin-marketing";
import s from "./admin-payment-action-cell.module.css";

type AdminMarketingPublicActionCellProps = {
  row: MarketingPublicCompanyRow;
  appOrigin: string;
  quotesFromRequestsAvailable: boolean;
  onCopyPublicLink: (slug: string | null) => void;
};

const MENU_ITEM_COUNT = 7;

function resolvePrimaryHref(row: MarketingPublicCompanyRow) {
  if (row.primaryAction === "abrir_pagina" && row.publicPageUrl) {
    return row.publicPageUrl;
  }
  return `/admin/clientes/${row.organizationId}`;
}

export function AdminMarketingPublicActionCell({
  row,
  appOrigin,
  quotesFromRequestsAvailable,
  onCopyPublicLink,
}: AdminMarketingPublicActionCellProps) {
  const menuId = useId();
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const primaryHref = resolvePrimaryHref(row);
  const isExternalPrimary = row.primaryAction === "abrir_pagina" && Boolean(row.publicPageUrl);

  return (
    <div className={s.cell}>
      {isExternalPrimary ? (
        <a
          href={primaryHref}
          target="_blank"
          rel="noreferrer"
          className={s.primaryBtn}
        >
          {row.primaryActionLabel}
        </a>
      ) : (
        <Link href={primaryHref} className={s.primaryBtn}>
          {row.primaryActionLabel}
        </Link>
      )}
      <div className={s.menuWrap}>
        <button
          ref={menuBtnRef}
          type="button"
          className={s.menuBtn}
          aria-label={`Más acciones para ${row.empresaNombre}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls={menuOpen ? menuId : undefined}
          onClick={() => setMenuOpen((current) => !current)}
        >
          <LuEllipsisVertical aria-hidden />
        </button>
        <AdminFloatingMenu
          menuId={menuId}
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          anchorRef={menuBtnRef}
          estimatedHeight={MENU_ITEM_COUNT * 40}
        >
          <Link
            href={`/admin/clientes/${row.organizationId}`}
            className={ms.menuItem}
            onClick={() => setMenuOpen(false)}
          >
            Ver cuenta
          </Link>
          <Link
            href={`/admin/clientes/${row.organizationId}`}
            className={ms.menuItem}
            onClick={() => setMenuOpen(false)}
          >
            Ver solicitudes
          </Link>
          {row.publicPageUrl ? (
            <a
              href={row.publicPageUrl.startsWith("http") ? row.publicPageUrl : `${appOrigin}${row.publicPageUrl}`}
              target="_blank"
              rel="noreferrer"
              className={ms.menuItem}
              onClick={() => setMenuOpen(false)}
            >
              Abrir página pública
            </a>
          ) : null}
          {row.slug ? (
            <button
              type="button"
              className={ms.menuItem}
              onClick={() => {
                onCopyPublicLink(row.slug);
                setMenuOpen(false);
              }}
            >
              Copiar enlace
            </button>
          ) : null}
          <Link
            href={`/admin/clientes/${row.organizationId}`}
            className={ms.menuItem}
            onClick={() => setMenuOpen(false)}
          >
            Configurar página
          </Link>
          {!row.whatsappConfigured ? (
            <Link
              href={`/admin/clientes/${row.organizationId}`}
              className={ms.menuItem}
              onClick={() => setMenuOpen(false)}
            >
              Configurar WhatsApp
            </Link>
          ) : null}
          {quotesFromRequestsAvailable ? (
            <Link
              href={`/admin/clientes/${row.organizationId}`}
              className={ms.menuItem}
              onClick={() => setMenuOpen(false)}
            >
              Ver cotizaciones vinculadas
            </Link>
          ) : null}
        </AdminFloatingMenu>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { LuEllipsisVertical, LuMessageCircle } from "react-icons/lu";

import {
  AdminFloatingMenu,
  adminFloatingMenuStyles as ms,
} from "@/features/admin/components/admin-floating-menu";
import type { ClientesAttentionRow } from "@/features/admin/services/admin-clientes-filters.service";
import type { AdminClientListItem } from "@/features/admin/types/admin-client";
import s from "./admin-client-attention-actions.module.css";

type AdminClientAttentionActionsProps = {
  row: ClientesAttentionRow;
  client: AdminClientListItem;
  appOrigin: string;
  onRegisterPayment: (organizationId: number) => void;
  onExtendTrial: (organizationId: number) => void;
  onArchiveTest: (organizationId: number) => void;
  onMarkLost: (organizationId: number) => void;
  onCopyPublicLink: (url: string) => void;
  onDeactivateTrial: (organizationId: number) => void;
};

type PrimaryAction =
  | { kind: "whatsapp"; label: "Contactar" | "Recordar"; href: string }
  | { kind: "register_payment"; label: "Registrar pago" }
  | { kind: "activate_menu"; label: "Activar cuenta" }
  | { kind: "recover_menu"; label: "Recuperar cuenta" }
  | { kind: "extend_trial"; label: "Extender trial" };

type MenuItem = {
  id: string;
  label: string;
  onClick?: () => void;
  href?: string;
  external?: boolean;
  destructive?: boolean;
  disabled?: boolean;
};

function buildWhatsappUrl(phone: string | null, message: string) {
  if (!phone) {
    return null;
  }

  const digits = phone.replace(/\D/g, "");
  if (!digits) {
    return null;
  }

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function hasConfirmedPaymentPending(client: AdminClientListItem) {
  return Boolean(client.ultimoPagoAt) && client.estadoEfectivo !== "active";
}

function resolvePrimaryAction(
  row: ClientesAttentionRow,
  client: AdminClientListItem
): PrimaryAction {
  const whatsappUrl = row.whatsappUrl;
  const setupWhatsappUrl = buildWhatsappUrl(
    client.telefonoPrincipal,
    "Hola, te ayudo con la configuración inicial de Ventora para crear tu primera cotización."
  );

  if (row.proximaAccion.startsWith("Contactar: ya usó el producto") && whatsappUrl) {
    return { kind: "whatsapp", label: "Contactar", href: whatsappUrl };
  }

  if (row.proximaAccion.startsWith("Ofrecer configuración inicial")) {
    return { kind: "activate_menu", label: "Activar cuenta" };
  }

  if (
    row.proximaAccion.startsWith("Registrar o confirmar pago") &&
    hasConfirmedPaymentPending(client)
  ) {
    return { kind: "register_payment", label: "Registrar pago" };
  }

  if (
    client.estadoEfectivo === "past_due" ||
    client.estadoEfectivo === "cancelled" ||
    (row.proximaAccion.startsWith("Registrar o confirmar pago") &&
      !hasConfirmedPaymentPending(client))
  ) {
    return { kind: "recover_menu", label: "Recuperar cuenta" };
  }

  if (row.proximaAccion.startsWith("Enviar recordatorio de renovación")) {
    if (whatsappUrl) {
      return { kind: "whatsapp", label: "Recordar", href: whatsappUrl };
    }
    return { kind: "extend_trial", label: "Extender trial" };
  }

  if (row.proximaAccion.startsWith("Enviar seguimiento") && whatsappUrl) {
    return { kind: "whatsapp", label: "Contactar", href: whatsappUrl };
  }

  if (row.actionType === "extend") {
    return { kind: "extend_trial", label: "Extender trial" };
  }

  if (setupWhatsappUrl && client.cotizacionesCount === 0) {
    return { kind: "activate_menu", label: "Activar cuenta" };
  }

  return { kind: "recover_menu", label: "Recuperar cuenta" };
}

function buildMenuItems(
  row: ClientesAttentionRow,
  client: AdminClientListItem,
  primary: PrimaryAction,
  appOrigin: string,
  handlers: Omit<
    AdminClientAttentionActionsProps,
    "row" | "client" | "appOrigin"
  >
): MenuItem[] {
  const whatsappUrl = row.whatsappUrl;
  const setupWhatsappUrl = buildWhatsappUrl(
    client.telefonoPrincipal,
    "Hola, te ayudo con la configuración inicial de Ventora para crear tu primera cotización."
  );
  const publicUrl = client.publicPageUrl
    ? `${appOrigin}${client.publicPageUrl}`
    : null;

  const items: MenuItem[] = [
    {
      id: "detail",
      label: "Ver ficha",
      href: `/admin/clientes/${client.organizationId}`,
    },
  ];

  const pushWhatsapp = (id: string, label: string, href: string | null) => {
    if (!href) {
      return;
    }
    if (primary.kind === "whatsapp" && primary.href === href) {
      return;
    }
    items.push({ id, label, href, external: true });
  };

  pushWhatsapp("whatsapp", "Abrir WhatsApp", whatsappUrl);
  pushWhatsapp("whatsapp-setup", "Enviar WhatsApp de configuración inicial", setupWhatsappUrl);

  const canRegisterPayment =
    hasConfirmedPaymentPending(client) ||
    client.estadoEfectivo === "past_due" ||
    client.estadoEfectivo === "cancelled";

  if (canRegisterPayment && primary.kind !== "register_payment") {
    items.push({
      id: "payment",
      label: "Registrar pago",
      onClick: () => handlers.onRegisterPayment(client.organizationId),
    });
    items.push({
      id: "activate-plan",
      label: "Activar plan",
      onClick: () => handlers.onRegisterPayment(client.organizationId),
    });
  }

  if (
    client.estadoEfectivo === "trial_active" ||
    client.estadoEfectivo === "trial_expiring" ||
    client.estadoEfectivo === "trial_expired"
  ) {
    if (primary.kind !== "extend_trial") {
      items.push({
        id: "extend",
        label: "Extender trial 7 días",
        onClick: () => handlers.onExtendTrial(client.organizationId),
      });
    }
    if (client.estadoEfectivo !== "trial_expired") {
      items.push({
        id: "deactivate-trial",
        label: "Desactivar trial",
        onClick: () => handlers.onDeactivateTrial(client.organizationId),
      });
    }
  }

  if (client.estadoEfectivo === "active" || canRegisterPayment) {
    items.push({
      id: "change-plan",
      label: "Cambiar plan",
      onClick: () => handlers.onRegisterPayment(client.organizationId),
    });
  }

  if (client.cotizacionesCount > 0) {
    items.push({
      id: "quotes",
      label: "Ver cotizaciones",
      href: `/admin/clientes/${client.organizationId}`,
    });
  }

  if (publicUrl) {
    items.push({
      id: "copy-public",
      label: "Copiar enlace de página pública",
      onClick: () => handlers.onCopyPublicLink(publicUrl),
    });
  }

  items.push({
    id: "lost",
    label: "Marcar como perdido",
    destructive: true,
    onClick: () => handlers.onMarkLost(client.organizationId),
  });

  if (!client.isTestAccount) {
    items.push({
      id: "archive",
      label: "Archivar cuenta de prueba",
      destructive: true,
      onClick: () => handlers.onArchiveTest(client.organizationId),
    });
  }

  return items;
}

export function AdminClientAttentionActions({
  row,
  client,
  appOrigin,
  onRegisterPayment,
  onExtendTrial,
  onArchiveTest,
  onMarkLost,
  onCopyPublicLink,
  onDeactivateTrial,
}: AdminClientAttentionActionsProps) {
  const menuId = useId();
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const primaryBtnRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [primaryMenuOpen, setPrimaryMenuOpen] = useState(false);

  const primary = resolvePrimaryAction(row, client);
  const menuItems = buildMenuItems(row, client, primary, appOrigin, {
    onRegisterPayment,
    onExtendTrial,
    onArchiveTest,
    onMarkLost,
    onCopyPublicLink,
    onDeactivateTrial,
  });

  const destructiveItems = menuItems.filter((item) => item.destructive);
  const regularItems = menuItems.filter((item) => !item.destructive);

  function renderPrimaryButton() {
    if (primary.kind === "whatsapp") {
      return (
        <a
          href={primary.href}
          target="_blank"
          rel="noreferrer"
          className={s.primaryBtn}
          title={`${primary.label} por WhatsApp`}
          aria-label={`${primary.label} por WhatsApp`}
        >
          <LuMessageCircle aria-hidden />
          <span>{primary.label}</span>
        </a>
      );
    }

    if (primary.kind === "register_payment") {
      return (
        <button
          type="button"
          className={s.primaryBtn}
          title="Registrar pago confirmado"
          aria-label="Registrar pago"
          onClick={() => onRegisterPayment(client.organizationId)}
        >
          <span>{primary.label}</span>
        </button>
      );
    }

    if (primary.kind === "extend_trial") {
      return (
        <button
          type="button"
          className={s.primaryBtn}
          title="Extender trial 7 días"
          aria-label="Extender trial 7 días"
          onClick={() => onExtendTrial(client.organizationId)}
        >
          <span>{primary.label}</span>
        </button>
      );
    }

    if (primary.kind === "activate_menu") {
      return (
        <div className={s.primaryMenuWrap}>
          <button
            ref={primaryBtnRef}
            type="button"
            className={s.primaryBtn}
            aria-expanded={primaryMenuOpen}
            aria-haspopup="menu"
            title="Activar cuenta"
            onClick={() => {
              setMenuOpen(false);
              setPrimaryMenuOpen((open) => !open);
            }}
          >
            <span>{primary.label}</span>
          </button>
          <AdminFloatingMenu
            open={primaryMenuOpen}
            onClose={() => setPrimaryMenuOpen(false)}
            anchorRef={primaryBtnRef}
            align="left"
            ignoreRefs={[menuBtnRef]}
          >
            {setupWhatsappMenuItems(client, {
              onExtendTrial,
              organizationId: client.organizationId,
            })}
          </AdminFloatingMenu>
        </div>
      );
    }

    return (
      <div className={s.primaryMenuWrap}>
        <button
          ref={primaryBtnRef}
          type="button"
          className={s.primaryBtn}
          aria-expanded={primaryMenuOpen}
          aria-haspopup="menu"
          title="Recuperar cuenta"
          onClick={() => {
            setMenuOpen(false);
            setPrimaryMenuOpen((open) => !open);
          }}
        >
          <span>{primary.label}</span>
        </button>
        <AdminFloatingMenu
          open={primaryMenuOpen}
          onClose={() => setPrimaryMenuOpen(false)}
          anchorRef={primaryBtnRef}
          align="left"
          ignoreRefs={[menuBtnRef]}
        >
          {recoverMenuItems(client, row, {
            onRegisterPayment,
            onExtendTrial,
            onCopyPublicLink,
            appOrigin,
          })}
        </AdminFloatingMenu>
      </div>
    );
  }

  return (
    <div className={s.actionsCell}>
      {renderPrimaryButton()}
      <div className={s.menuWrap}>
        <button
          ref={menuBtnRef}
          type="button"
          className={s.menuBtn}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-controls={menuId}
          title="Más acciones"
          aria-label={`Más acciones para ${row.empresa}`}
          onClick={() => {
            setPrimaryMenuOpen(false);
            setMenuOpen((open) => !open);
          }}
        >
          <LuEllipsisVertical aria-hidden />
        </button>
        <AdminFloatingMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          anchorRef={menuBtnRef}
          menuId={menuId}
          align="right"
          ignoreRefs={[primaryBtnRef]}
          estimatedHeight={Math.min(420, 44 * menuItems.length + 24)}
        >
          {regularItems.map((item) => renderMenuItem(item, () => setMenuOpen(false)))}
          {destructiveItems.length > 0 ? <div className={ms.menuDivider} role="separator" /> : null}
          {destructiveItems.map((item) => renderMenuItem(item, () => setMenuOpen(false)))}
        </AdminFloatingMenu>
      </div>
    </div>
  );
}

function renderMenuItem(item: MenuItem, onClose: () => void) {
  const className = item.destructive ? ms.menuItemDanger : ms.menuItem;

  if (item.href) {
    if (item.external) {
      return (
        <a
          key={item.id}
          href={item.href}
          target="_blank"
          rel="noreferrer"
          className={className}
          role="menuitem"
          onClick={onClose}
        >
          {item.label}
        </a>
      );
    }

    return (
      <Link key={item.id} href={item.href} className={className} role="menuitem" onClick={onClose}>
        {item.label}
      </Link>
    );
  }

  return (
    <button
      key={item.id}
      type="button"
      className={className}
      role="menuitem"
      disabled={item.disabled}
      onClick={() => {
        item.onClick?.();
        onClose();
      }}
    >
      {item.label}
    </button>
  );
}

function setupWhatsappMenuItems(
  client: AdminClientListItem,
  handlers: { onExtendTrial: (id: number) => void; organizationId: number }
) {
  const setupUrl = buildWhatsappUrl(
    client.telefonoPrincipal,
    "Hola, te ayudo con la configuración inicial de Ventora para crear tu primera cotización."
  );

  return (
    <>
      {setupUrl ? (
        <a href={setupUrl} target="_blank" rel="noreferrer" className={ms.menuItem} role="menuitem">
          Enviar WhatsApp de configuración inicial
        </a>
      ) : null}
      <button
        type="button"
        className={ms.menuItem}
        role="menuitem"
        onClick={() => handlers.onExtendTrial(handlers.organizationId)}
      >
        Extender trial 7 días
      </button>
      <Link
        href={`/admin/clientes/${handlers.organizationId}`}
        className={ms.menuItem}
        role="menuitem"
      >
        Ver ficha de cuenta
      </Link>
    </>
  );
}

function recoverMenuItems(
  client: AdminClientListItem,
  row: ClientesAttentionRow,
  handlers: {
    onRegisterPayment: (id: number) => void;
    onExtendTrial: (id: number) => void;
    onCopyPublicLink: (url: string) => void;
    appOrigin: string;
  }
) {
  const whatsappUrl = row.whatsappUrl;

  return (
    <>
      {hasConfirmedPaymentPending(client) ? (
        <button
          type="button"
          className={ms.menuItem}
          role="menuitem"
          onClick={() => handlers.onRegisterPayment(client.organizationId)}
        >
          Registrar pago
        </button>
      ) : null}
      {whatsappUrl ? (
        <a href={whatsappUrl} target="_blank" rel="noreferrer" className={ms.menuItem} role="menuitem">
          Abrir WhatsApp
        </a>
      ) : null}
      <button
        type="button"
        className={ms.menuItem}
        role="menuitem"
        onClick={() => handlers.onExtendTrial(client.organizationId)}
      >
        Extender trial 7 días
      </button>
      <Link href={`/admin/clientes/${client.organizationId}`} className={ms.menuItem} role="menuitem">
        Ver ficha
      </Link>
    </>
  );
}

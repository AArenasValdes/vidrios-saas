"use client";

import Link from "next/link";
import {
  LuCopyPlus,
  LuEllipsisVertical,
  LuSettings2,
  LuTrash2,
} from "react-icons/lu";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import s from "./lineas-precios-page-client.module.css";

export type LineTemplateActionKind = "duplicate" | "delete";

type LineTemplateCardActionsProps = {
  templateId: string | number;
  templateName: string;
  isOpen: boolean;
  isBusy: boolean;
  pendingAction: LineTemplateActionKind | null;
  onToggle: () => void;
  onClose: () => void;
  onDuplicate: () => void;
  onRequestDelete: () => void;
};

export function LineTemplateCardActions({
  templateId,
  templateName,
  isOpen,
  isBusy,
  pendingAction,
  onToggle,
  onClose,
  onDuplicate,
  onRequestDelete,
}: LineTemplateCardActionsProps) {
  return (
    <div className={s.menuWrap} data-line-template-actions>
      <button
        type="button"
        className={s.menuButton}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Acciones para ${templateName}`}
        disabled={isBusy}
      >
        <LuEllipsisVertical aria-hidden />
      </button>

      {isOpen ? (
        <div
          className={s.menuPanel}
          role="menu"
          aria-label={`Acciones de ${templateName}`}
          onClick={(event) => event.stopPropagation()}
        >
          <Link
            href={`/configuracion/empresa/lineas-precios/${templateId}/fabricacion`}
            className={s.menuAction}
            role="menuitem"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
          >
            <LuSettings2 aria-hidden />
            Administrar fabricación
          </Link>
          <button
            type="button"
            className={s.menuAction}
            role="menuitem"
            disabled={isBusy}
            onClick={onDuplicate}
          >
            <LuCopyPlus aria-hidden />
            {pendingAction === "duplicate" ? "Duplicando..." : "Duplicar línea"}
          </button>
          <button
            type="button"
            className={`${s.menuAction} ${s.menuActionDanger}`}
            role="menuitem"
            disabled={isBusy}
            onClick={onRequestDelete}
          >
            <LuTrash2 aria-hidden />
            Eliminar línea
          </button>
        </div>
      ) : null}
    </div>
  );
}

type LineTemplateDeleteDialogProps = {
  templateName: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function LineTemplateDeleteDialog({
  templateName,
  isDeleting,
  onCancel,
  onConfirm,
}: LineTemplateDeleteDialogProps) {
  return (
    <ConfirmDialog
      open
      title={`Eliminar “${templateName}”`}
      description="La línea dejará de aparecer en tu catálogo. Las cotizaciones guardadas no se modificarán."
      confirmLabel="Eliminar línea"
      pending={isDeleting}
      pendingLabel="Eliminando..."
      tone="danger"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

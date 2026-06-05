"use client";

import { useState, type KeyboardEvent } from "react";
import {
  LuChevronRight,
  LuCircleX,
  LuFilterX,
  LuMapPin,
  LuPhone,
  LuPlus,
  LuSave,
  LuSearch,
} from "react-icons/lu";

import type { Cliente } from "@/features/clientes/types/cliente";
import {
  FIELD_LIMITS,
  VALIDEZ_OPTIONS,
  type FieldErrors,
  type Step1FieldKey,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import type { CotizacionWorkflowDraft } from "@/features/cotizaciones/types/cotizacion-workflow";

import s from "../page.module.css";

type StepOneSummary = {
  cliente: string;
  clienteMuted: boolean;
  proyecto: string;
  proyectoMuted: boolean;
  piezas: string;
  piezasMuted: boolean;
  subtotal: string;
  subtotalMuted: boolean;
  iva: string;
  ivaMuted: boolean;
  total: string;
  totalMuted: boolean;
};

type PasoUnoDatosClienteProps = {
  draft: CotizacionWorkflowDraft;
  fieldErrors: FieldErrors;
  clientQuery: string;
  clientSearchState: string;
  filteredClientes: Cliente[];
  selectedClient: Cliente | null;
  selectedClientId: string;
  recentClients: Cliente[];
  mobileRecentClients: Cliente[];
  showStep1MoreData: boolean;
  isMobileViewport: boolean;
  isSaving: boolean;
  stepOneSummary: StepOneSummary;
  buildClientInitials: (name: string) => string;
  formatDraftPhoneValue: (value: string) => string;
  onRegisterInputRef: (
    field: Step1FieldKey,
    node: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null
  ) => void;
  onClientQueryChange: (value: string) => void;
  onSelectClient: (clientId: string) => void;
  onClearSelectedClient: () => void;
  onClienteNombreChange: (value: string) => void;
  onTelefonoChange: (value: string) => void;
  onObraChange: (value: string) => void;
  onDireccionChange: (value: string) => void;
  onValidezChange: (value: string) => void;
  onObservacionesChange: (value: string) => void;
  onStep1KeyDown: (
    field: Step1FieldKey,
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
  onToggleMoreData: () => void;
  onReset: () => void;
  onSaveAndExit: () => void;
  onContinue: () => void;
};

export function PasoUnoDatosCliente({
  draft,
  fieldErrors,
  clientQuery,
  clientSearchState,
  filteredClientes,
  selectedClient,
  selectedClientId,
  recentClients,
  mobileRecentClients,
  showStep1MoreData,
  isMobileViewport,
  isSaving,
  stepOneSummary,
  buildClientInitials,
  formatDraftPhoneValue,
  onRegisterInputRef,
  onClientQueryChange,
  onSelectClient,
  onClearSelectedClient,
  onClienteNombreChange,
  onTelefonoChange,
  onObraChange,
  onDireccionChange,
  onValidezChange,
  onObservacionesChange,
  onStep1KeyDown,
  onToggleMoreData,
  onReset,
  onSaveAndExit,
  onContinue,
}: PasoUnoDatosClienteProps) {
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [showOptionalClientFields, setShowOptionalClientFields] = useState(false);
  const [clienteCorreoDraft, setClienteCorreoDraft] = useState("");
  const [isEditingDraftClientName, setIsEditingDraftClientName] = useState(false);

  const canContinue = true;
  const clientList = (isMobileViewport ? mobileRecentClients : recentClients).slice(0, 3);
  const trimmedQuery = clientQuery.trim();
  const hasQuery = trimmedQuery.length > 0;
  const hasMatches = filteredClientes.length > 0;
  const showRecentClients = !selectedClient && !hasQuery && !isCreatingClient;
  const showSearchResults = !selectedClient && hasQuery && hasMatches && !isCreatingClient;
  const showCreateFromSearch = !selectedClient && hasQuery && !hasMatches && !isCreatingClient;
  const showNewClientForm = !selectedClient && isCreatingClient;
  const shouldShowOptionalClientFields = !selectedClient && showOptionalClientFields;
  const compactClientLine = stepOneSummary.clienteMuted ? "Sin cliente" : stepOneSummary.cliente;
  const compactProjectLine = stepOneSummary.proyectoMuted
    ? "se completa sola"
    : stepOneSummary.proyecto;
  const piezasLabel = `${stepOneSummary.piezas} ${
    stepOneSummary.piezas === "1" ? "pieza" : "piezas"
  }`;
  const compactPiecesTotal = `Total ${stepOneSummary.total}`;
  const statusLabel = canContinue ? "LISTO" : "PENDIENTE";
  const statusClassName = canContinue ? s.stepOneStatusReady : s.stepOneStatusPending;

  const openCreateFromQuery = () => {
    setIsCreatingClient(true);
    setShowOptionalClientFields(false);
    setClienteCorreoDraft("");
    setIsEditingDraftClientName(false);
    onClienteNombreChange(trimmedQuery);
    onTelefonoChange("");
  };

  const handleClearClientSearch = () => {
    onClientQueryChange("");

    if (selectedClient) {
      onClearSelectedClient();
    }

    setIsCreatingClient(false);
    setShowOptionalClientFields(false);
    setClienteCorreoDraft("");
    setIsEditingDraftClientName(false);
    onClienteNombreChange("");
    onTelefonoChange("");
  };

  const cancelCreateClient = () => {
    setIsCreatingClient(false);
    setShowOptionalClientFields(false);
    setClienteCorreoDraft("");
    setIsEditingDraftClientName(false);
    onClienteNombreChange("");
    onTelefonoChange("");
  };

  return (
    <section className={`${s.card} ${s.heroCard} ${s.stepOneHeroCard} ${s.stepOneMobileLayout}`}>
      <div className={s.stepOneSection}>
        <div className={s.stepOneSectionHeader}>
          <span className={s.stepOneSectionLabel}>CLIENTE</span>
          {!isMobileViewport ? (
            <button className={s.stepOneUtilityButton} type="button" onClick={onReset}>
              <LuFilterX aria-hidden />
              Limpiar
            </button>
          ) : null}
        </div>

        <div className={s.clientSearchWrap}>
          <label className={s.field}>
            <div className={s.stepOneSearchField}>
              <LuSearch className={s.stepOneSearchIcon} aria-hidden />
              <input
                ref={(node) => onRegisterInputRef("clientSearch", node)}
                className={s.stepOneSearchInput}
                value={clientQuery}
                onChange={(event) => onClientQueryChange(event.target.value)}
                onKeyDown={(event) => onStep1KeyDown("clientSearch", event)}
                placeholder="Buscar cliente o crear nuevo"
              />
              {hasQuery ? (
                <button
                  type="button"
                  className={s.stepOneSearchClearButton}
                  onClick={handleClearClientSearch}
                  aria-label="Limpiar busqueda"
                >
                  <LuCircleX aria-hidden />
                </button>
              ) : null}
            </div>
          </label>

          {showSearchResults ? (
            <div className={`${s.clientDropdown} ${s.stepOneRecentList}`}>
              {filteredClientes.map((cliente) => (
                <button
                  key={cliente.id}
                  type="button"
                  className={s.stepOneRecentRow}
                  onClick={() => onSelectClient(String(cliente.id))}
                >
                  <span className={s.stepOneRecentAvatar}>{buildClientInitials(cliente.nombre)}</span>
                  <span className={s.stepOneRecentContent}>
                    <strong>{cliente.nombre}</strong>
                    <span>
                      {cliente.telefono
                        ? formatDraftPhoneValue(cliente.telefono)
                        : cliente.correo || "Sin telefono"}
                    </span>
                  </span>
                  <LuChevronRight className={s.stepOneRecentChevron} aria-hidden />
                </button>
              ))}
            </div>
          ) : null}

          {showCreateFromSearch ? (
            <div className={s.stepOneSearchEmptyState}>
              <p className={s.stepOneSearchEmptyText}>
                No encontramos &quot;{trimmedQuery}&quot;
              </p>
              <button
                type="button"
                className={s.stepOneSearchEmptyAction}
                onClick={openCreateFromQuery}
              >
                <LuPlus aria-hidden />
                Crear cliente &quot;{trimmedQuery}&quot;
              </button>
            </div>
          ) : null}

          {!isMobileViewport && !showSearchResults && !showCreateFromSearch ? (
            <p className={s.stepOneHelperText}>{clientSearchState}</p>
          ) : null}
        </div>

        {showRecentClients ? (
          <div className={s.stepOneRecentSection}>
            <div className={s.stepOneRecentHeaderRow}>
              <span className={s.stepOneSectionLabel}>Clientes recientes</span>
            </div>
            {clientList.length > 0 ? (
              <div className={s.stepOneRecentList}>
                {clientList.map((cliente) => {
                  const isActive = String(cliente.id) === selectedClientId;

                  return (
                    <button
                      key={cliente.id}
                      type="button"
                      className={`${s.stepOneRecentRow} ${isActive ? s.stepOneRecentRowActive : ""}`}
                      onClick={() => onSelectClient(String(cliente.id))}
                    >
                      <span className={s.stepOneRecentAvatar}>{buildClientInitials(cliente.nombre)}</span>
                      <span className={s.stepOneRecentContent}>
                        <strong>{cliente.nombre}</strong>
                        <span>
                          {cliente.telefono ? formatDraftPhoneValue(cliente.telefono) : "Sin telefono"}
                        </span>
                      </span>
                      <LuChevronRight className={s.stepOneRecentChevron} aria-hidden />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className={s.stepOneEmptyRecent}>Aun no hay clientes recientes.</div>
            )}
          </div>
        ) : null}

        {selectedClient ? (
          <div className={s.stepOneSelectedClient}>
            <div className={s.stepOneSelectedClientMain}>
              <span className={s.stepOneRecentAvatar}>{buildClientInitials(selectedClient.nombre)}</span>
              <div className={s.stepOneSelectedClientText}>
                {isMobileViewport ? (
                  <span className={s.stepOneSelectedClientEyebrow}>CLIENTE SELECCIONADO</span>
                ) : null}
                <strong>{selectedClient.nombre}</strong>
                {!isMobileViewport && selectedClient.telefono ? (
                  <span>
                    <LuPhone aria-hidden />
                    {formatDraftPhoneValue(selectedClient.telefono)}
                  </span>
                ) : null}
                {!isMobileViewport && selectedClient.direccion ? (
                  <span>
                    <LuMapPin aria-hidden />
                    {selectedClient.direccion}
                  </span>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              className={s.stepOneSelectedClientAction}
              onClick={onClearSelectedClient}
            >
              Cambiar
            </button>
          </div>
        ) : null}

        {!selectedClient ? (
          <>
            {showNewClientForm ? (
              <div className={s.stepOneNewClientPanel}>
                {draft.clienteNombre.trim() !== "" && !isEditingDraftClientName ? (
                  <div className={`${s.stepOneSelectedClient} ${s.stepOneDraftClientState}`}>
                    <div className={s.stepOneSelectedClientMain}>
                      <span className={s.stepOneRecentAvatar}>{buildClientInitials(draft.clienteNombre)}</span>
                      <div className={s.stepOneSelectedClientText}>
                        <span className={s.stepOneSelectedClientEyebrow}>CLIENTE NUEVO</span>
                        <strong>{draft.clienteNombre}</strong>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={s.stepOneSelectedClientAction}
                      onClick={() => setIsEditingDraftClientName(true)}
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <label className={s.field}>
                    <span className={s.stepOneFieldLabel}>
                      Nombre del cliente <span className={s.required}>*</span>
                    </span>
                    <input
                      ref={(node) => onRegisterInputRef("clienteNombre", node)}
                      className={`${s.stepOnePrimaryInput} ${fieldErrors.clienteNombre ? s.inputError : ""}`}
                      maxLength={FIELD_LIMITS.clienteNombre}
                      value={draft.clienteNombre}
                      onChange={(event) => {
                        onClienteNombreChange(event.target.value);
                      }}
                      onBlur={() => {
                        if (draft.clienteNombre.trim() !== "") {
                          setIsEditingDraftClientName(false);
                        }
                      }}
                      onKeyDown={(event) => onStep1KeyDown("clienteNombre", event)}
                      placeholder="Ej. Alejandro Flores"
                    />
                    {fieldErrors.clienteNombre ? (
                      <span className={s.fieldError}>{fieldErrors.clienteNombre}</span>
                    ) : null}
                  </label>
                )}

                <button
                  type="button"
                  className={s.stepOneSecondaryToggle}
                  onClick={() => setShowOptionalClientFields((current) => !current)}
                  aria-expanded={shouldShowOptionalClientFields}
                >
                  <LuPlus aria-hidden />
                  <span>
                    {shouldShowOptionalClientFields
                      ? isMobileViewport
                        ? "Ocultar extras"
                        : "Ocultar telefono y correo"
                      : isMobileViewport
                        ? "Telefono y correo"
                        : "Anadir telefono y correo"}
                  </span>
                </button>

                {shouldShowOptionalClientFields ? (
                  <div className={s.stepOneInlineFields}>
                    <label className={s.field}>
                      <span className={s.stepOneFieldLabel}>Telefono</span>
                      <input
                        ref={(node) => onRegisterInputRef("clienteTelefono", node)}
                        className={s.input}
                        inputMode="numeric"
                        autoComplete="tel-national"
                        pattern="[0-9 ]*"
                        value={draft.clienteTelefono}
                        onChange={(event) => onTelefonoChange(event.target.value)}
                        onKeyDown={(event) => onStep1KeyDown("clienteTelefono", event)}
                        placeholder="Ej. 9 1234 5678"
                      />
                    </label>

                    <label className={s.field}>
                      <span className={s.stepOneFieldLabel}>Correo electronico</span>
                      <input
                        className={s.input}
                        type="email"
                        autoComplete="email"
                        maxLength={120}
                        value={clienteCorreoDraft}
                        onChange={(event) => setClienteCorreoDraft(event.target.value)}
                        placeholder="Ej. cliente@correo.cl"
                      />
                    </label>
                  </div>
                ) : null}

                <button
                  type="button"
                  className={s.stepOneCancelCreateButton}
                  onClick={cancelCreateClient}
                >
                  Volver a buscar
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <div className={s.stepOneSection}>
        <label className={s.field}>
          <span className={s.stepOneSectionLabel}>OBRA O TRABAJO</span>
          <input
            ref={(node) => onRegisterInputRef("obra", node)}
            className={`${s.stepOnePrimaryInput} ${fieldErrors.obra ? s.inputError : ""}`}
            maxLength={FIELD_LIMITS.obra}
            value={draft.obra}
            onChange={(event) => onObraChange(event.target.value)}
            onKeyDown={(event) => onStep1KeyDown("obra", event)}
            placeholder="Ej. Ventanas living casa Las Condes"
          />
          <span className={s.stepOneHelperText}>
            Si la dejas vacía, la completamos sola para que puedas seguir cotizando.
          </span>
          {fieldErrors.obra ? <span className={s.fieldError}>{fieldErrors.obra}</span> : null}
        </label>

        <button
          type="button"
          className={s.stepOneSecondaryToggle}
          onClick={onToggleMoreData}
          aria-expanded={showStep1MoreData}
        >
          <LuPlus aria-hidden />
          <span>
            {showStep1MoreData
              ? isMobileViewport
                ? "Ocultar extras"
                : "Ocultar mas datos"
              : isMobileViewport
                ? "Mas datos"
                : "Agregar mas datos"}
          </span>
        </button>

        {showStep1MoreData ? (
          <div className={s.stepOneMoreDataPanel}>
            <label className={s.field}>
              <span className={s.stepOneFieldLabel}>Direccion exacta</span>
              <input
                ref={(node) => onRegisterInputRef("direccion", node)}
                className={s.input}
                maxLength={FIELD_LIMITS.direccion}
                value={draft.direccion}
                onChange={(event) => onDireccionChange(event.target.value)}
                onKeyDown={(event) => onStep1KeyDown("direccion", event)}
                placeholder="Ej. Apoquindo 1540, Las Condes"
              />
            </label>

            <label className={s.field}>
              <span className={s.stepOneFieldLabel}>Validez del presupuesto</span>
              <div className={s.selectWrap}>
                <select
                  ref={(node) => onRegisterInputRef("validez", node)}
                  className={s.input}
                  value={draft.validez}
                  onChange={(event) => onValidezChange(event.target.value)}
                  onKeyDown={(event) => onStep1KeyDown("validez", event)}
                >
                  {VALIDEZ_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className={s.field}>
              <span className={s.stepOneFieldLabel}>Notas para el presupuesto</span>
              <textarea
                ref={(node) => onRegisterInputRef("observaciones", node)}
                className={s.textarea}
                rows={3}
                maxLength={FIELD_LIMITS.observaciones}
                value={draft.observaciones}
                onChange={(event) => onObservacionesChange(event.target.value)}
                onKeyDown={(event) => onStep1KeyDown("observaciones", event)}
                placeholder="Ej. Anticipo 50%, saldo contra entrega."
              />
            </label>
          </div>
        ) : null}
      </div>

      <section className={s.stepOneCompactSummary}>
        <div className={s.stepOneCompactSummaryHeader}>
          <span className={s.stepOneSectionLabel}>RESUMEN</span>
          <span className={`${s.stepOneSummaryStatus} ${statusClassName}`}>{statusLabel}</span>
        </div>
        <p className={s.stepOneCompactSummaryLine}>
          <strong className={stepOneSummary.clienteMuted ? s.stepOneSummaryMuted : ""}>
            {compactClientLine}
          </strong>
          <span>&middot;</span>
          <span className={stepOneSummary.proyectoMuted ? s.stepOneSummaryMuted : ""}>
            {compactProjectLine}
          </span>
        </p>
        <p className={s.stepOneCompactSummaryMeta}>
          <span className={stepOneSummary.piezasMuted ? s.stepOneSummaryMuted : ""}>{piezasLabel}</span>
          <span>&middot;</span>
          <span className={stepOneSummary.totalMuted ? s.stepOneSummaryMuted : ""}>
            {compactPiecesTotal}
          </span>
        </p>
      </section>

      {fieldErrors.step1 ? <div className={s.inlineError}>{fieldErrors.step1}</div> : null}

      {isMobileViewport ? (
        <div className={s.stepOneBottomBar}>
          <div className={s.stepOneBottomBarSurface}>
            <div className={s.stepOneBottomBarActions}>
              <button
                className={`${s.btnGhost} ${s.stepOneBottomSecondary}`}
                type="button"
                onClick={onSaveAndExit}
                disabled={isSaving}
              >
                <LuSave aria-hidden />
                {isSaving ? "Guardando..." : "Borrador"}
              </button>
              <button
                className={`${s.btnPrimary} ${s.stepOneBottomPrimary}`}
                type="button"
                onClick={onContinue}
                disabled={!canContinue}
              >
                Ir a componentes
              </button>
            </div>
            <div className={s.stepOneBottomBarMeta}>
              {draft.obra.trim() !== ""
                ? "Listo para agregar componentes"
                : "Puedes seguir y completar la obra automaticamente."}
            </div>
          </div>
        </div>
      ) : (
        <div className={`${s.stickyActionsInline} ${s.stepOneStickyActions}`}>
          <button className={`${s.btnGhost} ${s.mobileStepAction}`} type="button" onClick={onReset}>
            <LuFilterX aria-hidden />
            Limpiar
          </button>
          <button
            className={`${s.btnGhost} ${s.mobileStepAction}`}
            type="button"
            onClick={onSaveAndExit}
            disabled={isSaving}
          >
            <LuSave aria-hidden />
            {isSaving ? "Guardando..." : "Guardar borrador"}
          </button>
          <button
            className={`${s.btnPrimary} ${s.mobileStepAction}`}
            type="button"
            onClick={onContinue}
            disabled={!canContinue}
          >
            Ir a componentes <LuChevronRight aria-hidden />
          </button>
        </div>
      )}
    </section>
  );
}

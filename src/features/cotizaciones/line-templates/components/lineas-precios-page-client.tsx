"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  LuArrowLeft,
  LuChevronRight,
  LuCopyPlus,
  LuEllipsisVertical,
  LuPlus,
  LuSearch,
  LuTrash2,
  LuUpload,
  LuX,
} from "react-icons/lu";

import {
  buildGlassValue,
  formatCurrencyInput,
  GLASS_OPTIONS,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import { useCotizacionLineTemplates } from "@/features/cotizaciones/line-templates/hooks/useCotizacionLineTemplates";
import {
  getLineTemplateGlassMetadata,
  mergeLineTemplateGlassMetadata,
  CotizacionLineTemplate,
  CotizacionLineTemplateCategoria,
  CotizacionLineTemplateMaterial,
  CotizacionLineTemplateUnidadCobro,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  formatLineTemplatePriceLabel,
  LINE_TEMPLATE_CATEGORIA_LABELS,
  LINE_TEMPLATE_UNIDAD_LABELS,
} from "@/features/cotizaciones/line-templates/utils/catalog-labels";
import { formatCurrency } from "@/utils/formatCurrency";

import s from "./lineas-precios-page-client.module.css";

type LineTemplateFormDraft = {
  nombre: string;
  categoria: CotizacionLineTemplateCategoria | "";
  unidadCobro: CotizacionLineTemplateUnidadCobro | "";
  material: CotizacionLineTemplateMaterial | "";
  espesor: string;
  terminacion: string;
  vidrioPrincipalRecomendado: string;
  costoBase: string;
  precioM2Sugerido: string;
  minimoCobrable: string;
  redondeoPrecio: string;
  mermaPct: string;
  margenObjetivoPct: string;
  proveedor: string;
  vigenciaDesde: string;
  vigenciaHasta: string;
  isActive: boolean;
};

type StatusFilterValue = "todas" | "activas" | "inactivas";
type CategoryFilterValue = "Todo" | "aluminio" | "pvc" | "vidrio";

type Props = {
  openNewByDefault?: boolean;
};

const ROUNDING_OPTIONS = [
  { value: "0", label: "Sin redondeo" },
  { value: "1000", label: "Redondear a $1.000" },
  { value: "5000", label: "Redondear a $5.000" },
  { value: "10000", label: "Redondear a $10.000" },
] as const;
const GLASS_SELECT_OPTIONS = GLASS_OPTIONS.flatMap((group) =>
  group.items.map((item) => buildGlassValue(group.prefix, item))
);

function buildDraft(template?: CotizacionLineTemplate): LineTemplateFormDraft {
  const glassMetadata = getLineTemplateGlassMetadata(template?.catalogMetadata);
  return {
    nombre: template?.nombre ?? "",
    categoria: template?.categoria ?? "aluminio",
    unidadCobro: template?.unidadCobro ?? "m2",
    material: template?.material ?? "",
    espesor: glassMetadata.espesor ?? "",
    terminacion: glassMetadata.terminacion ?? "",
    vidrioPrincipalRecomendado: template?.vidrioPrincipalRecomendado ?? "",
    costoBase: template && template.costoBase > 0 ? String(template.costoBase) : "",
    precioM2Sugerido:
      template && template.precioM2Sugerido > 0 ? String(template.precioM2Sugerido) : "",
    minimoCobrable:
      template && template.minimoCobrable > 0 ? String(template.minimoCobrable) : "",
    redondeoPrecio: String(template?.redondeoPrecio ?? 1000),
    mermaPct: template && template.mermaPct > 0 ? String(template.mermaPct) : "",
    margenObjetivoPct:
      template?.margenObjetivoPct && template.margenObjetivoPct > 0
        ? String(template.margenObjetivoPct)
        : "",
    proveedor: template?.proveedor ?? "",
    vigenciaDesde: template?.vigenciaDesde ?? "",
    vigenciaHasta: template?.vigenciaHasta ?? "",
    isActive: template?.isActive ?? true,
  };
}

function getDigits(value: string) {
  return value.replace(/[^\d]/g, "");
}

function parseMoney(value: string) {
  const digits = getDigits(value);
  return digits ? Number(digits) : 0;
}

function formatMoneyDigits(value: string) {
  return formatCurrencyInput(getDigits(value));
}

function buildRoundingLabel(value: number) {
  return value > 0 ? formatCurrency(value) : "Sin redondeo";
}

export function LineasPreciosPageClient({ openNewByDefault = false }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    templates,
    isLoading,
    isSaving,
    error,
    createTemplate,
    updateTemplate,
    duplicateTemplate,
    deleteTemplate,
  } = useCotizacionLineTemplates();

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterValue>("Todo");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("todas");
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);
  const [sheetMode, setSheetMode] = useState<"new" | "edit" | null>(() =>
    openNewByDefault ? "new" : null
  );
  const [editingTemplateId, setEditingTemplateId] = useState<string | number | null>(null);
  const [draft, setDraft] = useState<LineTemplateFormDraft>(() => buildDraft());
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(
    null
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timeoutId = window.setTimeout(() => setFeedback(null), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  const activeCount = useMemo(
    () => templates.filter((template) => template.isActive).length,
    [templates]
  );

  const filteredTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return templates.filter((template) => {
      const matchesCategory =
        categoryFilter === "Todo" ? true : template.categoria === categoryFilter;
      const matchesStatus =
        statusFilter === "todas"
          ? true
          : statusFilter === "activas"
            ? template.isActive
            : !template.isActive;
      const matchesQuery = normalizedQuery
        ? template.nombre.toLowerCase().includes(normalizedQuery)
        : true;

      return matchesCategory && matchesStatus && matchesQuery;
    });
  }, [categoryFilter, query, statusFilter, templates]);

  const pricePerM2 = parseMoney(draft.precioM2Sugerido);
  const minimum = parseMoney(draft.minimoCobrable);
  const costoBase = parseMoney(draft.costoBase);
  const unidadCobro = (draft.unidadCobro || "m2") as CotizacionLineTemplateUnidadCobro;
  const isGlassDraft = draft.categoria === "vidrio";
  const saveDisabled =
    !draft.nombre.trim() ||
    !draft.categoria ||
    !draft.unidadCobro ||
    (!isGlassDraft && !draft.material) ||
    pricePerM2 <= 0;
  const sheetTitle =
    sheetMode === "edit"
      ? isGlassDraft
        ? "Editar producto de cristal"
        : "Editar línea"
      : isGlassDraft
        ? "Nuevo producto de cristal"
        : "Nueva línea";

  const resetQueryFlag = () => {
    if (!searchParams.get("nueva")) return;
    router.replace(pathname, { scroll: false });
  };

  const openNewSheet = () => {
    setDraft(buildDraft());
    setEditingTemplateId(null);
    setOpenMenuId(null);
    setFeedback(null);
    setSheetMode("new");
  };

  const openEditSheet = (template: CotizacionLineTemplate) => {
    setDraft(buildDraft(template));
    setEditingTemplateId(template.id);
    setOpenMenuId(null);
    setFeedback(null);
    setSheetMode("edit");
  };

  const closeSheet = () => {
    setSheetMode(null);
    setEditingTemplateId(null);
    setDraft(buildDraft());
    resetQueryFlag();
  };

  const handleDraftChange = <K extends keyof LineTemplateFormDraft>(
    key: K,
    value: LineTemplateFormDraft[K]
  ) => {
    setDraft((current) => {
      if (key === "categoria") {
        const categoria = value as CotizacionLineTemplateCategoria;
        if (categoria === "vidrio") {
          return {
            ...current,
            categoria,
            material: "Cristal",
            unidadCobro: "m2",
            vidrioPrincipalRecomendado: "",
          };
        }

        return {
          ...current,
          categoria,
          material: categoria === "pvc" ? "PVC" : "Aluminio",
        };
      }

      return { ...current, [key]: value };
    });
  };

  const handleSave = async () => {
    if (saveDisabled) return;

    const material = isGlassDraft ? "Cristal" : draft.material;
    if (!material) return;

    const payload = {
      nombre: draft.nombre,
      categoria: draft.categoria as CotizacionLineTemplateCategoria,
      unidadCobro: isGlassDraft ? "m2" : unidadCobro,
      material,
      vidrioPrincipalRecomendado: isGlassDraft ? null : draft.vidrioPrincipalRecomendado || null,
      costoBase,
      precioM2Sugerido: pricePerM2,
      minimoCobrable: minimum,
      redondeoPrecio: Number(draft.redondeoPrecio || "1000") || 1000,
      mermaPct: draft.mermaPct ? Number(draft.mermaPct.replace(",", ".")) : 0,
      margenObjetivoPct: draft.margenObjetivoPct
        ? Number(draft.margenObjetivoPct.replace(",", "."))
        : null,
      proveedor: draft.proveedor || null,
      vigenciaDesde: draft.vigenciaDesde || null,
      vigenciaHasta: draft.vigenciaHasta || null,
      catalogMetadata: mergeLineTemplateGlassMetadata(
        undefined,
        isGlassDraft
          ? {
              espesor: draft.espesor,
              terminacion: draft.terminacion,
            }
          : {}
      ),
      isActive: draft.isActive,
    };

    try {
      if (sheetMode === "edit" && editingTemplateId !== null) {
        await updateTemplate(editingTemplateId, payload);
        setFeedback({
          kind: "success",
          message: isGlassDraft ? "Producto de cristal actualizado." : "Línea actualizada.",
        });
      } else {
        await createTemplate(payload);
        setFeedback({
          kind: "success",
          message: isGlassDraft ? "Producto de cristal guardado." : "Línea guardada.",
        });
      }

      closeSheet();
    } catch (saveError) {
      setFeedback({
        kind: "error",
        message:
          saveError instanceof Error ? saveError.message : "No pudimos guardar este producto.",
      });
    }
  };

  const handleToggleActive = async (template: CotizacionLineTemplate) => {
    try {
      await updateTemplate(template.id, { isActive: !template.isActive });
      setFeedback({
        kind: "success",
        message: template.isActive ? "Línea pausada." : "Línea activada.",
      });
    } catch (toggleError) {
      setFeedback({
        kind: "error",
        message:
          toggleError instanceof Error ? toggleError.message : "No pudimos cambiar el estado.",
      });
    }
  };

  const handleDuplicate = async (templateId: string | number) => {
    try {
      await duplicateTemplate(templateId);
      setOpenMenuId(null);
      setFeedback({ kind: "success", message: "Línea duplicada." });
    } catch (duplicateError) {
      setFeedback({
        kind: "error",
        message:
          duplicateError instanceof Error
            ? duplicateError.message
            : "No pudimos duplicar la línea.",
      });
    }
  };

  const handleDelete = async (templateId: string | number) => {
    const confirmed = window.confirm(
      "¿Eliminar esta línea? Es mejor pausarla si todavía podría servirte."
    );
    if (!confirmed) return;

    try {
      await deleteTemplate(templateId);
      setOpenMenuId(null);
      setFeedback({ kind: "success", message: "Línea eliminada." });
    } catch (deleteError) {
      setFeedback({
        kind: "error",
        message:
          deleteError instanceof Error
            ? deleteError.message
            : "No pudimos eliminar la línea.",
      });
    }
  };

  const isEmpty = !isLoading && templates.length === 0;
  const hasNoResults = !isLoading && templates.length > 0 && filteredTemplates.length === 0;

  return (
    <div className={s.page}>
      <header className={s.header}>
        <Link href="/configuracion/empresa" className={s.backButton}>
          <LuArrowLeft aria-hidden />
        </Link>

        <div className={s.headerCopy}>
          <h1>Catálogo privado</h1>
          <p>
            {templates.length} líneas guardadas · {activeCount} activas
          </p>
        </div>

        <div className={s.headerActions}>
          <Link
            href="/configuracion/empresa/lineas-precios/importar"
            className={s.importButton}
            aria-label="Importar catálogo"
          >
            <LuUpload aria-hidden />
          </Link>
          <button type="button" className={s.addButton} onClick={openNewSheet} aria-label="Nueva línea">
            <LuPlus aria-hidden />
          </button>
        </div>
      </header>

      <section className={s.toolbar}>
        <label className={s.searchWrap}>
          <LuSearch className={s.searchIcon} aria-hidden />
          <input
            className={s.searchInput}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar líneas..."
            aria-label="Buscar líneas"
          />
        </label>

        <div className={s.filterStack}>
          <div className={s.materialSegment} role="tablist" aria-label="Filtrar por categoría">
            {[
              { value: "Todo" as const, label: "Todo" },
              { value: "aluminio" as const, label: "Aluminio" },
              { value: "pvc" as const, label: "PVC" },
              { value: "vidrio" as const, label: "Cristales" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${s.materialSegmentButton} ${
                  categoryFilter === option.value ? s.materialSegmentButtonActive : ""
                }`}
                data-material={option.value === "vidrio" ? "Cristal" : option.label}
                onClick={() => setCategoryFilter(option.value)}
                aria-pressed={categoryFilter === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className={s.statusChips} role="tablist" aria-label="Filtrar por estado">
            {[
              { value: "todas" as const, label: "Todas" },
              { value: "activas" as const, label: "Activas" },
              { value: "inactivas" as const, label: "Inactivas" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${s.statusChip} ${
                  statusFilter === option.value ? s.statusChipActive : ""
                }`}
                onClick={() => setStatusFilter(option.value)}
                aria-pressed={statusFilter === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {feedback ? (
        <div
          className={`${s.feedback} ${
            feedback.kind === "error" ? s.feedbackError : s.feedbackSuccess
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {error ? <div className={`${s.feedback} ${s.feedbackError}`}>{error}</div> : null}

      {isEmpty ? (
        <section className={s.emptyState}>
          <strong>Aún no tienes productos guardados</strong>
          <p>Aún no tienes cristales guardados. Agrega uno para reutilizarlo en tus cotizaciones.</p>
          <button type="button" className={s.primaryButton} onClick={openNewSheet}>
            <LuPlus aria-hidden />
            Crear producto
          </button>
        </section>
      ) : null}

      {hasNoResults ? (
        <section className={s.emptyState}>
          <strong>No encontramos productos</strong>
          <p>Prueba con otro nombre o cambia los filtros.</p>
        </section>
      ) : null}

      {!isEmpty && !hasNoResults ? (
        <section className={s.list}>
          {filteredTemplates.map((template) => {
            const isMenuOpen = openMenuId === template.id;
            const glassMetadata = getLineTemplateGlassMetadata(template.catalogMetadata);
            const glassDescription = [glassMetadata.espesor, glassMetadata.terminacion]
              .filter(Boolean)
              .join(" · ");

            return (
              <article
                key={template.id}
                className={`${s.card} ${template.isActive ? "" : s.cardInactive} ${
                  isMenuOpen ? s.cardMenuOpen : ""
                }`}
                data-material={template.material}
                onClick={() => openEditSheet(template)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openEditSheet(template);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className={s.cardTop}>
                  <div className={s.cardTitleBlock}>
                    <div className={s.cardTitleText}>
                      <strong>{template.nombre}</strong>
                      <span className={s.materialPill} data-material={template.material}>
                        {LINE_TEMPLATE_CATEGORIA_LABELS[template.categoria]}
                      </span>
                    </div>
                    <span className={s.cardTapHint}>
                      Editar
                      <LuChevronRight aria-hidden />
                    </span>
                  </div>

                  <div className={s.menuWrap}>
                    <button
                      type="button"
                      className={s.menuButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenMenuId((current) => (current === template.id ? null : template.id))
                      }}
                      aria-expanded={isMenuOpen}
                      aria-label={`Acciones para ${template.nombre}`}
                    >
                      <LuEllipsisVertical aria-hidden />
                    </button>

                    {isMenuOpen ? (
                      <div className={s.menuPanel} onClick={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          className={s.menuAction}
                          onClick={() => void handleDuplicate(template.id)}
                        >
                          <LuCopyPlus aria-hidden />
                          Duplicar
                        </button>
                        <button
                          type="button"
                          className={`${s.menuAction} ${s.menuActionDanger}`}
                          onClick={() => void handleDelete(template.id)}
                        >
                          <LuTrash2 aria-hidden />
                          Eliminar
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className={s.priceRow}>
                  <strong>
                    {formatLineTemplatePriceLabel(
                      template.unidadCobro,
                      template.precioM2Sugerido,
                      formatCurrency
                    )}
                  </strong>
                  <span>
                    {template.costoBase > 0 ? `Costo ${formatCurrency(template.costoBase)}` : "Sin costo"}
                    {" · "}
                    Mín.{" "}
                    {template.minimoCobrable > 0
                      ? formatCurrency(template.minimoCobrable)
                      : "Sin mínimo"}
                  </span>
                </div>

                <div className={s.cardDivider} />

                {template.categoria === "vidrio" && glassDescription ? (
                  <span className={s.roundingMeta}>{glassDescription}</span>
                ) : template.vidrioPrincipalRecomendado ? (
                  <span className={s.roundingMeta}>
                    Vidrio habitual: {template.vidrioPrincipalRecomendado}
                  </span>
                ) : null}

                <div className={s.cardBottom}>
                  <span className={s.roundingMeta}>
                    Redondeo: {buildRoundingLabel(template.redondeoPrecio)}
                  </span>

                  <button
                    type="button"
                    className={`${s.switch} ${template.isActive ? s.switchOn : ""}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleToggleActive(template);
                    }}
                    aria-pressed={template.isActive}
                    aria-label={`${template.isActive ? "Desactivar" : "Activar"} ${template.nombre}`}
                  >
                    <span className={s.switchThumb} />
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}

      {sheetMode ? (
        <div className={s.overlay} role="presentation" onClick={closeSheet}>
          <section
            className={s.sheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="linea-precio-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={s.sheetHandle} />

            <header className={s.sheetHeader}>
              <div className={s.sheetHeaderCopy}>
                <h2 id="linea-precio-title">{sheetTitle}</h2>
              </div>

              <button
                type="button"
                className={s.sheetClose}
                onClick={closeSheet}
                aria-label="Cerrar"
              >
                <LuX aria-hidden />
              </button>
            </header>

            <div className={s.sheetBody}>
              <label className={s.fieldBlock}>
                <span className={s.fieldLabel}>Nombre comercial</span>
                <input
                  className={s.textInput}
                  value={draft.nombre}
                  onChange={(event) => handleDraftChange("nombre", event.target.value)}
                  placeholder="Ej: Serie 25 negra"
                />
              </label>

              <label className={s.fieldBlock}>
                <span className={s.fieldLabel}>Categoría del catálogo</span>
                <select
                  className={s.selectInput}
                  value={draft.categoria}
                  onChange={(event) =>
                    handleDraftChange(
                      "categoria",
                      event.target.value as CotizacionLineTemplateCategoria
                    )
                  }
                >
                  {Object.entries(LINE_TEMPLATE_CATEGORIA_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={s.fieldBlock}>
                <span className={s.fieldLabel}>Unidad de cobro</span>
                <select
                  className={s.selectInput}
                  value={draft.unidadCobro}
                  onChange={(event) =>
                    handleDraftChange(
                      "unidadCobro",
                      event.target.value as CotizacionLineTemplateUnidadCobro
                    )
                  }
                >
                  {Object.entries(LINE_TEMPLATE_UNIDAD_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              {isGlassDraft ? (
                <div className={s.fieldGrid}>
                  <label className={s.fieldBlock}>
                    <span className={s.fieldLabel}>Espesor opcional</span>
                    <input
                      className={s.textInput}
                      value={draft.espesor}
                      onChange={(event) => handleDraftChange("espesor", event.target.value)}
                      placeholder="Ej: 10 mm, 5+5, 4-10-4"
                    />
                  </label>

                  <label className={s.fieldBlock}>
                    <span className={s.fieldLabel}>Terminación opcional</span>
                    <input
                      className={s.textInput}
                      value={draft.terminacion}
                      onChange={(event) => handleDraftChange("terminacion", event.target.value)}
                      placeholder="Ej: templado, laminado, espejo"
                    />
                  </label>
                </div>
              ) : (
                <label className={s.fieldBlock}>
                  <span className={s.fieldLabel}>Material</span>
                  <div className={s.materialSelect}>
                    {(["Aluminio", "PVC"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`${s.materialSelectButton} ${
                          draft.material === option ? s.materialSelectButtonActive : ""
                        }`}
                        data-material={option}
                        aria-pressed={draft.material === option}
                        onClick={() => handleDraftChange("material", option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </label>
              )}

              <label className={s.fieldBlock}>
                <span className={s.fieldLabel}>Costo base · opcional</span>
                <div className={s.moneyWrap}>
                  <span className={s.moneyPrefix}>$</span>
                  <input
                    className={s.moneyInput}
                    inputMode="numeric"
                    value={formatMoneyDigits(draft.costoBase)}
                    onChange={(event) =>
                      handleDraftChange("costoBase", getDigits(event.target.value))
                    }
                    placeholder="90.000"
                  />
                </div>
              </label>

              <label className={s.fieldBlock}>
                <span className={s.fieldLabel}>
                  Precio de venta · {LINE_TEMPLATE_UNIDAD_LABELS[unidadCobro]}
                </span>
                <div className={s.moneyWrap}>
                  <span className={s.moneyPrefix}>$</span>
                  <input
                    className={s.moneyInput}
                    inputMode="numeric"
                    value={formatMoneyDigits(draft.precioM2Sugerido)}
                    onChange={(event) =>
                      handleDraftChange("precioM2Sugerido", getDigits(event.target.value))
                    }
                    placeholder="150.000"
                  />
                </div>
              </label>

              <label className={s.fieldBlock}>
                <span className={s.fieldLabel}>Mínimo cobrable · opcional</span>
                <div className={s.moneyWrap}>
                  <span className={s.moneyPrefix}>$</span>
                  <input
                    className={s.moneyInput}
                    inputMode="numeric"
                    value={formatMoneyDigits(draft.minimoCobrable)}
                    onChange={(event) =>
                      handleDraftChange("minimoCobrable", getDigits(event.target.value))
                    }
                    placeholder="95.000"
                  />
                </div>
                <p className={s.fieldHint}>
                  Se aplicará cuando el cálculo sea menor a este monto.
                </p>
              </label>

              <label className={s.fieldBlock}>
                <span className={s.fieldLabel}>Redondeo del precio</span>
                <select
                  className={s.selectInput}
                  value={draft.redondeoPrecio}
                  onChange={(event) => handleDraftChange("redondeoPrecio", event.target.value)}
                >
                  {ROUNDING_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className={s.fieldGrid}>
                <label className={s.fieldBlock}>
                  <span className={s.fieldLabel}>Merma % · opcional</span>
                  <input
                    className={s.textInput}
                    inputMode="decimal"
                    value={draft.mermaPct}
                    onChange={(event) => handleDraftChange("mermaPct", event.target.value)}
                    placeholder="5"
                  />
                </label>

                <label className={s.fieldBlock}>
                  <span className={s.fieldLabel}>Margen objetivo % · opcional</span>
                  <input
                    className={s.textInput}
                    inputMode="decimal"
                    value={draft.margenObjetivoPct}
                    onChange={(event) =>
                      handleDraftChange("margenObjetivoPct", event.target.value)
                    }
                    placeholder="35"
                  />
                </label>
              </div>

              <label className={s.fieldBlock}>
                <span className={s.fieldLabel}>Proveedor · opcional</span>
                <input
                  className={s.textInput}
                  value={draft.proveedor}
                  onChange={(event) => handleDraftChange("proveedor", event.target.value)}
                  placeholder="Ej: Proveedor local"
                />
              </label>

              <div className={s.fieldGrid}>
                <label className={s.fieldBlock}>
                  <span className={s.fieldLabel}>Vigencia desde</span>
                  <input
                    className={s.textInput}
                    type="date"
                    value={draft.vigenciaDesde}
                    onChange={(event) => handleDraftChange("vigenciaDesde", event.target.value)}
                  />
                </label>

                <label className={s.fieldBlock}>
                  <span className={s.fieldLabel}>Vigencia hasta</span>
                  <input
                    className={s.textInput}
                    type="date"
                    value={draft.vigenciaHasta}
                    onChange={(event) => handleDraftChange("vigenciaHasta", event.target.value)}
                  />
                </label>
              </div>

              {!isGlassDraft ? (
                <label className={s.fieldBlock}>
                  <span className={s.fieldLabel}>Vidrio usado normalmente</span>
                  <select
                    className={s.selectInput}
                    value={draft.vidrioPrincipalRecomendado}
                    onChange={(event) =>
                      handleDraftChange("vidrioPrincipalRecomendado", event.target.value)
                    }
                  >
                    <option value="">Sin sugerencia fija</option>
                    {GLASS_SELECT_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <p className={s.fieldHint}>
                    Este vidrio aparecerá primero al cotizar con esta línea.
                  </p>
                </label>
              ) : null}

              <div className={s.activeCard}>
                <div className={s.activeCardCopy}>
                  <strong>Activa para cotizar</strong>
                  <span>Aparecerá como opción en nuevas cotizaciones.</span>
                </div>
                <button
                  type="button"
                  className={`${s.switch} ${draft.isActive ? s.switchOn : ""}`}
                  onClick={() => handleDraftChange("isActive", !draft.isActive)}
                  aria-pressed={draft.isActive}
                  aria-label="Cambiar estado de la línea"
                >
                  <span className={s.switchThumb} />
                </button>
              </div>

              <div className={s.previewCard}>
                <strong>Vista previa</strong>
                {pricePerM2 <= 0 ? (
                  <p className={s.previewEmpty}>
                    Completa el precio base para ver cómo se calculará.
                  </p>
                ) : (
                  <div className={s.previewValues}>
                    <span>
                      1 unidad se cotizará en{" "}
                      {formatLineTemplatePriceLabel(unidadCobro, pricePerM2, formatCurrency)}
                    </span>
                    <span>
                      Mínimo cobrable:{" "}
                      {minimum > 0 ? formatCurrency(minimum) : "Sin mínimo"}
                    </span>
                    {costoBase > 0 ? <span>Costo base: {formatCurrency(costoBase)}</span> : null}
                  </div>
                )}
              </div>
            </div>

            <footer className={s.sheetFooter}>
              <button
                type="button"
                className={s.primaryButton}
                onClick={() => void handleSave()}
                disabled={saveDisabled || isSaving}
              >
                {isSaving ? "Guardando..." : isGlassDraft ? "Guardar producto" : "Guardar línea"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}

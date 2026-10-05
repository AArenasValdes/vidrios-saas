"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { useMisPrecios } from "@/features/proveedor-catalogos/hooks/use-mis-precios";
import type { MyPresentationPrice, MySupplierPrices } from "@/features/proveedor-catalogos/services/mis-precios.client.service";
import s from "./page.module.css";
import { TallerPresentaciones } from "./taller-presentaciones";

type SheetState = { kind: "adjustment"; providerKey: string } | { kind: "price"; providerKey: string; presentationId: string } | { kind: "filters" } | null;
type ProductFilter = "all" | "custom" | "pending";
type SavePhase = "idle" | "saved";

function money(value: number | null, currency: string | null) {
  return value == null || !currency ? "Pendiente" : new Intl.NumberFormat("es-CL", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 }).format(Math.abs(value));
}

function formatRevision(value: string) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  if (!match) return value;
  const month = new Intl.DateTimeFormat("es-CL", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)));
  return `${month.charAt(0).toLocaleUpperCase("es-CL")}${month.slice(1)} ${match[1]}`;
}

function formatInput(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(Number(digits)) : "";
}

function adjustedNet(reference: number | null, percentage: number) {
  if (reference == null || percentage === 0) return null;
  return Math.round(reference * (1 + percentage / 100));
}

function Chevron() {
  return (
    <svg className={s.chevron} viewBox="0 0 8 14" aria-hidden="true">
      <path d="M1.2 1.2 6.6 7 1.2 12.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchGlyph() {
  return (
    <svg className={s.searchGlyph} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="8.6" cy="8.6" r="5.15" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12.6 12.6 16.4 16.4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg className={s.checkGlyph} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.2 8.2 6.4 11.4 12.8 4.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const supplierLogos = {
  veratec: { src: "/Icon-Empresas/veratec.webp", width: 320, height: 55 },
  winhouse: { src: "/Icon-Empresas/winhouse.webp", width: 320, height: 72 },
  arquetipo: { src: "/Icon-Empresas/arquetipo.webp", width: 320, height: 82 },
} as const;

function supplierLogo(providerKey: string, providerName: string) {
  const identity = `${providerKey} ${providerName}`.toLocaleLowerCase("es-CL");
  if (identity.includes("xelena") || identity.includes("veratec")) return supplierLogos.veratec;
  if (identity.includes("winhouse")) return supplierLogos.winhouse;
  if (identity.includes("arquetipo")) return supplierLogos.arquetipo;
  return null;
}

function SupplierLogo({ providerKey, providerName }: { providerKey: string; providerName: string }) {
  const logo = supplierLogo(providerKey, providerName);
  return (
    <span className={s.providerLogo} aria-hidden="true">
      {logo ? <Image src={logo.src} alt="" width={logo.width} height={logo.height} unoptimized /> : <span>{providerName.charAt(0).toLocaleUpperCase("es-CL")}</span>}
    </span>
  );
}

function priceOrigin(row: MyPresentationPrice, adjustmentPercentage: number) {
  if (row.ownNetPrice != null) return "Mi precio";
  if (row.effective?.source === "provider_adjustment") return `Ajuste ${adjustmentPercentage < 0 ? "−" : "+"}${formatPercent(adjustmentPercentage)}%`;
  if (row.effective?.source === "reference") return "Referencial";
  return "Pendiente";
}

function ProductRow({ row, adjustmentPercentage, onOpen }: { row: MyPresentationPrice; adjustmentPercentage: number; onOpen: () => void }) {
  const effective = row.effective?.unitNetPrice ?? null;
  const effectiveCurrency = row.effective?.currency ?? row.currency;
  const origin = priceOrigin(row, adjustmentPercentage);
  const meta = `${row.sku}${row.finish ? ` · ${row.finish}` : ""}${row.commercialLengthMm ? ` · ${(row.commercialLengthMm / 1000).toLocaleString("es-CL")} m` : ` · ${row.purchaseUnit}`}`;
  return (
    <button
      className={s.product}
      type="button"
      onClick={onOpen}
      aria-label={`Editar precio de ${row.name}, ${row.sku}. Referencia ${money(row.referenceNetPrice, row.currency)}. Efectivo ${money(effective, effectiveCurrency)}. ${origin}`}
    >
      <span className={s.productIdentity}>
        <strong>{row.name}</strong>
        <small>{meta}</small>
      </span>
      <span className={s.reference}>
        <small>Referencia</small>
        <strong>{money(row.referenceNetPrice, row.currency)}</strong>
      </span>
      <span className={s.effective}>
        <small>Efectivo</small>
        <strong>{money(effective, effectiveCurrency)}</strong>
        {effective != null ? <em>{origin}</em> : null}
      </span>
      <Chevron />
    </button>
  );
}

function ProviderRow({ provider, selected, onSelect }: { provider: MySupplierPrices; selected: boolean; onSelect: () => void }) {
  const customCount = provider.presentations.filter((row) => row.ownNetPrice != null).length;
  const adjustment = provider.percentage === 0 ? "Usando referencia" : `Ajuste ${provider.percentage < 0 ? "−" : "+"}${formatPercent(provider.percentage)}%`;
  const status = `${adjustment}${customCount ? ` · ${customCount} ${customCount === 1 ? "precio personalizado" : "precios personalizados"}` : ""}`;
  return (
    <button className={`${s.providerRow} ${selected ? s.providerSelected : ""}`} type="button" onClick={onSelect}>
      <SupplierLogo providerKey={provider.providerKey} providerName={provider.providerName} />
      <span className={s.providerCopy}>
        <strong>{provider.providerName}</strong>
        <small>{formatRevision(provider.revision)} · {provider.presentations.length} {provider.presentations.length === 1 ? "producto" : "productos"}</small>
        <small>{status}</small>
      </span>
      <Chevron />
    </button>
  );
}

function UnavailableProviderRow({ providerName }: { providerName: "WinHouse" | "Arquetipo" }) {
  return (
    <div className={`${s.providerRow} ${s.providerUnavailable}`} aria-label={`${providerName}: sin lista disponible`}>
      <SupplierLogo providerKey={providerName.toLocaleLowerCase("es-CL")} providerName={providerName} />
      <span className={s.providerCopy}>
        <strong>{providerName}</strong>
        <small>Sin lista disponible</small>
      </span>
    </div>
  );
}

export function MisPreciosContent({ catalog, error, busy, save, refresh }: ReturnType<typeof useMisPrecios>) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [familyKey, setFamilyKey] = useState("all");
  const [contextLineTemplateId, setContextLineTemplateId] = useState<number | null>(null);
  const [productFilter, setProductFilter] = useState<ProductFilter>("all");
  const [sheet, setSheet] = useState<SheetState>(null);
  const [closing, setClosing] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [adjustmentMode, setAdjustmentMode] = useState<"discount" | "surcharge">("discount");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [phase, setPhase] = useState<SavePhase>("idle");
  const [saved, setSaved] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const tokenRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const dismissRef = useRef<() => void>(() => undefined);
  const providers = useMemo(() => catalog?.providers ?? [], [catalog?.providers]);
  useEffect(() => {
    if (selectedKey || providers.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const requestedSupplier = params.get("supplier");
    const requestedFamily = params.get("family");
    const lineTemplateId = Number(params.get("lineTemplateId"));
    if (requestedSupplier !== "veratec" || !requestedFamily?.startsWith("veratec:")) return;
    const provider = providers.find((entry) =>
      `${entry.providerKey} ${entry.providerName}`.toLocaleLowerCase("es-CL").match(/xelena|veratec/) &&
      entry.presentations.some((row) => row.familyKeys?.includes(requestedFamily))
    );
    if (!provider) return;
    setSelectedKey(provider.providerKey);
    setFamilyKey(requestedFamily);
    if (Number.isSafeInteger(lineTemplateId) && lineTemplateId > 0) setContextLineTemplateId(lineTemplateId);
  }, [providers, selectedKey]);
  const unavailableProviders = (["WinHouse", "Arquetipo"] as const).filter((name) => !providers.some((provider) => `${provider.providerKey} ${provider.providerName}`.toLocaleLowerCase("es-CL").includes(name.toLocaleLowerCase("es-CL"))));

  useEffect(() => {
    for (const logo of Object.values(supplierLogos)) {
      const image = new window.Image();
      image.decoding = "async";
      image.src = logo.src;
    }
  }, []);

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  };

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  const dismissSheet = () => {
    if (closing) return;
    tokenRef.current += 1;
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setSheet(null);
      setClosing(false);
      setPhase("idle");
      return;
    }
    setClosing(true);
    later(() => {
      setSheet(null);
      setClosing(false);
      setPhase("idle");
    }, 160);
  };

  useEffect(() => {
    dismissRef.current = dismissSheet;
  });

  const acknowledge = (message: string) => {
    const token = tokenRef.current + 1;
    tokenRef.current = token;
    setPhase("saved");
    setSaved(message);
    later(() => {
      if (tokenRef.current !== token) return;
      dismissSheet();
      later(() => setSaved(null), 2200);
    }, 680);
  };

  const openSheet = (next: Exclude<SheetState, null>) => {
    clearTimers();
    tokenRef.current += 1;
    setClosing(false);
    setPhase("idle");
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSheetError(null);
    setSaved(null);
    if (next.kind === "adjustment") {
      const percentage = providers.find((provider) => provider.providerKey === next.providerKey)?.percentage ?? 0;
      setAdjustmentMode(percentage > 0 ? "surcharge" : "discount");
      setAdjustmentAmount(percentage === 0 ? "" : formatPercent(percentage));
    }
    if (next.kind === "price") {
      const row = providers.find((provider) => provider.providerKey === next.providerKey)?.presentations.find((item) => item.presentationId === next.presentationId);
      setPriceInput(row?.ownNetPrice == null ? "" : formatInput(String(Math.round(row.ownNetPrice))));
    }
    setSheet(next);
  };

  const selectedProvider = providers.find((provider) => provider.providerKey === selectedKey) ?? null;
  const familyKeys = useMemo(() => [...new Set((selectedProvider?.presentations ?? []).flatMap((row) => row.familyKeys ?? []))].sort(), [selectedProvider]);
  const familyLabel = (key: string) => key.split(":").at(-1)?.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toLocaleUpperCase("es-CL")) ?? key;
  const visibleRows = (selectedProvider?.presentations ?? []).filter((row) => {
    const matchesSearch = `${row.sku} ${row.name} ${row.finish ?? ""}`.toLocaleLowerCase("es-CL").includes(search.trim().toLocaleLowerCase("es-CL"));
    const matchesFamily = familyKey === "all" || row.familyKeys?.includes(familyKey);
    const matchesFilter = productFilter === "all" || (productFilter === "custom" ? row.ownNetPrice != null : row.effective?.unitNetPrice == null);
    return matchesSearch && matchesFamily && matchesFilter;
  });
  const selectedRow = sheet?.kind === "price" ? selectedProvider?.presentations.find((row) => row.presentationId === sheet.presentationId) ?? null : null;
  const customCount = selectedProvider?.presentations.filter((row) => row.ownNetPrice != null).length ?? 0;

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    if (!sheet) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { dismissRef.current(); return; }
      if (event.key !== "Tab") return;
      const focusable = [...(sheetRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])') ?? [])].filter((element) => !element.hasAttribute("hidden"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const viewport = window.visualViewport;
    const syncKeyboard = () => {
      if (!viewport) return;
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      document.documentElement.style.setProperty("--mp-keyboard", `${Math.round(inset)}px`);
    };
    syncKeyboard();
    viewport?.addEventListener("resize", syncKeyboard);
    viewport?.addEventListener("scroll", syncKeyboard);
    window.addEventListener("keydown", onKey);
    document.body.classList.add("mis-precios-sheet-open");
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
      viewport?.removeEventListener("resize", syncKeyboard);
      viewport?.removeEventListener("scroll", syncKeyboard);
      document.documentElement.style.removeProperty("--mp-keyboard");
      document.body.classList.remove("mis-precios-sheet-open");
      returnFocusRef.current?.focus();
    };
  }, [sheet]);

  const saveAdjustment = async () => {
    if (!sheet || sheet.kind !== "adjustment" || phase === "saved") return;
    const magnitude = Number(adjustmentAmount);
    if (adjustmentAmount.trim() && (!Number.isFinite(magnitude) || magnitude < 0 || magnitude > 1000)) { setSheetError("Ingresa un porcentaje entre 0 y 1.000."); return; }
    const percentage = adjustmentAmount.trim() ? (adjustmentMode === "discount" ? -magnitude : magnitude) : 0;
    const ok = await save({ kind: "adjustment", providerKey: sheet.providerKey, percentage });
    if (ok) acknowledge("Ajuste guardado");
    else setSheetError("No pudimos guardar el ajuste. Revisa tu conexión e inténtalo otra vez.");
  };

  const savePrice = async () => {
    if (!sheet || sheet.kind !== "price" || !selectedRow || phase === "saved") return;
    const raw = priceInput.replace(/\D/g, "");
    if (!raw || Number(raw) <= 0 || !selectedRow.currency) { setSheetError("Ingresa un precio mayor que cero."); return; }
    const ok = await save({ kind: "override", providerKey: sheet.providerKey, presentationId: selectedRow.presentationId, netPrice: Number(raw), currency: selectedRow.currency });
    if (ok) acknowledge("Precio guardado");
    else setSheetError("No pudimos guardar tu precio. Revisa tu conexión e inténtalo otra vez.");
  };

  const clearPrice = async () => {
    if (!sheet || sheet.kind !== "price" || !selectedRow || phase === "saved") return;
    const ok = await save({ kind: "clear_override", providerKey: sheet.providerKey, presentationId: selectedRow.presentationId });
    if (ok) acknowledge("Precio del proveedor");
    else setSheetError("No pudimos actualizar el precio. Revisa tu conexión e inténtalo otra vez.");
  };

  const clearAdjustment = async () => {
    if (!selectedProvider || phase === "saved") return;
    const ok = await save({ kind: "adjustment", providerKey: selectedProvider.providerKey, percentage: 0 });
    if (ok) acknowledge("Ajuste quitado");
    else setSheetError("No pudimos quitar el ajuste. Revisa tu conexión e inténtalo otra vez.");
  };

  const adjustmentPreview = sheet?.kind === "adjustment" ? selectedProvider?.presentations.find((row) => row.referenceNetPrice != null) : null;
  const previewPercentage = sheet?.kind === "adjustment" ? (Number(adjustmentAmount) || 0) * (adjustmentMode === "discount" ? -1 : 1) : 0;
  const adjustedPreview = adjustmentPreview ? adjustedNet(adjustmentPreview.referenceNetPrice, previewPercentage) : null;
  const sheetAdjusted = selectedRow && selectedProvider ? adjustedNet(selectedRow.referenceNetPrice, selectedProvider.percentage) : null;
  const productMeta = selectedRow ? `${selectedRow.sku}${selectedRow.finish ? ` · ${selectedRow.finish}` : ""}${selectedRow.commercialLengthMm ? ` · ${(selectedRow.commercialLengthMm / 1000).toLocaleString("es-CL")} m` : ` · ${selectedRow.purchaseUnit}`}` : "";
  const adjustmentLabel = selectedProvider ? (selectedProvider.percentage === 0 ? "Sin ajuste" : `${selectedProvider.percentage < 0 ? "Descuento" : "Recargo"} ${formatPercent(selectedProvider.percentage)}%`) : "";

  const sheetNode = sheet ? (
    <div className={`${s.sheetOverlay} ${closing ? s.overlayClosing : ""}`} onMouseDown={(event) => { if (event.target === event.currentTarget && phase !== "saved") dismissSheet(); }}>
      <section ref={sheetRef} className={`${s.sheet} ${closing ? s.sheetClosing : ""}`} role="dialog" aria-modal="true" aria-labelledby="price-sheet-title" tabIndex={-1}>
        <div className={s.grabber} aria-hidden="true" />
        <div className={s.sheetHeader}>
          <button type="button" onClick={dismissSheet}>Cancelar</button>
          {sheet.kind === "price" && selectedRow ? (
            <div className={s.sheetHeading}>
              <h2 id="price-sheet-title">{selectedRow.name}</h2>
              <p>{productMeta}</p>
            </div>
          ) : null}
          {sheet.kind === "adjustment" ? (
            <div className={s.sheetHeading}>
              <h2 id="price-sheet-title">Ajuste del proveedor</h2>
              <p>{selectedProvider?.providerName}</p>
            </div>
          ) : null}
          {sheet.kind === "filters" ? (
            <div className={s.sheetHeading}>
              <h2 id="price-sheet-title">Filtros</h2>
              <p>Elige qué productos quieres ver.</p>
            </div>
          ) : null}
        </div>
        {sheet.kind === "adjustment" && selectedProvider ? (
          <>
            <div className={s.sheetScroll}>
              <p className={s.sheetLead}>Se aplica sobre la referencia cuando no hay un precio propio.</p>
              <div className={s.segmented} role="group" aria-label="Tipo de ajuste">
                <button type="button" aria-pressed={adjustmentMode === "discount"} onClick={() => setAdjustmentMode("discount")}>Descuento</button>
                <button type="button" aria-pressed={adjustmentMode === "surcharge"} onClick={() => setAdjustmentMode("surcharge")}>Recargo</button>
              </div>
              <label className={s.fieldLabel} htmlFor="provider-adjustment">Porcentaje</label>
              <div className={s.percentField}>
                <input ref={inputRef} id="provider-adjustment" type="number" inputMode="decimal" min="0" max="1000" step="0.1" value={adjustmentAmount} onChange={(event) => setAdjustmentAmount(event.target.value)} placeholder="0" />
                <span>%</span>
              </div>
              {adjustmentPreview ? (
                <div className={s.summary}>
                  <div><span>Referencia</span><strong>{money(adjustmentPreview.referenceNetPrice, adjustmentPreview.currency)}</strong></div>
                  <div><span>{adjustmentMode === "discount" ? "Con ajuste" : "Con recargo"}</span><strong>{money(previewPercentage === 0 ? adjustmentPreview.referenceNetPrice : adjustedPreview, adjustmentPreview.currency)}</strong></div>
                </div>
              ) : null}
              {sheetError ? <p className={s.sheetError} role="alert">{sheetError}</p> : null}
            </div>
            <footer className={s.sheetActions}>
              <button type="button" onClick={() => void saveAdjustment()} disabled={busy || phase === "saved"}>
                {phase === "saved" ? <span className={s.saveLabel}><CheckGlyph /> Guardado</span> : busy ? "Guardando…" : "Guardar ajuste"}
              </button>
              {selectedProvider.percentage !== 0 ? <button className={s.textAction} type="button" onClick={() => void clearAdjustment()} disabled={busy || phase === "saved"}>{busy ? "Actualizando…" : "Quitar ajuste"}</button> : null}
            </footer>
          </>
        ) : null}
        {sheet.kind === "price" && selectedRow && selectedProvider ? (
          <>
            <div className={s.sheetScroll}>
              <div className={s.summary}>
                <div><span>Referencia</span><strong>{money(selectedRow.referenceNetPrice, selectedRow.currency)}</strong></div>
                {selectedProvider.percentage !== 0 ? <div><span>{selectedProvider.percentage < 0 ? "Con ajuste" : "Con recargo"}</span><strong>{money(sheetAdjusted, selectedRow.currency)}</strong></div> : null}
              </div>
              <label className={s.fieldLabel} htmlFor="own-price">Mi precio neto</label>
              <div className={s.moneyField}>
                <span aria-hidden="true">$</span>
                <input ref={inputRef} id="own-price" type="text" inputMode="numeric" enterKeyHint="done" autoComplete="off" value={priceInput} onChange={(event) => { setSheetError(null); setPriceInput(formatInput(event.target.value)); }} onFocus={(event) => event.currentTarget.select()} onKeyDown={(event) => { if (event.key === "Enter") void savePrice(); }} placeholder="" />
              </div>
              <p className={s.sheetLead}>Tu precio tendrá prioridad sobre el ajuste y la referencia.</p>
              {sheetError ? <p className={s.sheetError} role="alert">{sheetError}</p> : null}
            </div>
            <footer className={s.sheetActions}>
              <button type="button" onClick={() => void savePrice()} disabled={busy || phase === "saved"}>
                {phase === "saved" ? <span className={s.saveLabel}><CheckGlyph /> Guardado</span> : busy ? "Guardando…" : "Guardar precio"}
              </button>
              {selectedRow.ownNetPrice != null ? <button className={s.textAction} type="button" onClick={() => void clearPrice()} disabled={busy || phase === "saved"}>{busy ? "Actualizando…" : "Usar precio del proveedor"}</button> : null}
            </footer>
          </>
        ) : null}
        {sheet.kind === "filters" ? (
          <div className={s.sheetScroll}>
            <span className={s.fieldLabel}>Mostrar productos</span>
            <div className={s.filterOptions} role="listbox" aria-label="Mostrar productos">
              {([{ value: "all", label: "Todos" }, { value: "custom", label: "Con mi precio" }, { value: "pending", label: "Pendientes" }] as const).map((option) => (
                <button key={option.value} type="button" role="option" aria-selected={productFilter === option.value} onClick={() => { setProductFilter(option.value); later(() => dismissSheet(), 150); }}>
                  {option.label}
                  {productFilter === option.value ? <CheckGlyph /> : <span className={s.filterMark} aria-hidden="true" />}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  ) : null;

  return (
    <main className={s.page} aria-hidden={sheet ? true : undefined}>
      <div className={s.topline}>
        <Link className={s.back} href={selectedProvider ? "#" : "/configuracion/empresa"} onClick={selectedProvider ? (event) => { event.preventDefault(); setSelectedKey(null); setSearch(""); setFamilyKey("all"); setProductFilter("all"); } : undefined} aria-label={selectedProvider ? "Volver a Mis precios" : "Volver a Empresa"}>
          <ChevronBack />
          <span>{selectedProvider ? "Mis precios" : "Empresa"}</span>
        </Link>
      </div>
      <header className={`${s.header} ${selectedProvider ? s.headerDetail : ""}`}>
        <h1>Mis precios</h1>
        <p>Precios de compra que Ventora usará para estimar tus costos.</p>
      </header>
      {error && !sheet ? <div className={s.error} role="alert"><span>{error}</span><button type="button" onClick={() => void refresh()}>Reintentar</button></div> : null}
      {!catalog && !error ? <section className={s.loading} aria-label="Cargando proveedores"><i /><i /><i /></section> : catalog ? (
        <div className={`${s.workspace} ${!selectedProvider ? s.noSelection : ""}`}>
          <aside className={`${s.providerPane} ${selectedProvider ? s.mobileHidden : ""}`}>
            <h2>Proveedores</h2>
            <div className={s.providerList}>
              {providers.map((provider) => <ProviderRow key={provider.providerKey} provider={provider} selected={provider.providerKey === selectedProvider?.providerKey} onSelect={() => { setSelectedKey(provider.providerKey); setSearch(""); setFamilyKey("all"); setProductFilter("all"); }} />)}
              {unavailableProviders.map((name) => <UnavailableProviderRow key={name} providerName={name} />)}
            </div>
          </aside>
          <section className={`${s.detailPane} ${selectedProvider ? s.mobileActive : ""}`} aria-label={selectedProvider ? `Precios de ${selectedProvider.providerName}` : "Detalle de proveedor"}>
            {selectedProvider ? (
              <>
                <header className={s.detailHeader}>
                  <div className={s.detailTitle}>
                    <SupplierLogo providerKey={selectedProvider.providerKey} providerName={selectedProvider.providerName} />
                    <div>
                      <h2>{selectedProvider.providerName}</h2>
                      <span>{selectedProvider.presentations.length} {selectedProvider.presentations.length === 1 ? "producto" : "productos"}</span>
                    </div>
                  </div>
                  <div className={s.settings}>
                    <div className={s.settingsRow}>
                      <span className={s.settingsCopy}>
                        <small>Lista de referencia</small>
                        <strong>{formatRevision(selectedProvider.revision)}</strong>
                      </span>
                    </div>
                    <button className={s.settingsRow} type="button" onClick={() => openSheet({ kind: "adjustment", providerKey: selectedProvider.providerKey })}>
                      <span className={s.settingsCopy}>
                        <small>Ajuste del proveedor</small>
                        <strong>{adjustmentLabel}</strong>
                      </span>
                      <Chevron />
                    </button>
                  </div>
                </header>
                <div className={s.tools}>
                  <label className={s.search}>
                    <SearchGlyph />
                    <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto o SKU" aria-label="Buscar producto o SKU" enterKeyHint="search" autoComplete="off" autoCorrect="off" />
                    <button type="button" className={s.clearSearch} aria-label="Limpiar búsqueda" onClick={() => setSearch("")} hidden={!search}>
                      <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.2 2.2 9.8 9.8M9.8 2.2 2.2 9.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                    </button>
                  </label>
                  <div className={s.filterBar}>
                    <label className={s.systemFilter} data-active={familyKey === "all" ? "false" : "true"}>
                      <span className={s.visuallyHidden}>Sistema</span>
                      <select aria-label="Sistema" value={familyKey} onChange={(event) => setFamilyKey(event.target.value)}>
                        <option value="all">Todos</option>
                        {familyKeys.map((key) => <option key={key} value={key}>{familyLabel(key)}</option>)}
                      </select>
                    </label>
                    <button className={s.filterButton} type="button" data-active={productFilter === "all" ? "false" : "true"} onClick={() => openSheet({ kind: "filters" })}>
                      Filtros{productFilter !== "all" ? <span> · 1</span> : null}
                    </button>
                  </div>
                  <p className={s.resultCount}>{visibleRows.length} {visibleRows.length === 1 ? "producto" : "productos"}{customCount ? ` · ${customCount} ${customCount === 1 ? "personalizado" : "personalizados"}` : ""}</p>
                </div>
                {visibleRows.length ? (
                  <div className={s.products}>
                    <div className={s.productHead} aria-hidden="true"><span>Producto</span><span>Referencia</span><span>Efectivo</span></div>
                    {visibleRows.map((row) => <ProductRow key={row.presentationId} row={row} adjustmentPercentage={selectedProvider.percentage} onOpen={() => openSheet({ kind: "price", providerKey: selectedProvider.providerKey, presentationId: row.presentationId })} />)}
                  </div>
                ) : (
                  <div className={s.emptyResults}>
                    <strong>{search ? "No encontramos ese producto" : "No hay productos para este filtro"}</strong>
                    <span>{search ? "Prueba con otro nombre o SKU." : "Cambia el sistema o revisa los filtros."}</span>
                    {(search || productFilter !== "all" || familyKey !== "all") ? <button type="button" onClick={() => { setSearch(""); setProductFilter("all"); setFamilyKey("all"); }}>Mostrar todos</button> : null}
                  </div>
                )}
                {contextLineTemplateId && familyKey.startsWith("veratec:") ? (
                  <TallerPresentaciones lineTemplateId={contextLineTemplateId} familyKey={familyKey} />
                ) : null}
              </>
            ) : (
              <div className={s.desktopPrompt}>
                <strong>{providers.length ? "Elige un proveedor" : "Aún no hay listas disponibles"}</strong>
                <p>{providers.length ? "Verás su lista de referencia y podrás revisar o ajustar cada precio." : "Cuando se publique una lista, podrás revisar y ajustar sus precios aquí."}</p>
              </div>
            )}
          </section>
        </div>
      ) : null}
      {saved && !sheet ? <p className={s.toast} role="status">{saved}</p> : null}
      {sheetNode && typeof document !== "undefined" ? createPortal(sheetNode, document.body) : null}
    </main>
  );
}

function ChevronBack() {
  return (
    <svg viewBox="0 0 8 14" aria-hidden="true">
      <path d="M6.8 1.2 1.4 7l5.4 5.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

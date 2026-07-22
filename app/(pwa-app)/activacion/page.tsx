"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, Suspense, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Download,
  Eye,
  ImagePlus,
  MessageCircle,
  Sparkles,
} from "lucide-react";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useCotizacionesStore } from "@/features/cotizaciones/hooks/useCotizacionesStore";
import type { CotizacionWorkflowRecord } from "@/features/cotizaciones/types/cotizacion-workflow";
import { useActivationGate } from "@/features/onboarding/hooks/useActivationGate";
import {
  ACTIVATION_DEMO,
  buildActivationDemoDraft,
  buildActivationPrintHref,
  buildActivationQuoteSummary,
  buildActivationRealComponentDraft,
  buildActivationRealDraft,
  finalizeActivationDraftForSave,
  isActivationReplayMode,
  parseActivationReturnParams,
} from "@/features/onboarding/services/onboarding-activation-flow.service";
import { useOrganizationProfile } from "@/features/organization-profile/hooks/useOrganizationProfile";
import {
  buildEmpresaProfileInput,
  DEFAULT_ORGANIZATION_BRAND_COLOR,
} from "@/features/organization-profile/services/organization-profile.service";
import { formatCurrency } from "@/utils/formatCurrency";
import {
  buildCotizacionWhatsappMessage,
  buildCotizacionWhatsappUrl,
} from "@/utils/whatsapp";

import { ActivationLineFlowNav } from "./_components/activation-line-flow-nav";
import { ActivationMoneyInput } from "./_components/activation-money-input";
import {
  buildLinePricingPreview,
  buildLineSummaryMeta,
  formatActivationAreaM2,
  parseActivationMoney,
  type LineRoundingMode,
} from "./_lib/activation-line-pricing";

import s from "./page.module.css";

const ACTIVATION_BRAND_PRESETS = [
  "#1E88FF",
  "#4F7DD4",
  "#243B6B",
  "#2EA5E6",
  "#1DB98B",
  "#F59E0B",
] as const;

const ACTIVATION_COMPONENT_CATEGORIES = [
  "Ventana",
  "Puerta",
  "Shower door",
  "Cierre de balcon",
  "Otro trabajo",
] as const;

const ACTIVATION_STEP_ORDER: ActivationStep[] = [
  "welcome",
  "choose",
  "demo",
  "real_mode",
  "real_total",
  "component_method",
  "line_setup",
  "line_work",
  "real_component",
  "result",
  "company",
  "done",
];

const ACTIVATION_LAST_RESULT_STORAGE_KEY = "ventora:activation:last-result";

type ActivationStep =
  | "welcome"
  | "choose"
  | "demo"
  | "real_mode"
  | "real_total"
  | "component_method"
  | "line_setup"
  | "line_work"
  | "real_component"
  | "result"
  | "company"
  | "done";

type GenerateMode = "demo" | "real_total" | "real_component";
type ComponentPricingMode = "manual" | "line";

type ResultContext = {
  record: CotizacionWorkflowRecord;
  trabajo: string;
  isDemo: boolean;
  pdfViewed: boolean;
};

type PersistedActivationResult = {
  cotizacionId: string;
  trabajo: string;
  isDemo: boolean;
  pdfViewed: boolean;
};

type ComponentCategory = (typeof ACTIVATION_COMPONENT_CATEGORIES)[number];

function buildActivationComponentSafeName(category: ComponentCategory) {
  if (category === "Cierre de balcon") return "Cierre de balcon";
  if (category === "Otro trabajo") return "Trabajo personalizado";
  return category;
}

function buildWhatsappHref(record: CotizacionWorkflowRecord) {
  const directUrl = buildCotizacionWhatsappUrl(record);

  if (directUrl) {
    return directUrl;
  }

  const message = buildCotizacionWhatsappMessage(record);
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

function persistActivationResult(input: PersistedActivationResult | null) {
  if (typeof window === "undefined") return;

  try {
    if (!input) {
      window.sessionStorage.removeItem(ACTIVATION_LAST_RESULT_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(ACTIVATION_LAST_RESULT_STORAGE_KEY, JSON.stringify(input));
  } catch {
    return;
  }
}

function ActivationBrand({ welcome = false }: { welcome?: boolean }) {
  return (
    <div className={`${s.activationBrand} ${welcome ? s.activationBrandWelcome : ""}`}>
      <Image
        alt="Ventora"
        className={`${s.activationBrandLogo} ${welcome ? s.activationBrandLogoWelcome : ""}`}
        src="/brand/ventora-logo-boot.svg"
        width={280}
        height={66}
        unoptimized
        priority
      />
    </div>
  );
}

function ActivationProgress({ step }: { step: ActivationStep }) {
  const currentIndex = Math.max(0, ACTIVATION_STEP_ORDER.indexOf(step));
  const progressPct = Math.round(((currentIndex + 1) / ACTIVATION_STEP_ORDER.length) * 100);

  return (
    <div className={s.activationProgress} aria-label={`Paso ${currentIndex + 1} de ${ACTIVATION_STEP_ORDER.length}`}>
      <div className={s.activationProgressTop}>
        <span>Paso {currentIndex + 1} de {ACTIVATION_STEP_ORDER.length}</span>
        <strong>{progressPct}%</strong>
      </div>
      <div className={s.activationProgressTrack} aria-hidden>
        <span style={{ width: `${progressPct}%` }} />
      </div>
    </div>
  );
}

export default function ActivacionPage() {
  return (
    <Suspense fallback={<div className={s.activationLoading}>Preparando tu activacion...</div>}>
      <ActivacionPageContent />
    </Suspense>
  );
}

function ActivacionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReplayMode = useMemo(() => {
    if (isActivationReplayMode(searchParams)) {
      return true;
    }

    if (typeof window === "undefined") {
      return false;
    }

    return isActivationReplayMode(window.location.search);
  }, [searchParams]);
  const { cargando } = useAuth();
  const { saveWorkflow, getCotizacionById, loadCotizacionById } = useCotizacionesStore({
    autoLoadSummary: false,
  });
  const { profile, saveProfile, uploadLogo, isSaving, isUploading } = useOrganizationProfile();
  const { markActivationComplete, markActivationSkipped, isChecking, shouldRedirect } =
    useActivationGate({ isReplayMode });
  const initialGateCheckedRef = useRef(false);
  const hasHydratedCompanyFormRef = useRef(false);
  const hasRestoredPersistedResultRef = useRef(false);
  const isStartingRealQuoteRef = useRef(false);

  const [step, setStep] = useState<ActivationStep>("welcome");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultContext, setResultContext] = useState<ResultContext | null>(null);

  const [clienteNombre, setClienteNombre] = useState("");
  const [tipoTrabajo, setTipoTrabajo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [totalTrabajo, setTotalTrabajo] = useState("");
  const [componentCategory, setComponentCategory] = useState<ComponentCategory>("Ventana");
  const [componenteNombre, setComponenteNombre] = useState("");
  const [anchoComponente, setAnchoComponente] = useState("1200");
  const [altoComponente, setAltoComponente] = useState("1000");
  const [cantidadComponente, setCantidadComponente] = useState("1");
  const [componentPricingMode, setComponentPricingMode] =
    useState<ComponentPricingMode>("manual");
  const [lineaNombre, setLineaNombre] = useState("Linea 5000");
  const [lineaPrecioM2, setLineaPrecioM2] = useState("85000");
  const [lineaMinimo, setLineaMinimo] = useState("");
  const [lineaRedondeo, setLineaRedondeo] = useState<LineRoundingMode>("none");
  const [showLineAdvanced, setShowLineAdvanced] = useState(false);
  const [showCompanyMore, setShowCompanyMore] = useState(false);

  const [empresaNombre, setEmpresaNombre] = useState(profile?.empresaNombre ?? "");
  const [empresaTelefono, setEmpresaTelefono] = useState(profile?.empresaTelefono ?? "");
  const [empresaDireccion, setEmpresaDireccion] = useState(profile?.empresaDireccion ?? "");
  const [empresaEmail, setEmpresaEmail] = useState(profile?.empresaEmail ?? "");
  const [formaPago, setFormaPago] = useState(profile?.formaPago ?? "");
  const [brandColor, setBrandColor] = useState(
    profile?.brandColor ?? DEFAULT_ORGANIZATION_BRAND_COLOR
  );
  const [logoPreview, setLogoPreview] = useState<string | null>(profile?.empresaLogoUrl ?? null);

  const linePricingPreview = useMemo(
    () =>
      buildLinePricingPreview({
        anchoMm: anchoComponente,
        altoMm: altoComponente,
        cantidad: cantidadComponente,
        precioM2Raw: lineaPrecioM2,
        minimoRaw: lineaMinimo,
        redondeo: lineaRedondeo,
      }),
    [
      altoComponente,
      anchoComponente,
      cantidadComponente,
      lineaMinimo,
      lineaPrecioM2,
      lineaRedondeo,
    ]
  );

  const lineSummaryMeta = useMemo(
    () =>
      buildLineSummaryMeta({
        precioM2: parseActivationMoney(lineaPrecioM2),
        minimo: parseActivationMoney(lineaMinimo),
        redondeo: lineaRedondeo,
      }),
    [lineaMinimo, lineaPrecioM2, lineaRedondeo]
  );

  const canContinueLineSetup =
    lineaNombre.trim().length > 0 && parseActivationMoney(lineaPrecioM2) > 0;

  const canGenerateLineWork =
    componenteNombre.trim().length > 0 &&
    Number(anchoComponente.replace(/\D/g, "")) > 0 &&
    Number(altoComponente.replace(/\D/g, "")) > 0 &&
    Number(cantidadComponente.replace(/\D/g, "")) > 0 &&
    linePricingPreview.total > 0;

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.body.dataset.activationRoute = "true";

    return () => {
      delete document.body.dataset.activationRoute;
    };
  }, []);

  useEffect(() => {
    if (!profile || hasHydratedCompanyFormRef.current) {
      return;
    }

    hasHydratedCompanyFormRef.current = true;
    setEmpresaNombre(profile.empresaNombre ?? "");
    setEmpresaTelefono(profile.empresaTelefono ?? "");
    setEmpresaDireccion(profile.empresaDireccion ?? "");
    setEmpresaEmail(profile.empresaEmail ?? "");
    setFormaPago(profile.formaPago ?? "");
    setBrandColor(profile.brandColor ?? DEFAULT_ORGANIZATION_BRAND_COLOR);
    setLogoPreview(profile.empresaLogoUrl ?? null);
  }, [profile]);

  const activationReturnParams = useMemo(
    () => parseActivationReturnParams(searchParams),
    [searchParams]
  );

  useEffect(() => {
    if (!activationReturnParams || isStartingRealQuoteRef.current) {
      return;
    }

    const returnParams = activationReturnParams;
    let cancelled = false;

    async function restoreResultStep() {
      try {
        const record =
          getCotizacionById(returnParams.cotizacionId) ??
          (await loadCotizacionById(returnParams.cotizacionId));

        if (cancelled || !record) {
          return;
        }

        setResultContext({
          record,
          trabajo: record.obra,
          isDemo:
            record.clienteNombre === ACTIVATION_DEMO.clienteNombre &&
            record.obra === ACTIVATION_DEMO.obra,
          pdfViewed: true,
        });
        persistActivationResult({
          cotizacionId: record.id,
          trabajo: record.obra,
          isDemo:
            record.clienteNombre === ACTIVATION_DEMO.clienteNombre &&
            record.obra === ACTIVATION_DEMO.obra,
          pdfViewed: true,
        });
        setStep("result");
      } catch {
        if (!cancelled) {
          setError("No pudimos retomar tu cotizacion de activacion.");
        }
      }
    }

    void restoreResultStep();

    return () => {
      cancelled = true;
    };
  }, [
    activationReturnParams,
    getCotizacionById,
    loadCotizacionById,
  ]);

  useEffect(() => {
    if (
      activationReturnParams ||
      typeof window === "undefined" ||
      hasRestoredPersistedResultRef.current ||
      step !== "welcome"
    ) {
      return;
    }

    hasRestoredPersistedResultRef.current = true;
    const rawValue = window.sessionStorage.getItem(ACTIVATION_LAST_RESULT_STORAGE_KEY);
    if (!rawValue) {
      return;
    }

    const persistedValue = rawValue;
    let cancelled = false;

    async function restorePersistedResult() {
      try {
        const parsed = JSON.parse(persistedValue) as PersistedActivationResult;
        if (!parsed.cotizacionId) {
          return;
        }

        const record =
          getCotizacionById(parsed.cotizacionId) ??
          (await loadCotizacionById(parsed.cotizacionId));

        if (cancelled || !record) {
          return;
        }

        setResultContext({
          record,
          trabajo: parsed.trabajo || record.obra,
          isDemo: parsed.isDemo,
          pdfViewed: parsed.pdfViewed,
        });
        setStep("result");
      } catch {
        persistActivationResult(null);
      }
    }

    void restorePersistedResult();

    return () => {
      cancelled = true;
    };
  }, [activationReturnParams, getCotizacionById, loadCotizacionById, step]);

  useEffect(() => {
    if (isReplayMode || isChecking || initialGateCheckedRef.current || activationReturnParams) {
      return;
    }

    initialGateCheckedRef.current = true;

    if (!shouldRedirect) {
      router.replace("/dashboard");
    }
  }, [activationReturnParams, isChecking, isReplayMode, router, shouldRedirect]);

  const restartReplay = useCallback(() => {
    isStartingRealQuoteRef.current = false;
    setStep("welcome");
    setResultContext(null);
    setError(null);
    setClienteNombre("");
    setTipoTrabajo("");
    setDescripcion("");
    setTotalTrabajo("");
    setComponentCategory("Ventana");
    setComponenteNombre("");
    setAnchoComponente("1200");
    setAltoComponente("1000");
    setCantidadComponente("1");
    setComponentPricingMode("manual");
    setLineaNombre("Linea 5000");
    setLineaPrecioM2("85000");
    setLineaMinimo("");
    setLineaRedondeo("none");
    setShowLineAdvanced(false);
    setShowCompanyMore(false);
    persistActivationResult(null);
  }, []);

  const finishActivation = useCallback(async () => {
    persistActivationResult(null);
    await markActivationComplete();
    router.replace("/dashboard");
  }, [markActivationComplete, router]);

  const skipActivation = useCallback(async () => {
    persistActivationResult(null);
    await markActivationSkipped();
    router.replace("/dashboard");
  }, [markActivationSkipped, router]);

  const enterVentora = useCallback(async () => {
    if (resultContext && !resultContext.isDemo && resultContext.pdfViewed) {
      await finishActivation();
      return;
    }

    await skipActivation();
  }, [finishActivation, resultContext, skipActivation]);

  const startRealQuote = useCallback(() => {
    isStartingRealQuoteRef.current = true;
    persistActivationResult(null);
    setResultContext(null);
    setError(null);

    if (typeof window !== "undefined") {
      window.history.replaceState(
        null,
        "",
        isReplayMode ? "/activacion?replay=1" : "/activacion"
      );
    }

    setStep("real_mode");
  }, [isReplayMode]);

  const markPdfOpened = useCallback(() => {
    setResultContext((current) => {
      if (!current) {
        return current;
      }

      const next = { ...current, pdfViewed: true };
      persistActivationResult({
        cotizacionId: current.record.id,
        trabajo: current.trabajo,
        isDemo: current.isDemo,
        pdfViewed: true,
      });
      return next;
    });
  }, []);

  const generateQuote = useCallback(
    async (mode: GenerateMode) => {
      setIsGenerating(true);
      setError(null);

      try {
        let draft;

        if (mode === "demo") {
          draft = buildActivationDemoDraft();
        } else if (mode === "real_total") {
          if (!tipoTrabajo.trim()) {
            throw new Error("Ingresa el tipo de trabajo.");
          }

          const parsedTotal = Number(totalTrabajo.replace(/\D/g, ""));

          if (!Number.isFinite(parsedTotal) || parsedTotal <= 0) {
            throw new Error("Ingresa un total valido para el trabajo.");
          }

          draft = buildActivationRealDraft({
            clienteNombre,
            tipoTrabajo,
            descripcion,
            total: parsedTotal,
          });
        } else {
          if (!componenteNombre.trim()) {
            throw new Error("Ingresa el nombre o detalle del trabajo.");
          }

          const parsedTotal =
            componentPricingMode === "line"
              ? linePricingPreview.total
              : Number(totalTrabajo.replace(/\D/g, ""));
          const parsedAncho = Number(anchoComponente.replace(/\D/g, ""));
          const parsedAlto = Number(altoComponente.replace(/\D/g, ""));
          const parsedCantidad = Number(cantidadComponente.replace(/\D/g, ""));

          if (componentPricingMode === "line") {
            if (!lineaNombre.trim()) {
              throw new Error("Ingresa el nombre de la linea.");
            }

            if (parseActivationMoney(lineaPrecioM2) <= 0) {
              throw new Error("Ingresa un precio por m2 valido.");
            }
          }

          if (!Number.isFinite(parsedTotal) || parsedTotal <= 0) {
            throw new Error("Ingresa un total valido para el componente.");
          }

          if (!Number.isFinite(parsedAncho) || parsedAncho <= 0) {
            throw new Error("Ingresa un ancho valido en mm.");
          }

          if (!Number.isFinite(parsedAlto) || parsedAlto <= 0) {
            throw new Error("Ingresa un alto valido en mm.");
          }

          draft = buildActivationRealComponentDraft({
            clienteNombre,
            tipoTrabajo: componentCategory,
            componenteNombre: componenteNombre.trim(),
            descripcion:
              descripcion.trim() ||
              (componentPricingMode === "line"
                ? `Calculado con ${lineaNombre.trim()} a ${formatCurrency(parseActivationMoney(lineaPrecioM2))} por m2.`
                : buildActivationComponentSafeName(componentCategory)),
            lineaComercial:
              componentPricingMode === "line" ? lineaNombre.trim() : undefined,
            ancho: parsedAncho,
            alto: parsedAlto,
            cantidad: parsedCantidad > 0 ? parsedCantidad : 1,
            total: parsedTotal,
          });
        }

        const record = await saveWorkflow({
          draft: finalizeActivationDraftForSave(draft),
          estado: "creada",
        });

        setResultContext({
          record,
          trabajo:
            mode === "demo"
              ? ACTIVATION_DEMO.obra
              : mode === "real_component"
                ? componentCategory
                : tipoTrabajo.trim(),
          isDemo: mode === "demo",
          pdfViewed: false,
        });
        persistActivationResult({
          cotizacionId: record.id,
          trabajo:
            mode === "demo"
              ? ACTIVATION_DEMO.obra
              : mode === "real_component"
                ? componentCategory
                : tipoTrabajo.trim(),
          isDemo: mode === "demo",
          pdfViewed: false,
        });
        setStep("result");
      } catch (generationError) {
        setError(
          generationError instanceof Error
            ? generationError.message
            : "No pudimos generar la cotizacion."
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [
      altoComponente,
      anchoComponente,
      cantidadComponente,
      clienteNombre,
      componentCategory,
      componenteNombre,
      componentPricingMode,
      descripcion,
      linePricingPreview.total,
      lineaNombre,
      lineaPrecioM2,
      saveWorkflow,
      tipoTrabajo,
      totalTrabajo,
    ]
  );

  const handleSaveCompany = useCallback(async () => {
    if (!profile) {
      return;
    }

    setError(null);

    if (!empresaNombre.trim() || !empresaTelefono.trim()) {
      setError("Nombre y telefono son obligatorios.");
      return;
    }

    try {
      await saveProfile(
        buildEmpresaProfileInput({
          ...profile,
          empresaNombre: empresaNombre.trim(),
          empresaTelefono: empresaTelefono.trim(),
          empresaDireccion: empresaDireccion.trim(),
          empresaEmail: empresaEmail.trim(),
          formaPago: formaPago.trim(),
          brandColor,
          empresaLogoUrl: logoPreview,
        })
      );
      setStep("done");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No pudimos guardar tus datos de empresa."
      );
    }
  }, [
    brandColor,
    empresaDireccion,
    empresaEmail,
    empresaNombre,
    empresaTelefono,
    formaPago,
    logoPreview,
    profile,
    saveProfile,
  ]);

  const handleLogoChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";

      if (!file) {
        return;
      }

      setError(null);

      try {
        const uploadedUrl = await uploadLogo(file);
        setLogoPreview(uploadedUrl);
      } catch (uploadError) {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "No pudimos subir el logo."
        );
      }
    },
    [uploadLogo]
  );

  if (cargando || isChecking) {
    return <div className={s.activationLoading}>Preparando tu activacion...</div>;
  }

  if (step === "welcome") {
    return (
      <div className={s.activationRoot}>
        <section className={`${s.activationPage} ${s.activationWelcomePage}`}>
          <div className={s.activationWelcomeHero}>
            <ActivationBrand welcome />
            <h1 className={s.activationTitle}>Crea tu primera cotización</h1>
            <p className={s.activationText}>
              Sin configurar precios ni líneas todavía. En menos de 2 minutos tendrás un PDF
              listo para enviar por WhatsApp.
            </p>
          </div>
          <div className={s.activationWelcomePreview} aria-label="Vista previa del PDF">
            <div className={s.activationWelcomePreviewTop}>
              <span>EJEMPLO DE COTIZACIÓN</span>
            </div>
            <div className={s.activationWelcomePreviewBody}>
              <div className={s.activationWindowPreview} aria-hidden="true">
                <span />
                <span />
              </div>
              <div className={s.activationWelcomePreviewInfo}>
                <span>Cliente de prueba</span>
                <strong>Ventana corredera</strong>
                <small>1200 × 1000 mm</small>
              </div>
            </div>
            <div className={s.activationWelcomePreviewTotal}>
              <span>Total</span>
              <strong>$180.000</strong>
            </div>
          </div>
          <div className={`${s.activationActions} ${s.activationWelcomeActions}`}>
            <button
              type="button"
              className={s.activationPrimary}
              onClick={startRealQuote}
            >
              Crear mi primera cotización
              <ArrowRight size={18} aria-hidden />
            </button>
            <button
              type="button"
              className={s.activationWelcomeExampleButton}
              onClick={() => setStep("demo")}
            >
              Ver ejemplo de cotización
            </button>
            <button type="button" className={s.activationGhost} onClick={() => void skipActivation()}>
              Entrar sin guía
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (step === "choose") {
    return (
      <div className={s.activationRoot}>
        <section className={s.activationPage}>
          <ActivationBrand />
          <ActivationProgress step={step} />
          <h1 className={s.activationTitle}>Elige como partir</h1>
          <p className={s.activationText}>
            Parte viendo un ejemplo o crea un presupuesto para un cliente.
          </p>
          <div className={s.activationOptionGrid}>
            <article className={`${s.activationOptionCard} ${s.activationOptionCardRecommended}`}>
              <span className={s.activationBadge}>Recomendado</span>
              <h2 className={s.activationOptionTitle}>Ver un ejemplo</h2>
              <p className={s.activationOptionText}>
                Te mostramos como se vera una cotizacion profesional sin que tengas que escribir nada.
              </p>
              <button
                type="button"
                className={s.activationPrimary}
                onClick={() => setStep("demo")}
              >
                Ver ejemplo
              </button>
            </article>
            <article className={s.activationOptionCard}>
              <h2 className={s.activationOptionTitle}>Crear una cotizacion para un cliente</h2>
              <p className={s.activationOptionText}>
                Ingresa un trabajo real y deja listo tu primer presupuesto.
              </p>
              <button
                type="button"
                className={s.activationSecondary}
                onClick={startRealQuote}
              >
                Crear para un cliente
              </button>
            </article>
          </div>
          <button type="button" className={s.activationGhost} onClick={() => setStep("welcome")}>
            Volver
          </button>
        </section>
      </div>
    );
  }

  if (step === "demo") {
    return (
      <div className={s.activationRoot}>
        <section className={s.activationPage}>
          <ActivationBrand />
          <ActivationProgress step={step} />
          <h1 className={s.activationTitle}>Ver un ejemplo</h1>
          <p className={s.activationText}>
            Ventana corredera con medidas, cantidad, linea y total. Asi se entiende el PDF sin escribir nada.
          </p>
          <div className={s.activationSummary}>
            <div className={s.activationSummaryRow}>
              <span>Cliente</span>
              <strong>{ACTIVATION_DEMO.clienteNombre}</strong>
            </div>
            <div className={s.activationSummaryRow}>
              <span>Trabajo</span>
              <strong>{ACTIVATION_DEMO.obra}</strong>
            </div>
            <div className={s.activationSummaryRow}>
              <span>Componente</span>
              <strong>{ACTIVATION_DEMO.componenteNombre}</strong>
            </div>
            <div className={s.activationSummaryRow}>
              <span>Medidas</span>
              <strong>
                {ACTIVATION_DEMO.ancho} x {ACTIVATION_DEMO.alto} mm
              </strong>
            </div>
            <div className={s.activationSummaryRow}>
              <span>Cantidad</span>
              <strong>{ACTIVATION_DEMO.cantidad}</strong>
            </div>
            <div className={s.activationSummaryRow}>
              <span>Linea</span>
              <strong>Linea 5000</strong>
            </div>
            <div className={s.activationSummaryRow}>
              <span>Precio por m2</span>
              <strong>{formatCurrency(150000)}</strong>
            </div>
            <div className={`${s.activationSummaryRow} ${s.activationSummaryTotal}`}>
              <span>Total</span>
              <strong>{formatCurrency(ACTIVATION_DEMO.total)}</strong>
            </div>
          </div>
          {error ? <p className={s.activationError}>{error}</p> : null}
          <div className={s.activationActions}>
            <button
              type="button"
              className={s.activationPrimary}
              disabled={isGenerating}
              onClick={() => void generateQuote("demo")}
            >
              {isGenerating ? "Generando..." : "Ver PDF de ejemplo"}
            </button>
            <button type="button" className={s.activationGhost} onClick={() => setStep("choose")}>
              Volver
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (step === "real_mode") {
    return (
      <div className={s.activationRoot}>
        <section className={s.activationPage}>
          <ActivationBrand />
          <ActivationProgress step={step} />
          <h1 className={s.activationTitle}>Como quieres crear tu cotizacion?</h1>
          <p className={s.activationText}>
            Elige solo un camino. Puedes cambiar despues dentro de Ventora.
          </p>
          <div className={s.activationOptionGrid}>
            <article className={`${s.activationOptionCard} ${s.activationOptionCardRecommended}`}>
              <h2 className={s.activationOptionTitle}>Cotizar con medidas y componentes</h2>
              <p className={s.activationOptionText}>
                Para ventanas, puertas, shower y otros trabajos. Agrega medidas,
                cantidades y detalles del trabajo.
              </p>
              <p className={s.activationOptionFinePrint}>
                Tambien puedes usar tus lineas con precio por m2, minimo cobrable y redondeo.
              </p>
              <button
                type="button"
                className={s.activationPrimary}
                onClick={() => {
                  setDescripcion("");
                  setTotalTrabajo("");
                  setComponenteNombre("");
                  setAnchoComponente("1200");
                  setAltoComponente("1000");
                  setCantidadComponente("1");
                  setStep("component_method");
                }}
              >
                Usar medidas
              </button>
            </article>
            <article className={`${s.activationOptionCard} ${s.activationOptionCardFast}`}>
              <h2 className={s.activationOptionTitle}>Cotizacion libre por total</h2>
              <p className={s.activationOptionText}>
                Como un cuaderno digital: escribe el trabajo, agrega el valor final
                y genera un PDF profesional.
              </p>
              <button
                type="button"
                className={s.activationSecondary}
                onClick={() => {
                  setDescripcion("");
                  setComponenteNombre("");
                  setTotalTrabajo("");
                  setStep("real_total");
                }}
              >
                Ingresar precio final
              </button>
            </article>
          </div>
          <button type="button" className={s.activationGhost} onClick={() => setStep("choose")}>
            Volver
          </button>
        </section>
      </div>
    );
  }

  if (step === "component_method") {
    return (
      <div className={s.activationRoot}>
        <section className={s.activationPage}>
          <ActivationBrand />
          <ActivationProgress step={step} />
          <h1 className={s.activationTitle}>Como quieres calcular este trabajo?</h1>
          <p className={s.activationText}>
            Usa tus propias lineas para sugerir precios por m2, sin reemplazar tu criterio tecnico.
          </p>
          <div className={s.activationOptionGrid}>
            <article className={`${s.activationOptionCard} ${s.activationOptionCardRecommended}`}>
              <h2 className={s.activationOptionTitle}>Usar una linea por m2</h2>
              <p className={s.activationOptionText}>
                Configura un precio por m2, minimo cobrable y redondeo para sugerir el valor.
              </p>
              <button
                type="button"
                className={s.activationPrimary}
                onClick={() => {
                  setComponentPricingMode("line");
                  setTotalTrabajo("");
                  setShowLineAdvanced(false);
                  setLineaRedondeo("none");
                  setLineaMinimo("");
                  setStep("line_setup");
                }}
              >
                Usar linea por m2
              </button>
            </article>
            <article className={s.activationOptionCard}>
              <h2 className={s.activationOptionTitle}>Ingresar precio manual</h2>
              <p className={s.activationOptionText}>
                Usalo si ya sabes cuanto cobraras.
              </p>
              <button
                type="button"
                className={s.activationSecondary}
                onClick={() => {
                  setComponentPricingMode("manual");
                  setStep("real_component");
                }}
              >
                Ingresar precio manual
              </button>
            </article>
          </div>
          <button type="button" className={s.activationGhost} onClick={() => setStep("real_mode")}>
            Volver
          </button>
        </section>
      </div>
    );
  }

  if (step === "real_total") {
    return (
      <div className={s.activationRoot}>
        <section className={s.activationPage}>
          <ActivationBrand />
          <ActivationProgress step={step} />
          <h1 className={s.activationTitle}>Ingresar precio final</h1>
          <p className={s.activationText}>Solo lo esencial para generar el PDF.</p>
          <label className={s.activationField}>
            <span className={s.activationLabel}>Nombre del cliente (opcional)</span>
            <input
              className={s.activationInput}
              value={clienteNombre}
              onChange={(event) => setClienteNombre(event.target.value)}
              placeholder="Ej: Maria Gonzalez"
            />
          </label>
          <label className={s.activationField}>
            <span className={s.activationLabel}>Tipo de trabajo</span>
            <input
              className={s.activationInput}
              value={tipoTrabajo}
              onChange={(event) => setTipoTrabajo(event.target.value)}
              placeholder="Ej: Ventana corredera"
            />
          </label>
          <label className={s.activationField}>
            <span className={s.activationLabel}>Descripcion breve</span>
            <textarea
              className={s.activationTextarea}
              value={descripcion}
              onChange={(event) => setDescripcion(event.target.value)}
              placeholder="Ej: Ventana corredera de aluminio blanco"
            />
          </label>
          <label className={s.activationField}>
            <span className={s.activationLabel}>Total final que cobraras al cliente</span>
            <input
              className={s.activationInput}
              value={totalTrabajo}
              onChange={(event) => setTotalTrabajo(event.target.value.replace(/[^\d.]/g, ""))}
              placeholder="Ej: 180000"
              inputMode="numeric"
            />
            <span className={s.activationHelpText}>
              Este valor se mostrara como precio final en el PDF.
            </span>
          </label>
          {error ? <p className={s.activationError}>{error}</p> : null}
          <div className={s.activationActions}>
            <button
              type="button"
              className={s.activationPrimary}
              disabled={isGenerating}
              onClick={() => void generateQuote("real_total")}
            >
              {isGenerating ? "Generando..." : "Generar cotizacion"}
            </button>
            <button type="button" className={s.activationGhost} onClick={() => setStep("real_mode")}>
              Volver
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (step === "line_setup") {
    return (
      <div className={s.activationRoot}>
        <section className={`${s.activationPage} ${s.activationPageWithStickyActions}`}>
          <ActivationBrand />
          <ActivationLineFlowNav phase="line" />
          <h1 className={s.activationTitle}>Configura tu primera linea</h1>
          <p className={s.activationText}>
            Guarda tu precio por m² para sugerir valores mas rapido.
          </p>

          <label className={s.activationField}>
            <span className={s.activationLabelReadable}>Nombre de la linea</span>
            <input
              className={s.activationInput}
              value={lineaNombre}
              onChange={(event) => setLineaNombre(event.target.value)}
              placeholder="Ej. Linea 5000"
            />
          </label>

          <ActivationMoneyInput
            label="Precio por m²"
            value={lineaPrecioM2}
            onChange={setLineaPrecioM2}
            suffix="por m²"
            helpText="Valor que normalmente cobras por cada m²."
          />

          {!showLineAdvanced ? (
            <button
              type="button"
              className={s.activationInlineLink}
              onClick={() => setShowLineAdvanced(true)}
            >
              Agregar minimo y redondeo opcional
            </button>
          ) : (
            <div className={s.activationLineAdvanced}>
              <ActivationMoneyInput
                label="Minimo cobrable"
                value={lineaMinimo}
                onChange={setLineaMinimo}
                helpText="Solo si cobras un valor minimo aunque la medida sea pequena."
              />
              <div className={s.activationField}>
                <span className={s.activationLabelReadable}>Redondeo</span>
                <div
                  className={`${s.activationSegmented} ${s.activationSegmentedCompact}`}
                  role="group"
                  aria-label="Redondeo"
                >
                  {[
                    ["none", "Sin redondeo"],
                    ["1000", "A $1.000"],
                    ["5000", "A $5.000"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`${s.activationSegmentedButton} ${
                        lineaRedondeo === value ? s.activationSegmentedButtonActive : ""
                      }`}
                      onClick={() => setLineaRedondeo(value as LineRoundingMode)}
                      aria-pressed={lineaRedondeo === value}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {error ? <p className={s.activationError}>{error}</p> : null}

          <div className={s.activationActions}>
            <button
              type="button"
              className={s.activationPrimary}
              disabled={!canContinueLineSetup}
              onClick={() => {
                setError(null);
                setStep("line_work");
              }}
            >
              Continuar
            </button>
            <button
              type="button"
              className={s.activationGhost}
              onClick={() => setStep("component_method")}
            >
              Volver
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (step === "line_work") {
    const precioM2 = parseActivationMoney(lineaPrecioM2);
    const suggestedPriceLabel =
      canGenerateLineWork && linePricingPreview.total > 0
        ? `Ver cotizacion por ${formatCurrency(linePricingPreview.total)}`
        : "Ver mi cotizacion";

    return (
      <div className={s.activationRoot}>
        <section className={`${s.activationPage} ${s.activationPageWithStickyActions}`}>
          <ActivationBrand />
          <ActivationLineFlowNav phase="work" />
          <article className={s.activationLineCompactCard}>
            <div className={s.activationLineCompactCardCopy}>
              <strong>{lineaNombre.trim() || "Tu linea"}</strong>
              <span>{formatCurrency(precioM2)} por m²</span>
              <small>{lineSummaryMeta}</small>
            </div>
            <button
              type="button"
              className={s.activationInlineLink}
              onClick={() => setStep("line_setup")}
            >
              Editar
            </button>
          </article>

          <h1 className={s.activationTitle}>Agrega tu primer trabajo</h1>
          <p className={s.activationText}>
            Ingresa las medidas y Ventora te sugerira un valor.
          </p>

          <div className={s.activationField}>
            <span className={s.activationLabelReadable}>Que vas a cotizar?</span>
            <div
              className={`${s.activationChipGrid} ${s.activationChipGridCompact}`}
              role="group"
              aria-label="Tipo de trabajo"
            >
              {ACTIVATION_COMPONENT_CATEGORIES.map((category) => {
                const isSelected = componentCategory === category;

                return (
                  <button
                    key={category}
                    type="button"
                    className={`${s.activationChoiceChip} ${isSelected ? s.activationChoiceChipActive : ""}`}
                    onClick={() => {
                      setComponentCategory(category);
                      setTipoTrabajo(category);
                    }}
                    aria-pressed={isSelected}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          <label className={s.activationField}>
            <span className={s.activationLabelReadable}>Nombre o detalle</span>
            <input
              className={s.activationInput}
              value={componenteNombre}
              onChange={(event) => setComponenteNombre(event.target.value)}
              placeholder="Ej. Ventana corredera de aluminio"
            />
          </label>

          <div className={`${s.activationFieldRow} ${s.activationFieldRowKeepCols}`}>
            <label className={s.activationField}>
              <span className={s.activationLabelReadable}>Ancho (mm)</span>
              <input
                className={`${s.activationInput} ${s.activationInputLarge}`}
                value={anchoComponente}
                onChange={(event) => setAnchoComponente(event.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
              />
            </label>
            <label className={s.activationField}>
              <span className={s.activationLabelReadable}>Alto (mm)</span>
              <input
                className={`${s.activationInput} ${s.activationInputLarge}`}
                value={altoComponente}
                onChange={(event) => setAltoComponente(event.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
              />
            </label>
          </div>

          <label className={s.activationField}>
            <span className={s.activationLabelReadable}>Cantidad</span>
            <input
              className={`${s.activationInput} ${s.activationInputLarge}`}
              value={cantidadComponente}
              onChange={(event) => setCantidadComponente(event.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
            />
          </label>

          <div className={s.activationSuggestedPrice}>
            <span className={s.activationLabelReadable}>Precio sugerido</span>
            <strong>{formatCurrency(linePricingPreview.total)}</strong>
            {linePricingPreview.areaM2 > 0 && precioM2 > 0 ? (
              <p>
                {formatActivationAreaM2(linePricingPreview.areaM2)} m² ×{" "}
                {formatCurrency(precioM2)} por m²
              </p>
            ) : (
              <p>Ingresa medidas validas para calcular el valor.</p>
            )}
            {linePricingPreview.minimumApplied ? (
              <p className={s.activationSuggestedPriceNote}>Se aplico el minimo cobrable.</p>
            ) : null}
            {linePricingPreview.roundingApplied ? (
              <p className={s.activationSuggestedPriceNote}>
                Redondeado a {formatCurrency(Number(lineaRedondeo))}
              </p>
            ) : null}
          </div>

          {error ? <p className={s.activationError}>{error}</p> : null}

          <div className={s.activationActions}>
            <button
              type="button"
              className={s.activationPrimary}
              disabled={isGenerating || !canGenerateLineWork}
              onClick={() => void generateQuote("real_component")}
            >
              {isGenerating ? "Generando..." : suggestedPriceLabel}
            </button>
            <button
              type="button"
              className={s.activationGhost}
              onClick={() => setStep("line_setup")}
            >
              Volver
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (step === "real_component") {
    return (
      <div className={s.activationRoot}>
        <section className={`${s.activationPage} ${s.activationPageWithStickyActions}`}>
          <ActivationBrand />
          <ActivationProgress step={step} />
          <h1 className={s.activationTitle}>Ingresa el precio manual</h1>
          <p className={s.activationText}>Elige el tipo de trabajo e ingresa el valor final.</p>
          <label className={s.activationField}>
            <span className={s.activationLabelReadable}>Nombre del cliente (opcional)</span>
            <input
              className={s.activationInput}
              value={clienteNombre}
              onChange={(event) => setClienteNombre(event.target.value)}
              placeholder="Ej: Maria Gonzalez"
            />
          </label>
          <div className={s.activationField}>
            <span className={s.activationLabelReadable}>Tipo de trabajo</span>
            <div
              className={`${s.activationChipGrid} ${s.activationChipGridCompact}`}
              role="group"
              aria-label="Tipo de trabajo"
            >
              {ACTIVATION_COMPONENT_CATEGORIES.map((category) => {
                const isSelected = componentCategory === category;

                return (
                  <button
                    key={category}
                    type="button"
                    className={`${s.activationChoiceChip} ${isSelected ? s.activationChoiceChipActive : ""}`}
                    onClick={() => {
                      setComponentCategory(category);
                      setTipoTrabajo(category);
                    }}
                    aria-pressed={isSelected}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>
          <label className={s.activationField}>
            <span className={s.activationLabelReadable}>Nombre o detalle</span>
            <input
              className={s.activationInput}
              value={componenteNombre}
              onChange={(event) => setComponenteNombre(event.target.value)}
              placeholder="Ej: Ventana corredera de aluminio"
            />
          </label>
          <div className={`${s.activationFieldRow} ${s.activationFieldRowKeepCols}`}>
            <label className={s.activationField}>
              <span className={s.activationLabelReadable}>Ancho (mm)</span>
              <input
                className={`${s.activationInput} ${s.activationInputLarge}`}
                value={anchoComponente}
                onChange={(event) => setAnchoComponente(event.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
              />
            </label>
            <label className={s.activationField}>
              <span className={s.activationLabelReadable}>Alto (mm)</span>
              <input
                className={`${s.activationInput} ${s.activationInputLarge}`}
                value={altoComponente}
                onChange={(event) => setAltoComponente(event.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
              />
            </label>
          </div>
          <label className={s.activationField}>
            <span className={s.activationLabelReadable}>Cantidad</span>
            <input
              className={`${s.activationInput} ${s.activationInputLarge}`}
              value={cantidadComponente}
              onChange={(event) => setCantidadComponente(event.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
            />
          </label>
          <ActivationMoneyInput
            label="Precio manual"
            value={totalTrabajo}
            onChange={setTotalTrabajo}
            helpText="Valor final que cobraras por este trabajo."
          />
          {error ? <p className={s.activationError}>{error}</p> : null}
          <div className={s.activationActions}>
            <button
              type="button"
              className={s.activationPrimary}
              disabled={isGenerating}
              onClick={() => void generateQuote("real_component")}
            >
              {isGenerating ? "Generando..." : "Ver mi cotizacion"}
            </button>
            <button type="button" className={s.activationGhost} onClick={() => setStep("component_method")}>
              Volver
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (step === "result" && resultContext) {
    const { record, trabajo, isDemo, pdfViewed } = resultContext;
    const summary = buildActivationQuoteSummary(record);
    const printHref = buildActivationPrintHref(record.id, { isReplayMode });
    const whatsappHref = buildWhatsappHref(record);
    const isSimpleTotal = summary.quotePricingMode === "total_global";

    return (
      <div className={s.activationRoot}>
        <section className={s.activationPage}>
          <ActivationBrand />
          <ActivationProgress step={step} />
          <h1 className={s.activationTitle}>
            {isDemo && pdfViewed ? "Asi se vera tu cotizacion" : "Tu cotizacion esta lista"}
          </h1>
          <p className={s.activationText}>
            {isDemo && pdfViewed
              ? "Ahora crea una para un cliente real y enviala por WhatsApp. Tambien puedes guardar tus propias lineas, precios por m2, minimos cobrables y redondeos."
              : "Revisa el PDF como lo vera tu cliente por WhatsApp."}
          </p>
          <div className={s.activationSummary}>
            <div className={s.activationSummaryRow}>
              <span>Cotizacion</span>
              <strong>{summary.codigo}</strong>
            </div>
            <div className={s.activationSummaryRow}>
              <span>Cliente</span>
              <strong>{summary.clienteNombre}</strong>
            </div>
            <div className={s.activationSummaryRow}>
              <span>Trabajo</span>
              <strong>{trabajo}</strong>
            </div>

            {summary.items.length > 0 && !isSimpleTotal ? (
              <div className={s.activationSummarySection}>
                <p className={s.activationSummarySectionTitle}>
                  {summary.quotePricingMode === "total_global" ? "Trabajo cotizado" : "Componentes"}
                </p>
                <div className={s.activationSummaryItems}>
                  {summary.items.map((item) => (
                    <article key={item.id} className={s.activationSummaryItem}>
                      <div className={s.activationSummaryItemHead}>
                        <strong>{item.title}</strong>
                        <span>{formatCurrency(item.precioTotal)}</span>
                      </div>
                      <p className={s.activationSummaryItemDetail}>{item.detail}</p>
                      {item.lineaComercial ? (
                        <p className={s.activationSummaryItemMeta}>Linea usada: {item.lineaComercial}</p>
                      ) : null}
                      <p className={s.activationSummaryItemMeta}>
                        {item.cantidad} x {formatCurrency(item.precioUnitario)}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            <div className={s.activationSummarySection}>
              <p className={s.activationSummarySectionTitle}>Resumen</p>
              {!isSimpleTotal ? (
                <>
                  <div className={s.activationSummaryRow}>
                    <span>Subtotal trabajos</span>
                    <strong>{formatCurrency(summary.subtotal)}</strong>
                  </div>
                  {summary.descuentoValor > 0 ? (
                    <div className={s.activationSummaryRow}>
                      <span>Descuento</span>
                      <strong>-{formatCurrency(summary.descuentoValor)}</strong>
                    </div>
                  ) : null}
                  {summary.descuentoValor > 0 ? (
                    <div className={s.activationSummaryRow}>
                      <span>Neto</span>
                      <strong>{formatCurrency(summary.neto)}</strong>
                    </div>
                  ) : null}
                  {summary.flete > 0 ? (
                    <div className={s.activationSummaryRow}>
                      <span>Flete</span>
                      <strong>{formatCurrency(summary.flete)}</strong>
                    </div>
                  ) : null}
                  {summary.includesIva ? (
                    <div className={s.activationSummaryRow}>
                      <span>IVA 19%</span>
                      <strong>{formatCurrency(summary.iva)}</strong>
                    </div>
                  ) : null}
                </>
              ) : null}
              <div className={`${s.activationSummaryRow} ${s.activationSummaryTotal}`}>
                <span>{isSimpleTotal ? "Total final" : "Total presupuesto"}</span>
                <strong>{formatCurrency(summary.total)}</strong>
              </div>
              {summary.includesIva && !isSimpleTotal ? (
                <p className={s.activationSummaryNote}>
                  El precio que ingresaste es el neto del trabajo. El total incluye IVA 19%.
                </p>
              ) : isSimpleTotal ? (
                <p className={s.activationSummaryNote}>
                  Solo total final. Sin IVA ni campos avanzados en este primer flujo.
                </p>
              ) : null}
            </div>
          </div>
          <div className={s.activationActions}>
            {isDemo && pdfViewed ? (
              <>
                <button
                  type="button"
                  className={s.activationPrimary}
                  onClick={startRealQuote}
                >
                  Crear mi cotizacion
                  <ArrowRight size={18} aria-hidden />
                </button>
                <button type="button" className={s.activationGhost} onClick={() => void enterVentora()}>
                  Entrar a Ventora
                </button>
              </>
            ) : pdfViewed ? (
              <>
                <a className={s.activationPrimary} href={whatsappHref} target="_blank" rel="noreferrer">
                  <MessageCircle size={18} aria-hidden />
                  Enviar por WhatsApp
                </a>
                <Link className={s.activationSecondary} href={printHref} target="_blank">
                  <Download size={18} aria-hidden />
                  Descargar PDF
                </Link>
                <button type="button" className={s.activationSecondary} onClick={() => setStep("company")}>
                  <Building2 size={18} aria-hidden />
                  Dejar PDF listo con mis datos
                </button>
                <button type="button" className={s.activationGhost} onClick={() => void enterVentora()}>
                  Entrar a Ventora
                </button>
              </>
            ) : (
              <>
                <Link className={s.activationPrimary} href={printHref} onClick={markPdfOpened}>
                  <Eye size={18} aria-hidden />
                  Ver PDF
                </Link>
                <button type="button" className={s.activationSecondary} onClick={() => setStep("company")}>
                  <Building2 size={18} aria-hidden />
                  Dejar PDF listo con mis datos
                </button>
                <button type="button" className={s.activationGhost} onClick={() => void enterVentora()}>
                  Entrar a Ventora
                </button>
              </>
            )}
          </div>
        </section>
      </div>
    );
  }

  if (step === "company") {
    return (
      <div className={s.activationRoot}>
        <section className={s.activationPage}>
          <ActivationBrand />
          <ActivationProgress step={step} />
          <h1 className={s.activationTitle}>Deja tu PDF listo con tus datos</h1>
          <p className={s.activationText}>
            Agrega tus datos para que tu cliente sepa a quien contactar. Puedes editar esto despues.
          </p>
          <p className={s.activationComfortHint}>
            No te preocupes: puedes agregar o cambiar esto cuando quieras.
          </p>
          <label className={s.activationField}>
            <span className={s.activationLabel}>Nombre de empresa</span>
            <input
              className={s.activationInput}
              value={empresaNombre}
              onChange={(event) => setEmpresaNombre(event.target.value)}
              placeholder="Ej: Vidrieria San Marco"
            />
          </label>
          <label className={s.activationField}>
            <span className={s.activationLabel}>Telefono</span>
            <input
              className={s.activationInput}
              value={empresaTelefono}
              onChange={(event) => setEmpresaTelefono(event.target.value)}
              placeholder="+56 9 1234 5678"
            />
          </label>
          <label className={s.activationLogoUpload}>
            <span className={s.activationPreviewLogo}>
              {logoPreview ? (
                <Image src={logoPreview} alt="Logo" width={42} height={42} unoptimized />
              ) : (
                <ImagePlus size={18} aria-hidden />
              )}
            </span>
            <span className={s.activationLogoUploadCopy}>
              <strong>{isUploading ? "Subiendo logo..." : "Logo opcional"}</strong>
              <span>PNG o JPG</span>
            </span>
            <input type="file" accept="image/*" onChange={(event) => void handleLogoChange(event)} />
          </label>
          <button
            type="button"
            className={s.activationSecondary}
            onClick={() => setShowCompanyMore((current) => !current)}
          >
            {showCompanyMore ? "Ocultar datos opcionales" : "Agregar mas datos opcionales"}
          </button>
          {showCompanyMore ? (
            <div className={s.activationOptionalGroup}>
              <p className={s.activationOptionalTitle}>Opcional</p>
              <label className={s.activationField}>
                <span className={`${s.activationLabel} ${s.activationLabelOptional}`}>Direccion</span>
                <input
                  className={s.activationInput}
                  value={empresaDireccion}
                  onChange={(event) => setEmpresaDireccion(event.target.value)}
                  placeholder="Ej: Apoquindo 4501, Las Condes"
                />
              </label>
              <label className={s.activationField}>
                <span className={`${s.activationLabel} ${s.activationLabelOptional}`}>Email</span>
                <input
                  className={s.activationInput}
                  type="email"
                  value={empresaEmail}
                  onChange={(event) => setEmpresaEmail(event.target.value)}
                  placeholder="contacto@empresa.cl"
                  autoComplete="email"
                />
              </label>
              <label className={s.activationField}>
                <span className={`${s.activationLabel} ${s.activationLabelOptional}`}>
                  Forma de pago
                </span>
                <textarea
                  className={s.activationTextarea}
                  value={formaPago}
                  onChange={(event) => setFormaPago(event.target.value)}
                  placeholder="Ej: 50% al iniciar el trabajo, 50% al finalizar"
                  rows={3}
                />
              </label>
              <div className={s.activationField}>
                <span className={`${s.activationLabel} ${s.activationLabelOptional}`}>
                  Color de marca
                </span>
                <div className={s.activationColorRow}>
                  {ACTIVATION_BRAND_PRESETS.map((color) => {
                    const isActive = brandColor.toLowerCase() === color.toLowerCase();

                    return (
                      <button
                        key={color}
                        type="button"
                        className={`${s.activationColorSwatch} ${isActive ? s.activationColorSwatchActive : ""}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setBrandColor(color)}
                        aria-label={`Usar color ${color}`}
                        aria-pressed={isActive}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
          {error ? <p className={s.activationError}>{error}</p> : null}
          <div className={s.activationActions}>
            <button
              type="button"
              className={s.activationPrimary}
              disabled={isSaving}
              onClick={() => void handleSaveCompany()}
            >
              {isSaving ? "Guardando..." : "Guardar y continuar"}
            </button>
            <button type="button" className={s.activationGhost} onClick={() => setStep("result")}>
              Volver al resultado
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={s.activationRoot}>
      <section className={s.activationPage}>
        <ActivationBrand />
        <ActivationProgress step={step} />
        <Sparkles size={28} color="#1e88ff" aria-hidden />
        <h1 className={s.activationTitle}>Listo, ya puedes usar Ventora</h1>
        <p className={s.activationText}>
          Ahora puedes crear cotizaciones, descargar tus PDF y enviarlos por WhatsApp.
        </p>
        <div className={s.activationActions}>
          <button type="button" className={s.activationPrimary} onClick={() => void enterVentora()}>
            Ir al inicio
          </button>
          {isReplayMode ? (
            <button type="button" className={s.activationSecondary} onClick={restartReplay}>
              Probar de nuevo
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}

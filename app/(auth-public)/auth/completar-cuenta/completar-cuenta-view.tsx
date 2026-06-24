"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Building2 } from "lucide-react";

import { googleTagService } from "@/features/analytics/services/google-tag.service";
import type { AuthOAuthProvider } from "@/features/auth/types/auth";
import s from "../../login/login.module.css";

interface CompletarCuentaViewProps {
  nextPath: string;
  email: string;
  provider: AuthOAuthProvider;
}

const copy = {
  title: "Completa tu empresa",
  subtitle:
    "Ya validamos tu correo. Solo falta el nombre de tu empresa para activar tu prueba.",
  empresaLabel: "Nombre de la empresa",
  empresaPlaceholder: "Ej: Vidrios del Sur",
  submit: "Activar prueba gratis",
  submitting: "Creando tu cuenta...",
  loginPrompt: "¿Quieres usar otra cuenta?",
  loginAction: "Volver al inicio de sesion",
  errorGeneric: "No pudimos crear tu cuenta. Intenta de nuevo.",
  identityConflict:
    "Este correo ya esta vinculado a otra cuenta de acceso. Contactanos si necesitas ayuda.",
};

export default function CompletarCuentaView({
  nextPath,
  email,
  provider,
}: CompletarCuentaViewProps) {
  const router = useRouter();
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    googleTagService.trackEvent(`${provider}_signup_started`, {
      event_category: "auth",
      event_label: "completar_cuenta_view",
      next_path: nextPath,
      oauth_provider: provider,
    });
  }, [nextPath, provider]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCargando(true);

    try {
      const response = await fetch("/api/auth/oauth/complete-registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          empresaNombre,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; code?: string; alreadyProvisioned?: boolean }
        | null;

      if (!response.ok) {
        if (payload?.code === "identity_conflict") {
          setError(copy.identityConflict);
          googleTagService.trackEvent(`${provider}_signup_abandoned`, {
            event_category: "auth",
            event_label: "identity_conflict",
            oauth_provider: provider,
          });
          return;
        }

        setError(payload?.error ?? copy.errorGeneric);
        googleTagService.trackEvent(`${provider}_signup_abandoned`, {
          event_category: "auth",
          event_label: payload?.code ?? "unknown",
          oauth_provider: provider,
        });
        return;
      }

      if (!payload?.alreadyProvisioned) {
        googleTagService.trackEvent("trial_started", {
          event_category: "auth",
          event_label: `${provider}_oauth_signup`,
          next_path: "/activacion",
          oauth_provider: provider,
        });
      }

      googleTagService.trackEvent(`${provider}_signup_completed`, {
        event_category: "auth",
        event_label: payload?.alreadyProvisioned ? "already_provisioned" : "new_org",
        next_path: "/activacion",
        oauth_provider: provider,
      });

      router.replace("/activacion");
    } catch {
      setError(copy.errorGeneric);
      googleTagService.trackEvent(`${provider}_signup_abandoned`, {
        event_category: "auth",
        event_label: "network_error",
        oauth_provider: provider,
      });
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className={s.root}>
      <section className={s.formPanel}>
        <div className={s.formShell}>
          <Link href="/" className={s.brand} aria-label="Ventora">
            <Image
              src="/brand/ventora-logo-premium-dark.svg"
              alt="Ventora"
              width={348}
              height={82}
              className={s.brandLogo}
              unoptimized
            />
          </Link>

          <div className={s.formCard}>
            <header className={s.formHeader}>
              <h1 className={s.formTitle}>{copy.title}</h1>
              <p className={s.formSubtitle}>{copy.subtitle}</p>
              <p className={s.helperText}>{email}</p>
            </header>

            <form
              className={s.form}
              onSubmit={onSubmit}
              noValidate
              method="post"
              action="javascript:void(0)"
            >
              <div className={s.field}>
                <label className={s.fieldLabel} htmlFor="empresaNombre">
                  {copy.empresaLabel}
                </label>
                <div className={s.fieldControl}>
                  <Building2 size={18} aria-hidden />
                  <input
                    id="empresaNombre"
                    name="empresaNombre"
                    type="text"
                    className={s.fieldInput}
                    placeholder={copy.empresaPlaceholder}
                    value={empresaNombre}
                    onChange={(event) => {
                      setEmpresaNombre(event.target.value);
                      setError(null);
                    }}
                    autoComplete="organization"
                    required
                    minLength={2}
                  />
                </div>
              </div>

              {error ? (
                <div className={s.errorBox} role="alert" aria-live="polite">
                  <span className={s.errorMark} aria-hidden>
                    !
                  </span>
                  <span>{error}</span>
                </div>
              ) : null}

              <button
                type="submit"
                className={s.primaryButton}
                disabled={cargando}
              >
                <span className={s.buttonContent}>
                  {cargando ? <span className={s.spinner} aria-hidden /> : null}
                  {cargando ? copy.submitting : copy.submit}
                </span>
                <ArrowRight size={18} aria-hidden />
              </button>
            </form>

            <p className={s.signupText}>
              <span>{copy.loginPrompt}</span>{" "}
              <Link href="/login">{copy.loginAction}</Link>
            </p>
          </div>
        </div>
      </section>

      <section className={s.visualPanel} aria-hidden>
        <Image
          src="/brand/login-hero-premium.png"
          alt=""
          fill
          priority
          sizes="(max-width: 920px) 100vw, 60vw"
          className={s.visualImage}
        />
        <div className={s.visualOverlay} />

        <div className={s.visualCopy}>
          <p className={s.visualEyebrow}>Prueba gratuita</p>
          <h2 className={s.visualTitle}>Empieza a cotizar con Ventora en minutos</h2>
          <p className={s.visualDescription}>
            Tu cuenta queda lista con 7 dias de prueba para captar, ordenar y cerrar trabajos desde el celular.
          </p>
        </div>
      </section>
    </main>
  );
}

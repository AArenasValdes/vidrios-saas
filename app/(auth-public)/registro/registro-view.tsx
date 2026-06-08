"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Eye, EyeOff, Lock, Mail } from "lucide-react";

import { useAuth } from "@/features/auth/hooks/useAuth";
import s from "../login/login.module.css";

const copy = {
  title: "Crea tu cuenta",
  subtitle:
    "Prueba Ventora 7 dias gratis con acceso completo. Luego configuras tu empresa dentro del sistema.",
  emailLabel: "Correo",
  emailPlaceholder: "tu@empresa.cl",
  passwordLabel: "Contrasena",
  passwordPlaceholder: "Minimo 8 caracteres",
  empresaLabel: "Nombre de la empresa",
  empresaPlaceholder: "Ej: Vidrios del Sur",
  submit: "Crear cuenta",
  submitting: "Creando cuenta...",
  loginPrompt: "Ya tienes acceso?",
  loginAction: "Iniciar sesion",
  trialNote: "Incluye solicitudes, pagina publica y cotizaciones durante la prueba.",
  passwordShow: "Mostrar",
  passwordHide: "Ocultar",
  visualEyebrow: "Prueba completa 7 dias",
  visualTitle: "Empieza a captar y cotizar con mas orden",
  visualDescription:
    "Pensado para talleres de vidrios y aluminio que venden por WhatsApp y necesitan una presencia seria.",
};

export default function RegistroView() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCargando(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: correo,
          password,
          empresaNombre,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        setError(payload?.error ?? "No pudimos crear tu cuenta.");
        return;
      }

      try {
        await signIn({
          email: correo.trim(),
          password,
        });
        router.replace("/dashboard");
      } catch {
        router.push("/login?next=/configuracion/empresa");
      }
    } catch {
      setError("No pudimos crear tu cuenta. Revisa tu conexion e intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className={s.root}>
      <section className={s.formPanel}>
        <div className={s.formShell}>
          <div className={s.formCard}>
            <header className={s.formHeader}>
              <h1 className={s.formTitle}>{copy.title}</h1>
              <p className={s.formSubtitle}>{copy.subtitle}</p>
            </header>

            <form
              className={s.form}
              onSubmit={onSubmit}
              noValidate
              method="post"
              action="javascript:void(0)"
            >
              <div className={s.field}>
                <label className={s.fieldLabel} htmlFor="empresa">
                  {copy.empresaLabel}
                </label>
                <div className={s.fieldControl}>
                  <Building2 size={18} aria-hidden />
                  <input
                    id="empresa"
                    name="empresa"
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
                  />
                </div>
              </div>

              <div className={s.field}>
                <label className={s.fieldLabel} htmlFor="correo">
                  {copy.emailLabel}
                </label>
                <div className={s.fieldControl}>
                  <Mail size={18} aria-hidden />
                  <input
                    id="correo"
                    name="correo"
                    type="email"
                    className={s.fieldInput}
                    placeholder={copy.emailPlaceholder}
                    value={correo}
                    onChange={(event) => {
                      setCorreo(event.target.value);
                      setError(null);
                    }}
                    autoComplete="email"
                    inputMode="email"
                    required
                  />
                </div>
              </div>

              <div className={s.field}>
                <label className={s.fieldLabel} htmlFor="password">
                  {copy.passwordLabel}
                </label>
                <div className={s.fieldControl}>
                  <Lock size={18} aria-hidden />
                  <input
                    id="password"
                    name="password"
                    type={mostrarPassword ? "text" : "password"}
                    className={s.fieldInput}
                    placeholder={copy.passwordPlaceholder}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setError(null);
                    }}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className={s.passwordToggle}
                    onClick={() => setMostrarPassword((current) => !current)}
                    aria-label={
                      mostrarPassword ? copy.passwordHide : copy.passwordShow
                    }
                    aria-pressed={mostrarPassword}
                  >
                    {mostrarPassword ? (
                      <EyeOff size={18} aria-hidden />
                    ) : (
                      <Eye size={18} aria-hidden />
                    )}
                  </button>
                </div>
              </div>

              <p className={s.helperText}>{copy.trialNote}</p>

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
          <p className={s.visualEyebrow}>{copy.visualEyebrow}</p>
          <h2 className={s.visualTitle}>{copy.visualTitle}</h2>
          <p className={s.visualDescription}>{copy.visualDescription}</p>
        </div>
      </section>
    </main>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  MapPin,
  MessageSquareText,
  Phone,
  UserRound,
} from "lucide-react";

import s from "../login/login.module.css";

const copy = {
  title: "Solicitar cuenta de prueba",
  subtitle:
    "Te contactamos por WhatsApp para dejar Ventora configurado antes de que empieces a usarlo.",
  nombreLabel: "Nombre",
  nombrePlaceholder: "Tu nombre",
  empresaLabel: "Nombre de la empresa",
  empresaPlaceholder: "Ej: Vidrios del Sur",
  whatsappLabel: "WhatsApp",
  whatsappPlaceholder: "+56 9 0000 0000",
  ciudadLabel: "Ciudad o comuna",
  ciudadPlaceholder: "Ej: Puente Alto",
  mensajeLabel: "Mensaje opcional",
  mensajePlaceholder: "Algo especial para configurar tu cuenta?",
  submit: "Solicitar cuenta",
  submitting: "Enviando solicitud...",
  loginPrompt: "Ya tienes acceso?",
  loginAction: "Iniciar sesion",
  trialNote:
    "No se crea una cuenta automática. Revisamos tus datos y te ayudamos a entrar con el flujo correcto.",
  successTitle: "Solicitud recibida",
  successMessage:
    "Recibimos tus datos. Te contactaremos por WhatsApp para dejar tu cuenta configurada.",
  visualEyebrow: "Onboarding asistido",
  visualTitle: "Empieza con Ventora configurado para tu forma real de vender",
  visualDescription:
    "Pensado para maestros, talleres y empresas de vidrios y aluminio que necesitan captar, ordenar y cotizar sin improvisar.",
};

export default function RegistroView() {
  const [nombre, setNombre] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [whatsapp, setWhatsapp] = useState("+56 9 ");
  const [ciudadComuna, setCiudadComuna] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

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
          nombre,
          empresa,
          whatsapp,
          ciudadComuna,
          mensaje,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        setError(payload?.error ?? "No pudimos recibir tu solicitud.");
        return;
      }

      setEnviado(true);
    } catch {
      setError("No pudimos recibir tu solicitud. Revisa tu conexion e intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className={s.root}>
      <section className={s.formPanel}>
        <div className={s.formShell}>
          <Link href="/" className={s.brand} aria-label="Ventora">
            <img
              src="/brand/ventora-logo-premium-dark.svg"
              alt="Ventora"
              width={348}
              height={82}
              className={s.brandLogo}
            />
          </Link>

          <div className={s.formCard}>
            <header className={s.formHeader}>
              <h1 className={s.formTitle}>{copy.title}</h1>
              <p className={s.formSubtitle}>{copy.subtitle}</p>
            </header>

            {enviado ? (
              <div className={s.successState} role="status" aria-live="polite">
                <CheckCircle2 size={28} aria-hidden />
                <div>
                  <h2>{copy.successTitle}</h2>
                  <p>{copy.successMessage}</p>
                </div>
                <div className={s.successActions}>
                  <Link className={s.primaryButton} href="/login">
                    Ir a iniciar sesion
                    <ArrowRight size={18} aria-hidden />
                  </Link>
                  <Link className={s.secondaryButton} href="/">
                    Volver al inicio
                  </Link>
                </div>
              </div>
            ) : (
              <form
                className={s.form}
                onSubmit={onSubmit}
                noValidate
                method="post"
                action="javascript:void(0)"
              >
                <div className={`${s.field} ${s.fieldCompact}`}>
                  <label className={s.fieldLabel} htmlFor="nombre">
                    {copy.nombreLabel}
                  </label>
                  <div className={s.fieldControl}>
                    <UserRound size={18} aria-hidden />
                    <input
                      id="nombre"
                      name="nombre"
                      type="text"
                      className={s.fieldInput}
                      placeholder={copy.nombrePlaceholder}
                      value={nombre}
                      onChange={(event) => {
                        setNombre(event.target.value);
                        setError(null);
                      }}
                      autoComplete="name"
                      required
                    />
                  </div>
                </div>

                <div className={`${s.field} ${s.fieldCompact}`}>
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
                      value={empresa}
                      onChange={(event) => {
                        setEmpresa(event.target.value);
                        setError(null);
                      }}
                      autoComplete="organization"
                      required
                    />
                  </div>
                </div>

                <div className={`${s.field} ${s.fieldCompact}`}>
                  <label className={s.fieldLabel} htmlFor="whatsapp">
                    {copy.whatsappLabel}
                  </label>
                  <div className={s.fieldControl}>
                    <Phone size={18} aria-hidden />
                    <input
                      id="whatsapp"
                      name="whatsapp"
                      type="tel"
                      className={s.fieldInput}
                      placeholder={copy.whatsappPlaceholder}
                      value={whatsapp}
                      onChange={(event) => {
                        setWhatsapp(event.target.value);
                        setError(null);
                      }}
                      autoComplete="tel"
                      inputMode="tel"
                      required
                    />
                  </div>
                </div>

                <div className={`${s.field} ${s.fieldCompact}`}>
                  <label className={s.fieldLabel} htmlFor="ciudadComuna">
                    {copy.ciudadLabel}
                  </label>
                  <div className={s.fieldControl}>
                    <MapPin size={18} aria-hidden />
                    <input
                      id="ciudadComuna"
                      name="ciudadComuna"
                      type="text"
                      className={s.fieldInput}
                      placeholder={copy.ciudadPlaceholder}
                      value={ciudadComuna}
                      onChange={(event) => {
                        setCiudadComuna(event.target.value);
                        setError(null);
                      }}
                      autoComplete="address-level2"
                      required
                    />
                  </div>
                </div>

                <div className={`${s.field} ${s.fieldOptional}`}>
                  <label className={s.fieldLabel} htmlFor="mensaje">
                    {copy.mensajeLabel}
                  </label>
                  <div className={s.fieldControl}>
                    <MessageSquareText size={18} aria-hidden />
                    <textarea
                      id="mensaje"
                      name="mensaje"
                      className={`${s.fieldInput} ${s.fieldTextarea}`}
                      placeholder={copy.mensajePlaceholder}
                      value={mensaje}
                      onChange={(event) => {
                        setMensaje(event.target.value);
                        setError(null);
                      }}
                      rows={4}
                    />
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
            )}

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

"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FaCheckCircle, FaFilePdf, FaRulerCombined, FaWhatsapp } from "react-icons/fa";

import { useAuth } from "@/hooks/useAuth";
import s from "./login.module.css";

interface LoginViewProps {
  oauthError: boolean;
  nextPath: string | null;
}

const proofItems = [
  {
    icon: FaRulerCombined,
    title: "Cotiza desde la obra",
    text: "Carga medidas, componentes y margen desde el celular sin volver a Excel.",
  },
  {
    icon: FaFilePdf,
    title: "Entrega profesional",
    text: "Genera un PDF claro para el cliente con una presentacion seria y ordenada.",
  },
  {
    icon: FaWhatsapp,
    title: "Salida comercial rapida",
    text: "Comparte por WhatsApp y sigue la cotizacion sin perderte entre chats.",
  },
];

export default function LoginView({ oauthError, nextPath }: LoginViewProps) {
  const router = useRouter();
  const { signIn } = useAuth();

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCargando(true);
    setError(null);

    try {
      await signIn({
        email: correo,
        password,
      });
    } catch {
      setError("Correo o contrasena incorrectos");
      setCargando(false);
      return;
    }

    const redirectTarget = nextPath && nextPath.startsWith("/") ? nextPath : "/dashboard";

    router.push(redirectTarget);
    router.refresh();
  };

  return (
    <div className={s.root}>
      <section className={s.left}>
        <div className={s.leftTop}>
          <Link href="/" className={s.brand} aria-label="Ventora">
            <Image src="/brand/ventora-logo-navy.svg" alt="Ventora" width={160} height={40} priority />
          </Link>

          <p className={s.kicker}>Acceso para equipos de vidrios y aluminio</p>
          <h1 className={s.headline}>Cotiza en terreno. Cierra ventas mas rapido.</h1>
          <p className={s.subline}>
            Entra a tu cuenta para seguir cotizando con una interfaz clara, legible y pensada para trabajar en obra.
          </p>
        </div>

        <div className={s.proofGrid}>
          {proofItems.map((item) => {
            const Icon = item.icon;

            return (
              <article key={item.title} className={s.proofCard}>
                <div className={s.proofIcon}>
                  <Icon aria-hidden />
                </div>
                <div>
                  <h2>{item.title}</h2>
                  <p>{item.text}</p>
                </div>
              </article>
            );
          })}
        </div>

        <div className={s.bottomNote}>
          <FaCheckCircle aria-hidden />
          <span>Disenado para uso real en Chile, desde el celular y con salida comercial inmediata.</span>
        </div>
      </section>

      <section className={s.right}>
        <form className={s.formWrap} onSubmit={onSubmit} noValidate>
          <p className={s.formEyebrow}>Ingreso</p>
          <h2 className={s.formTitle}>Bienvenido de vuelta</h2>
          <p className={s.formSub}>Accede a tu cuenta para continuar con clientes, cotizaciones y PDF.</p>

          <div className={s.field}>
            <label className={s.fieldLabel} htmlFor="correo">
              Correo
            </label>
            <input
              id="correo"
              type="email"
              className={s.fieldInput}
              placeholder="tu@correo.com"
              value={correo}
              onChange={(e) => {
                setCorreo(e.target.value);
                setError(null);
              }}
              autoComplete="email"
              required
            />
          </div>

          <div className={s.field}>
            <label className={s.fieldLabel} htmlFor="password">
              Contrasena
            </label>
            <input
              id="password"
              type="password"
              className={s.fieldInput}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              autoComplete="current-password"
              required
            />
          </div>

          {(oauthError || error) && (
            <div className={s.errorBox}>
              <span>⚠</span>
              <span>{error ?? "No pudimos completar el inicio con OAuth. Intenta nuevamente."}</span>
            </div>
          )}

          <button type="submit" className={s.btnSubmit} disabled={cargando}>
            <span className={s.btnText}>
              {cargando ? <span className={s.spinner} /> : null}
              {cargando ? "Ingresando..." : "Ingresar"}
            </span>
          </button>

          <div className={s.formLinks}>
            <Link href="/" className={s.inlineLink}>
              Volver al inicio
            </Link>
            <Link href="/planes" className={s.inlineLink}>
              Ver como funciona
            </Link>
          </div>

          <div className={s.oauthBlock}>
            <div className={s.oauthDivider}>
              <span />
              <p>OAuth proximo</p>
              <span />
            </div>

            <div className={s.oauthBtns}>
              <button type="button" className={s.oauthBtn}>
                Google
              </button>
              <button type="button" className={s.oauthBtn}>
                Apple
              </button>
            </div>
          </div>
        </form>

        <div className={s.formFooter}>
          <span>© 2026 Ventora</span>
          <span>Chile</span>
        </div>
      </section>
    </div>
  );
}

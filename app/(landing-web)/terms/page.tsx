import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import s from "../legal.module.css";

export default function TermsPage() {
  return (
    <main className={s.page}>
      <div className={s.container}>
        <Link href="/" className={s.backLink}>
          <ArrowLeft size={16} aria-hidden />
          Volver a la landing
        </Link>

        <header className={s.header}>
          <span className={s.eyebrow}>Terminos</span>
          <h1 className={s.title}>Terminos de servicio.</h1>
          <p className={s.description}>
            Estos terminos regulan el acceso y uso de Ventora como software
            comercial para crear, gestionar y enviar cotizaciones de vidrios y
            aluminio.
          </p>
        </header>

        <section className={s.card}>
          <article className={s.section}>
            <h2 className={s.sectionTitle}>1. Objeto del servicio</h2>
            <p className={s.text}>
              Ventora entrega una plataforma para gestionar clientes,
              cotizaciones, documentos comerciales y comunicaciones
              relacionadas. El servicio se ofrece como herramienta de apoyo
              comercial y operativo, no como asesoria legal, tributaria,
              contable, tecnica de ingenieria ni financiera.
            </p>
          </article>

          <article className={s.section}>
            <h2 className={s.sectionTitle}>2. Cuenta y acceso</h2>
            <p className={s.text}>
              El usuario es responsable de mantener la confidencialidad de sus
              credenciales y de toda actividad realizada desde su cuenta. Toda
              cuenta puede ser suspendida o limitada ante uso indebido,
              incumplimiento de estos terminos o riesgos de seguridad.
            </p>
          </article>

          <article className={s.section}>
            <h2 className={s.sectionTitle}>3. Responsabilidad del usuario</h2>
            <ul className={s.list}>
              <li>Mantener segura su cuenta y sus credenciales.</li>
              <li>Ingresar informacion comercial veraz y actualizada.</li>
              <li>Revisar precios, impuestos, margenes y condiciones antes de enviar una cotizacion.</li>
              <li>Usar el sistema conforme a la ley y a la actividad declarada.</li>
              <li>Contar con autorizacion para tratar los datos que cargue al servicio.</li>
            </ul>
          </article>

          <article className={s.section}>
            <h2 className={s.sectionTitle}>4. Alcance y limites</h2>
            <p className={s.text}>
              Ventora no garantiza cierres comerciales, resultados economicos,
              disponibilidad ininterrumpida, ausencia total de errores ni
              compatibilidad con todos los procesos internos de cada negocio. El
              usuario sigue siendo responsable de validar el contenido final de
              sus presupuestos, documentos y comunicaciones.
            </p>
          </article>

          <article className={s.section}>
            <h2 className={s.sectionTitle}>5. Disponibilidad del servicio</h2>
            <p className={s.text}>
              Hacemos esfuerzos razonables para mantener continuidad operativa,
              pero no garantizamos disponibilidad ininterrumpida ni ausencia
              total de errores, especialmente durante mejoras, mantenimientos o
              incidentes de terceros.
            </p>
          </article>

          <article className={s.section}>
            <h2 className={s.sectionTitle}>6. Propiedad intelectual y contenido</h2>
            <p className={s.text}>
              La marca, interfaz, logica y componentes del servicio pertenecen a
              Ventora. Cada cliente mantiene la titularidad sobre sus datos
              comerciales, logos y contenido ingresado al sistema.
            </p>
          </article>

          <article className={s.section}>
            <h2 className={s.sectionTitle}>7. Limitacion de responsabilidad</h2>
            <p className={s.text}>
              En la maxima medida permitida por la ley aplicable, Ventora no
              sera responsable por danos indirectos, lucro cesante, perdida de
              oportunidades comerciales, errores originados en informacion
              ingresada por el usuario ni consecuencias derivadas del uso de
              integraciones, servicios o decisiones de terceros.
            </p>
          </article>

          <article className={s.section}>
            <h2 className={s.sectionTitle}>8. Cambios y contacto legal</h2>
            <p className={s.text}>
              Podemos modificar estos terminos para reflejar cambios del
              servicio, exigencias operativas o actualizaciones legales. La
              version publicada en este sitio sera la vigente.
            </p>
            <p className={s.text}>
              Para consultas contractuales o legales puedes escribir a{" "}
              <a href="mailto:hola@ventora.cl">hola@ventora.cl</a>.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}

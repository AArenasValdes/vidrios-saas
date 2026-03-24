import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import s from "../legal.module.css";

export default function PrivacyPage() {
  return (
    <main className={s.page}>
      <div className={s.container}>
        <Link href="/" className={s.backLink}>
          <ArrowLeft size={16} aria-hidden />
          Volver a la landing
        </Link>

        <header className={s.header}>
          <span className={s.eyebrow}>Privacidad</span>
          <h1 className={s.title}>Politica de privacidad.</h1>
          <p className={s.description}>
            Esta politica describe, de manera general, como Ventora recopila,
            usa, almacena y protege datos personales obtenidos a traves de la
            landing, formularios de contacto y uso del servicio.
          </p>
        </header>

        <section className={s.card}>
          <article className={s.section}>
            <h2 className={s.sectionTitle}>1. Datos que podemos recopilar</h2>
            <p className={s.text}>
              Podemos recopilar datos de identificacion y contacto, tales como
              nombre, empresa, correo electronico, telefono, cargo, historial
              de contacto comercial y cualquier informacion que nos entregues
              voluntariamente al solicitar una demo, cotizacion o soporte.
            </p>
          </article>

          <article className={s.section}>
            <h2 className={s.sectionTitle}>2. Finalidades del tratamiento</h2>
            <p className={s.text}>
              Usamos estos datos para responder solicitudes, coordinar demos,
              gestionar cuentas, prestar soporte, mantener continuidad
              operativa, mejorar la experiencia del producto y cumplir
              obligaciones legales o contractuales aplicables.
            </p>
          </article>

          <article className={s.section}>
            <h2 className={s.sectionTitle}>3. Base y alcance</h2>
            <p className={s.text}>
              Tratamos datos conforme al marco legal aplicable en Chile y
              segun la finalidad informada al momento de su entrega. Cuando un
              cliente empresa usa Ventora para gestionar datos de terceros, ese
              cliente es responsable del contenido comercial que carga al
              sistema y del uso que haga de esa informacion.
            </p>
          </article>

          <article className={s.section}>
            <h2 className={s.sectionTitle}>4. Comparticion con terceros</h2>
            <p className={s.text}>
              Podemos apoyarnos en proveedores tecnologicos para hosting,
              autenticacion, almacenamiento, procesamiento y soporte. Tambien
              podremos comunicar datos cuando exista obligacion legal, orden de
              autoridad competente o necesidad razonable para proteger derechos,
              seguridad y operacion del servicio.
            </p>
          </article>

          <article className={s.section}>
            <h2 className={s.sectionTitle}>5. Seguridad y conservacion</h2>
            <p className={s.text}>
              Aplicamos medidas razonables de seguridad administrativas,
              tecnicas y organizativas. Sin embargo, ningun sistema es
              completamente infalible, por lo que no podemos garantizar
              seguridad absoluta ni ausencia total de incidentes. Conservaremos
              la informacion por el tiempo necesario para las finalidades
              descritas, obligaciones legales y resguardo operativo.
            </p>
          </article>

          <article className={s.section}>
            <h2 className={s.sectionTitle}>6. Derechos del titular</h2>
            <ul className={s.list}>
              <li>Solicitar acceso a los datos personales que mantenemos.</li>
              <li>Solicitar rectificacion de informacion inexacta o desactualizada.</li>
              <li>Solicitar eliminacion o bloqueo cuando proceda legalmente.</li>
              <li>Solicitar informacion sobre el uso general de sus datos.</li>
            </ul>
          </article>

          <article className={s.section}>
            <h2 className={s.sectionTitle}>7. Cambios y contacto</h2>
            <p className={s.text}>
              Podemos actualizar esta politica para reflejar cambios legales,
              tecnicos o operativos. La version vigente sera la publicada en
              este sitio. Para consultas sobre privacidad o tratamiento de
              datos puedes escribirnos a{" "}
              <a href="mailto:hola@ventora.cl">hola@ventora.cl</a>.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}

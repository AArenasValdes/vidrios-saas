import Link from "next/link";

import s from "../../page.module.css";

export const dynamic = "force-dynamic";

export default function MercadoPagoReturnPage() {
  return (
    <section className={s.wrap}>
      <div className={s.card}>
        <div className={s.hero}>
          <span className={s.eyebrow}>Confirmando suscripcion</span>
          <h1 className={s.title}>Estamos verificando Mercado Pago.</h1>
          <p className={s.text}>
            Esta pantalla no activa tu cuenta por si sola. Ventora esperara la
            confirmacion segura de Mercado Pago; luego podras volver al panel y
            revisar el estado.
          </p>
        </div>

        <div className={s.activeBanner} role="status">
          La confirmacion puede tardar unos segundos. Puedes actualizar el panel
          sin riesgo de duplicar el cobro.
        </div>

        <div className={s.returnActions}>
          <Link className={s.webpayButton} href="/dashboard">
            Revisar mi cuenta
          </Link>
          <Link className={s.secondary} href="/cuenta-vencida">
            Volver a planes
          </Link>
        </div>
      </div>
    </section>
  );
}

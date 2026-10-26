import Link from "next/link";
import s from "./page.module.css";

export default function MisPreciosLoading() {
  return (
    <main className={s.page} aria-busy="true">
      <Link className={s.back} href="/configuracion/empresa">Empresa</Link>
      <header className={s.header}>
        <h1>Mis precios</h1>
        <p>Precios de compra que Ventora usará para estimar tus costos.</p>
      </header>
      <section className={s.loading} aria-label="Cargando proveedores"><i /><i /><i /></section>
    </main>
  );
}

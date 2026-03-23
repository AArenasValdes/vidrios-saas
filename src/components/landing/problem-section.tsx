import styles from "./problem-section.module.css";
import { ProblemCard } from "./problem-card";

const bulletPoints = [
  "Perdida promedio del 15% en materiales por mal calculo.",
  "3 horas diarias perdidas en gestion de WhatsApp.",
];

const cards = [
  {
    title: "El Caos del Excel",
    description:
      "Formulas rotas, archivos duplicados y errores humanos que terminan en cortes de vidrio inutilizables.",
    variant: "excel" as const,
  },
  {
    title: "WhatsApp Infinito",
    description:
      "Informacion critica perdida entre memes y audios. El historial de obra desaparece en el scroll infinito.",
    variant: "chat" as const,
  },
  {
    title: "Fugas de Dinero",
    description:
      "Cotizaciones que nunca se cerraron por falta de seguimiento o materiales que se compraron a precios desactualizados.",
    variant: "money" as const,
    fullWidth: true,
  },
];

export function ProblemSection() {
  return (
    <section id="problema" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.layout}>
          <div className={styles.copy}>
            <span className={styles.eyebrow}>El costo de la improvisacion</span>
            <h2>
              La informalidad te esta <span>costando dinero.</span>
            </h2>
            <p>
              Los procesos manuales no solo consumen tiempo; destruyen tus margenes de ganancia. En el mercado
              chileno, la precision es la diferencia entre el exito y la perdida.
            </p>

            <ul className={styles.bullets}>
              {bulletPoints.map((item) => (
                <li key={item}>
                  <span className={styles.bulletDot} aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.cards}>
            {cards.map((card) => (
              <ProblemCard
                key={card.title}
                title={card.title}
                description={card.description}
                variant={card.variant}
                fullWidth={card.fullWidth}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

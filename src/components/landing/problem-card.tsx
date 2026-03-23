import styles from "./problem-section.module.css";

type ProblemCardProps = {
  title: string;
  description: string;
  variant: "excel" | "chat" | "money";
  fullWidth?: boolean;
};

function ExcelVisual() {
  return (
    <div className={styles.visualPanel} aria-hidden>
      <div className={styles.sheetGhost}>
        <span className={styles.sheetLineLong} />
        <span className={styles.sheetLineShort} />
        <span className={styles.sheetLineMedium} />
        <span className={styles.sheetCell} />
        <span className={styles.sheetCellAlt} />
      </div>
      <div className={styles.visualStamp}>+VALOR!</div>
    </div>
  );
}

function ChatVisual() {
  return (
    <div className={styles.visualPanel} aria-hidden>
      <div className={`${styles.chatBubble} ${styles.chatBubbleRight}`}>Tienes las medidas de la obra Maipu?</div>
      <div className={`${styles.chatBubble} ${styles.chatBubbleLeft}`}>Las envie ayer al otro grupo...</div>
      <div className={`${styles.chatBubble} ${styles.chatBubbleRight}`}>No las encuentro. Puedes reenviar?</div>
      <div className={styles.chatNotice}>14 mensajes nuevos</div>
    </div>
  );
}

function MoneyVisual() {
  return (
    <div className={`${styles.visualPanel} ${styles.visualPanelWide}`} aria-hidden>
      <div className={styles.quoteGhost}>
        <span className={styles.quoteLineShort} />
        <strong>$4.850.000 CLP</strong>
      </div>
      <div className={styles.lossBadge}>Cotizacion perdida</div>
    </div>
  );
}

function ProblemCardVisual({ variant }: Pick<ProblemCardProps, "variant">) {
  if (variant === "chat") {
    return <ChatVisual />;
  }

  if (variant === "money") {
    return <MoneyVisual />;
  }

  return <ExcelVisual />;
}

export function ProblemCard({ title, description, variant, fullWidth = false }: ProblemCardProps) {
  return (
    <article className={`${styles.card} ${fullWidth ? styles.cardWide : ""}`}>
      <ProblemCardVisual variant={variant} />
      <div className={styles.cardBody}>
        <h3>{title}</h3>
        <p>{description}</p>
        {variant === "money" ? <a href="#como-funciona">Ver solucion →</a> : null}
      </div>
    </article>
  );
}

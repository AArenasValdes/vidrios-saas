export const WHATSAPP_LANDING_HREF =
  "https://wa.me/56977338906?text=Hola%20Ventora%2C%20quiero%20mi%20demo.";

export const REGISTRO_HREF = "/registro";
export const LOGIN_HREF = "/login";

export const navLinks = [
  { href: "#problema", label: "Problema" },
  { href: "#solucion", label: "Cómo" },
  { href: "#precios", label: "Precios" },
  { href: "#preguntas", label: "Preguntas" },
] as const;

export const heroTrustItems = [
  "15 días gratis",
  "Cualquier dispositivo",
  "Pensado para Latinoamérica",
  "PDF profesional",
] as const;

export const LATAM_COUNTRIES_LABEL =
  "Chile, Argentina, Colombia, México, Perú y Uruguay";

export const PRICING_IMPLEMENTATION_HREF = `https://wa.me/56977338906?text=${encodeURIComponent(
  "Hola Ventora, quiero solicitar implementación acompañada para mi empresa."
)}`;

export const faqs = [
  {
    question: "¿Ventora es un cotizador técnico?",
    answer:
      "Ventora parte como cotizador comercial y puede sumar fabricación configurable. Con recetas validadas por tu taller genera cubicación, despiece y una pauta de corte revisable; no es CAD, ERP ni optimizador industrial.",
  },
  {
    question: "¿Sirve en cualquier dispositivo?",
    answer:
      "Sí. Funciona en celular, tablet y computador. Entras desde varios dispositivos con la misma cuenta: cotizas en terreno y sigues en el taller.",
  },
  {
    question: "¿Está disponible en Latinoamérica?",
    answer: `Está pensado para talleres de ${LATAM_COUNTRIES_LABEL}. Puedes elegir tu país y trabajar con su moneda, prefijo y configuración regional. Los pagos directos y los precios publicados están disponibles inicialmente en Chile.`,
  },
  {
    question: "¿Puedo cubicar y hacer despiece?",
    answer:
      "Sí. Puedes agregar líneas, perfiles, reglas y largos comerciales para obtener cubicación, despiece y pautas de corte revisables. Si una línea aún no tiene receta, puedes cotizar su precio de todas formas.",
  },
  {
    question: "¿Cuánto dura la prueba?",
    answer:
      "15 días gratis, con acceso completo, sin tarjeta. Cancelas cuando quieras.",
  },
  {
    question: "¿Qué pasa si dejo mis datos en el formulario?",
    answer:
      "Guardamos tu consulta y te contactamos por WhatsApp. No te saca de la página. Si quieres partir ahora, crea tu cuenta y arranca los 15 días.",
  },
  {
    question: "¿Ventora reemplaza mi WhatsApp?",
    answer:
      "No. Ventora te ayuda a cotizar, generar PDF y enviar presupuestos por WhatsApp. También puedes recibir solicitudes con tu link público si lo activas.",
  },
  {
    question: "¿Necesito la página pública para usar Ventora?",
    answer:
      "No. Puedes empezar solo con el cotizador. La página pública es un complemento para captar solicitudes cuando no puedes responder.",
  },
] as const;

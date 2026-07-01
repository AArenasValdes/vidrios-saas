export type ActivacionWhatsappTemplate = {
  id: string;
  title: string;
  description: string;
  buildMessage: (input: { appOrigin: string; empresaNombre: string }) => string;
};

export const ACTIVACION_WHATSAPP_TEMPLATES: ActivacionWhatsappTemplate[] = [
  {
    id: "contact",
    title: "Contactar",
    description: "Primer contacto para ayudar a arrancar con Ventora.",
    buildMessage: ({ empresaNombre }) =>
      [
        `Hola ${empresaNombre},`,
        "",
        "Te escribo desde Ventora para ayudarte a dar el primer paso con tu cuenta.",
        "¿Quieres que revisemos juntos cómo crear tu primera cotización?",
      ].join("\n"),
  },
  {
    id: "configure",
    title: "Configurar",
    description: "Guía para completar datos básicos y página de captación.",
    buildMessage: ({ appOrigin, empresaNombre }) =>
      [
        `Hola ${empresaNombre},`,
        "",
        "Para sacarle provecho a Ventora, te recomiendo completar los datos de tu empresa y la página pública de solicitudes.",
        `Puedes hacerlo aquí: ${appOrigin}/configuracion/empresa`,
      ].join("\n"),
  },
  {
    id: "first_result",
    title: "Primera cotización y PDF",
    description: "Empujar al primer resultado: cotización lista para enviar.",
    buildMessage: ({ appOrigin }) =>
      [
        "Hola,",
        "",
        "Ya tienes una cotización creada. El siguiente paso es generar el PDF y compartirlo con tu cliente.",
        `Entra a Ventora: ${appOrigin}/cotizaciones`,
        "",
        "Si quieres, te guío en 5 minutos.",
      ].join("\n"),
  },
];

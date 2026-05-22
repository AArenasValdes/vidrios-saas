"use client";

export type PublicRequestShareChannel =
  | "generic"
  | "direct"
  | "instagram"
  | "facebook"
  | "whatsapp"
  | "qr";

export type PublicRequestShareVariant = {
  id: string;
  label: string;
  text: string;
};

type BuildPublicRequestShareInput = {
  url: string;
  empresaNombre?: string | null;
  channel?: PublicRequestShareChannel;
  variantId?: string;
};

type ResolveShareTextInput = Omit<BuildPublicRequestShareInput, "url">;

function normalizeEmpresaNombre(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function buildIntro(empresaNombre: string | null | undefined) {
  const empresa = normalizeEmpresaNombre(empresaNombre);
  return empresa
    ? `\u{1F4E9} Cotiza aqui las 24 horas con ${empresa}`
    : "\u{1F4E9} Cotiza aqui las 24 horas";
}

function buildInstagramVariants(
  empresaNombre: string | null | undefined
): PublicRequestShareVariant[] {
  return [
    {
      id: "bio_corta",
      label: "Bio corta",
      text: `${buildIntro(empresaNombre)}\nDejame tu solicitud aqui \u{1F447}`,
    },
    {
      id: "historia",
      label: "Historia",
      text: `\u{1F4F2} Cotiza por este link\nTe respondo apenas pueda \u{1F447}`,
    },
  ];
}

function buildFacebookVariants(
  empresaNombre: string | null | undefined
): PublicRequestShareVariant[] {
  return [
    {
      id: "post_general",
      label: "Post general",
      text: `${buildIntro(empresaNombre)}\nTe respondo apenas pueda \u{1F447}`,
    },
    {
      id: "captacion",
      label: "Captacion",
      text: `\u{1F9F0} Necesitas cotizar?\nMandame tu solicitud por aqui \u{1F447}`,
    },
  ];
}

function buildWhatsappVariants(
  empresaNombre: string | null | undefined
): PublicRequestShareVariant[] {
  return [
    {
      id: "mensaje_directo",
      label: "Mensaje directo",
      text: `${buildIntro(empresaNombre)}\nMandame tu solicitud por este link \u{1F447}`,
    },
    {
      id: "estado",
      label: "Estado",
      text: `\u{1F4F2} Enviame tu medida o idea por aqui\nY te cotizo apenas pueda \u{1F447}`,
    },
  ];
}

function buildQrVariants(
  empresaNombre: string | null | undefined
): PublicRequestShareVariant[] {
  return [
    {
      id: "impreso",
      label: "Impreso",
      text: `\u{1F4F2} Escanea y cotiza aqui las 24 horas${
        normalizeEmpresaNombre(empresaNombre)
          ? ` con ${normalizeEmpresaNombre(empresaNombre)}`
          : ""
      }\nDeja tu solicitud aqui \u{1F447}`,
    },
    {
      id: "vitrina",
      label: "Vitrina",
      text: `\u{1F9FE} Cotiza por este codigo QR\nTe respondo apenas pueda \u{1F447}`,
    },
  ];
}

function buildGenericVariants(
  empresaNombre: string | null | undefined
): PublicRequestShareVariant[] {
  return [
    {
      id: "general",
      label: "General",
      text: `${buildIntro(empresaNombre)}\nTe respondo apenas pueda \u{1F447}`,
    },
    {
      id: "terreno",
      label: "Terreno",
      text: `\u{1F6E0}\u{FE0F} Pideme tu cotizacion por aqui\nAunque este en terreno, la recibo igual \u{1F447}`,
    },
  ];
}

export function buildPublicRequestShareTitle(
  empresaNombre: string | null | undefined
) {
  const empresa = normalizeEmpresaNombre(empresaNombre);
  return empresa ? `Cotiza con ${empresa}` : "Cotiza aqui";
}

export function getPublicRequestShareVariants({
  empresaNombre,
  channel = "generic",
}: ResolveShareTextInput): PublicRequestShareVariant[] {
  if (channel === "instagram") {
    return buildInstagramVariants(empresaNombre);
  }

  if (channel === "facebook") {
    return buildFacebookVariants(empresaNombre);
  }

  if (channel === "whatsapp") {
    return buildWhatsappVariants(empresaNombre);
  }

  if (channel === "qr") {
    return buildQrVariants(empresaNombre);
  }

  return buildGenericVariants(empresaNombre);
}

export function buildPublicRequestShareText({
  empresaNombre,
  channel = "generic",
  variantId,
}: ResolveShareTextInput) {
  const variants = getPublicRequestShareVariants({
    empresaNombre,
    channel,
  });

  if (!variantId) {
    return variants[0]?.text ?? "";
  }

  return variants.find((variant) => variant.id === variantId)?.text ?? variants[0]?.text ?? "";
}

export function buildPublicRequestShareClipboardText({
  url,
  empresaNombre,
  channel = "generic",
  variantId,
}: BuildPublicRequestShareInput) {
  return `${buildPublicRequestShareText({
    empresaNombre,
    channel,
    variantId,
  })}\n${url}`;
}

export function buildPublicRequestSharePayload(
  input: BuildPublicRequestShareInput
) {
  return {
    title: buildPublicRequestShareTitle(input.empresaNombre),
    text: buildPublicRequestShareText({
      empresaNombre: input.empresaNombre,
      channel: input.channel,
      variantId: input.variantId,
    }),
    url: input.url,
  };
}

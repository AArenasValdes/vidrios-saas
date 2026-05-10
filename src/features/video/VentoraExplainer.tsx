import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { ReactNode } from "react";
import {
  AccentNote,
  CTAButton,
  FloatingMessage,
  PhoneMockup,
  SceneWrapper,
  StepCard,
  VentoraLogo,
  videoPalette,
} from "./components";
import {
  VENTORA_VIDEO_DURATIONS,
  VENTORA_VIDEO_FPS,
  type VentoraVideoLayout,
  ventoraVideoAssets,
} from "./video-assets";

type SceneProps = {
  frame: number;
  layout: VentoraVideoLayout;
};

function sceneWidth(layout: VentoraVideoLayout, width: number) {
  return layout === "portrait" ? width * 0.9 : width * 0.84;
}

function sceneGrid(layout: VentoraVideoLayout) {
  return layout === "portrait"
    ? ({ gridTemplateColumns: "1fr", gap: 24 } as const)
    : ({ gridTemplateColumns: "1.02fr 0.98fr", gap: 28 } as const);
}

function HookScene({ frame, layout }: SceneProps) {
  const { width } = useVideoConfig();
  const titleSize = layout === "portrait" ? 54 : 84;
  const subtitleSize = layout === "portrait" ? 24 : 30;
  const textWidth = layout === "portrait" ? "92%" : "72%";

  const bubbles = [
    { text: "Hola, cuanto sale una ventana?", x: layout === "portrait" ? 26 : 84, y: layout === "portrait" ? 126 : 118, delay: 0, rotate: -3, tone: "neutral" as const },
    { text: "Audio \u00b7 0:47", x: layout === "portrait" ? 18 : 110, y: layout === "portrait" ? 264 : 230, delay: 16, rotate: 2, tone: "soft" as const, width: 220 },
    { text: "Te mando las medidas", x: layout === "portrait" ? 86 : width * 0.68, y: layout === "portrait" ? 118 : 152, delay: 32, rotate: 2, tone: "blue" as const, width: 250 },
    { text: "Me haces precio de una mampara?", x: layout === "portrait" ? 98 : width * 0.73, y: layout === "portrait" ? 288 : 298, delay: 48, rotate: -2, tone: "soft" as const, width: 290 },
  ];

  return (
    <SceneWrapper frame={frame} layout={layout}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: sceneWidth(layout, width),
          maxWidth: 1600,
        }}
      >
        <div
          style={{
            display: "grid",
            ...sceneGrid(layout),
            alignItems: "center",
          }}
        >
          <div style={{ maxWidth: layout === "portrait" ? "100%" : 760 }}>
            <div
              style={{
                fontSize: layout === "portrait" ? 18 : 20,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: videoPalette.blueDark,
                marginBottom: 18,
              }}
            >
              Ventora
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: titleSize,
                lineHeight: 0.98,
                letterSpacing: "-0.05em",
                color: videoPalette.text,
                maxWidth: textWidth,
              }}
            >
              Cuantos clientes se te pierden por no responder a tiempo?
            </h1>
            <p
              style={{
                margin: "22px 0 0",
                fontSize: subtitleSize,
                lineHeight: 1.42,
                color: videoPalette.muted,
                maxWidth: layout === "portrait" ? "88%" : "78%",
              }}
            >
              Cada audio, foto o medida puede esconder una consulta importante.
            </p>
          </div>
          <div
            style={{
              position: "relative",
              minHeight: layout === "portrait" ? 420 : 520,
            }}
          >
            {bubbles.map((bubble) => (
              <FloatingMessage
                key={bubble.text}
                frame={frame}
                delay={bubble.delay}
                x={bubble.x}
                y={bubble.y}
                layout={layout}
                tone={bubble.tone}
                width={bubble.width ?? (layout === "portrait" ? 270 : 320)}
                rotate={bubble.rotate}
                opacity={0.98}
              >
                {bubble.text}
              </FloatingMessage>
            ))}
          </div>
        </div>
      </div>
    </SceneWrapper>
  );
}

function PainScene({ frame, layout }: SceneProps) {
  const { width } = useVideoConfig();
  const cardShift = interpolate(frame, [0, 90, 180], [24, 0, -14], {
    extrapolateRight: "clamp",
  });

  return (
    <SceneWrapper frame={frame} layout={layout}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: sceneWidth(layout, width),
          maxWidth: 1560,
        }}
      >
        <div style={{ display: "grid", ...sceneGrid(layout), alignItems: "center" }}>
          <div>
            <div style={{ marginBottom: 18 }}>
              <AccentNote tone="alert">EL PROBLEMA NO ES SOLO COTIZAR</AccentNote>
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: layout === "portrait" ? 46 : 74,
                lineHeight: 1,
                letterSpacing: "-0.05em",
                color: videoPalette.text,
                maxWidth: layout === "portrait" ? "95%" : 760,
              }}
            >
              WhatsApp, audios, fotos y medidas... todo mezclado.
            </h2>
            <p
              style={{
                margin: "20px 0 0",
                fontSize: layout === "portrait" ? 23 : 29,
                lineHeight: 1.44,
                color: videoPalette.muted,
                maxWidth: layout === "portrait" ? "92%" : 760,
              }}
            >
              Si respondes tarde, el cliente ya pidio precio en otro lado.
            </p>
          </div>
          <div
            style={{
              position: "relative",
              minHeight: layout === "portrait" ? 420 : 500,
              transform: `translateY(${cardShift}px)`,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: layout === "portrait" ? "18px 8px auto 24px" : "18px 56px auto 42px",
                width: layout === "portrait" ? "72%" : 360,
                height: 112,
                borderRadius: 26,
                background: "rgba(255,255,255,0.88)",
                border: "1px solid rgba(228, 90, 90, 0.16)",
                boxShadow: "0 20px 42px rgba(18, 31, 58, 0.08)",
                padding: "18px 20px",
                color: "#9F4545",
                fontSize: 23,
                lineHeight: 1.28,
                fontWeight: 650,
                opacity: interpolate(frame, [0, 36], [0, 1], {
                  extrapolateRight: "clamp",
                }),
              }}
            >
              Consulta perdida
            </div>
            <div
              style={{
                position: "absolute",
                right: layout === "portrait" ? 18 : 28,
                bottom: layout === "portrait" ? 58 : 46,
                width: layout === "portrait" ? "68%" : 390,
                borderRadius: 28,
                background: "rgba(255,255,255,0.9)",
                border: "1px solid rgba(77, 120, 214, 0.14)",
                boxShadow: "0 20px 42px rgba(18, 31, 58, 0.08)",
                padding: "18px 20px",
                color: videoPalette.text,
                fontSize: 23,
                lineHeight: 1.3,
                opacity: interpolate(frame, [28, 120], [0, 1], {
                  extrapolateRight: "clamp",
                }),
                transform: `translateY(${interpolate(frame, [0, 90], [18, 0], {
                  extrapolateRight: "clamp",
                })}px)`,
              }}
            >
              Cliente pidio precio en otro lado
            </div>
            <div
              style={{
                position: "absolute",
                left: layout === "portrait" ? 28 : 0,
                top: layout === "portrait" ? 190 : 148,
                width: layout === "portrait" ? "66%" : 300,
                transform: `rotate(-3deg) translateX(${interpolate(frame, [0, 100], [10, 0], {
                  extrapolateRight: "clamp",
                })}px)`,
                opacity: interpolate(frame, [0, 68], [0, 1], {
                  extrapolateRight: "clamp",
                }),
              }}
            >
              <StepCard
                number="01"
                title="Mensajes enterrados"
                body="Medidas, fotos y datos del cliente quedan repartidos entre chats, llamadas y notas sueltas."
                layout={layout}
                compact
              >
                <AccentNote tone="soft">Audios sin escuchar - fotos sueltas</AccentNote>
              </StepCard>
            </div>
          </div>
        </div>
      </div>
    </SceneWrapper>
  );
}

function IntroScene({ frame, layout }: SceneProps) {
  const { width } = useVideoConfig();
  const phoneWidth = layout === "portrait" ? width * 0.78 : 540;
  const logoScale = interpolate(frame, [0, 32], [0.88, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <SceneWrapper frame={frame} layout={layout}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: sceneWidth(layout, width),
            maxWidth: 1580,
            display: "grid",
            ...sceneGrid(layout),
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ transform: `scale(${logoScale})`, transformOrigin: "left center" }}>
              <VentoraLogo width={layout === "portrait" ? 320 : 360} />
            </div>
            <h2
              style={{
                margin: "24px 0 0",
                fontSize: layout === "portrait" ? 48 : 78,
                lineHeight: 0.98,
                letterSpacing: "-0.05em",
                color: videoPalette.text,
                maxWidth: layout === "portrait" ? "92%" : 760,
              }}
            >
              Ventora ordena tus solicitudes en un solo lugar.
            </h2>
            <p
              style={{
                margin: "20px 0 0",
                fontSize: layout === "portrait" ? 24 : 30,
                lineHeight: 1.4,
                color: videoPalette.muted,
                maxWidth: layout === "portrait" ? "90%" : 720,
              }}
            >
              Un sistema comercial movil para vidrios y aluminio.
            </p>
          </div>
          <div style={{ display: "flex", justifyContent: layout === "portrait" ? "center" : "flex-end" }}>
            <PhoneMockup
              src={ventoraVideoAssets.panelSolicitudes}
              alt="Panel de solicitudes Ventora"
              layout={layout}
              width={phoneWidth}
              objectFit="contain"
            />
          </div>
        </div>
      </div>
    </SceneWrapper>
  );
}

function LinkScene({ frame, layout }: SceneProps) {
  const { width } = useVideoConfig();
  const leftScale = interpolate(frame, [0, 60], [0.96, 1], {
    extrapolateRight: "clamp",
  });

  const chips = ["WhatsApp", "Instagram", "Facebook", "QR"] as const;

  return (
    <SceneWrapper frame={frame} layout={layout}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: sceneWidth(layout, width),
          maxWidth: 1580,
        }}
      >
        <div style={{ display: "grid", ...sceneGrid(layout), alignItems: "center" }}>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: layout === "portrait" ? 50 : 80,
                lineHeight: 0.98,
                letterSpacing: "-0.05em",
                color: videoPalette.text,
                maxWidth: layout === "portrait" ? "95%" : 780,
              }}
            >
              Comparte tu link comercial.
            </h2>
            <p
              style={{
                margin: "20px 0 0",
                fontSize: layout === "portrait" ? 24 : 30,
                lineHeight: 1.42,
                color: videoPalette.muted,
                maxWidth: layout === "portrait" ? "92%" : 760,
              }}
            >
              Dejalo en WhatsApp Business, Instagram, Facebook, QR o tarjetas.
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 14,
                marginTop: 26,
              }}
            >
              {chips.map((chip, index) => (
                <AccentNote key={chip} tone={index === 3 ? "soft" : "blue"}>
                  {chip}
                </AccentNote>
              ))}
            </div>
          </div>
          <div style={{ position: "relative" }}>
            <div
              style={{
                position: "absolute",
                left: layout === "portrait" ? 6 : 0,
                top: layout === "portrait" ? 14 : 22,
                width: layout === "portrait" ? "100%" : 160,
                height: layout === "portrait" ? 100 : 96,
                borderRadius: 28,
                background: "rgba(255,255,255,0.75)",
                border: "1px solid rgba(77, 120, 214, 0.12)",
                boxShadow: "0 14px 36px rgba(22, 38, 71, 0.08)",
                opacity: interpolate(frame, [0, 34], [0, 1], {
                  extrapolateRight: "clamp",
                }),
              }}
            />
            <div
              style={{
                transform: `scale(${leftScale})`,
                transformOrigin: "center center",
              }}
            >
              <PhoneMockup
                src={ventoraVideoAssets.linkComercial}
                alt="Link comercial Ventora"
                layout={layout}
                width={layout === "portrait" ? width * 0.84 : 520}
                objectFit="cover"
                objectPosition={layout === "portrait" ? "center top" : "center center"}
              />
            </div>
          </div>
        </div>
      </div>
    </SceneWrapper>
  );
}

function RequestScene({ frame, layout }: SceneProps) {
  const { width } = useVideoConfig();
  const fill = spring({
    fps: VENTORA_VIDEO_FPS,
    frame,
    config: {
      damping: 18,
      stiffness: 100,
    },
  });

  return (
    <SceneWrapper frame={frame} layout={layout}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: sceneWidth(layout, width),
          maxWidth: 1580,
        }}
      >
        <div style={{ display: "grid", ...sceneGrid(layout), alignItems: "center" }}>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: layout === "portrait" ? 50 : 80,
                lineHeight: 0.98,
                letterSpacing: "-0.05em",
                color: videoPalette.text,
                maxWidth: layout === "portrait" ? "92%" : 760,
              }}
            >
              El cliente deja sus datos.
            </h2>
            <p
              style={{
                margin: "20px 0 0",
                fontSize: layout === "portrait" ? 24 : 30,
                lineHeight: 1.42,
                color: videoPalette.muted,
                maxWidth: layout === "portrait" ? "92%" : 740,
              }}
            >
              Nombre, contacto, tipo de trabajo, medidas o descripcion.
            </p>
            <div style={{ display: "grid", gap: 14, marginTop: 26, maxWidth: 580 }}>
              {["Nombre", "WhatsApp", "Tipo de trabajo", "Medidas"].map((item, index) => (
                <div
                  key={item}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.9)",
                    border: "1px solid rgba(77,120,214,0.12)",
                    color: index === 3 ? videoPalette.blueDark : videoPalette.muted,
                    fontSize: 19,
                    fontWeight: 650,
                    boxShadow: "0 12px 28px rgba(22, 38, 71, 0.06)",
                    transform: `translateX(${interpolate(fill + index * 0.12, [0, 1], [18, 0], {
                      extrapolateRight: "clamp",
                    })}px)`,
                    opacity: interpolate(fill + index * 0.12, [0, 1], [0, 1], {
                      extrapolateRight: "clamp",
                    }),
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: layout === "portrait" ? "center" : "flex-end" }}>
            <PhoneMockup
              src={ventoraVideoAssets.formularioSolicitud}
              alt="Formulario de solicitud Ventora"
              layout={layout}
              width={layout === "portrait" ? width * 0.84 : 520}
              objectFit="cover"
              objectPosition="center top"
            />
          </div>
        </div>
      </div>
    </SceneWrapper>
  );
}

function PanelScene({ frame, layout }: SceneProps) {
  const { width } = useVideoConfig();
  const pulse = spring({
    fps: VENTORA_VIDEO_FPS,
    frame,
    config: {
      damping: 16,
      stiffness: 110,
    },
  });
  const badgeFrames = [0, 18, 36];
  const badgeTexts = ["Nueva solicitud", "Cliente pendiente", "Cotizacion creada"];

  return (
    <SceneWrapper frame={frame} layout={layout}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: sceneWidth(layout, width),
          maxWidth: 1580,
        }}
      >
        <div style={{ display: "grid", ...sceneGrid(layout), alignItems: "center" }}>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: layout === "portrait" ? 50 : 80,
                lineHeight: 0.98,
                letterSpacing: "-0.05em",
                color: videoPalette.text,
                maxWidth: layout === "portrait" ? "92%" : 780,
              }}
            >
              Todo queda ordenado en tu panel.
            </h2>
            <p
              style={{
                margin: "20px 0 0",
                fontSize: layout === "portrait" ? 24 : 30,
                lineHeight: 1.42,
                color: videoPalette.muted,
                maxWidth: layout === "portrait" ? "90%" : 740,
              }}
            >
              Ves quien esta nuevo, pendiente, contactado, cotizado o aprobado.
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                marginTop: 26,
              }}
            >
              {badgeTexts.map((text, index) => (
                <div
                  key={text}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 999,
                    background:
                      index === 2
                        ? "rgba(232, 245, 236, 0.96)"
                        : "rgba(235, 243, 255, 0.96)",
                    border:
                      index === 2
                        ? "1px solid rgba(66, 173, 103, 0.18)"
                        : "1px solid rgba(77,120,214,0.14)",
                    color: index === 2 ? "#2E9E5A" : videoPalette.blueDark,
                    fontSize: 18,
                    fontWeight: 700,
                    boxShadow: "0 10px 22px rgba(22, 38, 71, 0.06)",
                    opacity: interpolate(frame, [badgeFrames[index], badgeFrames[index] + 18], [0, 1], {
                      extrapolateRight: "clamp",
                    }),
                    transform: `translateY(${interpolate(frame, [badgeFrames[index], badgeFrames[index] + 18], [10, 0], {
                      extrapolateRight: "clamp",
                    })}px) scale(${0.96 + pulse * 0.04})`,
                  }}
                >
                  {text}
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: "relative", display: "flex", justifyContent: layout === "portrait" ? "center" : "flex-end" }}>
            <PhoneMockup
              src={ventoraVideoAssets.panelSolicitudes}
              alt="Panel de solicitudes Ventora"
              layout={layout}
              width={layout === "portrait" ? width * 0.84 : 540}
              objectFit="contain"
            />
          </div>
        </div>
      </div>
    </SceneWrapper>
  );
}

function ActionScene({ frame, layout }: SceneProps) {
  const { width } = useVideoConfig();
  const actions = [
    "Contactar por WhatsApp",
    "Crear cotizacion",
    "Ver estado",
  ];

  return (
    <SceneWrapper frame={frame} layout={layout}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: sceneWidth(layout, width),
          maxWidth: 1540,
        }}
      >
        <div style={{ display: "grid", gap: 32, justifyItems: "center" }}>
          <div style={{ textAlign: "center", maxWidth: 980 }}>
            <h2
              style={{
                margin: 0,
                fontSize: layout === "portrait" ? 52 : 82,
                lineHeight: 0.98,
                letterSpacing: "-0.05em",
                color: videoPalette.text,
              }}
            >
              Contacta, cotiza y sigue el estado.
            </h2>
            <p
              style={{
                margin: "18px auto 0",
                fontSize: layout === "portrait" ? 24 : 29,
                lineHeight: 1.42,
                color: videoPalette.muted,
                maxWidth: 820,
              }}
            >
              Respuesta clara. Presupuesto listo. Seguimiento visible.
            </p>
          </div>
          <div
            style={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: layout === "portrait" ? "1fr" : "repeat(3, 1fr)",
              gap: 18,
            }}
          >
            {actions.map((action, index) => (
              <StepCard
                key={action}
                number={`0${index + 1}`}
                label={index === 0 ? "accion" : undefined}
                title={action}
                body={
                  index === 0
                    ? "Hablas por WhatsApp desde la solicitud."
                    : index === 1
                      ? "Pasas la solicitud a cotizacion sin perder contexto."
                      : "Ves si quedo nueva, pendiente, cotizada o aprobada."
                }
                layout={layout}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: index === 2 ? "#2E9E5A" : videoPalette.blueDark,
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 999,
                      background: index === 2 ? "rgba(66, 173, 103, 0.18)" : "rgba(77,120,214,0.14)",
                    }}
                  />
                  {index === 0 ? "Respuesta inmediata" : index === 1 ? "Presupuesto profesional" : "Estado comercial"}
                </div>
              </StepCard>
            ))}
          </div>
        </div>
      </div>
    </SceneWrapper>
  );
}

function ClosingScene({ frame, layout }: SceneProps) {
  const { width } = useVideoConfig();
  const rise = interpolate(frame, [0, 90], [24, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <SceneWrapper frame={frame} layout={layout}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: sceneWidth(layout, width),
          maxWidth: 1580,
        }}
      >
        <div style={{ display: "grid", ...sceneGrid(layout), alignItems: "center" }}>
          <div style={{ transform: `translateY(${rise}px)` }}>
            <VentoraLogo width={layout === "portrait" ? 320 : 360} compact />
            <h2
              style={{
                margin: "26px 0 0",
                fontSize: layout === "portrait" ? 54 : 84,
                lineHeight: 0.98,
                letterSpacing: "-0.05em",
                color: videoPalette.text,
                maxWidth: layout === "portrait" ? "92%" : 760,
              }}
            >
              Recibe solicitudes aunque estes ocupado.
            </h2>
            <p
              style={{
                margin: "20px 0 0",
                fontSize: layout === "portrait" ? 24 : 30,
                lineHeight: 1.42,
                color: videoPalette.muted,
                maxWidth: layout === "portrait" ? "90%" : 760,
              }}
            >
              Ordena tus clientes y convierte consultas en cotizaciones profesionales.
            </p>
            <div style={{ display: "flex", gap: 14, marginTop: 30, flexWrap: "wrap" }}>
              <CTAButton>Prueba Ventora</CTAButton>
              <CTAButton variant="secondary">Crea tu link de solicitudes</CTAButton>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: layout === "portrait" ? "center" : "flex-end" }}>
            <PhoneMockup
              src={ventoraVideoAssets.cotizacion}
              alt="Cotizacion Ventora"
              layout={layout}
              width={layout === "portrait" ? width * 0.84 : 540}
              objectFit="contain"
            />
          </div>
        </div>
      </div>
    </SceneWrapper>
  );
}

const SCENES = [
  { key: "hook", duration: VENTORA_VIDEO_DURATIONS.hook, render: HookScene },
  { key: "dolor", duration: VENTORA_VIDEO_DURATIONS.dolor, render: PainScene },
  { key: "intro", duration: VENTORA_VIDEO_DURATIONS.intro, render: IntroScene },
  { key: "link", duration: VENTORA_VIDEO_DURATIONS.link, render: LinkScene },
  { key: "solicitud", duration: VENTORA_VIDEO_DURATIONS.solicitud, render: RequestScene },
  { key: "panel", duration: VENTORA_VIDEO_DURATIONS.panel, render: PanelScene },
  { key: "accion", duration: VENTORA_VIDEO_DURATIONS.accion, render: ActionScene },
  { key: "cierre", duration: VENTORA_VIDEO_DURATIONS.cierre, render: ClosingScene },
] as const;

const SCENE_STARTS = SCENES.reduce<number[]>((acc, scene, index) => {
  acc[index] = (acc[index - 1] ?? 0) + (index === 0 ? 0 : SCENES[index - 1].duration);
  return acc;
}, []);

function SceneChunk({
  startFrame,
  layout,
  render,
}: {
  startFrame: number;
  layout: VentoraVideoLayout;
  render: (props: SceneProps) => ReactNode;
}) {
  const frame = useCurrentFrame();
  return <>{render({ frame: Math.max(0, frame - startFrame), layout })}</>;
}

export function VentoraExplainer({
  layout = "landscape",
}: {
  layout?: VentoraVideoLayout;
}) {
  return (
    <AbsoluteFill>
      {SCENES.map((scene, index) => {
        const sceneStart = SCENE_STARTS[index];
        return (
          <Sequence
            key={scene.key}
            from={sceneStart}
            durationInFrames={scene.duration}
          >
            <SceneChunk
              startFrame={sceneStart}
              layout={layout}
              render={scene.render}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}

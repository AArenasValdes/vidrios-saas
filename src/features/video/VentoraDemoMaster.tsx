import { type ReactNode } from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  CTAButton,
  FloatingMessage,
  PhoneMockup,
  SceneWrapper,
  StepCard,
  videoPalette,
} from "./components";
import { ventoraDemoMasterAssets } from "./demoMasterAssets";
import { VENTORA_VIDEO_FPS } from "./video-assets";

const SCENE_SECONDS = 25;
const SCENE_DURATION = SCENE_SECONDS * VENTORA_VIDEO_FPS;
export const VENTORA_DEMO_MASTER_DURATION = SCENE_DURATION * 16;

type DemoScene = {
  id: string;
  kicker: string;
  title: string;
  lines: string[];
  voice: string;
  image?: string;
  imageAlt?: string;
  chips?: string[];
  renderExtra?: (frame: number) => ReactNode;
};

const scenes: DemoScene[] = [
  {
    id: "problema",
    kicker: "Problema real",
    title: "Las consultas llegan por todos lados",
    lines: ["WhatsApp", "Facebook", "Instagram", "Si no las ordenas, se pierden"],
    voice:
      "En vidrios y aluminio, muchas pegas no se pierden por falta de tecnica. Se pierden porque las consultas llegan desordenadas, se responden tarde o quedan perdidas en WhatsApp.",
    chips: ["Audio", "Foto", "Medidas", "Precio?"],
  },
  {
    id: "que-es",
    kicker: "Que es Ventora",
    title: "Ventora ordena el trabajo comercial",
    lines: ["Clientes", "Solicitudes", "Cotizaciones", "PDF y WhatsApp"],
    voice:
      "Ventora es una herramienta comercial movil para maestros y empresas de vidrios y aluminio. No reemplaza como fabricas. Te ayuda a vender mejor.",
    image: ventoraDemoMasterAssets.login,
    imageAlt: "Acceso a Ventora",
  },
  {
    id: "dashboard",
    kicker: "Dashboard",
    title: "Resumen simple para partir el dia",
    lines: ["Cotizaciones", "Estados", "Trabajos por revisar"],
    voice:
      "Desde el dashboard ves un resumen simple de tu actividad: cotizaciones, estados y proximos trabajos que debes revisar.",
    image: ventoraDemoMasterAssets.dashboard,
    imageAlt: "Dashboard Ventora",
  },
  {
    id: "clientes",
    kicker: "Clientes",
    title: "Contactos ordenados",
    lines: ["Nombre", "Telefono", "Historial", "Seguimiento"],
    voice:
      "En clientes puedes tener tus contactos mas ordenados, sin depender solamente de buscar conversaciones antiguas en WhatsApp.",
    image: ventoraDemoMasterAssets.clientes,
    imageAlt: "Clientes en Ventora",
  },
  {
    id: "solicitudes",
    kicker: "Solicitudes",
    title: "Cada consulta queda registrada",
    lines: ["Datos del cliente", "Tipo de trabajo", "Estado comercial"],
    voice:
      "Cuando un cliente deja una solicitud, queda registrada en Ventora con sus datos, el tipo de trabajo y el estado comercial.",
    image: ventoraDemoMasterAssets.solicitudes,
    imageAlt: "Solicitudes en Ventora",
  },
  {
    id: "pagina-publica",
    kicker: "Link publico",
    title: "Un formulario para recibir trabajos",
    lines: ["Comparte tu link", "Recibe datos claros", "Orden desde el inicio"],
    voice:
      "Cada empresa puede tener un link publico para recibir solicitudes. Lo puedes compartir por WhatsApp, Facebook, Instagram o con un codigo QR.",
    image: ventoraDemoMasterAssets.paginaPublica,
    imageAlt: "Pagina publica Ventora",
  },
  {
    id: "canales",
    kicker: "Canales y QR",
    title: "No todo tiene que perderse en el chat",
    lines: ["QR", "WhatsApp", "Instagram", "Facebook"],
    voice:
      "Ventora te permite usar enlaces por canal y QR para que tus clientes lleguen a una solicitud ordenada, no solo a una conversacion perdida.",
    image: ventoraDemoMasterAssets.canalesQr,
    imageAlt: "Canales y QR Ventora",
  },
  {
    id: "componentes",
    kicker: "Cotizacion por componentes",
    title: "Cotiza ventanas, shower door y trabajos a medida",
    lines: ["Medidas", "Cantidades", "Total claro"],
    voice:
      "Puedes crear cotizaciones por componentes, por ejemplo ventanas, shower door, cierres de terraza o trabajos a medida. Agregas medidas, cantidades y revisas el total.",
    image: ventoraDemoMasterAssets.nuevaCotizacion,
    imageAlt: "Nueva cotizacion por componentes",
  },
  {
    id: "cuaderno",
    kicker: "Cuaderno digital",
    title: "Tambien puedes cotizar por total",
    lines: ["Valor definido", "Detalle claro", "Presentacion ordenada"],
    voice:
      "Tambien puedes cotizar de forma mas libre, como un cuaderno digital. Esto sirve cuando ya tienes el valor definido y solo necesitas dejarlo claro, ordenado y presentable.",
    image: ventoraDemoMasterAssets.nuevaCotizacion,
    imageAlt: "Cotizacion tipo cuaderno digital",
  },
  {
    id: "detalle",
    kicker: "Detalle de cotizacion",
    title: "La propuesta queda guardada",
    lines: ["Revisar", "Editar", "Mantener estado claro"],
    voice:
      "La cotizacion queda guardada, puedes revisarla, editarla y mantener el estado comercial claro.",
    image: ventoraDemoMasterAssets.cotizaciones,
    imageAlt: "Detalle de cotizaciones",
  },
  {
    id: "pdf",
    kicker: "PDF profesional",
    title: "Deja de mandar solo un precio suelto",
    lines: ["Logo", "Datos de empresa", "Detalle del trabajo"],
    voice:
      "En vez de mandar solo un precio suelto por WhatsApp, puedes enviar un PDF profesional con los datos de tu empresa y el detalle del trabajo.",
    image: ventoraDemoMasterAssets.pdfProfesional,
    imageAlt: "PDF profesional Ventora",
  },
  {
    id: "whatsapp",
    kicker: "Envio por WhatsApp",
    title: "El canal sigue siendo WhatsApp",
    lines: ["Mensaje listo", "Link claro", "Cliente entiende mejor"],
    voice:
      "El maestro sigue usando WhatsApp, porque ese es su canal real de venta. La diferencia es que ahora envia una propuesta mas clara y ordenada.",
    renderExtra: (frame) => <WhatsAppMockup frame={frame} />,
  },
  {
    id: "presupuesto",
    kicker: "Presupuesto publico",
    title: "El cliente revisa desde un link simple",
    lines: ["Ver propuesta", "Responder", "Avanzar o revisar"],
    voice:
      "El cliente puede revisar el presupuesto desde un link simple y responder si quiere avanzar o prefiere revisarlo.",
    image: ventoraDemoMasterAssets.presupuestoPublico,
    imageAlt: "Presupuesto publico Ventora",
  },
  {
    id: "configuracion-empresa",
    kicker: "Configuracion de empresa",
    title: "Tu empresa se ve mas profesional",
    lines: ["Logo", "Colores", "Forma de pago", "Precios base"],
    voice:
      "En configuracion puedes dejar los datos de tu empresa, logo, colores, forma de pago y precios base.",
    image: ventoraDemoMasterAssets.configuracionEmpresa,
    imageAlt: "Configuracion de empresa",
  },
  {
    id: "configuracion-pagina",
    kicker: "Pagina publica",
    title: "Ajusta servicios, galeria y horarios",
    lines: ["Servicios", "Fotos", "Horarios", "Presentacion"],
    voice:
      "Tambien puedes ajustar tu pagina publica, servicios, galeria, horarios y presentacion para que el cliente vea una empresa mas profesional.",
    image: ventoraDemoMasterAssets.configuracionPagina,
    imageAlt: "Configuracion de pagina publica",
  },
  {
    id: "cierre",
    kicker: "Cierre comercial",
    title: "Tu cotizador tecnico te ayuda a fabricar. Ventora te ayuda a vender.",
    lines: ["Ordena consultas", "Cotiza desde el celular", "PDF profesional", "Pide tu demo por WhatsApp"],
    voice:
      "Ventora no busca reemplazar tu experiencia ni tu forma de fabricar. Te ayuda a ordenar consultas, cotizar desde el celular, enviar presupuestos profesionales y cerrar mas trabajos con menos desorden.",
    chips: ["Demo", "WhatsApp", "Plan fundador"],
  },
];

function TitleBlock({ scene, frame }: { scene: DemoScene; frame: number }) {
  const opacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(frame, [0, 24], [28, 0], { extrapolateRight: "clamp" });

  return (
    <div style={{ opacity, transform: `translateY(${y}px)` }}>
      <div
        style={{
          color: videoPalette.blueDark,
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 18,
        }}
      >
        {scene.kicker}
      </div>
      <h1
        style={{
          margin: 0,
          color: videoPalette.text,
          fontSize: scene.id === "cierre" ? 66 : 78,
          lineHeight: 0.96,
          letterSpacing: "-0.045em",
          fontWeight: 850,
        }}
      >
        {scene.title}
      </h1>
    </div>
  );
}

function BulletList({ lines, frame }: { lines: string[]; frame: number }) {
  return (
    <div style={{ display: "grid", gap: 16, marginTop: 34 }}>
      {lines.map((line, index) => {
        const local = Math.max(0, frame - 20 - index * 8);
        const progress = spring({
          fps: VENTORA_VIDEO_FPS,
          frame: local,
          config: { damping: 16, stiffness: 110 },
        });

        return (
          <div
            key={line}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              opacity: progress,
              transform: `translateX(${(1 - progress) * 24}px)`,
              fontSize: 34,
              lineHeight: 1.12,
              fontWeight: 760,
              color: index === lines.length - 1 ? videoPalette.blueDark : videoPalette.text,
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: 999,
                background:
                  index === lines.length - 1
                    ? "linear-gradient(180deg, #4F7BE0 0%, #345DBD 100%)"
                    : "rgba(77,120,214,0.22)",
                flex: "0 0 auto",
              }}
            />
            <span>{line}</span>
          </div>
        );
      })}
    </div>
  );
}

function VoiceCaption({ text }: { text: string }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        bottom: 88,
        padding: "22px 26px",
        borderRadius: 32,
        background: "rgba(255,255,255,0.94)",
        border: "1px solid rgba(42, 70, 133, 0.12)",
        boxShadow: "0 18px 52px rgba(22, 38, 71, 0.10)",
        color: videoPalette.muted,
        fontSize: 29,
        lineHeight: 1.34,
        fontWeight: 620,
      }}
    >
      {text}
    </div>
  );
}

function ScreenshotCard({
  src,
  alt,
  frame,
}: {
  src: string;
  alt: string;
  frame: number;
}) {
  const scale = interpolate(frame, [0, 40, SCENE_DURATION], [0.96, 1, 1.035], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        justifyContent: "center",
        transform: `scale(${scale})`,
      }}
    >
      <PhoneMockup
        src={src}
        alt={alt}
        layout="portrait"
        width={690}
        objectFit="cover"
        objectPosition="center top"
        radius={46}
        padding={18}
      />
    </div>
  );
}

function WhatsAppMockup({ frame }: { frame: number }) {
  const messages = [
    "Hola, te envio el presupuesto de tu ventana.",
    "Aqui va el link para revisarlo tranquilo.",
    "Si esta todo OK, seguimos por aca.",
  ];

  return (
    <div
      style={{
        width: 680,
        borderRadius: 50,
        padding: 30,
        background: "linear-gradient(180deg, #F7FFF9 0%, #EAF8EF 100%)",
        border: "1px solid rgba(60, 160, 88, 0.16)",
        boxShadow: "0 24px 80px rgba(22, 38, 71, 0.14)",
      }}
    >
      <div
        style={{
          borderRadius: 36,
          background: "#FFFFFF",
          minHeight: 720,
          padding: 30,
          display: "grid",
          alignContent: "end",
          gap: 18,
        }}
      >
        {messages.map((message, index) => {
          const progress = spring({
            fps: VENTORA_VIDEO_FPS,
            frame: Math.max(0, frame - index * 16),
            config: { damping: 16, stiffness: 115 },
          });

          return (
            <div
              key={message}
              style={{
                marginLeft: index === 1 ? "auto" : 0,
                maxWidth: "82%",
                borderRadius: 26,
                padding: "18px 22px",
                background: index === 1 ? "#DCF8C6" : "#F3F4F6",
                color: "#1F2937",
                fontSize: 28,
                lineHeight: 1.28,
                fontWeight: 620,
                opacity: progress,
                transform: `translateY(${(1 - progress) * 20}px)`,
              }}
            >
              {message}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProblemBubbles({ frame, chips = [] }: { frame: number; chips?: string[] }) {
  const labels = chips.length > 0 ? chips : ["WhatsApp", "Facebook", "Instagram"];
  const positions = [
    { x: 54, y: 170, rotate: -4 },
    { x: 520, y: 260, rotate: 3 },
    { x: 100, y: 430, rotate: 2 },
    { x: 462, y: 560, rotate: -2 },
  ];

  return (
    <div style={{ position: "relative", width: 760, height: 760 }}>
      {labels.map((label, index) => (
        <FloatingMessage
          key={label}
          frame={frame}
          delay={index * 12}
          x={positions[index]?.x ?? 80}
          y={positions[index]?.y ?? 160}
          rotate={positions[index]?.rotate ?? 0}
          layout="portrait"
          tone={index === labels.length - 1 ? "blue" : "soft"}
          width={index === labels.length - 1 ? 330 : 260}
        >
          {label}
        </FloatingMessage>
      ))}
      <div
        style={{
          position: "absolute",
          left: 235,
          top: 260,
          width: 260,
          height: 260,
          borderRadius: 999,
          background: "rgba(77,120,214,0.10)",
          border: "1px solid rgba(77,120,214,0.16)",
          display: "grid",
          placeItems: "center",
          color: videoPalette.blueDark,
          fontSize: 34,
          fontWeight: 850,
          textAlign: "center",
          lineHeight: 1.05,
        }}
      >
        Orden
        <br />
        comercial
      </div>
    </div>
  );
}

function DemoSceneView({ scene, frame }: { scene: DemoScene; frame: number }) {
  const isTextOnly = !scene.image && !scene.renderExtra;
  const contentTop = isTextOnly ? 260 : 130;

  return (
    <SceneWrapper frame={frame} layout="portrait">
      <Img
        src={staticFile("video-assets/logo-ventora.svg")}
        alt="Ventora"
        style={{
          position: "absolute",
          top: 58,
          left: 70,
          width: 240,
          height: "auto",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 58,
          right: 70,
          color: videoPalette.blueDark,
          fontSize: 23,
          fontWeight: 800,
        }}
      >
        Demo producto
      </div>

      <div
        style={{
          position: "absolute",
          left: 70,
          right: 70,
          top: contentTop,
          display: "grid",
          gap: 40,
        }}
      >
        <TitleBlock scene={scene} frame={frame} />
        {isTextOnly ? (
          <div style={{ height: 770, display: "grid", placeItems: "center" }}>
            {scene.id === "cierre" ? (
              <ClosingCards frame={frame} />
            ) : (
              <ProblemBubbles frame={frame} chips={scene.chips} />
            )}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              justifyItems: "center",
              gap: 28,
            }}
          >
            {scene.image ? (
              <ScreenshotCard src={scene.image} alt={scene.imageAlt ?? scene.title} frame={frame} />
            ) : null}
            {scene.renderExtra ? scene.renderExtra(frame) : null}
          </div>
        )}
        <BulletList lines={scene.lines} frame={frame} />
      </div>

      <div
        style={{
          position: "absolute",
          top: 155,
          right: 70,
          width: 92,
          height: 92,
          borderRadius: 999,
          background: "rgba(255,255,255,0.9)",
          border: "1px solid rgba(42, 70, 133, 0.12)",
          display: "grid",
          placeItems: "center",
          color: videoPalette.blueDark,
          fontSize: 28,
          fontWeight: 850,
        }}
      >
        {String(scenes.findIndex((item) => item.id === scene.id) + 1).padStart(2, "0")}
      </div>

      <VoiceCaption text={scene.voice} />
    </SceneWrapper>
  );
}

function ClosingCards({ frame }: { frame: number }) {
  return (
    <div style={{ display: "grid", gap: 24, width: "100%" }}>
      <StepCard
        number="01"
        title="Tu cotizador tecnico"
        body="Te ayuda a fabricar, calcular y resolver la parte tecnica del trabajo."
        layout="portrait"
      />
      <StepCard
        number="02"
        title="Ventora"
        body="Te ayuda a captar solicitudes, ordenar clientes, cotizar y vender mejor desde el celular."
        layout="portrait"
      >
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <CTAButton>Pide tu demo por WhatsApp</CTAButton>
        </div>
      </StepCard>
      <div
        style={{
          opacity: interpolate(frame, [80, 120], [0, 1], { extrapolateRight: "clamp" }),
          color: videoPalette.blueDark,
          fontSize: 34,
          lineHeight: 1.18,
          fontWeight: 850,
          textAlign: "center",
        }}
      >
        Tu cotizador tecnico te ayuda a fabricar.
        <br />
        Ventora te ayuda a vender.
      </div>
    </div>
  );
}

function SceneChunk({ scene }: { scene: DemoScene }) {
  const frame = useCurrentFrame();
  return <DemoSceneView scene={scene} frame={frame} />;
}

export function VentoraDemoMaster() {
  return (
    <AbsoluteFill style={{ background: "#F7FAFF" }}>
      {scenes.map((scene, index) => (
        <Sequence
          key={scene.id}
          from={index * SCENE_DURATION}
          durationInFrames={SCENE_DURATION}
          premountFor={VENTORA_VIDEO_FPS}
        >
          <SceneChunk scene={scene} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

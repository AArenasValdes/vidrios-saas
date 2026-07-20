import {
  drawGuidedHardware,
  resolveHardwareAnchor,
  resolveHardwareSize,
} from "../guided-visual-hardware";

describe("guided visual hardware", () => {
  it("dibuja manilla abatible con placa y palanca", () => {
    const svg = drawGuidedHardware({
      kind: "manilla_abatible",
      cx: 100,
      cy: 120,
      size: 28,
      freeSide: "left",
      stroke: "#111827",
      strokeWidth: 1.2,
    });
    expect(svg).toContain('data-guided-hardware="manilla_abatible"');
    expect(svg).toContain("<rect");
    expect(svg).toContain("<circle");
  });

  it("espeja la palanca según el lado libre", () => {
    const left = drawGuidedHardware({
      kind: "manilla_abatible",
      cx: 40,
      cy: 100,
      size: 24,
      freeSide: "left",
      stroke: "#111",
      strokeWidth: 1,
    });
    const right = drawGuidedHardware({
      kind: "manilla_abatible",
      cx: 160,
      cy: 100,
      size: 24,
      freeSide: "right",
      stroke: "#111",
      strokeWidth: 1,
    });
    expect(left).toContain('x="');
    expect(right).toContain('x="');
    expect(left).not.toEqual(right);
  });

  it("dibuja cremona, oscilobatiente y tiradores embutidos", () => {
    expect(
      drawGuidedHardware({
        kind: "cremona_ventana",
        cx: 50,
        cy: 80,
        size: 26,
        freeSide: "right",
        stroke: "#222",
        strokeWidth: 1,
      })
    ).toContain('data-guided-hardware="cremona_ventana"');

    expect(
      drawGuidedHardware({
        kind: "manilla_oscilobatiente",
        cx: 50,
        cy: 80,
        size: 26,
        freeSide: "right",
        stroke: "#222",
        strokeWidth: 1,
      })
    ).toContain('data-guided-hardware="manilla_oscilobatiente"');

    expect(
      drawGuidedHardware({
        kind: "tirador_corredera_embutido",
        cx: 50,
        cy: 80,
        size: 22,
        freeSide: "left",
        stroke: "#222",
        strokeWidth: 1,
      })
    ).toContain('data-guided-hardware="tirador_corredera_embutido"');

    expect(
      drawGuidedHardware({
        kind: "tirador_puerta_corredera",
        cx: 50,
        cy: 80,
        size: 30,
        freeSide: "left",
        stroke: "#222",
        strokeWidth: 1,
      })
    ).toContain('data-guided-hardware="tirador_puerta_corredera"');
  });

  it("ancla el herraje al lado libre", () => {
    const left = resolveHardwareAnchor({
      x: 0,
      y: 0,
      w: 200,
      h: 100,
      freeSide: "left",
      insetRatio: 0.1,
    });
    const right = resolveHardwareAnchor({
      x: 0,
      y: 0,
      w: 200,
      h: 100,
      freeSide: "right",
      insetRatio: 0.1,
    });
    expect(left.cx).toBeLessThan(100);
    expect(right.cx).toBeGreaterThan(100);
    expect(resolveHardwareSize(200, 100)).toBeGreaterThanOrEqual(14);
  });
});

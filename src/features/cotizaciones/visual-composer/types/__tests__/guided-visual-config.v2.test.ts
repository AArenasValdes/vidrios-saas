import {
  GUIDED_VISUAL_SCHEMA_VERSION_V1,
  MAX_GUIDED_LEAF_MODULES,
  addEqualPalillos,
  addGuidedDivision,
  addPalillo,
  applyQuickSplitRatio,
  calculateNodeRects,
  countLeafModules,
  createDefaultGuidedVisualConfig,
  ensureGuidedVisualConfig,
  listLeafModules,
  mergeSiblingModules,
  migrateGuidedVisualConfigV1ToV2,
  parseGuidedVisualConfig,
  removePalillo,
  resetGuidedIdSeqForTests,
  serializeGuidedVisualConfig,
  splitModule,
  updateModuleType,
  updateModuleOpeningSide,
  updatePalilloPosition,
  updateSplitFirstSizeMm,
  updateSplitRatio,
  validateGuidedVisualConfig,
  type GuidedVisualConfigV1,
} from "../guided-visual-config";

describe("guided-visual-config V2", () => {
  beforeEach(() => {
    resetGuidedIdSeqForTests();
  });

  it("crea composición inicial con un módulo", () => {
    const config = createDefaultGuidedVisualConfig({
      widthMm: 1500,
      heightMm: 1800,
    });

    expect(config.schemaVersion).toBe(2);
    expect(config.widthMm).toBe(1500);
    expect(config.heightMm).toBe(1800);
    expect(countLeafModules(config.root)).toBe(1);
    expect(config.root.kind).toBe("module");
  });

  it("hace split vertical y horizontal", () => {
    let config = createDefaultGuidedVisualConfig({ widthMm: 1500, heightMm: 1800 });
    const leafId = listLeafModules(config.root)[0].id;

    config = splitModule(config, leafId, "vertical", 0.4);
    expect(countLeafModules(config.root)).toBe(2);
    expect(config.root.kind).toBe("split");
    if (config.root.kind === "split") {
      expect(config.root.direction).toBe("vertical");
      expect(config.root.ratio).toBeCloseTo(0.4);
    }

    const rightLeaf = listLeafModules(config.root)[1];
    config = splitModule(config, rightLeaf.id, "horizontal", 0.5);
    expect(countLeafModules(config.root)).toBe(3);
  });

  it("subdivide solo un hijo (fijo superior + dos inferiores)", () => {
    let config = createDefaultGuidedVisualConfig({ widthMm: 1800, heightMm: 1600 });
    const rootId = listLeafModules(config.root)[0].id;
    config = splitModule(config, rootId, "horizontal", 1 / 3);
    const bottom = listLeafModules(config.root)[1];
    config = splitModule(config, bottom.id, "vertical", 0.5);

    expect(countLeafModules(config.root)).toBe(3);
    const rects = calculateNodeRects(config);
    const modules = rects.filter((r) => r.kind === "module");
    expect(modules).toHaveLength(3);

    const top = modules.find((m) => m.yMm === 0);
    expect(top?.widthMm).toBe(1800);
    expect(top?.heightMm).toBeCloseTo(1600 / 3, 0);
  });

  it("respeta el máximo de 6 módulos", () => {
    let config = createDefaultGuidedVisualConfig({ widthMm: 2400, heightMm: 1200 });
    for (let i = 0; i < 10; i += 1) {
      const leaf = listLeafModules(config.root)[0];
      config = splitModule(config, leaf.id, "vertical", 0.5);
    }
    expect(countLeafModules(config.root)).toBe(MAX_GUIDED_LEAF_MODULES);
  });

  it("actualiza ratios y medida exacta del primer hijo", () => {
    let config = createDefaultGuidedVisualConfig({ widthMm: 1500, heightMm: 1000 });
    const leafId = listLeafModules(config.root)[0].id;
    config = splitModule(config, leafId, "vertical", 0.5);
    const splitId = config.root.kind === "split" ? config.root.id : "";

    config = updateSplitRatio(config, splitId, 0.6);
    expect(config.root.kind === "split" && config.root.ratio).toBeCloseTo(0.6);

    config = updateSplitFirstSizeMm(config, splitId, 600);
    expect(config.root.kind === "split" && config.root.ratio).toBeCloseTo(600 / 1500);

    config = applyQuickSplitRatio(config, splitId, "1_3");
    expect(config.root.kind === "split" && config.root.ratio).toBeCloseTo(1 / 3);
  });

  it("merge de hermanos y cambio de tipo", () => {
    let config = createDefaultGuidedVisualConfig({ widthMm: 1200, heightMm: 1000 });
    const leafId = listLeafModules(config.root)[0].id;
    config = splitModule(config, leafId, "vertical", 0.5);
    const [left, right] = listLeafModules(config.root);
    config = updateModuleType(config, left.id, "puerta");
    config = updateModuleType(config, right.id, "fijo");
    config = mergeSiblingModules(config, left.id);

    expect(countLeafModules(config.root)).toBe(1);
    expect(listLeafModules(config.root)[0].type).toBe("puerta");
  });

  it("normaliza oscilobatiente y sentido de apertura sin romper V2 legacy", () => {
    let config = createDefaultGuidedVisualConfig({ widthMm: 1200, heightMm: 1400 });
    const moduleId = listLeafModules(config.root)[0].id;
    config = updateModuleType(config, moduleId, "oscilobatiente");
    config = updateModuleOpeningSide(config, moduleId, "right");

    const parsed = parseGuidedVisualConfig(serializeGuidedVisualConfig(config));
    expect(parsed && listLeafModules(parsed.root)[0]).toMatchObject({
      type: "oscilobatiente",
      openingSide: "right",
    });

    const legacy = ensureGuidedVisualConfig({
      ...config,
      root: { ...listLeafModules(config.root)[0], openingSide: undefined },
    });
    expect(listLeafModules(legacy.root)[0].openingSide).toBe("left");
  });

  it("agrega, mueve y quita palillos sin crear módulos", () => {
    let config = createDefaultGuidedVisualConfig({ widthMm: 1200, heightMm: 1000 });
    const moduleId = listLeafModules(config.root)[0].id;
    config = addPalillo(config, moduleId, "horizontal", 0.5);
    expect(countLeafModules(config.root)).toBe(1);
    expect(listLeafModules(config.root)[0].palillos).toHaveLength(1);

    const palilloId = listLeafModules(config.root)[0].palillos[0].id;
    config = updatePalilloPosition(config, palilloId, 0.33);
    expect(listLeafModules(config.root)[0].palillos[0].position).toBeCloseTo(0.33);

    config = addEqualPalillos(config, moduleId, "vertical", 3);
    expect(listLeafModules(config.root)[0].palillos.length).toBeGreaterThanOrEqual(2);

    config = removePalillo(config, palilloId);
    expect(
      listLeafModules(config.root)[0].palillos.some((p) => p.id === palilloId)
    ).toBe(false);
  });

  it("migra V1 → V2 preservando dims, tipos y proporciones", () => {
    const v1: GuidedVisualConfigV1 = {
      schemaVersion: GUIDED_VISUAL_SCHEMA_VERSION_V1,
      axis: "vertical",
      widthMm: 1600,
      heightMm: 1200,
      modules: [
        { id: "a", type: "fijo", ratio: 1 },
        { id: "b", type: "corredera", ratio: 1 },
        { id: "c", type: "fijo", ratio: 1 },
      ],
      selectedModuleId: "b",
    };

    const v2 = migrateGuidedVisualConfigV1ToV2(v1);
    expect(v2.schemaVersion).toBe(2);
    expect(v2.widthMm).toBe(1600);
    expect(v2.heightMm).toBe(1200);
    expect(countLeafModules(v2.root)).toBe(3);
    expect(listLeafModules(v2.root).map((m) => m.type)).toEqual([
      "fijo",
      "corredera",
      "fijo",
    ]);

    const rects = calculateNodeRects(v2).filter((r) => r.kind === "module");
    expect(rects[0].widthMm).toBeCloseTo(1600 / 3, 0);
    expect(rects[1].widthMm).toBeCloseTo(1600 / 3, 0);
    expect(rects[2].widthMm).toBeCloseTo(1600 / 3, 0);
  });

  it("parsea V1 pipe y serializa V2 round-trip", () => {
    const fromV1 = parseGuidedVisualConfig("1|v|1600|1200|fijo:1,corredera:1,fijo:1");
    expect(fromV1?.schemaVersion).toBe(2);
    expect(fromV1 && countLeafModules(fromV1.root)).toBe(3);

    let config = createDefaultGuidedVisualConfig({ widthMm: 1500, heightMm: 1800 });
    config = addGuidedDivision(config, "puerta");
    const encoded = serializeGuidedVisualConfig(config);
    expect(encoded.startsWith("2|")).toBe(true);
    const parsed = parseGuidedVisualConfig(encoded);
    expect(parsed?.widthMm).toBe(1500);
    expect(parsed && countLeafModules(parsed.root)).toBe(2);
  });

  it("serializa sin usar encoding base64url nativo de Buffer (compat browser)", () => {
    const config = createDefaultGuidedVisualConfig({ widthMm: 1200, heightMm: 1000 });
    const originalToString = Buffer.prototype.toString;
    Buffer.prototype.toString = function patchedToString(
      this: Buffer,
      encoding?: BufferEncoding,
      ...rest: number[]
    ) {
      if (encoding === "base64url") {
        throw new TypeError("Unknown encoding: base64url");
      }
      return originalToString.call(this, encoding, ...rest);
    };

    try {
      expect(() => serializeGuidedVisualConfig(config)).not.toThrow();
      const encoded = serializeGuidedVisualConfig(config);
      const parsed = parseGuidedVisualConfig(encoded);
      expect(parsed?.widthMm).toBe(1200);
      expect(parsed?.heightMm).toBe(1000);
    } finally {
      Buffer.prototype.toString = originalToString;
    }
  });

  it("cae a fallback seguro con datos inválidos", () => {
    expect(validateGuidedVisualConfig(null).ok).toBe(false);
    expect(validateGuidedVisualConfig({ schemaVersion: 99 }).ok).toBe(false);
    const safe = ensureGuidedVisualConfig({ broken: true }, { widthMm: 1400, heightMm: 1100 });
    expect(safe.widthMm).toBe(1400);
    expect(countLeafModules(safe.root)).toBe(1);
  });
});

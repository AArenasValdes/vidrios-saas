"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  LuColumns2,
  LuRedo2,
  LuRows2,
  LuUndo2,
  LuX,
} from "react-icons/lu";

import { useGuidedVisualHistory } from "@/features/cotizaciones/visual-composer/hooks/use-guided-visual-history";
import {
  calculateGuidedVisualLayout,
  getGuidedCompositionSummary,
  renderGuidedModuleTypeIcon,
  renderGuidedVisualSvg,
} from "@/features/cotizaciones/visual-composer/services/guided-visual-renderer.service";
import {
  MAX_GUIDED_LEAF_MODULES,
  MAX_GUIDED_PALILLOS_PER_MODULE,
  MIN_GUIDED_DIMENSION_MM,
  GUIDED_FRAME_SHAPE_KINDS,
  GUIDED_FRAME_SHAPE_LABELS,
  GUIDED_GLASS_SHAPE_LABELS,
  GUIDED_MODULE_TYPE_LABELS,
  GUIDED_MODULE_TYPES,
  GUIDED_OPENING_SIDE_LABELS,
  GUIDED_OPENING_SIDES,
  GUIDED_PALILLO_PRESET_LABELS,
  applyPalilloPresetToModule,
  applyQuickSplitRatio,
  calculatePalilloRects,
  clearModulePalillos,
  countLeafModules,
  countPalilloCells,
  countPalilloSplits,
  createDefaultGuidedVisualConfig,
  createEmptyPalilloLayout,
  describeGuidedVisualConfig,
  describePalilloSplit,
  ensureGuidedVisualConfig,
  equalizeModulePalilloNode,
  findNodeById,
  findPalilloNodeById,
  findParentSplit,
  isModuleNode,
  isPalilloCell,
  isPalilloSplit,
  isSplitNode,
  listLeafModules,
  mergeSiblingModules,
  removeModulePalilloSplit,
  removeSplit,
  resetGuidedComposition,
  selectGuidedNode,
  selectPalilloNode,
  setGuidedFrameShape,
  setGuidedVisualDimensions,
  splitModule,
  splitModulePalilloCell,
  updateModuleGlassShape,
  updateModuleOpeningSide,
  updateModulePalilloSplitRatio,
  updateModuleType,
  updateSplitFirstSizeMm,
  updateSplitRatio,
  type GuidedFrameShapeKind,
  type GuidedGlassShapeKind,
  type GuidedModuleType,
  type GuidedOpeningSide,
  type GuidedPalilloPresetId,
  type GuidedModuleNode,
  type GuidedSplitDirection,
  type GuidedVisualConfig,
} from "@/features/cotizaciones/visual-composer/types/guided-visual-config";

import s from "./guided-visual-composer.module.css";

type Props = {
  open: boolean;
  config: GuidedVisualConfig;
  colorHex?: string | null;
  pieceTitle?: string;
  onChange: (next: GuidedVisualConfig) => void;
  onApply: (next: GuidedVisualConfig) => void;
  onClose: () => void;
  onClear?: () => void;
};

const PALILLO_PRESET_IDS: GuidedPalilloPresetId[] = [
  "none",
  "v1",
  "h1",
  "cross",
  "v3",
  "h3",
  "grid2x2",
  "grid3x2",
  "custom",
];

function renderPalilloPresetThumb(preset: GuidedPalilloPresetId): string {
  const frame = `<rect x="3" y="3" width="46" height="34" fill="#F8FAFC" stroke="#8A96A6" stroke-width="2.5" />`;
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#64748B" stroke-width="1.6" stroke-linecap="square" />`;

  let inner = "";
  switch (preset) {
    case "none":
      inner = "";
      break;
    case "v1":
      inner = line(26, 5, 26, 35);
      break;
    case "h1":
      inner = line(5, 20, 47, 20);
      break;
    case "cross":
      inner = `${line(26, 5, 26, 35)}${line(5, 20, 47, 20)}`;
      break;
    case "v3":
      inner = `${line(18, 5, 18, 35)}${line(34, 5, 34, 35)}`;
      break;
    case "h3":
      inner = `${line(5, 14, 47, 14)}${line(5, 26, 47, 26)}`;
      break;
    case "grid2x2":
      inner = `${line(26, 5, 26, 35)}${line(5, 20, 47, 20)}`;
      break;
    case "grid3x2":
      inner = `${line(18, 5, 18, 35)}${line(34, 5, 34, 35)}${line(5, 20, 47, 20)}`;
      break;
    case "custom":
      inner = `${line(26, 5, 26, 22)}${line(5, 22, 47, 22)}`;
      break;
    default:
      inner = "";
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="40" viewBox="0 0 52 40" aria-hidden="true">${frame}${inner}</svg>`;
}

function commitDimensionMm(raw: string, fallback: number) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return Math.max(MIN_GUIDED_DIMENSION_MM, fallback);
  }
  const parsed = Math.round(Number(trimmed));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return Math.max(MIN_GUIDED_DIMENSION_MM, fallback);
  }
  return Math.max(MIN_GUIDED_DIMENSION_MM, parsed);
}

export function GuidedVisualComposer({
  open,
  config,
  colorHex,
  pieceTitle,
  onChange,
  onApply,
  onClose,
  onClear,
}: Props) {
  const titleId = useId();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [widthDraft, setWidthDraft] = useState(String(config.widthMm));
  const [heightDraft, setHeightDraft] = useState(String(config.heightMm));
  const [archRiseDraft, setArchRiseDraft] = useState("");
  const [frameRadiusDraft, setFrameRadiusDraft] = useState("");
  const [glassRadiusDraft, setGlassRadiusDraft] = useState("");
  const [splitMmDraft, setSplitMmDraft] = useState("");
  const [palilloEditModuleId, setPalilloEditModuleId] = useState<string | null>(null);
  const [showPalilloPresets, setShowPalilloPresets] = useState(false);
  const [palilloMmDraft, setPalilloMmDraft] = useState("");
  const [dirtyConfirm, setDirtyConfirm] = useState(false);
  const [dragHint, setDragHint] = useState<string | null>(null);
  const baselineRef = useRef(config);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    splitId: string;
    direction: GuidedSplitDirection;
    before: GuidedVisualConfig;
    bounds: DOMRect;
    layoutOriginX: number;
    layoutOriginY: number;
    layoutDrawW: number;
    layoutDrawH: number;
    splitX: number;
    splitY: number;
    splitW: number;
    splitH: number;
  } | null>(null);
  const palilloDragRef = useRef<{
    moduleId: string;
    splitId: string;
    direction: GuidedSplitDirection;
    before: GuidedVisualConfig;
    bounds: DOMRect;
    moduleX: number;
    moduleY: number;
    moduleW: number;
    moduleH: number;
    parentXRatio: number;
    parentYRatio: number;
    parentWRatio: number;
    parentHRatio: number;
    moduleWidthMm: number;
    moduleHeightMm: number;
  } | null>(null);

  const history = useGuidedVisualHistory(ensureGuidedVisualConfig(config));
  const working = history.config;
  const summary = useMemo(() => getGuidedCompositionSummary(working), [working]);
  const leafCount = countLeafModules(working.root);
  const selected = working.selectedNodeId
    ? findNodeById(working.root, working.selectedNodeId)
    : null;
  const selectedModule =
    selected && isModuleNode(selected) ? selected : null;
  const selectedSplit =
    selected && isSplitNode(selected) ? selected : null;
  const renderOptions = useMemo(
    () => ({
      maxW: 720,
      maxH: 520,
      variant: "editor" as const,
      colorHex,
      showSelection: true,
      palilloEditModuleId,
      selectedPalilloNodeId: working.selectedPalilloId,
      resourceKey: `composer-${titleId}`,
    }),
    [colorHex, palilloEditModuleId, titleId, working.selectedPalilloId]
  );
  const layout = useMemo(
    () => calculateGuidedVisualLayout(working, renderOptions),
    [working, renderOptions]
  );

  const svg = useMemo(
    () => renderGuidedVisualSvg(working, renderOptions),
    [working, renderOptions]
  );

  const isDirty = useMemo(
    () => JSON.stringify(working) !== JSON.stringify(baselineRef.current),
    [working]
  );

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const next = ensureGuidedVisualConfig(config);
    baselineRef.current = next;
    history.reset(next);
    setWidthDraft(String(next.widthMm));
    setHeightDraft(String(next.heightMm));
    setDirtyConfirm(false);
    setDragHint(null);
    setPalilloEditModuleId(null);
    setShowPalilloPresets(false);
    setPalilloMmDraft("");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on open
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          history.redo();
        } else {
          history.undo();
        }
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        history.redo();
        return;
      }
      if (event.key === "Escape") {
        if (palilloEditModuleId) {
          setPalilloEditModuleId(null);
          setShowPalilloPresets(false);
          setPalilloMmDraft("");
          return;
        }
        if (isDirty) {
          setDirtyConfirm(true);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, history, isDirty, onClose, palilloEditModuleId]);

  useEffect(() => {
    onChange(working);
  }, [working, onChange]);

  useEffect(() => {
    if (selectedSplit) {
      const splitLayout = layout.splits.find((item) => item.id === selectedSplit.id);
      if (splitLayout) {
        setSplitMmDraft(String(Math.round(splitLayout.firstSizeMm)));
      }
    } else {
      setSplitMmDraft("");
    }
  }, [selectedSplit, layout.splits]);

  useEffect(() => {
    if (
      palilloEditModuleId &&
      !findNodeById(working.root, palilloEditModuleId)
    ) {
      setPalilloEditModuleId(null);
      setShowPalilloPresets(false);
      setPalilloMmDraft("");
    }
  }, [working.root, palilloEditModuleId]);

  const palilloEditModule =
    palilloEditModuleId && findNodeById(working.root, palilloEditModuleId);
  const palilloEditModuleNode =
    palilloEditModule && isModuleNode(palilloEditModule)
      ? palilloEditModule
      : null;
  const palilloEditLayoutModule = palilloEditModuleId
    ? layout.modules.find((module) => module.id === palilloEditModuleId) ?? null
    : null;
  const palilloEditLeafIndex = palilloEditModuleNode
    ? listLeafModules(working.root).findIndex(
        (leaf) => leaf.id === palilloEditModuleNode.id
      ) + 1
    : 0;
  const selectedPalilloNode =
    palilloEditModuleNode?.palilloLayout && working.selectedPalilloId
      ? findPalilloNodeById(
          palilloEditModuleNode.palilloLayout,
          working.selectedPalilloId
        )
      : null;
  const selectedPalilloCell =
    selectedPalilloNode && isPalilloCell(selectedPalilloNode)
      ? selectedPalilloNode
      : null;
  const selectedPalilloSplit =
    selectedPalilloNode && isPalilloSplit(selectedPalilloNode)
      ? selectedPalilloNode
      : null;
  const palilloSplitCount = countPalilloSplits(
    palilloEditModuleNode?.palilloLayout ?? null
  );
  const palilloAtMax = palilloSplitCount >= MAX_GUIDED_PALILLOS_PER_MODULE;

  useEffect(() => {
    if (!selectedPalilloSplit || !palilloEditLayoutModule) {
      setPalilloMmDraft("");
      return;
    }
    const described = describePalilloSplit(
      selectedPalilloSplit,
      palilloEditLayoutModule.widthMm,
      palilloEditLayoutModule.heightMm
    );
    const mmMatch = described.measureLabel.match(/(\d+)\s*mm/);
    setPalilloMmDraft(mmMatch?.[1] ?? "");
  }, [selectedPalilloSplit, palilloEditLayoutModule]);

  const commitDims = useCallback(() => {
    const widthMm = commitDimensionMm(widthDraft, working.widthMm);
    const heightMm = commitDimensionMm(heightDraft, working.heightMm);
    setWidthDraft(String(widthMm));
    setHeightDraft(String(heightMm));
    if (widthMm !== working.widthMm || heightMm !== working.heightMm) {
      history.setConfig(setGuidedVisualDimensions(working, { widthMm, heightMm }));
    }
  }, [widthDraft, heightDraft, working, history]);

  useEffect(() => {
    if (working.frameShape.kind === "arch_top") {
      setArchRiseDraft(String(working.frameShape.archRiseMm));
      setFrameRadiusDraft("");
    } else if (working.frameShape.kind === "rounded") {
      setFrameRadiusDraft(String(working.frameShape.radiusMm));
      setArchRiseDraft("");
    } else {
      setArchRiseDraft("");
      setFrameRadiusDraft("");
    }
  }, [working.frameShape]);

  useEffect(() => {
    if (selectedModule?.glassShape.kind === "rounded") {
      setGlassRadiusDraft(String(selectedModule.glassShape.radiusMm));
    } else {
      setGlassRadiusDraft("");
    }
  }, [selectedModule?.id, selectedModule?.glassShape]);

  const commitArchRise = useCallback(() => {
    if (working.frameShape.kind !== "arch_top") {
      return;
    }
    const rise = Number(archRiseDraft.replace(/[^\d]/g, "")) || 0;
    const next = setGuidedFrameShape(working, {
      kind: "arch_top",
      archRiseMm: rise,
    });
    setArchRiseDraft(
      next.frameShape.kind === "arch_top"
        ? String(next.frameShape.archRiseMm)
        : archRiseDraft
    );
    if (
      next.frameShape.kind === "arch_top" &&
      working.frameShape.kind === "arch_top" &&
      next.frameShape.archRiseMm !== working.frameShape.archRiseMm
    ) {
      history.setConfig(next);
    }
  }, [archRiseDraft, working, history]);

  const commitFrameRadius = useCallback(() => {
    if (working.frameShape.kind !== "rounded") {
      return;
    }
    const radiusMm = Number(frameRadiusDraft.replace(/[^\d]/g, "")) || 40;
    const next = setGuidedFrameShape(working, {
      kind: "rounded",
      radiusMm,
      corners: working.frameShape.corners,
    });
    if (next.frameShape.kind === "rounded") {
      setFrameRadiusDraft(String(next.frameShape.radiusMm));
      if (
        working.frameShape.kind === "rounded" &&
        next.frameShape.radiusMm !== working.frameShape.radiusMm
      ) {
        history.setConfig(next);
      }
    }
  }, [frameRadiusDraft, working, history]);

  const commitGlassRadius = useCallback(() => {
    if (!selectedModule || selectedModule.glassShape.kind !== "rounded") {
      return;
    }
    const radiusMm = Number(glassRadiusDraft.replace(/[^\d]/g, "")) || 40;
    const next = updateModuleGlassShape(working, selectedModule.id, {
      kind: "rounded",
      radiusMm,
      corners: selectedModule.glassShape.corners,
    });
    const nextLeaf = listLeafModules(next.root).find(
      (leaf) => leaf.id === selectedModule.id
    );
    if (nextLeaf?.glassShape.kind === "rounded") {
      setGlassRadiusDraft(String(nextLeaf.glassShape.radiusMm));
      if (nextLeaf.glassShape.radiusMm !== selectedModule.glassShape.radiusMm) {
        history.setConfig(next);
      }
    }
  }, [glassRadiusDraft, selectedModule, working, history]);

  const canSplit = leafCount < MAX_GUIDED_LEAF_MODULES && Boolean(selectedModule);
  const findParentSplitExists = Boolean(
    selectedModule && findParentSplit(working.root, selectedModule.id)
  );
  const selectedLeafIndex = selectedModule
    ? listLeafModules(working.root).findIndex((leaf) => leaf.id === selectedModule.id) + 1
    : 0;

  const resolvePalilloTargetCellId = (
    module: GuidedModuleNode,
    selectedId: string | null
  ) => {
    if (module.palilloLayout && selectedId) {
      const node = findPalilloNodeById(module.palilloLayout, selectedId);
      if (node && isPalilloCell(node)) {
        return node.id;
      }
    }
    if (module.palilloLayout && isPalilloCell(module.palilloLayout)) {
      return module.palilloLayout.id;
    }
    const firstCell = calculatePalilloRects(module.palilloLayout).find(
      (item) => item.kind === "cell"
    );
    if (firstCell) {
      return firstCell.id;
    }
    return createEmptyPalilloLayout().id;
  };

  const enterPalilloEditMode = (moduleId: string) => {
    setPalilloEditModuleId(moduleId);
    setShowPalilloPresets(false);
    setPalilloMmDraft("");
    history.setConfig(selectPalilloNode(working, moduleId, null));
  };

  const exitPalilloEditMode = () => {
    setPalilloEditModuleId(null);
    setShowPalilloPresets(false);
    setPalilloMmDraft("");
  };

  const handlePalilloSplit = (direction: GuidedSplitDirection) => {
    if (!palilloEditModuleId || !palilloEditModuleNode || palilloAtMax) {
      return;
    }
    const cellId = resolvePalilloTargetCellId(
      palilloEditModuleNode,
      working.selectedPalilloId
    );
    history.setConfig(
      splitModulePalilloCell(
        working,
        palilloEditModuleId,
        cellId,
        direction,
        0.5
      )
    );
  };

  const handlePalilloEqualize = () => {
    if (!palilloEditModuleId || !palilloEditModuleNode?.palilloLayout) {
      return;
    }
    const fallbackSplit = calculatePalilloRects(
      palilloEditModuleNode.palilloLayout
    ).find((item) => item.kind === "split");
    const nodeId = working.selectedPalilloId ?? fallbackSplit?.id;
    if (!nodeId) {
      return;
    }
    history.setConfig(
      equalizeModulePalilloNode(working, palilloEditModuleId, nodeId)
    );
  };

  const handleSplit = (direction: GuidedSplitDirection) => {
    if (!selectedModule || !canSplit) {
      return;
    }
    history.setConfig(splitModule(working, selectedModule.id, direction, 0.5));
  };

  const handleEqualize = () => {
    if (selectedSplit) {
      history.setConfig(applyQuickSplitRatio(working, selectedSplit.id, "equal"));
      return;
    }
    if (working.root.kind === "split") {
      history.setConfig(applyQuickSplitRatio(working, working.root.id, "equal"));
    }
  };

  const startDividerDrag = (
    event: React.PointerEvent,
    splitId: string,
    direction: GuidedSplitDirection
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const bounds = canvasRef.current?.getBoundingClientRect();
    const splitLayout = layout.splits.find((item) => item.id === splitId);
    if (!bounds || !splitLayout) {
      return;
    }

    dragRef.current = {
      splitId,
      direction,
      before: working,
      bounds,
      layoutOriginX: layout.originX,
      layoutOriginY: layout.originY,
      layoutDrawW: layout.drawW,
      layoutDrawH: layout.drawH,
      splitX: splitLayout.x,
      splitY: splitLayout.y,
      splitW: splitLayout.w,
      splitH: splitLayout.h,
    };
    history.setConfig(selectGuidedNode(working, splitId));
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  };

  const onDividerPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }

    const scaleX = drag.bounds.width / layout.svgW;
    const scaleY = drag.bounds.height / layout.svgH;
    const localX = (event.clientX - drag.bounds.left) / scaleX;
    const localY = (event.clientY - drag.bounds.top) / scaleY;

    let ratio = 0.5;
    if (drag.direction === "vertical") {
      ratio = (localX - drag.splitX) / Math.max(drag.splitW, 1);
    } else {
      ratio = (localY - drag.splitY) / Math.max(drag.splitH, 1);
    }

    const next = updateSplitRatio(drag.before, drag.splitId, ratio, { snap: true });
    const nextLayout = calculateGuidedVisualLayout(next, {
      maxW: 720,
      maxH: 520,
      variant: "editor",
    });
    const splitInfo = nextLayout.splits.find((item) => item.id === drag.splitId);
    if (splitInfo) {
      setDragHint(
        `${Math.round(splitInfo.firstSizeMm)} mm · ${Math.round(splitInfo.secondSizeMm)} mm`
      );
    }
    history.replaceConfig(next);
  };

  const endDividerDrag = () => {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }
    history.commitFrom(drag.before, history.config);
    dragRef.current = null;
    setDragHint(null);
  };

  const startPalilloDrag = (
    event: React.PointerEvent,
    splitId: string,
    direction: GuidedSplitDirection
  ) => {
    if (!palilloEditModuleId || !palilloEditModuleNode?.palilloLayout) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const bounds = canvasRef.current?.getBoundingClientRect();
    const moduleLayout = palilloEditLayoutModule;
    const splitRect = calculatePalilloRects(palilloEditModuleNode.palilloLayout).find(
      (item) => item.id === splitId && item.kind === "split"
    );
    if (!bounds || !moduleLayout || !splitRect) {
      return;
    }

    palilloDragRef.current = {
      moduleId: palilloEditModuleId,
      splitId,
      direction,
      before: working,
      bounds,
      moduleX: moduleLayout.x,
      moduleY: moduleLayout.y,
      moduleW: moduleLayout.w,
      moduleH: moduleLayout.h,
      parentXRatio: splitRect.xRatio,
      parentYRatio: splitRect.yRatio,
      parentWRatio: splitRect.wRatio,
      parentHRatio: splitRect.hRatio,
      moduleWidthMm: moduleLayout.widthMm,
      moduleHeightMm: moduleLayout.heightMm,
    };
    history.setConfig(
      selectPalilloNode(working, palilloEditModuleId, splitId)
    );
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  };

  const onPalilloPointerMove = (event: React.PointerEvent) => {
    const drag = palilloDragRef.current;
    if (!drag) {
      return;
    }

    const scaleX = drag.bounds.width / layout.svgW;
    const scaleY = drag.bounds.height / layout.svgH;
    const localX = (event.clientX - drag.bounds.left) / scaleX;
    const localY = (event.clientY - drag.bounds.top) / scaleY;

    let ratio = 0.5;
    if (drag.direction === "vertical") {
      const moduleRelativeX = (localX - drag.moduleX) / Math.max(drag.moduleW, 1);
      ratio =
        (moduleRelativeX - drag.parentXRatio) / Math.max(drag.parentWRatio, 1e-6);
    } else {
      const moduleRelativeY = (localY - drag.moduleY) / Math.max(drag.moduleH, 1);
      ratio =
        (moduleRelativeY - drag.parentYRatio) / Math.max(drag.parentHRatio, 1e-6);
    }

    const next = updateModulePalilloSplitRatio(
      drag.before,
      drag.moduleId,
      drag.splitId,
      ratio
    );
    const nextModule = findNodeById(next.root, drag.moduleId);
    if (nextModule && isModuleNode(nextModule) && nextModule.palilloLayout) {
      const splitNode = findPalilloNodeById(
        nextModule.palilloLayout,
        drag.splitId
      );
      if (splitNode && isPalilloSplit(splitNode)) {
        const described = describePalilloSplit(
          splitNode,
          drag.moduleWidthMm,
          drag.moduleHeightMm
        );
        setDragHint(described.measureLabel);
      }
    }
    history.replaceConfig(next);
  };

  const endPalilloDrag = () => {
    const drag = palilloDragRef.current;
    if (!drag) {
      return;
    }
    history.commitFrom(drag.before, history.config);
    palilloDragRef.current = null;
    setDragHint(null);
  };

  const onCanvasPointerMove = (event: React.PointerEvent) => {
    if (dragRef.current) {
      onDividerPointerMove(event);
    }
    if (palilloDragRef.current) {
      onPalilloPointerMove(event);
    }
  };

  const onCanvasPointerEnd = () => {
    endDividerDrag();
    endPalilloDrag();
  };

  const statusMessage = (() => {
    if (palilloEditModuleId) {
      if (palilloAtMax) {
        return "Máximo de palillos en este módulo.";
      }
      if (selectedPalilloSplit) {
        return "Arrastra el palillo o escribe la medida en mm.";
      }
      return "Toca un espacio y pártalo con los botones de arriba.";
    }
    if (leafCount >= MAX_GUIDED_LEAF_MODULES) {
      return "Máximo 6 módulos. Une alguno o empieza de nuevo.";
    }
    if (selectedSplit) {
      return "Arrastra la línea o ajusta la medida a la derecha.";
    }
    if (leafCount === 1) {
      return "Parte el módulo al lado o arriba/abajo para armar la pieza.";
    }
    if (selectedModule) {
      return "Elige el tipo a la derecha, o vuelve a partir este módulo.";
    }
    return "Toca un módulo del dibujo para editarlo.";
  })();

  const selectedPalilloSplitInfo =
    selectedPalilloSplit && palilloEditLayoutModule
      ? describePalilloSplit(
          selectedPalilloSplit,
          palilloEditLayoutModule.widthMm,
          palilloEditLayoutModule.heightMm
        )
      : null;

  const requestClose = () => {
    if (isDirty) {
      setDirtyConfirm(true);
      return;
    }
    onClose();
  };

  if (!open || !portalTarget) {
    return null;
  }

  return createPortal(
    <div className={s.overlay} role="presentation" onClick={requestClose}>
      <section
        className={s.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={s.header}>
          <div className={s.headerCopy}>
            <h2 id={titleId}>Armar composición</h2>
            <p className={s.subcopy}>
              {pieceTitle || "Pieza"} · {summary.widthMm} × {summary.heightMm} mm
            </p>
          </div>
          <div className={s.headerActions}>
            <button
              type="button"
              className={s.iconButton}
              aria-label="Deshacer"
              disabled={!history.canUndo}
              onClick={history.undo}
            >
              <LuUndo2 aria-hidden />
            </button>
            <button
              type="button"
              className={s.iconButton}
              aria-label="Rehacer"
              disabled={!history.canRedo}
              onClick={history.redo}
            >
              <LuRedo2 aria-hidden />
            </button>
            <button
              type="button"
              className={s.iconButton}
              onClick={requestClose}
              aria-label="Cerrar"
            >
              <LuX aria-hidden />
            </button>
          </div>
        </header>

        <p className={s.stepStrip} aria-hidden>
          <span>1. Toca un módulo</span>
          <span className={s.stepDot} />
          <span>2. Elige el tipo</span>
          <span className={s.stepDot} />
          <span>3. Aplica</span>
        </p>

        <div className={s.workspace}>
          <div className={s.canvasColumn}>
            <div className={s.toolbarRow}>
              {palilloEditModuleId ? (
                <div
                  className={`${s.toolbar} ${s.palilloToolbar}`}
                  role="toolbar"
                  aria-label="Herramientas de palillos"
                >
                  <button
                    type="button"
                    className={`${s.toolButton} ${s.toolButtonPrimary}`}
                    disabled={palilloAtMax}
                    title={
                      palilloAtMax
                        ? "Llegaste al máximo de palillos para este módulo."
                        : undefined
                    }
                    onClick={() => handlePalilloSplit("vertical")}
                  >
                    <LuColumns2 aria-hidden />
                    Partir al lado
                  </button>
                  <button
                    type="button"
                    className={`${s.toolButton} ${s.toolButtonPrimary}`}
                    disabled={palilloAtMax}
                    title={
                      palilloAtMax
                        ? "Llegaste al máximo de palillos para este módulo."
                        : undefined
                    }
                    onClick={() => handlePalilloSplit("horizontal")}
                  >
                    <LuRows2 aria-hidden />
                    Partir arriba / abajo
                  </button>
                  <button
                    type="button"
                    className={s.toolButton}
                    onClick={handlePalilloEqualize}
                  >
                    Igualar
                  </button>
                  <button
                    type="button"
                    className={`${s.toolButton} ${showPalilloPresets ? s.toolButtonActive : ""}`}
                    onClick={() => setShowPalilloPresets((value) => !value)}
                  >
                    Diseños
                  </button>
                  <button
                    type="button"
                    className={s.toolButton}
                    onClick={() => {
                      if (!palilloEditModuleId) {
                        return;
                      }
                      history.setConfig(
                        clearModulePalillos(working, palilloEditModuleId)
                      );
                    }}
                  >
                    Borrar
                  </button>
                  <button
                    type="button"
                    className={`${s.toolButton} ${s.palilloExitButton}`}
                    onClick={exitPalilloEditMode}
                  >
                    Listo
                  </button>
                </div>
              ) : (
                <div className={s.toolbar} role="toolbar" aria-label="Herramientas de composición">
                  <button
                    type="button"
                    className={`${s.toolButton} ${s.toolButtonPrimary}`}
                    disabled={!canSplit}
                    title={
                      !selectedModule
                        ? "Selecciona un módulo para dividirlo"
                        : !canSplit
                          ? "Máximo de 6 módulos alcanzado"
                          : undefined
                    }
                    onClick={() => handleSplit("vertical")}
                  >
                    <LuColumns2 aria-hidden />
                    Partir al lado
                  </button>
                  <button
                    type="button"
                    className={`${s.toolButton} ${s.toolButtonPrimary}`}
                    disabled={!canSplit}
                    title={
                      !selectedModule
                        ? "Selecciona un módulo para dividirlo"
                        : !canSplit
                          ? "Máximo de 6 módulos alcanzado"
                          : undefined
                    }
                    onClick={() => handleSplit("horizontal")}
                  >
                    <LuRows2 aria-hidden />
                    Partir arriba / abajo
                  </button>
                  <button type="button" className={s.toolButton} onClick={handleEqualize}>
                    Igualar
                  </button>
                  <button
                    type="button"
                    className={s.toolButton}
                    onClick={() => history.setConfig(resetGuidedComposition(working))}
                  >
                    Empezar de nuevo
                  </button>
                </div>
              )}
              {palilloEditModuleId ? (
                <p className={`${s.editingBanner} ${s.editingBannerPalillo}`} aria-live="polite">
                  Palillos · M{palilloEditLeafIndex}
                </p>
              ) : selectedModule ? (
                <p className={s.editingBanner} aria-live="polite">
                  Módulo M{selectedLeafIndex} activo
                </p>
              ) : (
                <p className={s.editingBanner} aria-live="polite">
                  Toca un módulo en el dibujo
                </p>
              )}
            </div>

            <div
              className={s.canvas}
              onPointerMove={onCanvasPointerMove}
              onPointerUp={onCanvasPointerEnd}
              onPointerCancel={onCanvasPointerEnd}
            >
              <div
                className={s.svgStage}
                ref={canvasRef}
                style={{
                  aspectRatio: `${layout.svgW} / ${layout.svgH}`,
                  width: `min(100cqw, calc(100cqh * ${layout.svgW} / ${layout.svgH}))`,
                }}
              >
                <div
                  className={s.svgWrap}
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
                {!palilloEditModuleId
                  ? layout.modules.map((module) => (
                      <button
                        key={`hit-${module.id}`}
                        type="button"
                        className={`${s.moduleHit} ${module.selected ? s.moduleHitActive : ""}`}
                        style={{
                          left: `${(module.x / layout.svgW) * 100}%`,
                          top: `${(module.y / layout.svgH) * 100}%`,
                          width: `${(module.w / layout.svgW) * 100}%`,
                          height: `${(module.h / layout.svgH) * 100}%`,
                        }}
                        aria-label={`Seleccionar módulo M${module.leafIndex + 1}`}
                        onClick={() =>
                          history.setConfig(selectGuidedNode(working, module.id))
                        }
                      />
                    ))
                  : null}
                {!palilloEditModuleId
                  ? layout.splits.map((split) => (
                  <button
                    key={`div-${split.id}`}
                    type="button"
                    className={`${s.dividerHit} ${
                      split.direction === "vertical"
                        ? s.dividerHitVertical
                        : s.dividerHitHorizontal
                    }`}
                    style={
                      split.direction === "vertical"
                        ? {
                            left: `${((split.dividerX ?? 0) / layout.svgW) * 100}%`,
                            top: `${(split.y / layout.svgH) * 100}%`,
                            height: `${(split.h / layout.svgH) * 100}%`,
                          }
                        : {
                            top: `${((split.dividerY ?? 0) / layout.svgH) * 100}%`,
                            left: `${(split.x / layout.svgW) * 100}%`,
                            width: `${(split.w / layout.svgW) * 100}%`,
                          }
                    }
                    aria-label="Arrastrar división"
                    onPointerDown={(event) =>
                      startDividerDrag(event, split.id, split.direction)
                    }
                    onClick={() =>
                      history.setConfig(selectGuidedNode(working, split.id))
                    }
                  />
                    ))
                  : null}
                {palilloEditModuleId && palilloEditLayoutModule
                  ? (
                      palilloEditLayoutModule.palilloCells.length > 0
                        ? palilloEditLayoutModule.palilloCells
                        : [
                            {
                              id: "__root_cell__",
                              x: palilloEditLayoutModule.x,
                              y: palilloEditLayoutModule.y,
                              w: palilloEditLayoutModule.w,
                              h: palilloEditLayoutModule.h,
                              selected: !working.selectedPalilloId,
                            },
                          ]
                    ).map((cell) => (
                      <button
                        key={`palillo-cell-${cell.id}`}
                        type="button"
                        className={`${s.palilloCellHit} ${
                          cell.selected ? s.palilloCellHitActive : ""
                        }`}
                        style={{
                          left: `${(cell.x / layout.svgW) * 100}%`,
                          top: `${(cell.y / layout.svgH) * 100}%`,
                          width: `${(cell.w / layout.svgW) * 100}%`,
                          height: `${(cell.h / layout.svgH) * 100}%`,
                        }}
                        aria-label="Seleccionar espacio"
                        onClick={() => {
                          if (!palilloEditModuleId) {
                            return;
                          }
                          history.setConfig(
                            selectPalilloNode(
                              working,
                              palilloEditModuleId,
                              cell.id === "__root_cell__" ? null : cell.id
                            )
                          );
                        }}
                      />
                    ))
                  : null}
                {palilloEditModuleId && palilloEditLayoutModule
                  ? palilloEditLayoutModule.palilloSegments.map((segment) => (
                      <button
                        key={`palillo-seg-${segment.id}`}
                        type="button"
                        className={`${s.palilloSegmentHit} ${
                          segment.direction === "vertical"
                            ? s.palilloSegmentHitVertical
                            : s.palilloSegmentHitHorizontal
                        } ${segment.selected ? s.palilloSegmentHitActive : ""}`}
                        style={
                          segment.direction === "vertical"
                            ? {
                                left: `${(segment.x1 / layout.svgW) * 100}%`,
                                top: `${(segment.y1 / layout.svgH) * 100}%`,
                                height: `${((segment.y2 - segment.y1) / layout.svgH) * 100}%`,
                              }
                            : {
                                top: `${(segment.y1 / layout.svgH) * 100}%`,
                                left: `${(segment.x1 / layout.svgW) * 100}%`,
                                width: `${((segment.x2 - segment.x1) / layout.svgW) * 100}%`,
                              }
                        }
                        aria-label="Arrastrar palillo"
                        onPointerDown={(event) =>
                          startPalilloDrag(event, segment.id, segment.direction)
                        }
                        onClick={() => {
                          if (!palilloEditModuleId) {
                            return;
                          }
                          history.setConfig(
                            selectPalilloNode(working, palilloEditModuleId, segment.id)
                          );
                        }}
                      />
                    ))
                  : null}
              </div>
            </div>
            <p className={s.statusLine} aria-live="polite">
              {dragHint ?? statusMessage}
            </p>
          </div>

          <aside className={s.inspector}>
            <div className={`${s.block} ${s.measuresBlock}`}>
              <span className={s.blockLabel}>Medidas de la pieza</span>
              <div className={s.inlineFields}>
                <label>
                  Ancho (mm)
                  <input
                    type="text"
                    inputMode="numeric"
                    value={widthDraft}
                    onChange={(event) =>
                      setWidthDraft(event.target.value.replace(/[^\d]/g, ""))
                    }
                    onBlur={commitDims}
                  />
                </label>
                <label>
                  Alto (mm)
                  <input
                    type="text"
                    inputMode="numeric"
                    value={heightDraft}
                    onChange={(event) =>
                      setHeightDraft(event.target.value.replace(/[^\d]/g, ""))
                    }
                    onBlur={commitDims}
                  />
                </label>
              </div>
            </div>

            <div className={s.block}>
              <span className={s.blockLabel}>Forma del marco</span>
              <p className={s.hint}>Solo visual. No cambia precio ni pauta.</p>
              <div className={s.shapeChipRow} role="listbox" aria-label="Forma del marco">
                {GUIDED_FRAME_SHAPE_KINDS.map((kind: GuidedFrameShapeKind) => {
                  const active = working.frameShape.kind === kind;
                  return (
                    <button
                      key={kind}
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={`${s.shapeChip} ${active ? s.shapeChipActive : ""}`}
                      onClick={() => {
                        if (kind === "arch_top") {
                          history.setConfig(
                            setGuidedFrameShape(working, {
                              kind: "arch_top",
                              archRiseMm:
                                working.frameShape.kind === "arch_top"
                                  ? working.frameShape.archRiseMm
                                  : Math.round(working.heightMm * 0.18),
                            })
                          );
                          return;
                        }
                        if (kind === "rounded") {
                          history.setConfig(
                            setGuidedFrameShape(working, {
                              kind: "rounded",
                              radiusMm:
                                working.frameShape.kind === "rounded"
                                  ? working.frameShape.radiusMm
                                  : 80,
                              corners:
                                working.frameShape.kind === "rounded"
                                  ? working.frameShape.corners
                                  : "all",
                            })
                          );
                          return;
                        }
                        history.setConfig(
                          setGuidedFrameShape(working, { kind: "rect" })
                        );
                      }}
                    >
                      {GUIDED_FRAME_SHAPE_LABELS[kind]}
                    </button>
                  );
                })}
              </div>
              {working.frameShape.kind === "arch_top" ? (
                <label className={s.fullLabel}>
                  Flecha del arco (mm)
                  <input
                    type="text"
                    inputMode="numeric"
                    value={archRiseDraft}
                    onChange={(event) =>
                      setArchRiseDraft(event.target.value.replace(/[^\d]/g, ""))
                    }
                    onBlur={commitArchRise}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        (event.target as HTMLInputElement).blur();
                      }
                    }}
                  />
                </label>
              ) : null}
              {working.frameShape.kind === "rounded" ? (
                <>
                  <label className={s.fullLabel}>
                    Radio del marco (mm)
                    <input
                      type="text"
                      inputMode="numeric"
                      value={frameRadiusDraft}
                      onChange={(event) =>
                        setFrameRadiusDraft(
                          event.target.value.replace(/[^\d]/g, "")
                        )
                      }
                      onBlur={commitFrameRadius}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          (event.target as HTMLInputElement).blur();
                        }
                      }}
                    />
                  </label>
                  <div className={s.shapeChipRow} role="listbox" aria-label="Esquinas del marco">
                    {([
                      ["all", "Todas"],
                      ["top", "Solo arriba"],
                    ] as const).map(([corners, label]) => {
                      const active =
                        working.frameShape.kind === "rounded" &&
                        working.frameShape.corners === corners;
                      return (
                        <button
                          key={corners}
                          type="button"
                          role="option"
                          aria-selected={active}
                          className={`${s.shapeChip} ${active ? s.shapeChipActive : ""}`}
                          onClick={() => {
                            if (
                              working.frameShape.kind === "rounded" &&
                              working.frameShape.corners === corners
                            ) {
                              return;
                            }
                            history.setConfig(
                              setGuidedFrameShape(working, {
                                kind: "rounded",
                                radiusMm:
                                  working.frameShape.kind === "rounded"
                                    ? working.frameShape.radiusMm
                                    : 80,
                                corners,
                              })
                            );
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>

            {palilloEditModuleId && palilloEditModuleNode ? (
              <>
                <div className={s.block}>
                  <span className={s.blockLabel}>
                    Palillos · M{palilloEditLeafIndex}
                  </span>
                  <p className={s.palilloNotice}>
                    Solo visuales: no cambian materiales ni precio.
                  </p>
                </div>

                {!selectedPalilloSplit ? (
                  <div className={s.block}>
                    <span className={s.blockLabel}>Espacio seleccionado</span>
                    <p className={s.hint}>
                      Usa los botones de arriba para partir el espacio.
                    </p>
                    <div className={s.actionStack}>
                      <button
                        type="button"
                        className={`${s.toolButton} ${s.toolButtonPrimary}`}
                        disabled={palilloAtMax}
                        onClick={() => handlePalilloSplit("vertical")}
                      >
                        Partir al lado
                      </button>
                      <button
                        type="button"
                        className={`${s.toolButton} ${s.toolButtonPrimary}`}
                        disabled={palilloAtMax}
                        onClick={() => handlePalilloSplit("horizontal")}
                      >
                        Partir arriba / abajo
                      </button>
                      {selectedPalilloCell ? (
                        <button
                          type="button"
                          className={s.toolButton}
                          onClick={() => {
                            if (!palilloEditModuleId) {
                              return;
                            }
                            history.setConfig(
                              equalizeModulePalilloNode(
                                working,
                                palilloEditModuleId,
                                selectedPalilloCell.id
                              )
                            );
                          }}
                        >
                          Igualar con espacios vecinos
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {selectedPalilloSplit && selectedPalilloSplitInfo ? (
                  <div className={s.block}>
                    <span className={s.blockLabel}>{selectedPalilloSplitInfo.title}</span>
                    <p className={s.hint}>{selectedPalilloSplitInfo.measureLabel}</p>
                    <p className={s.hint}>{selectedPalilloSplitInfo.percentLabel}</p>
                    <label className={s.fullLabel}>
                      Medida (mm)
                      <input
                        type="text"
                        inputMode="numeric"
                        value={palilloMmDraft}
                        onChange={(event) =>
                          setPalilloMmDraft(event.target.value.replace(/[^\d]/g, ""))
                        }
                        onBlur={() => {
                          if (!palilloEditModuleId || !palilloEditLayoutModule) {
                            return;
                          }
                          const value = Number(palilloMmDraft);
                          if (!Number.isFinite(value) || value <= 0) {
                            return;
                          }
                          const total =
                            selectedPalilloSplit.direction === "vertical"
                              ? palilloEditLayoutModule.widthMm
                              : palilloEditLayoutModule.heightMm;
                          history.setConfig(
                            updateModulePalilloSplitRatio(
                              working,
                              palilloEditModuleId,
                              selectedPalilloSplit.id,
                              value / Math.max(total, 1)
                            )
                          );
                        }}
                      />
                    </label>
                    <div className={s.actionStack}>
                      <button
                        type="button"
                        className={s.toolButton}
                        onClick={() => {
                          if (!palilloEditModuleId) {
                            return;
                          }
                          history.setConfig(
                            equalizeModulePalilloNode(
                              working,
                              palilloEditModuleId,
                              selectedPalilloSplit.id
                            )
                          );
                        }}
                      >
                        Centrar
                      </button>
                      <button
                        type="button"
                        className={s.textButton}
                        onClick={() => {
                          if (!palilloEditModuleId) {
                            return;
                          }
                          history.setConfig(
                            removeModulePalilloSplit(
                              working,
                              palilloEditModuleId,
                              selectedPalilloSplit.id
                            )
                          );
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ) : null}

                {showPalilloPresets ? (
                  <div className={s.block}>
                    <span className={s.blockLabel}>Diseños rápidos</span>
                    <p className={s.hint}>
                      Elige un diseño prehecho. Luego puedes seguir editando celdas.
                    </p>
                    <div
                      className={`${s.typeGrid} ${s.presetGrid}`}
                      role="listbox"
                      aria-label="Diseños rápidos de palillos"
                    >
                      {PALILLO_PRESET_IDS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          role="option"
                          className={`${s.typeCard} ${s.presetCard}`}
                          onClick={() => {
                            if (!palilloEditModuleId) {
                              return;
                            }
                            history.setConfig(
                              applyPalilloPresetToModule(
                                working,
                                palilloEditModuleId,
                                preset
                              )
                            );
                            if (preset === "custom") {
                              setShowPalilloPresets(false);
                            }
                          }}
                        >
                          <span
                            className={`${s.typeIcon} ${s.presetThumb}`}
                            dangerouslySetInnerHTML={{
                              __html: renderPalilloPresetThumb(preset),
                            }}
                          />
                          <span className={s.presetLabel}>
                            {GUIDED_PALILLO_PRESET_LABELS[preset]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}

            {selectedModule && !palilloEditModuleId ? (
              <div className={`${s.block} ${s.typeBlock}`}>
                <div className={s.moduleHeading}>
                  <span className={s.blockLabel}>Módulo M{selectedLeafIndex}</span>
                  <p className={s.moduleDims}>
                    {Math.round(
                      layout.modules.find((m) => m.id === selectedModule.id)?.widthMm ?? 0
                    )}{" "}
                    ×{" "}
                    {Math.round(
                      layout.modules.find((m) => m.id === selectedModule.id)?.heightMm ?? 0
                    )}{" "}
                    mm
                  </p>
                </div>
                <span className={s.blockLabel}>¿Qué es este módulo?</span>
                <div className={s.typeGrid} role="listbox" aria-label="Tipo de módulo">
                  {GUIDED_MODULE_TYPES.map((type) => {
                    const active = selectedModule.type === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={`${s.typeCard} ${active ? s.typeCardActive : ""}`}
                        onClick={() =>
                          history.setConfig(
                            updateModuleType(working, selectedModule.id, type)
                          )
                        }
                      >
                        <span
                          className={s.typeIcon}
                          dangerouslySetInnerHTML={{
                            __html: renderGuidedModuleTypeIcon(type, 44),
                          }}
                        />
                        <span>{GUIDED_MODULE_TYPE_LABELS[type]}</span>
                      </button>
                    );
                  })}
                </div>

                {selectedModule.type === "abatible" ||
                selectedModule.type === "oscilobatiente" ||
                selectedModule.type === "puerta" ||
                selectedModule.type === "shower_frontal" ? (
                  <>
                    <span className={s.blockLabel}>Sentido de apertura</span>
                    <div
                      className={s.shapeChipRow}
                      role="listbox"
                      aria-label="Sentido de apertura"
                    >
                      {GUIDED_OPENING_SIDES.map((side: GuidedOpeningSide) => {
                        const active = (selectedModule.openingSide ?? "left") === side;
                        return (
                          <button
                            key={side}
                            type="button"
                            role="option"
                            aria-selected={active}
                            className={`${s.shapeChip} ${active ? s.shapeChipActive : ""}`}
                            onClick={() =>
                              history.setConfig(
                                updateModuleOpeningSide(
                                  working,
                                  selectedModule.id,
                                  side
                                )
                              )
                            }
                          >
                            {GUIDED_OPENING_SIDE_LABELS[side]}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : null}

                <span className={s.blockLabel}>Forma del vidrio</span>
                <div className={s.shapeChipRow} role="listbox" aria-label="Forma del vidrio">
                  {(["rect", "rounded"] as const).map((kind: GuidedGlassShapeKind) => {
                    const active = selectedModule.glassShape.kind === kind;
                    return (
                      <button
                        key={kind}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={`${s.shapeChip} ${active ? s.shapeChipActive : ""}`}
                        onClick={() =>
                          history.setConfig(
                            updateModuleGlassShape(
                              working,
                              selectedModule.id,
                              kind === "rounded"
                                ? {
                                    kind: "rounded",
                                    radiusMm:
                                      selectedModule.glassShape.kind === "rounded"
                                        ? selectedModule.glassShape.radiusMm
                                        : 40,
                                    corners:
                                      selectedModule.glassShape.kind === "rounded"
                                        ? selectedModule.glassShape.corners
                                        : "all",
                                  }
                                : { kind: "rect" }
                            )
                          )
                        }
                      >
                        {GUIDED_GLASS_SHAPE_LABELS[kind]}
                      </button>
                    );
                  })}
                </div>
                {selectedModule.glassShape.kind === "rounded" ? (
                  <>
                    <label className={s.fullLabel}>
                      Radio (mm)
                      <input
                        type="text"
                        inputMode="numeric"
                        value={glassRadiusDraft}
                        onChange={(event) =>
                          setGlassRadiusDraft(
                            event.target.value.replace(/[^\d]/g, "")
                          )
                        }
                        onBlur={commitGlassRadius}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            (event.target as HTMLInputElement).blur();
                          }
                        }}
                      />
                    </label>
                    <p className={s.hint}>
                      Confirma el radio con Enter. &quot;Todas&quot; = 4 esquinas;
                      &quot;Solo arriba&quot; = base recta.
                    </p>
                    <div className={s.shapeChipRow} role="listbox" aria-label="Esquinas">
                      {([
                        ["all", "Todas"],
                        ["top", "Solo arriba"],
                      ] as const).map(([corners, label]) => {
                        const active =
                          selectedModule.glassShape.kind === "rounded" &&
                          selectedModule.glassShape.corners === corners;
                        return (
                          <button
                            key={corners}
                            type="button"
                            role="option"
                            aria-selected={active}
                            className={`${s.shapeChip} ${active ? s.shapeChipActive : ""}`}
                            onClick={() => {
                              if (
                                selectedModule.glassShape.kind === "rounded" &&
                                selectedModule.glassShape.corners === corners
                              ) {
                                return;
                              }
                              history.setConfig(
                                updateModuleGlassShape(working, selectedModule.id, {
                                  kind: "rounded",
                                  radiusMm:
                                    selectedModule.glassShape.kind === "rounded"
                                      ? selectedModule.glassShape.radiusMm
                                      : 40,
                                  corners,
                                })
                              );
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : null}

                <div className={s.secondaryActions}>
                  <button
                    type="button"
                    className={s.toolButton}
                    onClick={() => enterPalilloEditMode(selectedModule.id)}
                  >
                    {countPalilloSplits(selectedModule.palilloLayout) === 0
                      ? "Agregar palillos"
                      : "Editar palillos"}
                  </button>
                  {findParentSplitExists ? (
                    <button
                      type="button"
                      className={s.toolButton}
                      onClick={() =>
                        history.setConfig(mergeSiblingModules(working, selectedModule.id))
                      }
                    >
                      Unir con el de al lado
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {!selectedModule && !selectedSplit && !palilloEditModuleId ? (
              <div className={s.emptyInspector}>
                <p className={s.emptyInspectorTitle}>Selecciona un módulo</p>
                <p className={s.hint}>
                  Toca el dibujo para elegir un paño y definir si es fijo, corredera, puerta u
                  otro.
                </p>
              </div>
            ) : null}

            {selectedSplit && !palilloEditModuleId ? (
              <div className={s.block}>
                <span className={s.blockLabel}>Ajustar división</span>
                <p className={s.hint}>
                  {selectedSplit.direction === "vertical"
                    ? "Separación de lado a lado"
                    : "Separación arriba / abajo"}
                </p>
                <div className={s.quickRatios}>
                  {(
                    [
                      ["50_50", "Mitad"],
                      ["1_3", "1/3"],
                      ["2_3", "2/3"],
                      ["equal", "Iguales"],
                    ] as const
                  ).map(([preset, label]) => (
                    <button
                      key={preset}
                      type="button"
                      className={s.chip}
                      onClick={() =>
                        history.setConfig(
                          applyQuickSplitRatio(working, selectedSplit.id, preset)
                        )
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <label className={s.fullLabel}>
                  Primer módulo (mm)
                  <input
                    type="text"
                    inputMode="numeric"
                    value={splitMmDraft}
                    onChange={(event) =>
                      setSplitMmDraft(event.target.value.replace(/[^\d]/g, ""))
                    }
                    onBlur={() => {
                      const value = Number(splitMmDraft);
                      if (!Number.isFinite(value) || value <= 0) {
                        return;
                      }
                      history.setConfig(
                        updateSplitFirstSizeMm(working, selectedSplit.id, value)
                      );
                    }}
                  />
                </label>
                <button
                  type="button"
                  className={s.textButton}
                  onClick={() =>
                    history.setConfig(removeSplit(working, selectedSplit.id, "first"))
                  }
                >
                  Quitar esta división
                </button>
              </div>
            ) : null}
          </aside>
        </div>

        <footer className={s.footer}>
          <div className={s.footerMeta}>
            <strong className={s.footerSummary}>
              {summary.moduleCount} módulo{summary.moduleCount === 1 ? "" : "s"} ·{" "}
              {summary.typesLabel}
            </strong>
            {onClear ? (
              <button type="button" className={s.textButton} onClick={onClear}>
                Quitar composición
              </button>
            ) : null}
          </div>
          <div className={s.footerActions}>
            <button type="button" className={s.ghostButton} onClick={requestClose}>
              Cancelar
            </button>
            <button
              type="button"
              className={s.primaryButton}
              onClick={() => {
                commitDims();
                const next = setGuidedVisualDimensions(working, {
                  widthMm: commitDimensionMm(widthDraft, working.widthMm),
                  heightMm: commitDimensionMm(heightDraft, working.heightMm),
                });
                onApply(next);
              }}
            >
              Usar esta composición
            </button>
          </div>
        </footer>

        {dirtyConfirm ? (
          <div className={s.confirmOverlay} role="presentation">
            <div className={s.confirmDialog} role="alertdialog" aria-modal="true">
              <strong>Tienes cambios sin aplicar.</strong>
              <div className={s.footerActions}>
                <button
                  type="button"
                  className={s.ghostButton}
                  onClick={() => setDirtyConfirm(false)}
                >
                  Seguir editando
                </button>
                <button type="button" className={s.primaryButton} onClick={onClose}>
                  Salir sin guardar
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>,
    portalTarget
  );
}

export function ensureGuidedVisualDraft(input: {
  current: GuidedVisualConfig | null;
  widthMm?: number | null;
  heightMm?: number | null;
}): GuidedVisualConfig {
  if (input.current) {
    return setGuidedVisualDimensions(ensureGuidedVisualConfig(input.current), {
      widthMm: Number(input.widthMm) || input.current.widthMm,
      heightMm: Number(input.heightMm) || input.current.heightMm,
    });
  }

  return createDefaultGuidedVisualConfig({
    widthMm: input.widthMm,
    heightMm: input.heightMm,
  });
}

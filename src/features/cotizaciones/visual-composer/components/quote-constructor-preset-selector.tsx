"use client";

import { useEffect, useMemo, useRef } from "react";
import { LuChevronDown } from "react-icons/lu";

import {
  QUOTE_CONSTRUCTOR_DOOR_PRESETS,
  QUOTE_CONSTRUCTOR_MORE_PRESETS,
  QUOTE_CONSTRUCTOR_PRIMARY_PRESETS,
  type QuoteConstructorPreset,
  type QuoteConstructorPresetId,
} from "@/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service";
import { renderGuidedModuleTypeIcon } from "@/features/cotizaciones/visual-composer/services/guided-visual-renderer.service";

import s from "./quote-constructor-preset-selector.module.css";

type Props = {
  activePresetId: QuoteConstructorPresetId | null;
  onSelect: (presetId: QuoteConstructorPresetId) => void;
};

type PresetCardProps = {
  preset: QuoteConstructorPreset;
  active: boolean;
  menu?: boolean;
  onSelect: (presetId: QuoteConstructorPresetId) => void;
};

function PresetCard({ preset, active, menu = false, onSelect }: PresetCardProps) {
  return (
    <button
      type="button"
      className={`${s.presetCard} ${menu ? s.presetCardMenu : ""} ${
        active ? s.presetCardActive : ""
      }`}
      aria-label={preset.label}
      aria-pressed={active}
      onClick={() => onSelect(preset.id)}
    >
      <span
        className={s.presetIcon}
        aria-hidden
        dangerouslySetInnerHTML={{
          __html: renderGuidedModuleTypeIcon(preset.id, menu ? 58 : 52),
        }}
      />
      <span className={s.presetName}>{preset.label}</span>
    </button>
  );
}

export function QuoteConstructorPresetSelector({
  activePresetId,
  onSelect,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const doorMenuRef = useRef<HTMLDetailsElement | null>(null);
  const moreMenuRef = useRef<HTMLDetailsElement | null>(null);
  const compositionPreset = QUOTE_CONSTRUCTOR_PRIMARY_PRESETS.find(
    (preset) => preset.id === "pano_libre"
  );
  const primaryPresets = QUOTE_CONSTRUCTOR_PRIMARY_PRESETS.filter(
    (preset) => preset.id !== "pano_libre"
  );
  const activeDoorPreset = useMemo(
    () =>
      QUOTE_CONSTRUCTOR_DOOR_PRESETS.find(
        (preset) => preset.id === activePresetId
      ) ?? QUOTE_CONSTRUCTOR_DOOR_PRESETS[0],
    [activePresetId]
  );
  const doorIsActive = QUOTE_CONSTRUCTOR_DOOR_PRESETS.some(
    (preset) => preset.id === activePresetId
  );
  const moreIsActive = QUOTE_CONSTRUCTOR_MORE_PRESETS.some(
    (preset) => preset.id === activePresetId
  );

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      if (doorMenuRef.current) doorMenuRef.current.open = false;
      if (moreMenuRef.current) moreMenuRef.current.open = false;
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (doorMenuRef.current) doorMenuRef.current.open = false;
      if (moreMenuRef.current) moreMenuRef.current.open = false;
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const selectPreset = (presetId: QuoteConstructorPresetId) => {
    onSelect(presetId);
    if (doorMenuRef.current) doorMenuRef.current.open = false;
    if (moreMenuRef.current) moreMenuRef.current.open = false;
  };

  const keepSingleMenuOpen = (current: "door" | "more") => {
    const currentRef = current === "door" ? doorMenuRef : moreMenuRef;
    const otherRef = current === "door" ? moreMenuRef : doorMenuRef;
    if (currentRef.current?.open && otherRef.current) {
      otherRef.current.open = false;
    }
  };

  return (
    <div ref={rootRef} className={s.selector}>
      {primaryPresets.map((preset) => (
        <PresetCard
          key={preset.id}
          preset={preset}
          active={activePresetId === preset.id}
          onSelect={selectPreset}
        />
      ))}

      <details
        ref={doorMenuRef}
        className={`${s.menu} ${doorIsActive ? s.menuActive : ""}`}
        onToggle={() => keepSingleMenuOpen("door")}
      >
        <summary
          className={s.menuTrigger}
          aria-label="Puerta: elegir entre abatible y corredera"
        >
          <span
            className={s.presetIcon}
            aria-hidden
            dangerouslySetInnerHTML={{
              __html: renderGuidedModuleTypeIcon(
                activeDoorPreset?.id ?? "puerta",
                52
              ),
            }}
          />
          <span className={s.presetName}>Puerta</span>
          <LuChevronDown className={s.menuChevron} aria-hidden />
        </summary>
        <div className={s.menuPanel}>
          <div className={s.menuHeading}>
            <strong>Tipo de puerta</strong>
            <span>Elige su forma de apertura</span>
          </div>
          <div className={s.menuGrid}>
            {QUOTE_CONSTRUCTOR_DOOR_PRESETS.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                active={activePresetId === preset.id}
                menu
                onSelect={selectPreset}
              />
            ))}
          </div>
        </div>
      </details>

      {compositionPreset ? (
        <PresetCard
          preset={compositionPreset}
          active={activePresetId === compositionPreset.id}
          onSelect={selectPreset}
        />
      ) : null}

      <details
        ref={moreMenuRef}
        className={`${s.menu} ${moreIsActive ? s.menuActive : ""}`}
        onToggle={() => keepSingleMenuOpen("more")}
      >
        <summary className={s.moreTrigger} aria-label="Más tipologías">
          <span className={s.moreGlyph} aria-hidden>
            <i />
            <i />
            <i />
            <i />
          </span>
          <span>
            <strong>Más tipologías</strong>
            <small>6 opciones</small>
          </span>
          <LuChevronDown className={s.menuChevron} aria-hidden />
        </summary>
        <div className={`${s.menuPanel} ${s.morePanel}`}>
          <div className={s.menuHeading}>
            <strong>Más tipologías</strong>
            <span>Ventanas especiales y shower</span>
          </div>
          <div className={`${s.menuGrid} ${s.moreGrid}`}>
            {QUOTE_CONSTRUCTOR_MORE_PRESETS.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                active={activePresetId === preset.id}
                menu
                onSelect={selectPreset}
              />
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}

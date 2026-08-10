# Design QA — Catálogo privado desktop

## Evidence

- Source visual truth: `C:\Users\aless\AppData\Local\Temp\codex-clipboard-126f6dfc-ad32-40b5-b476-a798d5796712.png`
- Source image: 1672 × 941 px (desktop reference supplied by the user).
- Implementation: browser-rendered `/configuracion/empresa/lineas-precios` capture in this session at 1680 × 940 CSS px (1665 px client width after scrollbar), closed-filter state.
- Secondary responsive capture: 1024 × 900 CSS px (1009 px client width after scrollbar), with the filter availability control opened.
- Density normalization: both desktop comparison captures are approximately 1× and assessed at their native CSS viewport; browser chrome excluded.

## Full-view comparison

The implementation matches the reference's operating composition: a narrow graphite shell, compact page header, one white filter bar, provider/system groups, a full-width featured line when a group contains one item, and a compact multi-column catalogue for larger groups.

## Focused regions

- Header and filter bar: verified at 1680 px. Search, supplier, material, technical-recipe state, and the secondary availability filter remain usable without exposing a wall of chips.
- Featured line: verified at 1680 px. It uses the full content width and keeps identity, commercial price, technical status, contextual CTA, and active state in one scan.
- Catalogue cards: verified at 1680 px and 1024 px. They reflow from three compact columns to two columns without horizontal overflow.

## Required fidelity surfaces

- Fonts and typography: the existing Ventora type system remains intact; the hierarchy follows the reference with title, price, technical label, state, and CTA in distinct weights.
- Spacing and layout rhythm: the desktop page uses the available content width, a single toolbar surface, generous group separation, and 12–32 px purposeful rhythm.
- Colors and visual tokens: graphite shell, quiet blue action, white surfaces, neutral borders, and restrained semantic state pills align with the existing Ventora palette and the reference.
- Image quality and asset fidelity: the reference includes technical profile imagery. Ventora renders this slot only when a line already has a verified profile asset; no generated or approximate profile drawing was introduced.
- Copy and content: prices, suppliers, recipe labels, availability, and actions use persisted application data and the existing terminology.

## Findings and comparison history

- [P1, fixed] Featured line inherited a reduced-width rule and left its switch outside the card. Fixed by restoring full group width for the single-line desktop composition; recapture confirms a 1333 px card within a 1665 px client viewport and no overflow.
- No actionable P0, P1, or P2 differences remain for the desktop reference adaptation.

## Primary interactions tested

- Desktop search and all four primary filter controls render in one bar.
- The `Filtros` control opens availability choices at 1024 px without horizontal overflow.
- Active/inactive toggles, edit actions, menu actions, and recipe navigation remain in their existing components.

final result: passed

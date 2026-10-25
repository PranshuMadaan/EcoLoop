# EcoLoop Design System — "Civic Circularity"

> Official frontend design specification, v2 (October 2026).
> Extracted from the Stitch-generated theme (`stitch-exports/civic_circularity/DESIGN.md`) and applied across the whole platform.
> Replaces the previous "Cyber-Industrial" dark/neon system.

---

## 1. Philosophy

**Light-first civic-tech.** EcoLoop should feel like a tool municipal officers and recycling companies use daily — trustworthy, calm, data-dense. Like Stripe or Linear, not a hackathon demo.

- **No glassmorphism, no neon glows, no surface gradients.** Flat white cards, hairline borders, soft shadows.
- **One accent: deep forest green.** Amber is the only secondary (in-progress states). Red only for errors/reversals.
- **Data is the hero.** Monetary amounts and weights always in tabular figures; mono only for hashes and transaction IDs.
- Light theme is the default everywhere; dark mode (where it exists) is a warm stone dark, never navy/black with glow.

## 2. Typography

| Role | Font | Notes |
|------|------|-------|
| Everything | **Inter** (400–800) | Headings 600–700, tracking `-0.02em` to `-0.025em` |
| Display hero (landing) | **Fraunces** (serif) | Landing headline only |
| Money / weights | Inter, `font-variant-numeric: tabular-nums` | Mandatory in tables and stat cards |
| Hashes / txn refs / VPA codes | **JetBrains Mono** | Nothing else uses mono |

Type scale: hero `clamp(1.6rem, 3.2vw, 2.3rem)` · section title 1.3rem · card title 1rem · body 15px · micro-label **11px uppercase, letter-spacing 0.06–0.09em, weight 600**.

## 3. Color Tokens

| Token | Value | Use |
|-------|-------|-----|
| `--bg` | `#fff8f5` | Page background (warm cream) |
| `--bg-dim` / surface-container | `#f6ece6` | Hover fills, sunken areas |
| `--surface` | `#ffffff` | Cards, modals, navbar |
| `--surface-sunken` | `#fcf2eb` | Wells, QR containers, empty states |
| `--border-subtle` | `#eae1da` | Card borders, dividers |
| `--border-strong` | `#d8ccc2` | Input borders |
| `--text-main` | `#1f1b17` | Primary text |
| `--text-muted` | `#78716c` | Secondary text |
| `--text-dim` | `#a8a29e` | Labels, hints, placeholders |
| `--primary` | `#166534` | Buttons, links, active nav, brand |
| `--primary-dark` / deep | `#004c22` | Hover, municipal role accent |
| `--primary-tint` | `#f0fdf4` | Success tags, tinted boxes |
| `--primary-border` | `#bbf7d0` | Tint-box borders |
| `--amber` | `#d97706` | BIDDING / PENDING / warnings |
| `--amber-tint` / border | `#fff7ed` / `#fed7aa` | Amber tint boxes |
| `--red` | `#ba1a1a` | FAILED / REVERSED / errors |
| Dark-section background | `#052e16` (forest-950) | Phone frames, map canvas, dark banners |

Status tag mapping: **OPEN** green tint · **BIDDING / PENDING** amber tint · **SOLD / REVERSED** neutral gray · **SUCCESS** green tint · **FAILED** red tint.

## 4. Shape & Elevation

- Radii: inputs/buttons 8px · cards 10–14px · pills 999px.
- Card shadow: `0 1px 2px rgba(31,27,23,.05), 0 4px 14px rgba(31,27,23,.05)`; hover: `0 4px 12px …, 0 12px 32px …`.
- Transitions: `all .18s ease` (was `.25s cubic-bezier` glow era).
- Minimum touch target: 48px on mobile surfaces; compact 40px table rows in back-office tables.

## 5. Components

- **Navbar:** white, 60px, sticky, hairline bottom border; pill nav links (active = green tint); "API Live" dot badge.
- **Buttons:** solid deep green primary; white/gray-border secondary; ghost destructive red for payout reversal.
- **Cards:** white, 1px border, soft shadow, hover lift + border darkening.
- **Stat cards:** uppercase 11px label → large tabular value → small hint line.
- **Tables:** 40px rows, hairline dividers, uppercase micro headers, right-aligned tabular amounts.
- **Modals:** 45% dark backdrop, white card, scale-in 200ms.
- **Toasts:** dark stone (success: deep green, error: red), bottom-right.

## 6. Rules

1. Never introduce cyan, violet, or neon accents — green + amber only.
2. Never use glassmorphism, `backdrop-blur` glow, or colored box-shadows.
3. All monetary values get `tabular-nums`; all hashes/refs get JetBrains Mono.
4. Never hardcode `#0a0e17`/`#f1f5f9`-era dark-theme values; use the tokens above.
5. Status color semantics are fixed — do not reuse amber for success or green for errors.
6. New pages should start from the Stitch exports in `stitch-exports/` as the visual reference.

## 7. Where It's Implemented

| Surface | Implementation |
|---------|----------------|
| `frontend/` SPA | `frontend/src/style.css` (full token sheet) |
| Landing | `index.html` (Tailwind config: Stitch "Civic Circularity" palette) |
| Citizen dashboard | `user.html` (token block remapped) |
| Municipal/classifier pages | `ecoloop-municipal.html`, `waste-segregation.html` (token blocks remapped) |
| Demo pages | `marketplace.html`, `route-optimizer.html`, `worker-ledger.html` (Tailwind `forest` scale + green remaps) |
| Login | `login.html` (`--acu`/`--acm`/`--neon` harmonized) |
| Route optimizer app | `ecoloop-app/src/OptimizerPage.jsx` (inline tokens remapped) |

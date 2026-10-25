---
name: Civic Circularity
colors:
  surface: '#fff8f5'
  surface-dim: '#e2d8d2'
  surface-bright: '#fff8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fcf2eb'
  surface-container: '#f6ece6'
  surface-container-high: '#f0e6e0'
  surface-container-highest: '#eae1da'
  on-surface: '#1f1b17'
  on-surface-variant: '#404940'
  inverse-surface: '#342f2b'
  inverse-on-surface: '#f9efe8'
  outline: '#707a6f'
  outline-variant: '#bfc9bd'
  surface-tint: '#1f6c3a'
  primary: '#004c22'
  on-primary: '#ffffff'
  primary-container: '#166534'
  on-primary-container: '#93e0a2'
  inverse-primary: '#8bd79b'
  secondary: '#904d00'
  on-secondary: '#ffffff'
  secondary-container: '#fe932c'
  on-secondary-container: '#663500'
  tertiary: '#004b1d'
  on-tertiary: '#ffffff'
  tertiary-container: '#00662a'
  on-tertiary-container: '#6ae784'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a6f4b5'
  primary-fixed-dim: '#8bd79b'
  on-primary-fixed: '#00210b'
  on-primary-fixed-variant: '#005226'
  secondary-fixed: '#ffdcc3'
  secondary-fixed-dim: '#ffb77d'
  on-secondary-fixed: '#2f1500'
  on-secondary-fixed-variant: '#6e3900'
  tertiary-fixed: '#7ffc97'
  tertiary-fixed-dim: '#62df7d'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005320'
  background: '#fff8f5'
  on-background: '#1f1b17'
  surface-variant: '#eae1da'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: '0'
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.06em
  data-metric:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  data-tabular:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: '0'
  code-hash:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: '0'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 1.75rem
---

## Brand & Style

This design system is engineered for civic enterprise waste management, Extended Producer Responsibility (EPR) compliance tracking, and industrial B2B scrap auctions. It prioritizes operational clarity, institutional credibility, and high-throughput productivity. The visual atmosphere communicates rigor, regulatory compliance, and fiscal trust, bridging municipal sanitation officials, certified recyclers, and corporate procurement directors.

The design movement is **Modern Enterprise Functionalism**:
- Pure solid surface fills without decorative gradients, neon glows, or frosted blurs.
- Utilitarian visual hierarchy rooted in warm stone neutrals, structural boundaries, and strict tabular alignment.
- Dense data displays balanced by disciplined whitespace, allowing users to rapidly scan tonnage metrics, transaction escrows, and audit logs without cognitive fatigue.

## Colors

The system uses a warm-stone-anchored palette engineered for high-contrast legible data readouts under demanding field and desk environments.

### Primary Brand & Action
- **Primary Base (`#166534`)**: Deep Forest Green for primary actions, navigation active states, high-priority buttons, and confirmed institutional checkpoints.
- **Primary Hover (`#14532D`)**: Darkened green for interactive hover states.
- **Primary Tint Surface (`#F0FDF4`)**: Soft tint for verified tags, highlighted rows, and selected controls.
- **Primary Border (`#BBF7D0`)**: Structural border for positive states and accent callouts.

### Secondary / In-Progress & Commerce
- **Secondary Base (`#D97706`)**: Industrial Amber for active live scrap auctions, pending municipal collections, escrow holds, and time-sensitive bidding.
- **Secondary Tint Surface (`#FFFBEB`)**: Background surface for active bids, transit tracking cards, and caution banners.
- **Secondary Border (`#FDE68A`)**: Border for pending and amber status indicators.

### Neutrals (Stone Scale)
- **Canvas Base (`#FAFAF9`)**: Main canvas background behind panels and dashboards.
- **Surface Layer (`#FFFFFF`)**: Pure crisp white for all cards, table rows, and modals.
- **Border Neutral (`#E7E5E4`)**: Structural 1px border for containers, cards, and input boundaries.
- **Subtle Dividers (`#F5F5F4`)**: Hairline separator between table rows and subheaders.
- **Text Primary (`#1C1917`)**: High-contrast body, header, and numeric text.
- **Text Secondary (`#78716C`)**: Descriptive metadata, secondary navigation, and unit indicators.
- **Text Muted (`#A8A29E`)**: Placeholders, inactive breadcrumbs, and disabled states.

### Semantic Alerts & Lifecycle
- **Success / Settled (`#16A34A`)**: Closed payouts, verified recycling batches. Background: `#F0FDF4`, Border: `#BBF7D0`.
- **Warning / Bidding (`#D97706`)**: Pending verification, active bids. Background: `#FFFBEB`, Border: `#FDE68A`.
- **Closed / Archived (`#57534E`)**: Sold scrap lots, historical logs. Background: `#F5F5F4`, Border: `#E7E5E4`.
- **Error / Reversed (`#DC2626`)**: Contaminated load alerts, escrow disputes. Background: `#FEF2F2`, Border: `#FECACA`.

## Typography

The typographic engine balances rapid legibility with precise institutional audit capabilities:

- **Primary Interface**: Inter handles all headings, interface controls, table cells, and narrative content. Headings leverage tight letter spacing (-0.015em to -0.025em) with medium-to-bold weights (600-700) to ground complex views.
- **Numerical Alignment**: All numerical values—including weights (MT, kg), rates (₹/kg), and monetary balances (INR ₹)—must employ `font-variant-numeric: tabular-nums`. This prevents layout shifts during live bid updates and guarantees column vertical alignment across dense tables.
- **Audit & Cryptographic Identifiers**: JetBrains Mono is strictly used for non-prose technical tokens: EPR manifest IDs, batch reference hashes, blockchain certificate signatures, and bank escrow IDs.
- **Uppercase Metadata Labels**: Metric card headers and table column headers utilize 11px uppercase styling with expanded letter-spacing (`0.06em`) in `#78716C` to clearly separate field labels from dynamic operational values.

## Layout & Spacing

The layout is built around a **Fluid Enterprise Grid** anchored to fixed boundary limits:
- **Max Content Width**: 1440px centered viewport with responsive gutters.
- **Desktop (1024px+)**: 12-column layout with 24px (`1.5rem`) gutters and 32px (`2rem`) outer canvas margins. Multi-pane operational split: sticky navigation on top, optional collapsible left-side facility tree (260px fixed), and a flexible 12-column content grid.
- **Tablet (768px - 1023px)**: 8-column layout with 16px (`1rem`) gutters and 24px margins. Data tables enable horizontal scrolling with fixed column anchors.
- **Mobile (< 768px)**: 4-column layout with 16px margins. Complex scrap lot tables collapse into compact stacked card units.

### Spacing Rhythm
- `space-xs` (4px): Gap between status dot indicators and text; pill tag padding.
- `space-sm` (8px): Form input inner vertical padding; table cell padding in ultra-dense mode; gap between icon and CTA text.
- `space-md` (12px): Standard form gap; horizontal padding inside buttons and inputs; table header vertical baseline.
- `space-lg` (20px): Inner padding for operational cards, metric KPI boxes, and modal footers.
- `space-xl` (28px): Section spacing between dashboard rows, card grids, and primary workspace panels.

## Elevation & Depth

This system avoids heavy drop shadows, neon underglows, and skeuomorphic bevels. Depth is established through **Layered Surface Planarity**:

1. **Canvas (Level 0)**: `#FAFAF9` serves as the underlying base layer for the entire application.
2. **Structural Surfaces (Level 1)**: Modals, metric panels, table cards, and utility bars sit at pure white (`#FFFFFF`) with a 1px solid `#E7E5E4` boundary.
3. **Resting Card Shadow**: Every resting white card has a dual micro-shadow:
   `box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)`.
4. **Interactive Hover (Level 2)**: Actionable scrap auction cards and clickable table rows elevate slightly:
   `box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -1px rgba(0, 0, 0, 0.03)`.
5. **Overlays & Drawers (Level 3)**: Manifest upload dialogs and facility switchers utilize:
   `box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)`.
6. **No Glassmorphism**: Backdrops for dialogs must use a flat 40% neutral wash (`rgba(28, 25, 23, 0.4)`) without backdrop filters or blurs.

## Shapes

The design uses a clean, industrial shape hierarchy calibrated between utility and software modernity:

- **Cards, Panels & Modals (`rounded-xl` / 10px - 12px)**: Defines the boundaries for scrap listing cards, live bidding panels, metric KPI containers, and audit popups.
- **Interactive Controls (`rounded-md` / 6px - 8px)**: Buttons, text fields, dropdown selectors, date pickers, and filter groups use 6px-8px corners for clear affordance and compact alignment.
- **Status Tags & Semantic Pills (`rounded-full` / 9999px)**: Bidding states, material types (e.g., "HDPE Rigid", "PET Flakes"), and payment badges are pill-shaped to differentiate them from actionable buttons.

## Components

### Top Navigation Bar & Subheader
- **Main Bar**: Fixed 56px height, `#FFFFFF` background, solid 1px `#E7E5E4` bottom border. Features municipality/facility switcher (`#FAFAF9` container with `#E7E5E4` border), global search with tabular shortcut indicator, and session profile details.
- **Breadcrumb Subheader**: 44px height, `#FFFFFF` background, 1px bottom border `#E7E5E4`. Contains path hierarchy (`#78716C`), current page title (`#1C1917`, 14px bold), and right-aligned CTA buttons.

### Buttons
- **Primary**: Solid Deep Forest Green (`#166534`), text `#FFFFFF`, font-weight 500, height 36px (or 40px for prominent actions), 6px-8px rounded corners. Hover state: `#14532D`. Active state: `#0F3D21`. No drop shadows or gradients.
- **Secondary**: Solid White (`#FFFFFF`), 1px border `#E7E5E4`, text `#1C1917`, font-weight 500. Hover state: `#F5F5F4`.
- **Destructive**: Solid White (`#FFFFFF`), 1px border `#FECACA`, text `#DC2626`. Hover state: `#FEF2F2`.
- **Ghost / Utility**: Transparent background, text `#78716C`, hover `#F5F5F4` with text `#1C1917`.

### Compact Data Tables
- **Row Architecture**: Strict 40px row height for standard operational density (32px in compact audit view).
- **Header**: `#FAFAF9` background, 11px uppercase text in `#78716C`, 1px bottom border `#E7E5E4`.
- **Dividers & Rows**: 1px horizontal dividers `#F5F5F4`. Row hover transitions to `#FAFAF9`.
- **Numbers & Hashes**: Monospace font for batch hashes; `tabular-nums` for lot weight (MT) and currency values (₹). Right-align all numeric columns.

### Status Pills & Badges
- Pill-shaped (`rounded-full`), padding 2px 8px, font-size 11px or 12px, font-weight 500.
- **Active Bidding / Pending**: Background `#FFFBEB`, text `#92400E`, border 1px solid `#FDE68A`.
- **Confirmed / Completed / Settled**: Background `#F0FDF4`, text `#166534`, border 1px solid `#BBF7D0`.
- **Sold / Closed / Inactive**: Background `#F5F5F4`, text `#57534E`, border 1px solid `#E7E5E4`.
- **Disputed / Contaminated**: Background `#FEF2F2`, text `#B91C1C`, border 1px solid `#FECACA`.
- Includes a 6px solid circular dot preceding the label for instant optical grouping.

### Metric Cards (KPI Displays)
- White surface, 1px `#E7E5E4` border, 12px border radius, resting micro-shadow.
- Upper region: 11px uppercase metadata label in `#78716C` with optional material icon.
- Central region: 28px bold tabular metric (e.g., `1,420.50 MT` or `₹4,28,900`) in `#1C1917`.
- Footer region: Comparison trend pill (e.g., `+12.4% vs last cycle`) using the semantic green/red tint.

### Form Inputs & Selectors
- Solid `#FFFFFF` fill with 1px `#E7E5E4` border, 36px height, 6px-8px border radius.
- Text: `#1C1917`, placeholder `#A8A29E`, 14px size.
- Focus: Crisp 1px `#166534` ring outline with no blurred glow.
- Pre-appended / Post-appended addons: `#FAFAF9` background with `#78716C` labels (e.g., "kg", "₹", "INR").

### Live Scrap Auction Cards
- White `#FFFFFF` card, 12px radius, 1px `#E7E5E4` border.
- Header row with Material Category badge ("PET Grade A") and live countdown timer in Amber (`#D97706`).
- Two-column data grid: Total Lot Weight (MT) and Current Highest Bid (`tabular-nums` with currency mark).
- Bottom single-action row: Direct "Place Bid" primary button and "Inspection Certificate" hash link.
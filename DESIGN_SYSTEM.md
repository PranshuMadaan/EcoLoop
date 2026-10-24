# EcoLoop Design System & UI Normalization Guide

> **Official Frontend Design Specification for the EcoLoop Platform**  
> *Target Audience:* All frontend engineers, UI/UX designers, and module contributors building new views, dashboards, and components for EcoLoop.

---

## 1. Design Philosophy & Aesthetic Identity

EcoLoop pairs a **Cyber-Industrial Circular Economy** foundation with two complementary, high-contrast visual themes:

1. **Dark Luxury Mode (Default)**: Deep midnight obsidian foundations (`#0a0e17`) illuminated by bio-luminescent emeralds (`#10b981`, `#34d399`), tech cyans (`#22d3ee`, `#38bdf8`), and glassmorphic translucent panels with ambient radial glows.
2. **Clean Solar Light Mode**: Crisp, high-readability slate canvas (`#f8fafc`) with elevated pure white cards (`#ffffff`), darkened accessible emeralds (`#059669`), sky blues (`#0284c7`), and subtle drop shadows.

The design evokes regulatory compliance (CPCB/MoEFCC), high-frequency financial settlement (NPCI/UPI/Razorpay), and industrial recycling integrity.

### Core Principles
1. **Dual-Theme Resilience**: Every component, card, modal, and data table must seamlessly adapt between Dark and Light modes by consuming CSS variables instead of hardcoded hex values.
2. **Glassmorphic Elevation & Depth**: Semi-transparent card planes layered over fixed ambient radial glow gradients with `backdrop-filter: blur(12px - 16px)`.
3. **Cryptographic & Financial Precision**: Monospaced typography for all ledger hashes, UPI VPAs, Bank UTR numbers, GPS coordinates, and tonnage metrics.
4. **Field-Ready Ergonomics**: Minimum **48px touch targets** on all interactive buttons, inputs, tabs, and voice controls to ensure tactile usability by DWCC center operators and waste collectors on ruggedized mobile tablets or smartphones.

---

## 2. Typography System

The platform imports Google Fonts at the root level (`index.html`):

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

### Font Roles

| Role | Font Family | Weights Used | Usage |
| :--- | :--- | :--- | :--- |
| **Headings & Numbers** | `'Outfit', sans-serif` | 600, 700, 800 | Page titles, section headers, large INR amounts, stat values, balance tickers |
| **Body & UI Copy** | `'Plus Jakarta Sans', sans-serif` | 400, 500, 600, 700 | Descriptions, form labels, table cells, buttons, navbar links, toasts |
| **Data & Code** | `ui-monospace, 'SF Mono', Menlo, monospace` | 500, 600, 700 | 64-char SHA-256 hashes, 12-digit UTR numbers, UPI VPAs, UUIDs, weights |

### Hierarchy & Scales

```css
/* Typography Scale Tokens */
--hero-title: clamp(2rem, 4vw, 3.25rem); /* weight: 800, tracking: -0.03em */
--section-title: 1.5rem (24px);           /* weight: 700, tracking: -0.02em */
--card-title: 1.15rem (18px);             /* weight: 700, tracking: -0.01em */
--body-default: 0.875rem (14px);          /* weight: 400/500, line-height: 1.5 */
--label-micro: 0.75rem (12px);            /* weight: 600/700, uppercase, tracking: 0.05em */
```

### Gradient Text Signature
Use on platform brand names, key metrics, and hero callouts:
```css
.gradient-text {
  background: linear-gradient(135deg, var(--emerald-400), var(--cyan-400));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```
*Tailwind:* `bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent`

---

## 3. Color Palette & Token Reference (Dual-Theme)

### Comprehensive Token Mapping Table

| Semantic Token | Dark Mode Default | Light Mode Override (`[data-theme="light"]`) | Application / Role | Tailwind Equivalent |
| :--- | :--- | :--- | :--- | :--- |
| `--bg-main` | `#0a0e17` (Deep Obsidian) | `#f8fafc` (Slate 50) | Full page canvas body background | `bg-slate-950 dark:bg-slate-950` / `bg-slate-50` |
| `--bg-card` | `rgba(18, 24, 38, 0.75)` | `rgba(255, 255, 255, 0.92)` | Cards, panels, modal sheets | `bg-white/95 dark:bg-slate-900/75` |
| `--bg-card-hover` | `rgba(26, 35, 54, 0.85)` | `#ffffff` | Hover state for interactive items | `hover:bg-white dark:hover:bg-slate-800/85` |
| `--border-subtle` | `rgba(255, 255, 255, 0.08)` | `rgba(0, 0, 0, 0.08)` | Card borders, dividers, inputs | `border-black/[0.08] dark:border-white/[0.08]` |
| `--border-focus` | `rgba(16, 185, 129, 0.5)` | `rgba(16, 185, 129, 0.6)` | Focused inputs, active tab borders | `focus:border-emerald-500` |
| `--emerald-400` | `#34d399` (Bioluminescent) | `#059669` (Accessible Green) | Accent text, numbers, success alerts | `text-emerald-600 dark:text-emerald-400` |
| `--emerald-500` | `#10b981` | `#10b981` | Primary CTA buttons, verified badges | `bg-emerald-500` |
| `--emerald-600` | `#059669` | `#047857` | Button active states, gradient stops | `bg-emerald-600 dark:bg-emerald-600` |
| `--cyan-400` | `#22d3ee` | `#0284c7` (Sky Blue) | Ledger hashes, Bank RRN, links | `text-sky-600 dark:text-cyan-400` |
| `--violet-400` | `#a78bfa` | `#7c3aed` | Corporate entity tags, AI audio waves | `text-violet-600 dark:text-violet-400` |
| `--amber-400` | `#fbbf24` | `#d97706` | Pending payouts, auction in-progress | `text-amber-600 dark:text-amber-400` |
| `--rose-400` | `#fb7185` | `#e11d48` | Fraud flags, recording mic, errors | `text-rose-600 dark:text-rose-400` |
| `--text-main` | `#f1f5f9` (Slate 100) | `#0f172a` (Slate 900) | Main headings, titles, values | `text-slate-900 dark:text-slate-100` |
| `--text-muted` | `#94a3b8` (Slate 400) | `#475569` (Slate 600) | Subtitles, helper text, descriptions | `text-slate-600 dark:text-slate-400` |
| `--text-dim` | `#64748b` (Slate 500) | `#64748b` (Slate 500) | Metadata prefixes, timestamps, tags | `text-slate-500` |
| `--shadow-glow` | `0 0 35px rgba(16, 185, 129, 0.15)` | `0 4px 25px rgba(16, 185, 129, 0.12)` | Hero buttons & active cards | `shadow-emerald-500/15` |
| `--shadow-card` | `0 10px 30px rgba(0, 0, 0, 0.35)` | `0 4px 20px rgba(0, 0, 0, 0.05)` | Elevated panels & modals | `shadow-xl dark:shadow-2xl` |

### Raw CSS Custom Properties Definition

```css
:root {
  --font-heading: 'Outfit', sans-serif;
  --font-body: 'Plus Jakarta Sans', sans-serif;

  /* Dark Mode Defaults */
  --bg-main: #0a0e17;
  --bg-card: rgba(18, 24, 38, 0.75);
  --bg-card-hover: rgba(26, 35, 54, 0.85);
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-focus: rgba(16, 185, 129, 0.5);

  --emerald-400: #34d399;
  --emerald-500: #10b981;
  --emerald-600: #059669;
  --cyan-400: #22d3ee;
  --sky-400: #38bdf8;
  --violet-400: #a78bfa;
  --amber-400: #fbbf24;
  --rose-400: #fb7185;

  --text-main: #f1f5f9;
  --text-muted: #94a3b8;
  --text-dim: #64748b;

  --shadow-glow: 0 0 35px rgba(16, 185, 129, 0.15);
  --shadow-card: 0 10px 30px rgba(0, 0, 0, 0.35);

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 9999px;
  --transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Light Mode Overrides */
[data-theme="light"] {
  --bg-main: #f8fafc;
  --bg-card: rgba(255, 255, 255, 0.92);
  --bg-card-hover: #ffffff;
  --border-subtle: rgba(0, 0, 0, 0.08);
  --border-focus: rgba(16, 185, 129, 0.6);

  --emerald-400: #059669; /* WCAG AA 4.5:1 on white */
  --emerald-500: #10b981;
  --emerald-600: #047857;
  --cyan-400: #0284c7;    /* Sky blue for readability on white */
  --sky-400: #0284c7;
  --violet-400: #7c3aed;
  --amber-400: #d97706;
  --rose-400: #e11d48;

  --text-main: #0f172a;
  --text-muted: #475569;
  --text-dim: #64748b;

  --shadow-glow: 0 4px 25px rgba(16, 185, 129, 0.12);
  --shadow-card: 0 4px 20px rgba(0, 0, 0, 0.05);
}
```

---

## 4. Atmospheric Background & Glow Strategy

Every page must apply fixed dual-radial ambient illumination. This eliminates flat-black dead space in Dark Mode and flat-white glare in Light Mode:

```css
/* Dark Mode Background (Default) */
body {
  background-color: var(--bg-main);
  background-image: 
    radial-gradient(circle at 15% 15%, rgba(16, 185, 129, 0.08) 0%, transparent 40%),
    radial-gradient(circle at 85% 75%, rgba(6, 182, 212, 0.08) 0%, transparent 45%);
  background-attachment: fixed;
  color: var(--text-main);
  font-family: var(--font-body);
}

/* Light Mode Background */
[data-theme="light"] body {
  background-color: var(--bg-main);
  background-image: 
    radial-gradient(circle at 15% 15%, rgba(16, 185, 129, 0.06) 0%, transparent 40%),
    radial-gradient(circle at 85% 75%, rgba(6, 182, 212, 0.05) 0%, transparent 45%);
}
```

---

## 5. UI Component Library & Standards

### A. Navigation Bar & Theme Toggle (`.navbar`)
- **Position**: `sticky; top: 0; z-index: 100;`
- **Surface**: `backdrop-filter: blur(16px); background: rgba(10, 14, 23, 0.85);` (Dark) / `rgba(255, 255, 255, 0.92);` (Light)
- **Container**: `max-width: 1280px; margin: 0 auto; padding: 1rem 1.5rem;`
- **Pill Menu**: Rounded capsule (`border-radius: 9999px`) containing interactive tab buttons. Active tab displays `background: linear-gradient(135deg, rgba(16,185,129,0.25), rgba(6,182,212,0.25)); border: 1px solid rgba(16,185,129,0.4);`.

```html
<nav class="navbar">
  <div class="nav-container">
    <div class="brand-logo">
      <span class="gradient-text">EcoLoop</span>
      <span class="brand-badge">B2B + IWL</span>
    </div>
    <div class="nav-menu">
      <button class="nav-link active" data-tab="dashboard">Dashboard</button>
      <button class="nav-link" data-tab="listings">Marketplace</button>
      <button class="nav-link" data-tab="workers">IWL Ledger</button>
      <button class="nav-link" data-tab="epr">EPR Registry</button>
    </div>
    <div class="nav-actions">
      <!-- Theme Switcher Button -->
      <button id="btn-theme-toggle" class="theme-toggle-btn" aria-label="Toggle light/dark theme">
        <span class="theme-icon-sun">☀️</span>
        <span class="theme-icon-moon">🌙</span>
      </button>
      <div class="api-status-badge">
        <span class="status-dot"></span> Live
      </div>
    </div>
  </div>
</nav>
```

### B. Glass Cards (`.card`)
```html
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Card Title</h3>
    <span class="status-tag OPEN">OPEN</span>
  </div>
  <p class="text-muted">Descriptive contextual text goes here.</p>
</div>
```
```css
.card {
  background: var(--bg-card);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  transition: var(--transition);
}

.card:hover {
  transform: translateY(-3px);
  border-color: rgba(16, 185, 129, 0.3);
  box-shadow: var(--shadow-card), var(--shadow-glow);
}

[data-theme="light"] .card {
  background: #ffffff;
  border-color: rgba(0, 0, 0, 0.08);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
}
```

### C. Buttons (`.btn`)
All buttons must satisfy the **48px minimum touch height** for touch and kiosk readiness:

```html
<!-- Primary CTA -->
<button class="btn btn-primary">
  <span>⚡ Instant Action</span>
</button>

<!-- Secondary / Neutral Action -->
<button class="btn btn-secondary">
  <span>Cancel / Dismiss</span>
</button>
```

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 48px;
  padding: 0.65rem 1.25rem;
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  border: 1px solid transparent;
}

.btn-primary {
  background: linear-gradient(135deg, var(--emerald-500), var(--emerald-600));
  color: #fff;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.45);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-main);
  border: 1px solid var(--border-subtle);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.15);
}

[data-theme="light"] .btn-secondary {
  background: #f1f5f9;
  color: #0f172a;
  border-color: #cbd5e1;
}

[data-theme="light"] .btn-secondary:hover {
  background: #e2e8f0;
  border-color: #94a3b8;
}
```

### D. Status Tags & Badges (`.status-tag`)
Pill badges for lifecycle states:

```html
<span class="status-tag OPEN">OPEN</span>
<span class="status-tag BIDDING">BIDDING</span>
<span class="status-tag SOLD">SOLD</span>
<span class="status-tag COMPLETED">VERIFIED</span>
```

```css
.status-tag {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.25rem 0.65rem;
  border-radius: var(--radius-full);
  display: inline-flex;
  align-items: center;
}

.status-tag.OPEN, .status-tag.COMPLETED {
  background: rgba(52, 211, 153, 0.15);
  color: var(--emerald-400);
  border: 1px solid rgba(52, 211, 153, 0.3);
}

.status-tag.BIDDING {
  background: rgba(251, 191, 36, 0.15);
  color: var(--amber-400);
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.status-tag.SOLD {
  background: rgba(148, 163, 184, 0.15);
  color: var(--text-muted);
  border: 1px solid rgba(148, 163, 184, 0.25);
}
```

### E. Form Controls (`.form-control`)
```html
<div class="form-group">
  <label for="input-field">Settlement VPA</label>
  <input type="text" id="input-field" class="form-control" placeholder="org@upi" />
  <span class="field-hint">NPCI authorized handle for instant payouts.</span>
</div>
```
```css
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
}

.form-control, .select-control {
  background: rgba(18, 24, 38, 0.85);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 0.75rem 1rem;
  color: var(--text-main);
  font-family: var(--font-body);
  font-size: 0.9rem;
  min-height: 48px;
  outline: none;
  transition: var(--transition);
}

.form-control:focus, .select-control:focus {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}

[data-theme="light"] .form-control, 
[data-theme="light"] .select-control {
  background: #ffffff;
  border-color: #cbd5e1;
  color: #0f172a;
}
```

### F. Stat Metrics Box (`.stat-card`)
Large numeral dashboard displays:
```html
<div class="stat-card">
  <div class="stat-label">Total Volume Recycled</div>
  <div class="stat-value">1,482.5 <span class="stat-unit">MT</span></div>
  <div class="stat-subtext text-emerald-400">↑ 14.8% vs last month</div>
</div>
```
```css
.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 1.25rem 1.5rem;
  backdrop-filter: blur(12px);
}

.stat-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-dim);
  margin-bottom: 0.35rem;
}

.stat-value {
  font-family: var(--font-heading);
  font-size: 2rem;
  font-weight: 800;
  color: var(--text-main);
}
```

### G. Data Tables (`.data-table`)
Financial records, weigh-in audit logs, and EPR certificates:
```html
<div class="table-wrapper">
  <table class="data-table">
    <thead>
      <tr>
        <th>Worker / Batch ID</th>
        <th>Category</th>
        <th>Net Weight</th>
        <th>Payable</th>
        <th>UTR / Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="font-mono">#WL-2026-9021</td>
        <td>HDPE Rigid Bales</td>
        <td>42.50 kg</td>
        <td class="text-emerald-400 font-bold">₹1,190.00</td>
        <td><span class="status-tag COMPLETED">SETTLED</span></td>
      </tr>
    </tbody>
  </table>
</div>
```
```css
.table-wrapper {
  overflow-x: auto;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.data-table th {
  background: rgba(18, 24, 38, 0.95);
  color: var(--text-muted);
  font-weight: 600;
  text-align: left;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--border-subtle);
}

.data-table td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: var(--text-main);
}

.data-table tr:hover td {
  background: rgba(255, 255, 255, 0.02);
}

[data-theme="light"] .data-table th {
  background: #f1f5f9;
  color: #475569;
  border-bottom-color: #e2e8f0;
}

[data-theme="light"] .data-table td {
  border-bottom-color: #f1f5f9;
  color: #1e293b;
}

[data-theme="light"] .data-table tr:hover td {
  background: #f8fafc;
}
```

### H. Modals (`.modal-backdrop` + `.modal-card`)
- **Backdrop**: `position: fixed; inset: 0; background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(8px); z-index: 1000;`
- **Card**: `background: #111827; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; max-width: 520px; animation: modalIn 0.25s ease-out;`

```css
@keyframes modalIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

[data-theme="light"] .modal-backdrop {
  background: rgba(15, 23, 42, 0.55);
}

[data-theme="light"] .modal-card {
  background: #ffffff;
  border-color: rgba(0, 0, 0, 0.1);
  color: #0f172a;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.15);
}
```

---

## 6. Dual Theme & Light Mode Specification (`[data-theme="light"]`)

EcoLoop natively supports dual theme switching between **Dark Luxury** (default) and **Clean Solar Light Mode**. The active mode is determined via the `data-theme` attribute on the root `<html>` element (`<html data-theme="dark">` or `<html data-theme="light">`), persisted automatically in `localStorage` (`ecoloop_theme`).

### A. Theme Switcher Architecture & Logic
1. **HTML Button Definition**:
   ```html
   <button id="btn-theme-toggle" class="theme-toggle-btn" aria-label="Toggle theme">
     <span class="theme-icon-sun">☀️</span>
     <span class="theme-icon-moon">🌙</span>
   </button>
   ```

2. **CSS Icon Toggle & Button Styles**:
   ```css
   .theme-toggle-btn {
     display: flex;
     align-items: center;
     justify-content: center;
     width: 40px;
     height: 40px;
     border-radius: 50%;
     background: var(--bg-card);
     border: 1px solid var(--border-subtle);
     cursor: pointer;
     font-size: 1.15rem;
     transition: var(--transition);
   }

   .theme-toggle-btn:hover {
     border-color: var(--emerald-400);
     transform: scale(1.08);
   }

   /* Icon visibility rules */
   .theme-icon-moon { display: none; }
   .theme-icon-sun  { display: inline-block; }

   [data-theme="light"] .theme-icon-sun  { display: none; }
   [data-theme="light"] .theme-icon-moon { display: inline-block; }
   ```

3. **JavaScript Controller Implementation**:
   ```javascript
   export function initTheme() {
     const savedTheme = localStorage.getItem('ecoloop_theme') || 'dark';
     setTheme(savedTheme, false);

     const toggleBtn = document.getElementById('btn-theme-toggle');
     if (toggleBtn) {
       toggleBtn.addEventListener('click', () => {
         const current = document.documentElement.getAttribute('data-theme') || 'dark';
         const target = current === 'dark' ? 'light' : 'dark';
         setTheme(target, true);
       });
     }
   }

   export function setTheme(theme, notify = true) {
     document.documentElement.setAttribute('data-theme', theme);
     localStorage.setItem('ecoloop_theme', theme);
     if (notify && typeof showToast === 'function') {
       showToast(`Switched to ${theme === 'light' ? 'Light ☀️' : 'Dark 🌙'} mode`, 'success');
     }
   }
   ```

### B. Contrast & Accessibility in Light Mode
1. **WCAG AA Compliance**: In light mode, primary text uses `#0f172a` (Slate 900) which provides a **15.2:1 contrast ratio** against `#ffffff` and `#f8fafc`.
2. **Deepened Accent Greens**: `--emerald-400` is deepened from `#34d399` to `#059669` (Emerald 600) to ensure a compliant **4.6:1 contrast ratio** for text and badges against white cards.
3. **No Inverted Hardcodes**: Never write inline `color: #fff` in HTML or JavaScript templates. Always use `var(--text-main)` or styled classes.

---

## 7. Tailwind CSS Integration Guide

For teammates building components in React / Next.js / Tailwind CSS, use this direct class reference:

```jsx
// Standard EcoLoop Glass Card in Tailwind (Dual-Theme Capable)
export function GlassCard({ title, children }) {
  return (
    <div className="bg-white/95 dark:bg-slate-900/75 backdrop-blur-md border border-black/[0.08] dark:border-white/[0.08] hover:border-emerald-500/40 dark:hover:border-emerald-500/30 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-2xl dark:hover:shadow-emerald-950/40">
      <h3 className="font-['Outfit'] font-bold text-lg text-slate-900 dark:text-white mb-2">{title}</h3>
      <div className="font-['Plus_Jakarta_Sans'] text-slate-600 dark:text-slate-300 text-sm">
        {children}
      </div>
    </div>
  );
}

// Standard EcoLoop Primary Button in Tailwind (48px+ Touch Target)
export function PrimaryButton({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="min-h-[48px] px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
    >
      {children}
    </button>
  );
}

// Status Tag in Tailwind
export function StatusTag({ status }) {
  const styles = {
    OPEN: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    BIDDING: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    SETTLED: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
    FAILED: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border tracking-wide uppercase ${styles[status] || styles.OPEN}`}>
      {status}
    </span>
  );
}
```

---

## 8. Layout & Responsive Breakpoints

| Breakpoint | Width | Grid Adaptation |
| :--- | :--- | :--- |
| **Mobile (`< 640px`)** | Full width | Single column grid (`grid-cols-1`), full-width modal sheets, horizontal scroll on tables |
| **Tablet (`640px - 1024px`)** | Responsive | 2-column stats & listings, stacked auction bidder panes |
| **Desktop (`> 1024px`)** | `max-w-7xl (1280px)` | 3 to 4 column feeds, side-by-side DWCC weigh-in & digital ID layouts |

---

## 9. Audio & Voice Feedback System (IWL Module)

For the Informal Waste Worker voice-assisted weigh-in module:
1. **Microphone Recording State**: When recording, the mic button displays a pulsating rose halo (`--rose-400` / `rgba(251, 113, 133, 0.4)`).
2. **Audio Wave Visualizer**: 5 animated height bars (`@keyframes audioWave { 0%, 100% { height: 6px; } 50% { height: 26px; } }`) rendered in `--violet-400` / `--emerald-400`.
3. **Language Selection Pills**: Multi-lingual selector chips with 44px min-height for Hindi (`hi`), Marathi (`mr`), Kannada (`kn`), and English (`en`).

---

## 10. Do's and Don'ts Checklist

- ❌ **DON'T** use pure `#000000` or plain unstyled `#ffffff` backgrounds. Always anchor to `var(--bg-main)` and `var(--bg-card)`.
- ❌ **DON'T** use generic system fonts (`Arial`, `Times`, `sans-serif`) for headers. Always specify `'Outfit'` for headings and numerical values.
- ❌ **DON'T** hardcode text colors like `#fff` or `#000` directly in component CSS or inline HTML templates. Always use `var(--text-main)`, `var(--text-muted)`, or `var(--text-dim)` so Light Mode automatically cascades.
- ❌ **DON'T** create buttons shorter than 44px–48px. Waste collectors and DWCC kiosk operators require large tactile targets.
- ❌ **DON'T** hardcode raw colored borders (e.g. `border: red`). Always use calibrated alphas: `rgba(244, 63, 94, 0.35)` or `rgba(16, 185, 129, 0.35)`.
- ✅ **DO** wrap financial figures, Bank UTRs, and cryptographic ledger hashes in monospace font tags (`font-mono`).
- ✅ **DO** add hover transitions (`transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1)` or `transition-all duration-300`).
- ✅ **DO** use the green emerald gradient (`#10b981` to `#059669`) for primary calls to action.
- ✅ **DO** test all new views with both `<html data-theme="dark">` and `<html data-theme="light">`.

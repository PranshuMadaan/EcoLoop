# EcoLoop — Stitch UI Redesign Prompt Pack

**How to use this file:**

1. Go to **stitch.withgoogle.com** and sign in with Google.
2. Start with **Prompt 0 (Global Theme)** — generate it first. Stitch applies a consistent look when you reference the same theme description in every later prompt. Every prompt below already includes the theme block pasted at the end, so you can copy-paste them as-is.
3. Generate one screen per prompt, in the order given. For each screen, if the first result is close but not exact, use Stitch's follow-up chat: "make the header shorter", "use a 3-column grid for the cards", etc. Iterate before moving on.
4. Set mode to **Web** for prompts marked 💻, **Mobile** for those marked 📱.
5. Export each finished screen as **HTML/Tailwind code** (the `</>` code tab).
6. Save the exports into a folder **`stitch-exports/`** in the repo root, one file per screen, named as listed in each prompt (e.g. `stitch-exports/01-marketplace-home.html`).
7. When all (or any subset of) screens are exported, come back to me and I will implement them into the codebase — porting to React/Vite where needed and wiring up all the real API calls, keeping every existing feature.

---

## Design Direction (what changed and why)

The old UI was a dark "cyber-industrial neon" theme — glassmorphic panels, glow effects, emerald-on-obsidian. It read as a hackathon demo. The new direction is a **clean civic-tech product UI**: light-first, high-trust, data-dense but calm — closer to Stripe / Linear / Modern Treasury. Key moves:

- **Light theme by default** with a real dark mode; warm neutral surfaces, no glassmorphism, no glow.
- **One accent: a deep forest green** (#166534 family) plus a supporting amber for in-progress states. No cyan/violet/rose rainbow.
- **Typography:** Inter (or Geist) throughout, tabular numerals for all money/weight data; a mono face (JetBrains Mono) reserved for hashes and transaction IDs.
- **Density:** compact rows, real tables, visible data — it should look like a tool people use daily, not a landing page.

If you'd rather have a different mood (e.g. keep dark-first, or a warmer "Indian civic" feel with saffron accents), edit the Global Theme block once before generating — consistency matters more than the specific palette.

---

## Prompt 0 — Global Theme 💻 (generate this first, keep it saved)

```
Design system for "EcoLoop", a civic-tech platform for municipal waste
recycling and a B2B scrap marketplace in India.

Style: modern, clean, professional SaaS product UI. Light-first with soft
warm neutral backgrounds (#FAFAF9 stone), white cards with subtle 1px
borders (#E7E5E4) and very soft shadows. NO glassmorphism, NO neon glows,
NO gradients on surfaces. Rounded corners 10-12px. Generous but efficient
whitespace, data-dense layouts.

Colors:
- Primary accent: deep forest green #166534 (buttons, links, active states),
  hover #14532D, light tint background #F0FDF4.
- Secondary: amber #D97706 with tint #FFFBEB for "in progress" states
  (open auctions, pending escrow).
- Neutrals: stone scale, text #1C1917 primary, #78716C secondary.
- Status colors: green #16A34A = success/settled, amber #D97706 = bidding,
  neutral gray #57534E = sold/closed, red #DC2626 = error/reversed.

Typography: Inter for everything. Bold 600-700 headings, tight tracking.
All monetary amounts and weights in tabular-nums. Monospace (JetBrains
Mono) only for certificate hashes and transaction reference IDs.

Components: sticky top navigation bar, white breadcrumb header, compact
data tables with 40px rows and hairline dividers, pill-shaped status
badges, primary buttons solid deep green with white text, secondary
buttons white with gray border. Small uppercase 11px letter-spaced labels
above data values.
```

---

## A. Core Product — `frontend/` (the real marketplace SPA)

### Prompt 1 — 💻 Marketplace Home → `01-marketplace-home.html`

```
Design the main marketplace dashboard screen for EcoLoop, a B2B scrap
marketplace where municipal sellers list scrap lots and recyclers bid.

Layout, top to bottom:
1. Sticky white top nav: logo "EcoLoop" (small green leaf icon), center
   nav links: Marketplace, Live Auctions, EPR Audit, Payouts. Right side:
   green outlined "Post Scrap Lot" button, a user avatar chip showing
   "Attero Recycling" with a dropdown arrow, and a small green dot
   "API Live" status badge.
2. Page header: "Marketplace" title with subtitle "Verified scrap lots
   from municipal bodies and DWCCs across India", and on the right two
   dropdown filter selects: "Material: All" and "Status: Open".
3. A row of 4 compact stat cards: "Open Lots 5", "Live Bids 12",
   "Escrow Funded ₹18.2L", "Avg. Bid Uplift 8.4%". Small uppercase labels,
   large tabular-num values.
4. A grid of 6 listing cards (3 columns, 2 rows). Each card: top row with
   a pill badge (green "OPEN" or amber "BIDDING") and a small gray text
   lot number "MSTC-2026-09"; title like "PET Flakes — 12,500 kg";
   origin line "MCD MRF Dwarka · New Delhi" with a small pin icon; a
   divider; 3-column mini stats: "Reserve ₹4,37,500", "Weight 12.5 MT",
   "Top Bid ₹4,45,000"; footer row with seller name "BBMP Ward 150" +
   tiny verified checkmark, and a solid green "Bid Now" button. One card
   shows gray "SOLD" badge with muted styling and no button.
5. Footer: thin, single line, "EcoLoop — circular economy infrastructure
   · CPCB registered recyclers only".

Clean light theme, professional, data-dense but calm.
```

### Prompt 2 — 💻 Listing Detail / Live Auction → `02-listing-detail.html`

```
Design a scrap lot detail page for EcoLoop's B2B marketplace. It is a
live auction page.

Layout:
1. Same sticky white top nav as the EcoLoop marketplace, "Live Auctions"
   tab active.
2. Breadcrumb: Marketplace / PET Flakes — Lot MSTC-2026-09.
3. Two-column layout. Left column (widest):
   - Header block: pill badge amber "BIDDING", large title "PET Flakes —
     Baled", lot number and origin in gray subtitle, and on the right a
     countdown chip "Closes in 01:42:07" with a small clock icon.
   - A spec table (2 columns of key-value rows): Material PET, Weight
     12,500 kg, Reserve price ₹4,37,500, Origin "MCD MRF Dwarka, New
     Delhi", Lab purity 88.4%, Moisture <3%, Contamination 1.6%, Density
     340 kg/m³.
   - Below it a "Bid history" table: columns Bidder (company name with
     small avatar initials), Bid amount (₹/kg and total), Time, Status
     pill. 5 rows, highest bid on top with green "HIGHEST" pill, amounts
     in tabular-nums.
4. Right column (sticky sidebar, white card):
   - "Current highest bid" block: large ₹4,45,000 in bold tabular-nums,
     below it "₹35.60 / kg" gray, and "by Attero Recycling" with avatar.
   - "Place your bid" form: one input with rupee prefix showing total
     amount, a helper line "Minimum: ₹4,45,001", and a full-width solid
     green button "Place Bid".
   - A divider, then an "Escrow requirement" info box with light green
     tint background and small shield icon: "Your escrow deposit must
     cover your bid amount before the seller can accept. Fund escrow
     after bidding." with a small text link "How escrow works".
   - Seller card at bottom: "Listed by BBMP Ward 150, Bengaluru" with
     government building icon and a "Verified ULB" gray pill.

Light theme, professional auction tool feel.
```

### Prompt 3 — 💻 Escrow / Payment Rails → `03-escrow-payment.html`

```
Design an "Fund Escrow" page for EcoLoop, a B2B scrap marketplace. The
recycler must deposit money into escrow before their bid can be accepted.

Layout:
1. EcoLoop top nav, breadcrumb: Live Auctions / PET Flakes Lot-09 / Fund
   Escrow.
2. A centered narrow column (max 640px) white card, titled "Fund escrow
   for Lot MSTC-2026-09", subtitle "Deposit ₹4,45,000 to the EcoLoop
   escrow account. Funds are released to the seller only when you win."
3. Tab selector with 3 options side by side: "UPI Intent", "Scan QR",
   "Bank Transfer (RTGS/NEFT)". Show the UPI Intent tab active with:
   - A big amount display "₹4,45,000.00" in tabular nums.
   - A green tinted info box showing the payment reference number
     "ECOP1A2B3C4D5E" in monospace with a copy icon button.
   - A solid green button "Open UPI App to Pay ₹4,45,000" with a small
     external-link icon.
   - Below, a note: "Works with GPay, PhonePe, Paytm and any UPI app.
     15 minute validity." with a small countdown "Expires in 12:41".
4. Below the tabs, a "Deposit status" timeline with 3 steps connected by
   a vertical line: step 1 "Deposit created" done (green check), step 2
   "Bank confirmation" current (pulsing amber dot, label "Waiting for
   bank webhook…"), step 3 "Escrow funded" upcoming (gray circle).
5. Under the timeline, a muted button "I've paid — simulate bank
   confirmation" (this is a sandbox demo).

Clean, trustworthy fintech aesthetic, like a modern payment checkout.
```

### Prompt 4 — 💻 Settlement Receipt & EPR Certificate → `04-settlement-epr.html`

```
Design a "Settlement complete" page for EcoLoop B2B marketplace shown
right after a scrap lot sale is finalized.

Layout:
1. EcoLoop top nav, breadcrumb Marketplace / Lot MSTC-2026-04.
2. Centered column (max 720px):
   - A success header: green circle with white checkmark, title "Lot
     settled — ₹1,50,000 paid to BBMP Ward 150", subtitle "Paper
     Occidental — 9,500 kg · accepted bid by Attero Recycling".
   - A "Payment split" card: 3 rows in a small table — "Seller net
     (98.5%) ₹1,47,750.00", "Platform fee (1.0%) ₹1,500.00", "Welfare
     levy (0.5%) ₹750.00" — with a bold divider row "Total ₹1,50,000.00".
     All tabular-nums. Next to it a small receipt metadata column:
     "UPI Ref UPI-TXN-8842…", "Bank RRN 4210…", monospace, with copy
     icons.
   - A "CPCB EPR Certificate" card with a distinct light green border:
     header row "EPR Token Minted" with a green verified badge icon;
     certificate hash in full-width monospace box with copy button
     "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
     details grid: Material Paper, Verified weight 9.500 MT, Recycler
     Attero Recycling, Issued 25 Oct 2026; footer link "View public
     verification page →" and a second link "Download PDF →".
3. Bottom of page: two side-by-side buttons — solid green "View payout
   ledger" and outlined "Back to marketplace".

Professional, like a Stripe payment success page but with the
certificate block feeling official.
```

### Prompt 5 — 💻 Payouts Ledger → `05-payouts-ledger.html`

```
Design a "Payouts" audit ledger page for EcoLoop B2B marketplace. This is
the municipal admin (ULB) view of every seller settlement.

Layout:
1. EcoLoop top nav, "Payouts" tab active.
2. Page header: title "Payouts Ledger", subtitle "Every settlement, with
   the 98.5 / 1.0 / 0.5 split visible", right side: a status filter
   select "Status: All" and a date range picker chip "Oct 2026".
3. A row of 3 summary stat cards: "Total settled ₹42.8L", "Seller payouts
   ₹42.2L", "Welfare reserve ₹21,400".
4. A full-width data table, 40px compact rows, hairline dividers:
   Columns: Lot (lot number + material name stacked), Seller, Gross
   Amount, Seller Net, Platform Fee, Welfare Levy, UPI Ref (monospace,
   truncated), Status (pill: green "SUCCESS", gray "REVERSED", amber
   "PENDING"), and an overflow "⋯" action menu.
   8 rows of realistic Indian scrap data (PET, HDPE, E-Waste, Paper,
   Metal lots; sellers like MCD MRF Dwarka, IOCL Panipat, Western
   Railway). One row has red "REVERSED" status with its amount struck
   through.
5. Footer row of the table: "Showing 8 of 128 settlements · 50 per page"
   with Previous / Next pagination buttons.

Dense, tabular-nums everywhere, like a modern finance back-office tool.
```

### Prompt 6 — 💻 Seller Onboarding / UPI Verification → `06-seller-onboarding.html`

```
Design a "Seller Onboarding" modal-style page for EcoLoop B2B
marketplace: registering a new scrap seller (a municipal body or waste
collector) with UPI bank verification.

Layout:
1. EcoLoop top nav.
2. Centered card (max 560px) titled "Register a seller", with a small
   step indicator on top: "1. Details" (active, green) → "2. Bank
   verification" → "3. Done".
3. Form fields stacked with 14px labels: a segmented role selector with
   2 options "DWCC / Municipal" and "Individual Picker" (first active);
   text input "Organization name" showing "MCD MRF Dwarka"; text input
   with +91 prefix "Mobile number" showing "+91 98765 43220"; password
   field "Set password"; optional gray-outlined input "CPCB registration
   no. (recyclers only)".
4. A visually separated section at the bottom with light green tint
   background titled "Settlement account (UPI)": input "UPI ID" showing
   "mc.dwarka@sbi" and to its right an outlined green button "Verify".
   Below it a verification result card: green check icon, "Account
   verified", and 3 rows of small text: "Holder: MUNICIPAL CORPORATION
   DWARKA", "Bank: State Bank of India", "IFSC prefix: SBIN" — with a
   tiny gray note "Verified via ₹1 reverse penny-drop".
5. Footer of card: full-width solid green button "Create seller account".

Clean onboarding flow, like a modern fintech KYC form.
```

---

## B. Static Portals

### Prompt 7 — 💻 Landing / Command Center → `07-landing.html`

```
Design the public landing page for "EcoLoop", a municipal waste
recycling platform serving Pune, India. Audience: city officials.

Style: light civic-tech. Cream/stone background, deep forest green
accent, one large serif display font for the hero headline (like Fraunces
or Source Serif), Inter for everything else. Subtle topographic map line
pattern in the background at very low opacity.

Layout, top to bottom:
1. Sticky nav: "EcoLoop" logo with leaf icon, links: Route Optimizer,
   Marketplace, Worker Ledger, Citizen Portal. Right: outlined "Sign in"
   and solid green "Open Command Center" buttons. Below the nav a thin
   announcement strip: "Live in Pune Municipal Corporation, Ward 14 —
   Shivajinagar" with a small pulse dot.
2. Hero, left-aligned: small uppercase label "MUNICIPAL SOLID WASTE
   PLATFORM"; huge serif headline "The ward's waste, priced and routed
   honestly."; one paragraph: "EcoLoop connects informal waste pickers,
   municipal counters and CPCB-registered recyclers on one rate card —
   no middlemen."; two buttons: solid green "Enter Command Center" and
   outlined "See how it works". Right side of hero: a clean illustration
   or abstract graphic of a circular loop of waste flowing to industry.
3. A horizontal ticker strip (light green tint bar): "PET ₹28.50/kg ·
   HDPE ₹34.00/kg · E-Waste PCB ₹450/kg · OCC ₹12.00/kg · CPCB EPR token
   ₹2,150/MT" repeating.
4. Stats band: 4 numbers in a row with big tabular figures and small
   uppercase labels: "3,420 kg diverted this month", "48 green workers
   onboarded", "27% fleet distance saved", "₹1.2L paid directly to
   pickers".
5. "Three engines" section: 3 equal cards each with a small icon, title
   and 2-line description and a text link: "Route Optimizer — CVRP
   routing for collection fleets", "B2B Marketplace — auction scrap
   lots to verified recyclers", "Worker Ledger — instant, honest pay
   for informal pickers".
6. Simple footer: portal links and "Built for Pune Municipal
   Corporation · Mitsui & Co. problem track".

Calm, institutional, trustworthy. No dark mode, no neon.
```

### Prompt 8 — 💻 Login → `08-login.html`

```
Design a login page for EcoLoop, a civic waste platform in Pune, India.

Layout: split screen. Left half: brand panel on a deep forest green
(#14532D) background with a subtle leaf/loop line pattern — "EcoLoop"
logo in white, one line "Ward 14 · Pune Municipal Corporation", and 3
small trust bullets in white with icons: "Aadhaar-safe OTP login",
"DPDP compliant", "Used by 850 citizens in Ward 14". Right half: white
login card on stone background.

The card:
1. A segmented control with 2 tabs: "Citizen" (active) and "Municipal
   Officer".
2. Citizen flow visible: label "Mobile number", an input with "+91"
   prefix showing "98765 43210", and a solid green button "Send OTP".
3. Below it, the OTP step shown in an entered state: label "Enter the
   6-digit code sent to +91 98765 43210", 6 square OTP boxes (filled:
   1 2 3 4 5 6), a gray "Resend in 00:23" countdown, and a green button
   "Verify & Sign In".
4. Language switcher pills at top right of the card: English · हिंदी ·
   मराठी.
5. At the bottom, a small gray demo hint box: "Demo: any mobile number,
   OTP 123456".

Show the municipal officer tab as an inactive label only — design just
the citizen state. Clean, warm, trustworthy, generous spacing.
```

### Prompt 9 — 💻 Citizen Dashboard → `09-citizen-dashboard.html`

```
Design the citizen dashboard for EcoLoop, shown to a household citizen
in Pune after login. Light theme, friendly but not childish.

Layout:
1. White top nav: EcoLoop logo, right side: language pills "EN हिं मरा",
   a theme toggle icon, and avatar chip "Arjun K."
2. Greeting header row: "Good afternoon, Arjun" with subtitle "Ward 14 ·
   Shivajinagar · Citizen #PMC-W14-AK-0342", and 3 small pill badges:
   green "Pickup active", amber "2 vouchers expiring", neutral "147
   credits".
3. Grid, 2 columns (left wider):
   Left column:
   - A "Your pickup" card: driver row with circular avatar initials
     "RK", name "Ramesh Kale", rating "★ 4.92", vehicle "EV Tricycle
     MH-12-EQ-8842", a green outlined "Call" button with phone icon;
     below it a map placeholder area (light beige with a simple dashed
     route line and 2 markers: home icon and scooter icon) with an ETA
     pill overlay "ETA 12 min · 0.8 km".
   - A "Credit history" card: 4 compact ledger rows with icon, label,
     and +/- amounts in tabular-nums: "Pickup completed +6", "Voucher
     redeemed −100", "Segregation bonus +4", "Missed pickup −2".
   Right column:
   - A "Green Credit Score" card: large ring gauge showing 78/100 in
     green with the score centered, below it tier chip "Emerald tier" +
     "Ward rank #12 of 850", and 3 thin progress bars: "Pickup
     compliance 94%", "Segregation quality 82%", "Schedule adherence
     68%".
   - A "Redeem credits" card: 3 compact voucher rows (brand logo
     placeholder square, name "Amazon Pay ₹50", cost chip "50 cr",
     green "Redeem" button), one row disabled/gray "Croma ₹250 — 200
     cr (locked)".
4. Bottom mobile-style tab bar (this is also responsive): Home, Driver,
   Credits, Rewards, Help.

Warm light theme, soft shadows, rounded 12px cards, green accent only.
```

### Prompt 10 — 💻 Municipal Portal → `10-municipal-portal.html`

```
Design the internal portal for a municipal officer of EcoLoop (Pune
Municipal Corporation). This officer plans collection routes, sells dry
waste to recyclers, and manages the informal worker ledger.

Layout:
1. White sidebar (240px, collapsible): EcoLoop logo, nav items with
   icons — "Overview" (active, green tint background), "Collection
   Routes", "Direct Sales", "Worker Ledger", "Rate Card", "Settings".
   Bottom: officer chip "Dr. S. Deshmukh · Ward 14".
2. Main area, stone background:
   - Page header: "Overview — Ward 14, Shivajinagar" with date chip
     "Sat, 25 Oct" and green button "Plan today's routes".
   - 4 stat cards in a row: "Tonnage today 8.2 MT", "Active routes 4",
     "Counter sales ₹18,450", "Workers paid this week 32".
   - Two-panel section:
     Left: "Live collection routes" card with a simple light map
     placeholder showing 3 colored route polylines (green, amber,
     gray) with truck icons, and a small legend.
     Right: "Today's counter sales" card — a compact table: Time,
     Worker, Material, Weight, Paid, Mode. 5 rows (e.g. "10:12 ·
     Bhagwan Das · PET · 12.5 kg · ₹350 · Cash"), with a highlighted
     final column showing the "middleman uplift" per sale in green
     (+₹125).
   - Below: a wide "Worker ledger balances" card: table with Worker ID
     (ECO-4F2A91 style codes in monospace), Name, Ward, Lifetime kg,
     Lifetime paid, Uplift delivered, and a green "Pay all owed"
     button in the header.

Institutional dashboard, dense tables, light theme, green accent.
```

### Prompt 11 — 📱 Worker Ledger App → `11-worker-ledger-mobile.html`

```
Design a mobile app screen for "EcoLoop Worker" — the digital ledger app
for informal waste pickers in India. Users may have low literacy: big
touch targets, large numbers, minimal text, icons everywhere.

Single phone screen (390px wide), light theme:
1. Status area: small header with "EcoLoop" leaf logo and a language
   toggle "EN | मरा".
2. Earnings hero card (green tint background): label "TODAY'S EARNINGS",
   huge "₹680" in bold tabular-nums, small line "+₹180 more than the
   scrap dealer would pay" with a small up-arrow icon.
3. A "Weigh-in" card, the main action: large weight display "14.8 kg"
   centered, with a row of 3 big round buttons below: "−", "Tare", "+";
   a material selector as a horizontal scroll of 4 big chips with icons:
   "PET ₹28.5", "HDPE ₹34", "Paper ₹14", "E-Waste ₹65" (PET selected,
   green outline).
4. A payout equation strip in a gray box: "14.8 kg × ₹28.50 = ₹421.80",
   and a big solid green full-width button "Get paid via UPI" with the
   UPI logo placeholder.
5. Recent activity list: 3 rows with icon, "Household QR scan — Flat
   402" + time, and points "+15" / "Weigh-in PET 6.2 kg" + "₹176.70" /
   "Grade A audit" + "+15".
6. Bottom tab bar with 4 big icons: Weigh (active green), Jobs, Rates,
   Profile.

Friendly, high-contrast, large type, generous touch targets, no
clutter.
```

### Prompt 12 — 💻 Waste Segregation Classifier → `12-waste-classifier.html`

```
Design a web page for "EcoLoop Sort" — a photo-based AI waste
classification tool for citizens and DWCC workers in India.

Layout:
1. White nav: EcoLoop logo, right side a connection status pill
   "Model connected" with green dot.
2. Compact hero: title "Snap it. Sort it. Done.", subtitle "Photograph
   any waste item — the model tells you the bin, the category and the
   approximate value."
3. Main two-column layout:
   Left (upload zone): a large dashed-border drop area with an upload
   cloud icon, text "Drag photos here or click to upload", subtext
   "Up to 32 images · JPG/PNG · camera capture supported"; below it two
   buttons: solid green "Classify photos" and outlined "Use camera".
   Right (results): 3 result cards stacked, each with a small thumbnail
   placeholder, item label "Plastic bottle", a confidence ring gauge
   "94%", a bin assignment chip with color: green chip "Dry / Recyclable
   bin", and a thin top-3 bar breakdown ("PET 94% · HDPE 4% · Other
   2%"). One card shows a warning state: amber chip "Needs manual check
   — confidence 41%".
4. A collapsible "Model connection" details section at the bottom: two
   inputs "Classifier API URL" (placeholder http://localhost:8000) and
   "API key (optional)", and a "Test connection" button.
5. A small horizontal bin guide strip: 4 color-coded bins with icons —
   Green "Dry / Recyclable", Brown "Wet / Organic", Red "Hazardous",
   Gray "Reject".

Light, clean utility feel.
```

---

## C. Route Optimizer (React app — `ecoloop-app/`)

### Prompt 13 — 💻 Route Optimizer App → `13-route-optimizer.html`

```
Design the main screen of EcoLoop's fleet route optimizer for a
municipal collection fleet (Patiala, India). This is a full-screen map
tool with a left control panel.

Layout:
1. Top bar (white, 56px): EcoLoop logo, title "Route Optimizer —
   Patiala Ward", and on the right a green dot "C++ engine connected"
   badge plus a solid green button "Optimize Fleet Route" with a
   route icon.
2. Left panel (360px, white, scrollable), sections:
   - "Active fleet" card: one vehicle row "Truck PB-01" with 4 small
     capacity number inputs labeled Organic / Dry / Hazardous / Other
     (values 1000/1000/200/1000, kg), each with a tiny label above.
   - "Depot intake" card: two inputs "Worker ID" (W-102) and "Deposit
     kg" (15.0) and a small outlined button "Log deposit" — subtitle
     "For workers who drop waste at the depot without a phone".
   - "Collection points" card: a header with count chip "5 stops" and
     hint text "Click the map to add a stop"; then 5 compact stop rows,
     each showing a numbered circle (0 = green "DEPOT", others 1-4
     gray), stop name ("Model Town", "Leela Bhawan", "Urban Estate
     Ph-II", "Tripuri Road"), and two tiny inputs for organic/dry kg.
     Each row has a "⋯" delete affordance.
3. Right area: a full-bleed light-style street map (beige/white tiles)
   of a mid-size Indian city with: a green warehouse icon at the depot,
   4 numbered pin markers at stops, and a thick green polyline showing
   the optimized route order. A floating legend chip bottom-left:
   "● Depot · 1-4 Collection stops". A floating stats chip top-right:
   "Total 18.4 km · 3 vehicles · 42 min" in a white card.
4. After "optimizing", a slim green banner at the top of the map area:
   "Route optimized — 27% distance saved vs. fixed route" with a
   dismiss X.

Professional mapping tool, like a lightweight logistics SaaS.
```

### Prompt 14 — 💻 IVR Flow Diagram Page (optional) → `14-ivr-console.html`

```
Design an internal "IVR Call Console" page for EcoLoop — used by
municipal staff to understand and test the voice hotline that
phone-less-adjacent waste pickers call to report collections.

Layout:
1. White top nav: "EcoLoop IVR Console", right: green pill "Line live:
   +91 172 XXX 4310".
2. Two columns:
   Left: a vertical flow diagram of the call, drawn as connected rounded
   cards with arrows: "Caller dials in" → "Language? [1] English [2]
   हिंदी" → "Main menu: [1] Report collection · [2] Today's rates · [3]
   My earnings" → "Material? [1] PET [2] HDPE … [8] PP" → "Enter weight
   (* = decimal, # to finish)" → "Confirm? ₹353.75 for 12.5 kg PET" →
   green terminal card "Listing created — enters B2B auction". Two side
   branches in amber: "Not registered → plays rates, points to nearest
   counter" and "No rate published → returns to menu".
   Right: a "Live call simulation" card styled like a phone transcript:
   bubbles alternating "Caller" / "System" showing a real exchange in
   English + Hindi, and below it a 12-key DTMF keypad grid with "1"
   highlighted, plus a small note "* works as decimal point".
3. Bottom strip: a rate table showing official vs middleman rates for 8
   materials with a green "uplift %" column.

Light theme, diagram-centric, clean.
```

---

## Integration notes (for when you come back with exports)

When you've exported screens into `stitch-exports/`, tell me and I will:

1. **`frontend/` SPA** — port the new design into the Vite app (replacing `style.css` and re-marking up `index.html`), keeping 100% of the existing JS logic: auth store, demo login, bid min-price logic, payment rails, EPR verification, payout reversal. No API behaviour changes.
2. **Static portals** — rebuild `index.html`, `login.html`, `user.html`, `ecoloop-municipal.html`, `worker-ledger.html`, `waste-segregation.html` against the new designs, preserving all working JS (Neon client, OTP flow, Leaflet map, i18n dictionaries, classifier fetch logic, theme persistence).
3. **`ecoloop-app/`** — restyle `OptimizerPage.jsx` (Tailwind 4), keeping map, click-to-add-stops, capacity validation, and the C++ `/api/optimize` call intact.
4. **Unify** — one shared token sheet (colors, radii, type scale) extracted from your generated screens and applied everywhere, replacing `DESIGN_SYSTEM.md`.
5. **Visual QA pass** — I'll render and check every page against the generated design before handing it back.

Anything you *don't* generate in Stitch, I can fill in myself in the same visual language, so partial exports are fine — just tell me which screens you made.

# Shameer & Associates — Agent Design & Engineering Guidelines

> **CRITICAL DIRECTIVE FOR ALL AI AGENTS & CODING ASSISTANTS:**
> This repository is a production practice-management CRM for **Shameer & Associates (Accountants and Practitioners)**.
> All UI, component development, styling, and data modeling MUST adhere strictly to the **Apple & Vercel minimal enterprise aesthetic**.
> **NEVER generate generic "AI slop"** (no 3D glossy bubbles/spheres, no rainbow/mesh gradients, no neon borders, no glassmorphism gimmicks, no cartoon bubbly cards, and no off-canvas right drawers).

---

## 1. Practice Identity & Domain Accuracy

* **Firm Legal Identity:** `Shameer & Associates | Accountants and Practitioners` (based in Kerala, India).
* **Firm Leadership:**
  * **Shameer** — *Managing Partner & Senior Practitioner* (Admin)
  * **Ameen** — *Partner & Senior Practitioner* (Admin)
  * **Susmi** — *Audit & Tax Executive* (Staff Employee)
* **NEVER USE "CA Shameer":** The firm practitioners are Accountants and Tax Practitioners, NOT Chartered Accountants. Do not prefix "CA" to any name.
* **Authentic Master Clients (6 Real Entities):**
  1. `Havos (P) Ltd` (`Private Limited` • ITR-6 • Assigned: Ameen)
  2. `KM Traders` (`Partnership` • ITR-5 • Assigned: Susmi)
  3. `Semicolon Innovations` (`LLP` • ITR-5 • Assigned: Ameen)
  4. `Rafeek` (`Proprietorship` • ITR-3 • Assigned: Susmi)
  5. `Jinu & Family` (`Individual` • ITR-2 • Assigned: Ameen)
  6. `Spanish Absolute Parlour` (`Proprietorship` • ITR-4 • Assigned: Susmi)
* **No Cluttered Mock Data:** Do not generate or hardcode fake batches of 120 or 50 items. All counts and metrics must be calculated dynamically (`${clients.length}`).

---

## 2. Strict Design Language: Apple / Vercel Minimalist Standard

The UI is built for senior accountants and tax practitioners working with compliance deadlines, GSTINs, and ledgers all day. Prioritize **clarity, density, typographic restraint, and calm precision**.

### 🚫 Explicit Ban List ("AI Slop" Anti-Patterns)
1. **NO 3D Glossy / Gradient Spheres or Orbs:**
   * Never use glossy, shaded, or spherically gradient dots (e.g. pink, green, or orange shaded 3D balls).
   * Status indicators must be flat, clean, 1.5px/2px hairline badges or subtle flat solid dots (`<StatusDot tone="success" />`).
2. **NO Mesh or Rainbow Gradients:**
   * Avoid multi-color gradients (purple-to-pink, cyan-to-purple, orange-to-magenta).
   * Keep background surfaces calm, solid, and monochromatic.
3. **NO Gimmicky Glassmorphism or Heavy Floating Shadows:**
   * Do not use heavy blurred cards, 3D CSS tilts (`perspective`, `rotateX`), or floating parallax cards.
   * Shadows must be understated and crisp: `shadow-sm` or `shadow-2xl` for modals.
4. **NO Off-Canvas Right-Side Drawers:**
   * Major modals (such as Client Details, New Task, New Ticket, Integrations) must be **dead-centered dialog modals** (`max-w-3xl`, centered on screen with backdrop blur and escape-key dismissal).
   * Right drawers feel cramped and awkward on widescreen desktop monitors.
5. **NO Cartoonish Bubbly Pills or Neon Borders:**
   * Use clean 5px to 8px corner radii (`rounded-[6px]` or `rounded-[8px]`).
   * Avoid 9999px pill shapes for full tables and cards.

---

## 3. Design Tokens & Styling Rules (v2 "Ledger")

All colour is token-driven. Tokens live as RGB channels in `src/index.css` and map to Tailwind utilities in `tailwind.config.js`. A single class is correct in both themes — **never write `dark:` colour pairs or raw hex classes** (`bg-[#…]`, `text-[#…]`). Only the logo swap uses `dark:`.

### Color Foundations
| Token (utility) | Light | Dark | Usage |
| :--- | :--- | :--- | :--- |
| `bg-canvas` | `#F8F8F9` | `#0C0C0E` | App background, sidebar, header |
| `bg-surface` | `#FFFFFF` | `#161619` | Cards, tables, dialogs |
| `bg-subtle` | `#F4F4F6` | `#1D1D21` | Table heads, insets, segmented tracks |
| `bg-hover` | `#EFEFF2` | `#242429` | Row / item hover |
| `bg-muted` | `#E4E4E8` | `#2E2E34` | Avatars, progress tracks |
| `border-line` | `#E6E6EA` | `#27272C` | Hairlines |
| `border-line-strong` | `#D4D4DA` | `#3A3A42` | Input borders |
| `text-fg` | `#18181B` | `#F4F4F5` | Primary text, figures |
| `text-fg-muted` | `#52525B` | `#ACACB4` | Secondary text |
| `text-fg-subtle` | `#71717A` | `#86868F` | Metadata, column heads |
| `text-fg-faint` | `#A1A1AA` | `#5C5C65` | Placeholders, disabled, em-dash |
| `bg-ink` / `text-ink-fg` | `#18181B` | `#F4F4F5` | **Primary buttons** (near-black / near-white) |
| `accent` | `#0066D6` | `#4D9AFF` | Focus rings, links, active nav icon, "info" tone |

### Restrained Semantic Status (Flat, Never 3D)
`success` `#15803D`/`#4AC978` · `warning` `#B45309`/`#F0A83C` · `danger` `#C81E1E`/`#F86460`.
Express status only through the `Badge` (tone + optional dot) and `StatusDot` primitives — tinted at 7–8% fill with a 20% border. Never colour whole rows or KPI numbers.

### Shared Primitives (`src/components/ui`)
Use these instead of hand-rolled markup: `Button` (primary · secondary · ghost · danger · accent; sm h-7 / md h-8 / lg h-9), `IconButton`, `Input`, `Select`, `Textarea`, `Field`, `SearchInput`, `Badge`, `StatusDot`, `Avatar`, `Kbd`, `Card`/`CardHeader`, `PageHeader`, `Metric`/`MetricGrid`, `Segmented`, `Tabs`, `Toolbar`, `TableCard`, `Pagination`, `Menu`, `Modal`, `DescriptionList`, `Progress`, `EmptyState`; helpers `cn`, `formatINR`, `formatDate`, `statusTone`.
Tables use the `.data-table` class (36px head, 44px rows). Copy: sentence case for headings and labels, Title Case for button labels.

---

## 4. Typography & Numerical Formatting

* **Typography & Fonts:**
  * System Font Stack: **SF Pro Text / Inter / -apple-system** (`font-sans`). Restrained, enterprise-grade Apple HIG typography.
  * **Professional Grade Legibility (No Tiny AI Slop Text):**
    * Standard Body & Table Text: `13px` - `14px` (never tiny illegible 9px or 10px).
    * Metadata & Secondary Labels: Minimum `12px` (`text-fg-subtle`).
    * Headers & Titles: `16px` - `24px` with clear typographic hierarchy.
    * Micro-Labels: `11px` - `12px` font-semibold uppercase tracking-wider.
* **Tabular Numerals (`font-mono` or `font-tabular`):**
  * ALWAYS use monospace/tabular numerals for:
    * Currency values (e.g. `₹10,500`)
    * Tax Identifiers (`GSTIN`, `PAN`)
    * Filing Acknowledgments & ARNs (`AA321026048123Z`)
    * Due dates and countdowns (`16 Nov 2026`, `Due in 10d`)
    * Phone numbers (`+91 98470 12345`)

---

## 5. Themes

The CRM strictly supports 2 themes via `data-theme`:
1. **Light** (`light`): neutral zinc canvas (`#F8F8F9`), white surfaces, ink primary actions, blue accent for focus/links.
2. **Dark** (`dark`): `#0C0C0E` canvas, `#161619` surfaces, near-white primary actions, `#4D9AFF` accent.

---

## 6. Component Construction Rules

### Continuous Top Chrome Alignment (Sidebar Brand & Header)
* Both the Sidebar Brand header and the main Header MUST share the EXACT same height: `h-14` (`56px`).
* Both must use `border-b border-line` so the horizontal dividing line forms one unbroken, continuous hairline across the entire screen from left to right.
* All controls in the top-right toolbar (Theme switch, Search bar, User profile button, `+ Add Task` CTA) must share an exact uniform height of `h-8` (`32px`) and `rounded-[6px]`.
* Viewport root must be `h-screen w-screen overflow-hidden flex`, with vertical scrolling strictly contained within `<main className="flex-1 overflow-y-auto">`, preventing browser scrollbars from ever appearing adjacent to the top header chrome.

### Centered Modals (Dialogs)
* Always use the `Modal` primitive (`src/components/ui`): centred, `max-w-md` / `max-w-2xl` / `max-w-3xl`, header + scrollable body + footer, Escape and backdrop-click dismissal, close button labelled `Close dialog`.
* Forms inside a dialog submit through the footer: `<Button type="submit" form="<form-id>">`.
* Dialogs with internal state mount only while open (gate component), so hooks never run conditionally.

### Tables
* Use `<TableCard>` + `<table className="data-table">`. Header: 36px, 11px uppercase `text-fg-subtle` on `bg-subtle`.
* Row: 44px, hover `bg-subtle`. Numbers right-aligned with `.num`; identifiers (GSTIN, PAN, ARN, phone) with `.ident`.
* Actions: Always right-aligned with clear labels (e.g. WhatsApp CTA, View Details).

### OneDrive & Document Repositories
* Always represent authentic accounting files:
  * `.pdf` (Receipts, GSTR-3B acknowledgments, ITR drafts, Bank statements)
  * `.xlsx` (Sales registers, Purchase books, Debtors aging)
  * `.json` (GST portal payloads)
* Display file size, date modified, author, and direct SharePoint/OneDrive link.

---

## 7. Multi-User & Access Rules

1. **Admins (`Shameer` & `Ameen`):**
   * Full access to all modules.
   * Can edit employee accounts, fee ledgers, practice settings, and view the immutable audit trail.
2. **Staff (`Susmi`):**
   * Access to Assigned Work, ITR Filings, GST Tracker, Client Accounts, and Call Desk.
   * Restricted from Employee Management, Firm Settings, and Financial Configurations.

---

## 8. Verification Checklist Before Any Commit
- [ ] No "CA Shameer" anywhere (use "Shameer").
- [ ] No fake 120/50 client clutter; all modules use the 6 authentic clients.
- [ ] No 3D gradient spheres or shiny orbs; all status dots are flat and subtle.
- [ ] Modals are centered (not side drawers).
- [ ] TypeScript compiles cleanly with zero errors (`npm run build`).


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
   * Status indicators must be flat, clean, 1.5px/2px hairline badges or subtle flat solid dots (`w-1.5 h-1.5 rounded-full bg-[#34C759]`).
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

## 3. Design Tokens & Styling Rules

### Color Foundations
| Surface / Role | Light Mode | Dark Mode | Usage |
| :--- | :--- | :--- | :--- |
| **App Canvas** | `#FAFAFA` | `#121214` | Global background |
| **Surface Cards & Modals** | `#FFFFFF` | `#1C1C1E` | Table containers, dialogs, cards |
| **Sub-surfaces & Insets** | `#F2F2F7` | `#242426` | Filter bars, code blocks, input fills |
| **Hairline Borders** | `1px solid #E5E5EA` | `1px solid #2C2C2E` | Subtle dividers and outlines |
| **Subtle Hover Borders** | `#D1D1D6` | `#3A3A3C` | Input borders on hover/focus |
| **Primary Accent** | `#0071E3` (Apple Blue) | `#2997FF` | Primary CTA, active tab, links |
| **Primary Text** | `#1D1D1F` | `#F5F5F7` | Headings, company titles, key metrics |
| **Muted / Secondary Text** | `#6E6E73` | `#8E8E93` | Metadata, subtitles, column headers |
| **Tertiary Micro-labels** | `#86868B` | `#6E6E73` | Eyebrow labels, timestamps |

### Restrained Semantic Status Tints (Flat, Never 3D)
* **Filed / Cleared / Active:**
  * Foreground: `#16A34A` (light) / `#34C759` (dark)
  * Background: `bg-[#16A34A]/10` (light) / `bg-[#34C759]/15` (dark)
  * Border: `border-[#16A34A]/20`
* **Overdue / Critical:**
  * Foreground: `#DC2626` (light) / `#FF453A` (dark)
  * Background: `bg-[#DC2626]/10` (light) / `bg-[#FF453A]/15` (dark)
  * Border: `border-[#DC2626]/20`
* **Due Soon / Pending Review:**
  * Foreground: `#D97706` (light) / `#FF9F0A` (dark)
  * Background: `bg-[#D97706]/10` (light) / `bg-[#FF9F0A]/15` (dark)
  * Border: `border-[#D97706]/20`

---

## 4. Typography & Numerical Formatting

* **Typography & Fonts:**
  * Primary Font: **Figtree** (by Erik Kennedy) / **System Inter** via the global font toggle (`data-font="figtree"` or `data-font="system"`).
  * **Professional Grade Legibility (No Tiny AI Slop Text):**
    * Standard Body & Table Text: `13px` - `14px` (never tiny illegible 9px or 10px).
    * Metadata & Secondary Labels: Minimum `12px` (`text-[#6E6E73]`).
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
1. **Light Minimal** (`light`): Clean Apple / Vercel monochromatic canvas (`#FAFAFA` background, `#FFFFFF` cards, `#0071E3` accent).
2. **Dark Mode** (`dark`): Midnight OLED charcoal (`#121214` canvas, `#1C1C1E` cards, `#2997FF` accent).

---

## 6. Component Construction Rules

### Centered Modals (Dialogs)
* Structure:
  ```tsx
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
    <div className="w-full max-w-3xl max-h-[92vh] bg-white dark:bg-[#1C1C1E] rounded-[12px] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-2xl flex flex-col overflow-hidden">
      {/* Header, Scrollable Body, and Footer */}
    </div>
  </div>
  ```
* Include keyboard support: Close on `Escape` key and click outside.

### Tables
* Header: 36px height, subtle uppercase text, muted grey, 1px bottom border.
* Row: 44px to 52px height, subtle hover background (`hover:bg-[#F2F2F7] dark:hover:bg-[#242426]`).
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


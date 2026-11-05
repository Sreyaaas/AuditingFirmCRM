# Shameer & Associates — Practice Management CRM

> **Firm Legal Identity:** `Shameer & Associates | Accountants and Practitioners`  
> **Headquarters:** Kerala, India  
> **Design Standard:** Apple & Vercel Minimal Enterprise Aesthetic • v2 "Ledger" Design System

A high-density practice management CRM engineered specifically for accounting and tax practitioners handling statutory compliance deadlines, GSTIN verification, ITR-1 through ITR-6 filings, rolling debtors aging ledgers, client call desk tickets, and partner-grade practice administration.

---

## 1. Practice Philosophy & Design Standards

The CRM is designed to replace generic "AI slop" and cluttered enterprise software with calm precision, typographic restraint, and operational speed.

### Core Aesthetic Principles (v2 "Ledger")
* **Zero AI Slop**: No 3D glossy/gradient spheres, no rainbow/mesh gradients, no neon borders, and no gimmicky glassmorphism.
* **Continuous Top Chrome Alignment**: Both the sidebar brand header and main header share an exact uniform height of `56px` (`h-14`) with a continuous hairline divider across the viewport.
* **Centered Dialog Modals**: Major operations (Client Profiles, New Tasks, Payment Collection, Integrations, WhatsApp Dispatch) are rendered as centered dialogs (`max-w-2xl` / `max-w-3xl`) with backdrop blur and `Escape` key dismissal—eliminating cramped right-side drawers.
* **Tabular Numerals & Monospace Identifiers**: All financial sums (`₹`), tax identifiers (`GSTIN`, `PAN`), filing acknowledgments (`ARN`), phone numbers, and dates utilize `font-mono` / `tabular-nums` for effortless scanning.
* **Token-Driven Architecture**: Built upon CSS variables mapped directly to semantic Tailwind utilities. Surfaces, hairlines, and typography adapt automatically between Light (`#F8F8F9`) and Dark (`#0C0C0E`) modes without cluttered `dark:` class pairs.

---

## 2. Shared UI Primitive Library (`src/components/ui`)

All CRM views are constructed using a cohesive set of atomic UI primitives located in `src/components/ui/index.tsx`:

| Component | Description |
| :--- | :--- |
| `Button` / `IconButton` | Standard actions with `primary` (ink), `secondary`, `ghost`, `danger`, and `accent` variants (`sm`, `md`, `lg`). |
| `Field` / `Input` / `Select` / `Textarea` | Accessible form controls with integrated labels, hints, and error states. |
| `SearchInput` | Compact search fields with integrated search icon and shortcut badges. |
| `Badge` / `StatusDot` | Restrained hairline tags and flat semantic status dots (`success`, `warning`, `danger`, `info`, `neutral`). |
| `Metric` / `MetricGrid` | Enterprise KPI tiles with tabular counters, trends, and click actions. |
| `TableCard` | Data table container with standard 36px headers, 44px rows, and subtle hover states. |
| `Modal` | Centered dialog with backdrop blur, keyboard dismissal, and flexible action footers. |
| `Segmented` / `Tabs` | Apple-style segmented toggle switches and underline navigation tab bars. |
| `Pagination` | Table pagination controls with page indicators and responsive navigation. |
| `DescriptionList` | Two-column metadata grid for entity specifications and tax identifiers. |
| `Progress` | Single-color progress track for filing completion rates. |
| `Kbd` | Keyboard shortcut chips (`⌘K`, `Esc`, `Enter`). |

---

## 3. Core Practice Management Modules

### 1. Overview & Practice KPIs (`OverviewStats.tsx`)
* **Real-Time Workload Metrics**: Active clients count, pending monthly returns, debtors balance, and unassigned call desk inquiries.
* **Action Center ("Needs Attention")**: High-priority tasks nearing compliance cutoffs.
* **Statutory Deadlines Timeline**: Upcoming filing milestones with dynamic countdown badges (`Due in 5d`, `Overdue`).

### 2. GST & Audit Compliance Desk (`ComplianceTaskManager.tsx` & `GSTComplianceTracker.tsx`)
* **Monthly Filing Queue**: Comprehensive tracking of recurring compliance obligations (GSTR-1, GSTR-3B, CMP-08, TDS 281 Challans, PF & ESI).
* **Filing State Lifecycle**: Seamless transitions between `Pending` → `In Progress` → `Filed`.
* **Automatic ARN Generation**: Transitioning a return to `Filed` generates a valid statutory acknowledgment reference (`AA32...`).
* **Instant Client Communication**: 1-click WhatsApp dispatch to request books or confirm filing receipts.

### 3. Annual Income Tax Returns (`ITRFilingsManager.tsx`)
* **Statutory Classification (AY 2026–27)**: Entity-accurate return mapping across the master client base:
  * `Havos (P) Ltd` → **ITR-6** (Private Limited Company)
  * `KM Traders` & `Semicolon Innovations` → **ITR-5** (Partnership Firm & LLP)
  * `Rafeek` → **ITR-3** (Proprietorship with Business Income)
  * `Spanish Absolute Parlour` → **ITR-4** (Presumptive Business Scheme)
  * `Jinu & Family` → **ITR-2** (Individual Capital Gains & Other Sources)
* **Tax Calculations**: Computes gross income, deductions, advance taxes paid, and net tax payable or refund receivable.

### 4. Debtors Aging Ledger & Fees (`DebtorsManager.tsx`)
* **Rolling Monthly Aging Buckets**: Real-time outstanding balances categorized across rolling statutory months (August, September, October, November).
* **Closing Balance Formula**: Strict ledger calculation (`Closing = Opening - Received + Billed`) with support for advance credits.
* **Payment Collection Modal**: Record client payments with automatic balance adjustment, payment mode tracking (UPI, Bank Transfer, Cash), and immediate ledger clearance.
* **Fee Notices**: Generate and dispatch WhatsApp payment notices pre-populated with practice bank credentials and UPI ID.
* **Excel Export & Workbook**: Export debtors aging reports directly to formatted `.xlsx` workbooks (`src/utils/debtorWorkbook.ts`).

### 5. Client Master Accounts (`ClientDirectory.tsx` & `ClientDetailDrawer.tsx`)
* **360° Client Dossier**: Legal constitution, PAN, GSTIN, registered address, primary contact details, monthly retainer fees, and assigned staff executive.
* **OneDrive Document Repository**: Structured cloud links to client accounting folders, sales invoices, purchase books, bank statements, and tax acknowledgments.
* **Direct Modals**: Centered dialogs for viewing and updating client master configurations.

### 6. Call Desk & Query Tickets (`StaffTicketDesk.tsx`)
* **Inward Client Inquiries**: Log phone calls, department notices, and tax queries.
* **Ticket Management**: Assign inquiries to staff (Susmi / Ameen / Shameer), set priority levels (`High`, `Medium`, `Normal`), and track resolution progress.
* **Direct Follow-Up**: 1-click WhatsApp modal to follow up directly with the caller.

### 7. Firm Settings & Practice Customization (`PracticeConfigManager.tsx`)
* **Dropdowns & Categories**: Live management of practice options (Filing Types, GST Returns, Entity Types, and Service Catalog).
* **WhatsApp Template Customizer**:
  * Edit templates for *Document Request Reminder*, *Payment & Fee Reminder*, and *Filing Acknowledgment*.
  * Interactive dynamic variable placeholder chips: `{{clientName}}`, `{{period}}`, `{{dueDate}}`, `{{amount}}`, `{{upiId}}`, `{{arn}}`, `{{bankName}}`, `{{accountNumber}}`, `{{ifscCode}}`.
  * Live message preview card for immediate verification.
* **Firm Profile & Bank Accounts**:
  * Configure practice legal identity, address, GSTIN, and PAN.
  * Payment credentials: Beneficiary Name, Bank Name, Account Number, IFSC, and Practice UPI ID (`shameerassociates@okaxis`).
* **Practice Data Backup**: 1-click export of a timestamped snapshot (`shameer_associates_crm_backup_<date>.json`) archiving all clients, tasks, ITR records, debtors ledgers, and activity logs.

### 8. Global Command Palette (`⌘K` / `Ctrl+K`) (`CommandPalette.tsx`)
* Universal search across all 6 master clients, monthly tasks, debtors ledgers, and workflow tabs.
* Keyboard-driven actions with quick access to dark/light theme switching, data sync, and new record creation.

---

## 4. Multi-User Role-Based Access Control (RBAC)

The application enforces strict permission boundaries between firm leadership and staff:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Shameer & Associates Practice Roles                  │
├───────────────────────────────────┬─────────────────────────────────────┤
│ Senior Partners (Shameer & Ameen) │ Staff Employee (Susmi)              │
│ Role: Admin                       │ Role: Employee                      │
├───────────────────────────────────┼─────────────────────────────────────┤
│ • Full practice access            │ • Assigned Monthly Filings          │
│ • Firm Settings & Templates       │ • Assigned ITR Execution            │
│ • Employee & Access Management    │ • Client Accounts Directory         │
│ • Debtors Financial Configurations│ • Call Desk & Inquiry Tickets       │
│ • Cloud Database Sync Controls    │ • Client WhatsApp Reminders         │
│ • Immutable Practice Audit Trail  │ ✗ Restricted from Firm Settings     │
│                                   │ ✗ Restricted from Staff Management  │
│                                   │ ✗ Restricted from Financial Configs │
└───────────────────────────────────┴─────────────────────────────────────┘
```

---

## 5. Technology Stack & Cloud Infrastructure

* **Frontend Framework**: [React 18](https://react.dev/) with [TypeScript 5](https://www.typescriptlang.org/)
* **Build Tool**: [Vite 6](https://vitejs.dev/) (fast HMR and optimized production bundles)
* **Styling**: [Tailwind CSS v3](https://tailwindcss.com/) with semantic CSS variable tokens
* **Iconography**: [Lucide React](https://lucide.dev/) (clean 1.5px / 1.75px enterprise line strokes)
* **Spreadsheet Processing**: [SheetJS (xlsx)](https://docs.sheetjs.com/) for Debtors financial reporting
* **Backend & Cloud Database**: [Supabase](https://supabase.com/) (PostgreSQL with RLS & Edge Functions)
* **Production Security**: Authenticated RLS policies, bcrypt password hashing, and role checks (`001_production_security.sql`)
* **Offline Resilience**: Automatic bidirectional synchronization with `localStorage` fallback
* **Automated E2E Testing**: [Selenium WebDriver](https://www.selenium.dev/) (headless Chrome test runner)

---

## 6. Project Directory Structure

```
c:\WebDevelopment\Audit-company-CRM\
├── .env.example                     # Environment template for Supabase credentials
├── AGENTS.md                        # AI agent & developer guidelines (design rules)
├── README.md                        # Complete practice management CRM documentation
├── index.html                       # HTML root with Google Sans & JetBrains Mono
├── package.json                     # Scripts, dependencies, and project metadata
├── tailwind.config.js               # Semantic theme token utilities
├── supabase/
│   ├── schema.sql                   # Supabase schema with base tables
│   ├── enable_crm_sync.sql          # Bidirectional sync functions
│   ├── functions/
│   │   └── admin-users/index.ts     # Supabase Edge Function for user administration
│   └── migrations/
│       ├── 001_production_security.sql # Authenticated RLS & schema enhancements
│       └── 002_bootstrap_admins.sql    # Partner & staff account bootstrapping
├── tests/
│   └── selenium-crm.cjs             # 14 comprehensive E2E Selenium test suites
└── src/
    ├── main.tsx                     # Application mount point
    ├── App.tsx                      # Root component, routing, and global state
    ├── index.css                    # CSS variable design tokens (v2 "Ledger")
    ├── vite-env.d.ts                # Vite client type definitions
    ├── components/
    │   ├── ui/
    │   │   └── index.tsx            # Shared atomic UI primitives (Buttons, Modals, Tables)
    │   ├── Header.tsx               # 56px top chrome with user profile & search
    │   ├── Sidebar.tsx              # Grouped navigation bar with role guards
    │   ├── OverviewStats.tsx        # Dashboard metrics & deadlines
    │   ├── ComplianceTaskManager.tsx# GST & Audit monthly filing desk
    │   ├── GSTComplianceTracker.tsx # GST status overview & timeline
    │   ├── ITRFilingsManager.tsx    # Annual ITR filings (AY 2026-27)
    │   ├── DebtorsManager.tsx       # Debtors ledger & payment collection
    │   ├── ClientDirectory.tsx      # Master clients directory
    │   ├── ClientDetailDrawer.tsx   # Client 360° profile dialog
    │   ├── StaffTicketDesk.tsx      # Inward calls & ticket management
    │   ├── EmployeeManagement.tsx   # Staff roster & permissions (Admin only)
    │   ├── PracticeConfigManager.tsx# Firm settings, WhatsApp templates, backup
    │   ├── ActivityHistory.tsx      # Practice audit log
    │   ├── CommandPalette.tsx       # ⌘K universal command palette
    │   ├── LoginView.tsx            # Session switcher & authentication portal
    │   ├── WhatsAppModal.tsx        # WhatsApp template dispatch dialog
    │   ├── NewClientModal.tsx       # Master client registration modal
    │   ├── NewTaskModal.tsx         # Filing task creation modal
    │   ├── NewTicketModal.tsx       # Call desk ticket creation modal
    │   └── IntegrationsModal.tsx    # Cloud sync & storage backend status
    ├── data/
    │   ├── mockData.ts              # Authentic master data structures
    │   └── actualClientData.ts      # Authentic firm client records
    ├── services/
    │   ├── authService.ts           # Supabase Auth, session lifecycle & password validation
    │   ├── dbSyncService.ts         # Supabase bidirectional cloud sync service
    │   ├── firmConfigService.ts     # WhatsApp templates & firm profile service
    │   └── supabaseClient.ts        # Supabase client initializer
    ├── types/
    │   └── crm.ts                   # Core TypeScript domain models
    └── utils/
        ├── debtors.ts               # Debtors aging calculation helpers
        ├── debtorWorkbook.ts        # Spreadsheet workbook generators
        └── excelExport.ts           # XLSX file export utilities
```

---

## 7. Getting Started

### Prerequisites
* **Node.js**: v18.x or v20.x or higher
* **npm**: v9.x or higher
* **Google Chrome**: (required for running the Selenium test suite)

### Installation
Clone the repository and install project dependencies:
```bash
git clone https://github.com/Sreyaaas/AuditingFirmCRM.git
cd AuditingFirmCRM
npm install
```

### Environment Configuration
Create a `.env` file in the root directory by copying `.env.example`:
```bash
cp .env.example .env
```
Provide your Supabase credentials (optional for offline mode):
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-api-key-here
```
> **Note:** The CRM includes a resilient offline storage mode. If Supabase credentials are not provided, the application automatically persists all clients, filings, debtors ledgers, and settings to browser `localStorage`.

### Database Setup (Supabase)
To run with a live Supabase backend:
1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Run `supabase/migrations/001_production_security.sql` to apply authenticated Row Level Security.
4. Run `supabase/migrations/002_bootstrap_admins.sql` to seed partner & staff user accounts.

### Development Server
Run the local Vite development server:
```bash
npm run dev
```
The CRM will be available at `http://localhost:3000`.

### Production Build
Compile TypeScript and build the production bundle:
```bash
npm run build
```
Verify the production build locally with:
```bash
npm run preview
```

---

## 8. Automated End-to-End Testing (Selenium)

The application includes an automated test suite verifying all 14 core CRM workflows using headless Google Chrome:

```bash
npm run test:selenium
```

### Test Suite Coverage (`tests/selenium-crm.cjs`)
1. **Test 1: App Launch & Portal Access** — Asserts page title and root element mounting.
2. **Test 2: Multi-User Authentication** — Switches session to *Shameer (Admin)* and confirms workspace initialization.
3. **Test 3: Navigation Workflows** — Cycles through all 9 primary sidebar modules.
4. **Test 4: Client Accounts Directory** — Asserts rendering of authentic master clients.
5. **Test 5: Debtors Financial Aging Ledger** — Confirms rolling monthly aging columns and balance summaries.
6. **Test 6: Top Chrome Alignment** — Verifies `56px` continuous baseline between sidebar brand and header.
7. **Test 7: Dynamic Theme Switching** — Toggles between `light` and `dark` themes and validates `data-theme` attribute.
8. **Test 8: Command Palette (`⌘K`)** — Validates keyboard shortcut trigger, search input focus, and backdrop dismissal.
9. **Test 9: Monthly Filing Lifecycle & ARN** — Updates task status to `Filed` and validates auto-generated ARN (`AA32...`).
10. **Test 10: ITR Statutory Classification** — Asserts exact return forms (`ITR-6`, `ITR-5`, `ITR-4`, `ITR-3`, `ITR-2`) for all 6 entities.
11. **Test 11: Debtors Payment Collection** — Validates rolling months (August–November), tabular currency (`₹`), and payment recording modal.
12. **Test 12: Dialog Centering & Escape Dismissal** — Validates centered modal positioning (no right-side drawers) and `Escape` key closing.
13. **Test 13: Staff Role Governance** — Switches user to *Susmi* and asserts admin-only controls (*Settings*, *Team*, *Database Sync*) are hidden.
14. **Test 14: Tabular Numerals & Monospace Verification** — Validates `font-tabular` and `tabular-nums` formatting across financial figures and GSTINs.

---

## 9. Authentic Master Client Base

The CRM is pre-configured with 6 authentic master entities (no hardcoded fake batches):

| Entity Name | Constitution | Legal Form | Assigned Executive | Location |
| :--- | :--- | :--- | :--- | :--- |
| **Havos (P) Ltd** | Private Limited | ITR-6 | Ameen | Calicut |
| **KM Traders** | Partnership Firm | ITR-5 | Susmi | Kochi |
| **Semicolon Innovations** | LLP | ITR-5 | Ameen | Kochi |
| **Rafeek** | Proprietorship | ITR-3 | Susmi | Calicut |
| **Jinu & Family** | Individual | ITR-2 | Ameen | Kochi |
| **Spanish Absolute Parlour** | Proprietorship | ITR-4 | Susmi | Calicut |

---

## 10. License & Practice Rights

Proprietary practice software developed for **Shameer & Associates | Accountants and Practitioners**. All rights reserved.

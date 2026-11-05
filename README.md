# Practice Management CRM — Shameer & Associates

> A high-density web practice management CRM engineered for accounting and tax practitioners handling statutory compliance deadlines, GST returns, income tax filings (ITR), rolling debtors aging ledgers, client call desk inquiries, and firm administration.

---

## 1. Design & Interface Architecture

The application is built on the **v2 "Ledger" Design System**, following Apple and Vercel minimalist enterprise standards prioritizing dense data presentation, typographic clarity, and operational efficiency.

### Interface Highlights
* **Continuous Top Chrome Baseline**: The sidebar brand header and main navigation header share a uniform `56px` (`h-14`) height with a continuous hairline border across the viewport.
* **Centered Dialog Modals**: Operations such as Client Profiles, Task Management, Payment Recording, and WhatsApp Dispatch open in centered dialogs with backdrop blur and keyboard `Escape` dismissal.
* **Tabular Numerals & Monospace Identifiers**: All currency amounts (`₹`), GSTINs, PANs, filing acknowledgments (ARNs), phone numbers, and dates utilize monospace/tabular numerals (`tabular-nums`) for rapid scanning.
* **Token-Driven CSS System**: Surface, hairline, text, and action colors are powered by RGB CSS variables that automatically adapt between Light (`#F8F8F9`) and Dark (`#0C0C0E`) themes without duplicate color utility classes.

---

## 2. Shared UI Primitive Library (`src/components/ui`)

All views are assembled using atomic, reusable UI components:

| Primitive | Purpose |
| :--- | :--- |
| `Button` / `IconButton` | Primary (ink), secondary, ghost, danger, and accent button actions (`sm`, `md`, `lg`). |
| `Field` / `Input` / `Select` / `Textarea` | Accessible inputs with integrated labels, help text, and error states. |
| `SearchInput` | Compact search bars with integrated search icons and shortcut indicators. |
| `Badge` / `StatusDot` | Hairline tags and flat status indicators (`success`, `warning`, `danger`, `info`, `neutral`). |
| `Metric` / `MetricGrid` | KPI summary cards with tabular numbers, contextual status, and click interactions. |
| `TableCard` | Standardized data tables featuring 36px header bands, 44px data rows, and hover highlights. |
| `Modal` | Centered dialog primitive supporting backdrop dismiss, focus trapping, and action footers. |
| `Segmented` / `Tabs` | Segmented controls and underline tabs for switching workflow states and sub-views. |
| `Pagination` | Responsive pagination bars with item counts and navigation buttons. |
| `DescriptionList` | Two-column key-value specification grids for metadata inspection. |
| `Progress` | Clean single-color progress bars for filing completion metrics. |
| `Kbd` | Keyboard shortcut badges (`⌘K`, `Esc`, `Enter`). |

---

## 3. Application Workflows & Functional Modules

### 1. Overview Dashboard & Practice Metrics
* **KPI Strip**: Instant visibility into active client counts, pending monthly returns, outstanding debtors balances, and open call desk tickets.
* **Action Center**: Prioritized view of immediate obligations requiring practitioner intervention.
* **Statutory Deadlines Timeline**: Chronological countdown to upcoming GST, TDS, and ITR statutory cutoffs (`Due in 5d`, `Overdue`).

### 2. GST & Audit Compliance Queue
* **Monthly Filing Tracking**: Centralized register for recurring compliance obligations, including GSTR-1, GSTR-3B, CMP-08, TDS 281 Challan payments, and PF/ESI filings.
* **Filing State Lifecycle**: Progression workflow from `Docs Pending` → `In Progress` → `Filed`.
* **Automatic ARN Generation**: Transitioning a return to `Filed` status automatically generates a formatted statutory acknowledgment reference (ARN).
* **Direct Client Messaging**: 1-click WhatsApp action to dispatch customized document requests or filing confirmation notices.

### 3. Annual Income Tax Returns (ITR)
* **Form Classification**: Comprehensive support across statutory income tax forms based on business constitution:
  * **ITR-6**: Companies and corporate entities
  * **ITR-5**: Partnership firms, LLPs, and associations
  * **ITR-4**: Presumptive taxation scheme (Sugam)
  * **ITR-3**: Proprietorships and individuals with business/professional income
  * **ITR-2**: Individuals and HUFs with capital gains or foreign income
* **Computation Tracking**: Tracks gross total income, deductions, advance tax paid, and calculates net tax payable or refund due.
* **Assessment Year Support**: Tracks filing status, e-verification stages, and acknowledgment numbers for current and preceding assessment years.

### 4. Debtors Aging Ledger & Fee Management
* **Rolling Monthly Aging Buckets**: Real-time accounts receivable tracking across chronological monthly buckets.
* **Ledger Formula**: Continuous balance calculation adhering to accounting standards:
  $$\text{Closing Balance} = \text{Opening Balance} - \text{Payments Received} + \text{Fees Billed}$$
* **Advance & Credit Tracking**: Explicit support for advance client retainers, partial settlements, and credit balances.
* **Payment Recording Dialog**: Log receipts by mode (UPI, Bank NEFT/RTGS, Cheque, Cash) with immediate closing balance updates.
* **Fee Collection Reminders**: Send WhatsApp fee notices pre-populated with outstanding balances, bank account credentials, and practice UPI ID.
* **Spreadsheet Export**: Export debtors aging schedules and billing registers directly to formatted `.xlsx` files.

### 5. Client Directory & 360° Profiles
* **Master Records**: Centralized registry storing business constitution, PAN, GSTIN, registered address, primary contact info, monthly retainer fees, and assigned staff executive.
* **Document Repository Integration**: Direct links to cloud-hosted accounting folders (SharePoint / OneDrive) for sales books, purchase registers, bank statements, and tax acknowledgments.
* **Centered Modal Inspection**: View and update full client dossiers directly from the directory table.

### 6. Call Desk & Query Tickets
* **Inward Client Call Log**: Record incoming client calls, tax inquiries, department notices, and ad-hoc requests.
* **Ticket Lifecycle**: Assign inquiries to specific team members, assign priority levels (`Urgent`, `High`, `Normal`, `Low`), track turnaround times, and log resolution notes.
* **Client Follow-Up**: Direct WhatsApp trigger to contact clients regarding ticket updates.

### 7. Firm Settings & Practice Administration
* **Configurable Metadata**: Manage dropdown catalogs for Filing Types, GST Returns, Entity Types, and Services.
* **Dynamic WhatsApp Template Editor**:
  * Customize copy for *Document Requests*, *Fee Reminders*, and *Filing Acknowledgments*.
  * Supports dynamic placeholder tokens: `{{clientName}}`, `{{period}}`, `{{dueDate}}`, `{{amount}}`, `{{upiId}}`, `{{arn}}`, `{{bankName}}`, `{{accountNumber}}`, `{{ifscCode}}`.
  * Real-time preview card displaying the rendered message output.
* **Practice Profile & Bank Credentials**: Store firm legal name, address, GSTIN, PAN, and settlement bank/UPI details used across client invoices and notices.
* **1-Click Data Backup**: Export a complete, timestamped JSON archive of all clients, filing tasks, ITR records, debtors ledgers, and activity logs.

### 8. Global Command Palette (`⌘K` / `Ctrl+K`)
* Fast keyboard navigation across all entities, active compliance tasks, financial ledgers, and application tabs.
* Quick-action shortcuts for toggling themes, triggering sync, and creating new tasks or tickets.

---

## 4. Role-Based Access Control (RBAC)

The system enforces permission boundaries between firm administrators and staff executives:

* **Administrators (Managing Partners)**: Full access to all modules, firm settings, billing configurations, staff user administration, database sync controls, and immutable audit logs.
* **Staff Executives**: Focused access to assigned monthly compliance tasks, ITR filings, client directory records, and call desk tickets. Firm settings, staff management, and administrative fee configurations are securely restricted.

---

## 5. Technology Stack & Architecture

* **Frontend**: React 18, TypeScript 5, Vite 6
* **Styling**: Tailwind CSS v3 with custom RGB design tokens
* **Icons**: Lucide React
* **Spreadsheet Engine**: SheetJS (`xlsx`) for Excel ledger generation
* **Backend Database**: Supabase (PostgreSQL with Row Level Security)
* **Authentication**: Supabase Auth with bcrypt password hashing and JWT session management
* **Offline Resilience**: Bidirectional cloud sync with automatic `localStorage` persistence fallback
* **Testing**: Selenium WebDriver (14 automated end-to-end headless Chrome tests)

---

## 6. Project Structure

```
├── .env.example                     # Environment template for Supabase credentials
├── AGENTS.md                        # Engineering & design guidelines
├── README.md                        # Application documentation
├── index.html                       # HTML entry point with system fonts
├── package.json                     # Project dependencies and npm scripts
├── tailwind.config.js               # Semantic theme token utilities
├── supabase/
│   ├── schema.sql                   # Database tables and relations
│   ├── enable_crm_sync.sql          # Bidirectional cloud sync procedures
│   ├── functions/
│   │   └── admin-users/index.ts     # Edge Function for staff user administration
│   └── migrations/
│       ├── 001_production_security.sql # Authenticated RLS policies & enhancements
│       └── 002_bootstrap_admins.sql    # Administrative account seeding
├── tests/
│   └── selenium-crm.cjs             # End-to-end automated test suite
└── src/
    ├── main.tsx                     # React application entry point
    ├── App.tsx                      # Root component, routing, and state orchestration
    ├── index.css                    # CSS variable design tokens
    ├── components/
    │   ├── ui/
    │   │   └── index.tsx            # Shared atomic UI primitives
    │   ├── Header.tsx               # Top navigation chrome & user profile
    │   ├── Sidebar.tsx              # Grouped navigation bar with role guards
    │   ├── OverviewStats.tsx        # Dashboard metrics & deadlines
    │   ├── ComplianceTaskManager.tsx# GST & Audit monthly filing desk
    │   ├── GSTComplianceTracker.tsx # GST status overview & timeline
    │   ├── ITRFilingsManager.tsx    # Annual ITR filings manager
    │   ├── DebtorsManager.tsx       # Debtors ledger & payment collection
    │   ├── ClientDirectory.tsx      # Client directory table
    │   ├── ClientDetailDrawer.tsx   # Client profile modal dialog
    │   ├── StaffTicketDesk.tsx      # Inward query & ticket desk
    │   ├── EmployeeManagement.tsx   # Staff roster & permissions
    │   ├── PracticeConfigManager.tsx# Firm settings, WhatsApp templates, backup
    │   ├── ActivityHistory.tsx      # Practice audit log
    │   ├── CommandPalette.tsx       # ⌘K command palette modal
    │   ├── LoginView.tsx            # Authentication portal & session management
    │   ├── WhatsAppModal.tsx        # WhatsApp template dispatch modal
    │   ├── NewClientModal.tsx       # Client creation modal
    │   ├── NewTaskModal.tsx         # Filing task creation modal
    │   └── NewTicketModal.tsx       # Query ticket creation modal
    ├── services/
    │   ├── authService.ts           # Authentication & session lifecycle
    │   ├── dbSyncService.ts         # Cloud sync service with local persistence
    │   ├── firmConfigService.ts     # Template & practice profile configuration
    │   └── supabaseClient.ts        # Supabase client initializer
    ├── types/
    │   └── crm.ts                   # TypeScript domain models and interfaces
    └── utils/
        ├── debtors.ts               # Debtors ledger calculation helpers
        ├── debtorWorkbook.ts        # Excel workbook generator
        └── excelExport.ts           # Spreadsheet file export utilities
```

---

## 7. Getting Started

### Prerequisites
* **Node.js**: v18.x or higher
* **npm**: v9.x or higher
* **Google Chrome**: (required for Selenium E2E test runs)

### Installation
```bash
git clone https://github.com/Sreyaaas/AuditingFirmCRM.git
cd AuditingFirmCRM
npm install
```

### Environment Configuration
Copy the environment template:
```bash
cp .env.example .env
```
Optionally provide Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-api-key-here
```
> **Offline Mode**: If Supabase credentials are not provided, the CRM operates in local offline mode, persisting all data to `localStorage`.

### Running Locally
```bash
# Start Vite development server (http://localhost:3000)
npm run dev

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 8. Automated End-to-End Testing

Run the automated Selenium test suite:
```bash
npm run test:selenium
```

### Test Coverage (14 Automated Suites)
1. **Application Load**: Verifies document title, assets, and root container mounting.
2. **User Authentication**: Validates session initialization and profile hydration.
3. **Sidebar Navigation**: Verifies routing across all primary workflow tabs.
4. **Client Accounts Directory**: Validates client directory data table rendering and filters.
5. **Debtors Aging Ledger**: Confirms aging columns, summary calculations, and action triggers.
6. **Top Chrome Alignment**: Asserts uniform `56px` continuous baseline across the interface.
7. **Dynamic Theme Switching**: Validates theme toggling between Light and Dark modes.
8. **Command Palette (`⌘K`)**: Validates keyboard shortcut trigger, search filtering, and dismissal.
9. **Filing Lifecycle & ARN**: Tests status update to `Filed` and automatic ARN generation.
10. **ITR Classification**: Asserts correct statutory form classification across entity types.
11. **Debtors Payment Recording**: Tests payment collection modal and balance clearance.
12. **Centered Dialog Positioning**: Verifies modal centering and `Escape` key dismissal.
13. **Staff Role Governance**: Asserts admin-only settings are hidden for staff users.
14. **Tabular Numerals Verification**: Confirms monospace tabular font rendering for financial data.

---

## 9. License

Proprietary software developed for **Shameer & Associates | Accountants and Practitioners**. All rights reserved.

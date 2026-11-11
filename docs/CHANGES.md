# Shameer & Associates CRM — change log and handoff notes

Audience: developers and AI coding agents (Claude, Gemini, …) continuing work on this repository.
Read this together with `AGENTS.md` (design and domain rules) before changing anything.

Last updated: 5 November 2026.

---

## 1. Summary of the production pass

| Area | Before | Now |
| :--- | :--- | :--- |
| Sign-in | Quick-login buttons and self-registration; any email logged in without a password; header let anyone "switch user" | Email + password only, verified by **Supabase Auth**. No sign-up page, no account switching. Forgot-password email flow, change-password dialog, idle auto sign-out |
| Passwords | Not stored or checked | Stored by Supabase Auth as **bcrypt hashes** (one-way). The app never sees or stores them. Admins set passwords through a server-side Edge Function |
| Database access | `enable_crm_sync.sql` let the anonymous key read and write every table | Row Level Security on every table; anonymous role has no access; fee tables gated by per-person permissions; audit trail append-only |
| Data | Large hard-coded seed files shown even when the database was connected | Production reads only from Supabase (empty stays empty). Sample data (≤ 4 rows per section) is used only when no database is configured |
| Debtors | Four hard-coded months (Aug–Nov) | Month-by-month history (any number of months), imported directly from the office Excel workbook |
| Filing references | "Filed" invented random ARN / acknowledgement numbers | Staff enter the real ARN / acknowledgement number |
| Settings | Stored in one browser's localStorage | Stored in Supabase `app_settings` — same on every device |
| UI | Status dots, tinted pills, sync indicators, jargon ("ledger", "practice", "engagement") | Plain coloured status text, neutral tags, no sync bar, plain wording |

---

## 2. One-time setup (must be done before anyone can sign in)

1. **Run the migration.** Supabase Dashboard → SQL Editor → paste and run
   `supabase/migrations/001_production_security.sql`. Safe to re-run.
2. **Turn off public sign-ups.** Dashboard → Authentication → Sign In / Providers →
   disable "Allow new users to sign up". (Defence in depth: new Auth users also start *Inactive*.)
3. **Create the first administrator logins.** Dashboard → Authentication → Users → Add user →
   Create new user, with strong passwords and "Auto Confirm User" ticked. The current
   administrators are `sreyassai7@gmail.com` and `ameenshameer007@gmail.com`.
4. **Make them administrators.** Run `supabase/migrations/002_bootstrap_admins.sql`
   (edit the email list in it to add or change administrators).
4a. **Remove sample rows** left by the original `schema.sql` (placeholder team members,
   six sample clients and debtors): run `supabase/migrations/003_remove_sample_data.sql`.
   It deletes only rows with the fixed sample IDs and never touches real logins or imports.
5. **Deploy the admin function** (needed for Team → Add Member / Set password / Deactivate):
   ```
   npx supabase login
   npx supabase functions deploy admin-users --project-ref <project-ref>
   ```
6. **Set the password-reset redirect.** Dashboard → Authentication → URL Configuration →
   Site URL = the deployed app URL (and add it to Redirect URLs).
7. **Import the debtors workbook.** Sign in as an admin → Debtors → Import Excel →
   choose the office `debtors.xlsx` → review the preview (it lists any rows whose opening
   balance does not match the previous month) → Import.
8. **Fill in firm and bank details.** Settings → Firm & banking. Fee reminders include the
   bank account and UPI ID, which now start empty instead of placeholder numbers.

Environment variables (`.env`, never committed): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
The service-role key is **never** placed in the frontend; Supabase injects it into the Edge Function.

---

## 3. Architecture

```
src/
  App.tsx                     Auth gate, data loading, all mutations (handlers), routing by tab
  services/
    supabaseClient.ts         Client from env vars only; isSupabaseConfigured()
    authService.ts            signIn / signOut / reset / changePassword / admin* (Edge Function)
    dbSyncService.ts          All table reads/writes. Local-only fallback when no database
    firmConfigService.ts      app_settings: firm profile, WhatsApp templates, AppPreferences
  utils/
    debtors.ts                Monthly balance maths: recalcDebtor, applyPayment, applyBilling
    debtorWorkbook.ts         Parser for the office Excel workbook (Debtors + monthly billing sheets)
    excelExport.ts            Export in the same layout, so files round-trip through Import
  data/sampleData.ts          Local-development sample rows only (≤ 4 per section)
  components/ui/index.tsx     Design-system primitives (Button, Badge, Modal, TableCard …)
supabase/
  schema.sql                  Original tables
  migrations/001_production_security.sql   RLS, helper functions, new tables/columns
  migrations/002_bootstrap_admins.sql      Promote the partners to admin
  functions/admin-users/index.ts           Create login / set password / activate-deactivate
```

### Modes
* **Connected** (`VITE_SUPABASE_*` set): login required; data from Supabase only.
* **Sample mode** (variables missing): no login, first sample admin is signed in, a banner says
  "Sample data". Used for UI work and the e2e tests. Never shows real data.

### Auth flow
`App` reads the Supabase session (`getSession` + `onAuthStateChange`). After sign-in it loads all
data, then maps the session to a profile (`profileForSession`: `auth_user_id` → `id` → email).
No profile, or an inactive one → "Your account is not active" screen. `PASSWORD_RECOVERY` events
show `SetNewPasswordView`.

### Permissions (enforced in the database by RLS, mirrored in the UI)
| Capability | Admin | Staff with fee access | Staff |
| :--- | :---: | :---: | :---: |
| Clients, tasks, ITR, GST returns, calls (read/write) | ✓ | ✓ | ✓ |
| Debtors and billing register (read) | ✓ | ✓ | — |
| Record payments / bills | ✓ | if "Record payments" is on | — |
| Import debtors workbook | ✓ | — | — |
| Team, Settings, Audit trail | ✓ | — | — |
| Delete or archive anything | ✓ | — | — |

Per-person toggles live on the Team page; defaults for new staff live in Settings → Access & security.

---

## 4. Data model notes

### Debtors (`DebtorRecord`)
```ts
months: { month: 'YYYY-MM'; opening: number; received: number; billed: number }[]  // oldest first
currentBalance  // closing of the latest month; negative = paid in advance
status          // Pending | Partially Paid | Overdue | Cleared | Advance
agingBucket     // consecutive recent months carrying a balance with no payment
```
* Closing = opening − received + billed. `recalcDebtor` re-derives every opening from the first
  month, so balances stay consistent after any change. Always mutate through
  `applyPayment` / `applyBilling`.
* Stored in `debtor_records.ledger` (JSONB). The legacy `aug_* … nov_*` columns are read only as
  a fallback.
* Payments and bills post to the latest month. To start a new month, import the updated workbook
  (or extend `ensureMonth` usage when a monthly roll-over feature is added).

### Workbook import (`utils/debtorWorkbook.ts`)
* Debtors sheet: header row containing "Client Name"; the row directly above holds month names;
  each month spans Outstanding · Payment cleared · Current billing.
* Billing sheets: any sheet with "Name of Client" and "Professional income" headers; the sheet
  name gives the month.
* "FY 26-27" anywhere in the first rows sets the year (Apr–Dec → 2026, Jan–Mar → 2027).
* Accounts match on client name (case-insensitive); billing rows on `external_id`, so
  re-importing an updated file updates rather than duplicates.
* Verified against the office workbook: month blocks, billing sheets and balances parse correctly.
  Rows whose opening balance does not match the previous month's closing are listed as warnings
  in the import preview.

### Settings (`app_settings` table, keys)
`preferences` (`AppPreferences`: financial year, due-soon windows, WhatsApp country code, invoice
prefix + next number, idle timeout, new-staff fee defaults), `firm_profile`, `whatsapp_templates`.
Dropdown lists remain in `practice_configs`.

---

## 5. UI conventions (summary — full rules in AGENTS.md)
* Use primitives from `src/components/ui`; colours only via tokens (`text-fg-muted`, `bg-surface` …).
* Status = coloured text via `<Badge tone=… dot>` (the `dot` prop now means "status text", no dot is drawn).
  Tags = `<Badge>` without `dot` (neutral outline).
* No status dots, tinted pills, sync/connection indicators or marketing words
  ("ledger", "practice", "engagement", "seamless", "immutable").
* Sentence case for headings and labels; Title Case for button labels.
* Never invent identifiers (ARN, acknowledgement, invoice, GSTIN) or money amounts in code.

---

## 6. Testing
* `npm run build` — type-checks via Vite/TS and builds.
* `npx tsc --noEmit -p .` — type-check only.
* E2E: start the sample-mode server (`VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npm run dev -- --port 3001`,
  or the `crm-local-sample` entry in `.claude/launch.json`), then `npm run test:selenium`.
  Against a real project: `TEST_URL=… TEST_EMAIL=… TEST_PASSWORD=… npm run test:selenium`
  (test 9 changes a task status — use a staging project, not production).

---

## 6a. Delete and archive (admins only)
* Clients: **Archive** (hides from lists, pickers and counts; an Archived tab appears; reversible) or **Delete** (removes the client with its tasks and ITR returns). Debtor accounts are kept.
* Tasks, ITR returns, calls and debtor accounts each have a Delete action behind a confirmation dialog.
* Enforced twice: the UI only receives the `onDelete` / `onArchive` props for admins, and the database policies allow DELETE only for `is_admin()`. A delete that affects 0 rows is reported as an error.
* Every delete or archive is written to the audit trail.

## 6b. Review fixes and design pass (11 Nov 2026)
* **Live app shows real data only.** Sample rows appear only when no database is configured. Empty or failed loads in connected mode return an empty list (with empty states), never sample rows, because edits to sample rows cannot be saved.
* **Sign-out clears cached firm data** from the browser (`clearLocalDataCache`), keeping only theme and settings caches. Important on shared office PCs.
* **Add debtor account:** the opening balance is stored as a single month entry, so recalculation no longer resets it to ₹0; after saving, debtors are reloaded so the row carries its database id (prevents a duplicate-insert error on the next payment); duplicate client names are refused.
* **Overview:** past due dates show "N days overdue" (previously "Due today"); overdue tasks show "Nd overdue" (previously "Due in -Nd"); day counts use the start of today.
* **WhatsApp:** the direct-chat button is labelled "Send to Client" (it opens the client's number, not the staff owner's).
* **Menu:** selected item shows a check, not a dot.
* **Design:** per-person avatar colours (`.av-0` … `.av-7`, stable by name, light/dark aware); KPI progress bars and a receivables ageing bar (`Metric` `progress` / `segments` props); time-of-day greeting; tinted due-date tiles (green done, red overdue, amber soon, accent later); "All caught up" state; accent-tinted active sidebar item and accent tab underline; split-screen login with a firm panel.
* **Tests:** test 7 uses the header theme picker; test 9 matches the portal menu.

## 7. Known gaps / next steps
* Bulk delete, and undo for deletes (use Archive when in doubt).
* `src/utils/whatsapp.ts`: only `sendToGroup` is used; the other helpers are unused.
* Monthly roll-over of debtor accounts (opening a new month without re-importing).
* Clients, tasks and ITR rows still use the original `schema.sql` columns; tasks and ITR require
  a client selected from the Clients list.
* GST returns are stored in the new `gst_returns` table but there is no "add GST return" form yet.
* Staff seen in the billing register (Mathew, Ashik, Ann) do not have logins; add them from Team
  if they should sign in.
* Client documents tab links to the client's SharePoint/OneDrive folder; no file listing.

---

## 8. Earlier changes (v2 UI)
* `48db237` — token-based design system, shared primitives, full page restyle.
* `3a7dd6e` — calmer badges, tags and KPI tiles.
* Resilient sample fallback (`readLocalListOrSeed`) across all database sync routines so Overview, GST & Audit, and ITR Returns properly display records even on initial unseeded/empty database setups.
* Added ITR returns KPI metric and attention items to Overview dashboard.
* Added `+ Add Account` modal dialog to Debtors view matching Apple/Vercel design system.
* Fixed table cell dropdown clipping in `Menu` primitive using React `createPortal` with viewport-aware dynamic positioning, preventing clipping by table containers or row boundaries.
* Added `vercel.json` SPA rewrite rule to ensure client-side routing resolves properly on Vercel deployments.
* Refined WhatsApp messaging workflow: table rows trigger centered preview modal directly; modal footer includes dual-action "Send to Group" and "Send to Owner" along with direct text copy.
* Replaced old light/dark boolean toggle with a 10-theme enterprise system (5 light themes: Classic Zinc, Firm Signature, Warm Parchment, Nordic Sage, Architectural Stone; 5 dark themes: Midnight Zinc, Firm Midnight, Espresso Roast, Forest Night, Pitch OLED). Added a quick-select Palette dropdown in Header toolbar and a 2-column grouped selector in Settings > Preferences.
* Softened the 5 light theme palettes in `src/index.css` by replacing harsh 255 255 255 white card surfaces with harmonized porcelain, iceberg, alabaster, tea-white, and limestone tones.
* Moved theme selection out of company Preferences into a dedicated "Appearance" section at the end of Settings navigation, styled as a compact, responsive 5-column swatch picker without bulky cards.

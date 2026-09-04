# KSJI Commandery Member System — Improvement Wishlist & Roadmap

This wishlist compiles all identified improvements for the **Next.js 15 Web App** and the **React Native / Expo Android App**. Every task is strictly aligned with KSJI constitutional logic (`ksji-logic.ts`), fraternal degrees (Exemplifications), and the repository guidelines (`AGENTS.md`).

---

## Difficulty Legend
- **[Low]**: 1–2 hours. Localized change, isolated function, or configuration cleanup.
- **[Medium]**: Half-day to 1 day. Involves cross-component flow, multi-file refactoring, or state handling.
- **[High]**: 2–3 days. Involves architectural changes, new full screens, or edge function orchestration.

---

## Category 1: Core Data Integrity & Inactive/Deceased Member Filtering

### [x] Task 1.1: Complete Deceased & Inactive Filtering in Billing Engine
- **Platform**: Web / Backend (`web/src/services/financialService.ts`)
- **Difficulty**: [Low]
- **KSJI Logic & Rationale**: Per `AGENTS.md`, deceased members must be permanently preserved in historical archives, while inactive members (`Dismissed` or `Transfer-Out`) are outside active Commandery jurisdiction. Neither group may receive dues bills, rate assessments, or payment reminders.
- **Current State**: `generateAnnualAssessments` filters `.not('status', 'in', '("Dismissed","Transfer-Out","Deceased")')`, but does not select or check `is_deceased !== true`.
- **Target State**: Update query and payload mapping to check `!m.is_deceased` and status in one unified filter. Ensure prior-year arrears rollover excludes deceased members.
- **Acceptance Criteria**: Bills are never generated for any member with `status = 'Deceased'`, `is_deceased = true`, `status = 'Dismissed'`, or `status = 'Transfer-Out'`.

---

### [x] Task 1.2: Fix Status and Eligibility Mismatches in Reminder Edge Function
- **Platform**: Supabase Edge Functions (`supabase/functions/payment-reminders/index.ts`)
- **Difficulty**: [Low]
- **KSJI Logic & Rationale**: The edge function checks `member.status === 'transferred'`, but the KSJI database status is `"Transfer-Out"`. It also omits checking `member.status === 'Deceased'`.
- **Current State**: A member whose record has `status = 'Deceased'` (without `is_deceased` flag) or `status = 'Transfer-Out'` can still receive automated financial reminders.
- **Target State**: Update `isEligibleForFinancialCommunication` to strictly check:
  ```typescript
  const status = (member.status || '').trim().toLowerCase();
  if (['deceased', 'dismissed', 'transfer-out'].includes(status)) return false;
  if (member.is_deceased === true || member.date_of_death) return false;
  ```
- **Acceptance Criteria**: Dry run or execution logs confirm zero emails dispatched to `Deceased`, `Dismissed`, or `Transfer-Out` records.

---

### [x] Task 1.3: Align Mobile Final Roll with Deceased Flag
- **Platform**: Android App (`src/screens/ReportsScreen.tsx`)
- **Difficulty**: [Low]
- **KSJI Logic & Rationale**: The Final Roll memorializes deceased members.
- **Current State**: `generateFinalRoll()` only queries `.eq('status', 'Deceased')`. If a record has `is_deceased = true` but status was recorded as 'Active' or left blank, they are missed from the memorial roll.
- **Target State**: Query `.or('status.eq.Deceased,is_deceased.eq.true')`.
- **Acceptance Criteria**: All deceased members appear on the Final Roll.

---

## Category 2: Character Encoding & UI Typography (Mojibake Elimination)

### [ ] Task 2.1: Replace Corrupted Unicode with Vector Icons on Web
- **Platform**: Web App (`web/src/components/layout/MemberShell.tsx`, `RegistrarShell.tsx`, `Sidebar.tsx`, `LoginForm.tsx`)
- **Difficulty**: [Medium]
- **KSJI Logic & Rationale**: Non-ASCII emojis in menu labels corrupted into mojibake (e.g. `'dY? Overview'`, `'dY Digital ID Card'`, `'sT,? Rates'`), undermining the professional dignity of the Commandery portal.
- **Current State**: Sidebar, navigation buttons, and flash messages contain corrupted text strings.
- **Target State**: Replace text emojis with standard SVG icons using `react-icons` (already installed: `react-icons/hi2` or `react-icons/fi`).
- **Acceptance Criteria**: Zero mojibake strings in navigation; crisp vector icons rendered across all browsers.

---

### [ ] Task 2.2: Standardize Ghanaian Cedi Currency Formatter
- **Platform**: Shared (Web & Android)
- **Difficulty**: [Low]
- **KSJI Logic & Rationale**: KSJI Commandery #500 operates in Ghana Cedis. Currently, corrupted strings like `GHA` or `GH,` appear on financial screens and printed PDFs.
- **Current State**: `FinancialsScreen.js`, `PersonalReportScreen.js`, and `DelinquencyPrintView.tsx` use varying currency format strings.
- **Target State**: Create a shared utility function:
  ```typescript
  export const formatCurrency = (amount: number) =>
    `GH₵ ${Number(amount || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  ```
- **Acceptance Criteria**: All balance screens, personal reports, and generated PDFs display `GH₵` cleanly.

---

### [ ] Task 2.3: Replace Corrupted Tab Emojis on Android
- **Platform**: Android App (`src/screens/MemberFormScreen.js`, `FinancialHubStubScreen.js`, `ViewMemberFinancialsScreen.js`)
- **Difficulty**: [Low]
- **KSJI Logic & Rationale**: Member form tabs display corrupted strings (`icon: 'dY '`, `icon: 'dY"z'`).
- **Current State**: Corrupted icons in `TABS` array and stub screens.
- **Target State**: Use `@expo/vector-icons` (`Ionicons` / `MaterialCommunityIcons`) for tab and status icons.
- **Acceptance Criteria**: Clean native icons rendered across all Android devices.

---

## Category 3: Mobile Member Experience & Navigation Architecture

### [ ] Task 3.1: Build Native Mobile Member Portal / Home Screen
- **Platform**: Android App (`src/screens/MemberHomeScreen.tsx` & `src/navigation/AppNavigator.js`)
- **Difficulty**: [High]
- **KSJI Logic & Rationale**: When a regular member logs in, opening directly into an extensive editing form (`MemberFormScreen`) causes confusion. The web app provides a clean `/me` portal with summary cards.
- **Current State**: No home dashboard exists for regular members on mobile.
- **Target State**: Create `MemberHomeScreen.tsx` featuring:
  - Brother's Rank, Title (Noble Brother / Brother), and Cadet/Commandery details.
  - Good Standing Badge (Financial dues benchmark + Welfare status).
  - Quick Action Cards: *Digital ID Card*, *View Ledger*, *Attendance Check-In*, *Personal Report*, *Update Bio*.
  - Birthday widget for members celebrating this month.
- **Acceptance Criteria**: Logging in as a regular member opens `MemberHomeScreen` with quick access to all member services.

---

### [ ] Task 3.2: Mobile Screen Authorization Guards
- **Platform**: Android App (`src/screens/ViewMemberFinancialsScreen.js`, `FinancialHubScreen.js`)
- **Difficulty**: [Low]
- **KSJI Logic & Rationale**: Separation of duties is strict in KSJI (Registrar vs Financial Registrar vs Welfare Treasurer vs General Member).
- **Current State**: `fetchMembers()` and `fetchData()` run in `useEffect` on mount before role verification completes in the render tree.
- **Target State**: Abort queries early if user lacks elevated permissions:
  ```javascript
  if (!FINANCIAL_ROLES.includes(role)) {
    setLoading(false);
    return;
  }
  ```
- **Acceptance Criteria**: Network inspector confirms zero unauthorized data calls for non-officer accounts.

---

## Category 4: Security, Credentials & Environment Configuration

### [ ] Task 4.1: Externalize Mobile Supabase Credentials to Environment
- **Platform**: Android App (`src/db/supabase.js`)
- **Difficulty**: [Low]
- **KSJI Logic & Rationale**: Credentials should not be hardcoded in client source files.
- **Current State**: `SUPABASE_URL` and `SUPABASE_KEY` are hardcoded in `supabase.js`.
- **Target State**: Use `process.env.EXPO_PUBLIC_SUPABASE_URL` and `process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY` via Expo `.env`.
- **Acceptance Criteria**: App connects seamlessly via environment variables without hardcoded keys in version control.

---

### [ ] Task 4.2: Sanitize Script Keys & Move to `.env.local`
- **Platform**: Repository Scripts (`scripts/inspect_db_schema.js`)
- **Difficulty**: [Low]
- **KSJI Logic & Rationale**: Maintain security of the Supabase backend.
- **Current State**: A `service_role` JWT token was committed in `inspect_db_schema.js`.
- **Target State**: Replace with `process.env.SUPABASE_SERVICE_ROLE_KEY` and ensure `.env.local` is git-ignored.
- **Acceptance Criteria**: No service role tokens in repository source files.

---

### [ ] Task 4.3: Sanitize PostgREST String Queries for Phone Numbers
- **Platform**: Web & Android (`LoginForm.tsx`, `AuthScreen.js`, `memberQueries.js`)
- **Difficulty**: [Low]
- **KSJI Logic & Rationale**: Ghanaian phone formats often contain spaces or country codes (e.g. `+233 24 123 4567`).
- **Current State**: Query string interpolation like `.or(`phone.eq.${phone},mobile.eq.${phone}`)` fails PostgREST syntax if phone contains spaces or special characters.
- **Target State**: Sanitize phone numbers by stripping whitespace and non-numeric characters before querying.
- **Acceptance Criteria**: Auth and lookup work reliably with any standard phone format input.

---

## Category 5: Mobile Architecture & Package Optimization

### [ ] Task 5.1: Clean Server Packages from Mobile `package.json`
- **Platform**: Android App (`package.json`)
- **Difficulty**: [Low]
- **KSJI Logic & Rationale**: A React Native client should only contain client libraries.
- **Current State**: Mobile `package.json` includes `pg`, `resend`, `readable-stream`, `browserify-zlib`, and `https-browserify`.
- **Target State**: Remove `pg` and `resend` from mobile `package.json`. Mobile communicates exclusively through Supabase client and edge functions.
- **Acceptance Criteria**: Mobile JavaScript bundle size decreases; `expo start` and `eas build` run without Node polyfill warnings.

---

### [ ] Task 5.2: Reconcile or Deprecate Legacy SQLite Sync
- **Platform**: Android App (`src/db/database.js`, `memberQueries.js`, `DashboardScreen.js`)
- **Difficulty**: [Medium]
- **KSJI Logic & Rationale**: Ensure consistent offline behavior without data type mismatch errors.
- **Current State**: SQLite tables define `MemberID INTEGER`, while Supabase uses UUID strings. `DashboardScreen.js` uses SQLite but is orphaned from navigation.
- **Target State**: Clean up `database.js` types (change `MemberID` to `TEXT`), or migrate offline caching to lightweight AsyncStorage/React Query caching.
- **Acceptance Criteria**: No type errors during local caching; offline reads work cleanly.

---

### [ ] Task 5.3: Add Pagination to Mobile Member List
- **Platform**: Android App (`src/screens/RegistrarDashboard.tsx`)
- **Difficulty**: [Medium]
- **KSJI Logic & Rationale**: The Commandery roster grows over time; fetching the entire roster with full nested relations on every screen focus strains mobile memory and bandwidth.
- **Current State**: `fetchMembers()` fetches `select('*, children(id), positions(...)')` unpaginated.
- **Target State**: Implement paginated loading (e.g. 25-50 members per page) with pull-to-refresh and debounced server-side search.
- **Acceptance Criteria**: Roster screen loads instantly and scrolls smoothly even on low-end Android devices.

---

## Category 6: Feature Parity & Mobile Financial Viewing

### [ ] Task 6.1: Native Mobile View for Rate History & Delinquency
- **Platform**: Android App (`src/screens/FinancialHubStubScreen.js`)
- **Difficulty**: [Medium]
- **KSJI Logic & Rationale**: Financial Registrars in meetings often need to quickly check dues rates or delinquent members without opening a laptop or web browser.
- **Current State**: 5 stub screens redirect the user to open a browser window.
- **Target State**: Implement native, read-only mobile cards for **Rates History** and **Delinquency Summary** inside the mobile app.
- **Acceptance Criteria**: Financial officers can view rates and aged delinquency directly on their mobile device during meetings.

---

## Category 7: Documentation & Operational Manuals

### [ ] Task 7.1: KSJI Member User Manual
- **Platform**: Documentation (`docs/MEMBER_USER_MANUAL.md`)
- **Difficulty**: [Low]
- **KSJI Logic & Rationale**: A simple guide for members to understand how to view their ledger, digital ID card, and submit MoMo receipts.
- **Target State**: Create a visual, step-by-step guide explaining the `/me` portal and Android app.
- **Acceptance Criteria**: Document completed and accessible in the repository.

---

### [ ] Task 7.2: Officer & Admin Operations Handbook
- **Platform**: Documentation (`docs/OFFICER_ADMIN_MANUAL.md`)
- **Difficulty**: [Medium]
- **KSJI Logic & Rationale**: Operational procedures for Registrars, Financial Registrars, and Welfare Treasurers covering annual billing, payment reconciliation, attendance tracking, and reporting.
- **Target State**: Handbook documenting role responsibilities, edge function operations, and audit procedures.
- **Acceptance Criteria**: Document completed and accessible in the repository.

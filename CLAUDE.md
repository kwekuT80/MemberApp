# Member App — Project Context

## Architecture Overview

This is a dual-platform application for the KSJI Commandery member registration system.

### Web Application (Next.js 15)

- **Framework**: Next.js 15 App Router with TypeScript
- **Styling**: Tailwind CSS (`web/src/app/globals.css`)
- **Database/Auth**: Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- **Deployment**: Vercel (`vercel.json`)

**Key directories:**
- `web/src/app/registrar/` — Registrar dashboard, member management, reports, meetings
- `web/src/app/registrar/financials/` — Financial Ledger: hub, rates & billing, payments (new)
- `web/src/app/verify/[id]/` — Public verification page
- `web/src/components/layout/` — Layout shells (`AppShell.tsx`, `RegistrarShell.tsx`)
- `web/src/components/financials/` — Financial components (`ActionCard.tsx`)
- `web/src/lib/supabase/` — Supabase client utilities (`server.ts`, `middleware.ts`)
- `web/src/lib/auth/` — Auth helpers (`requireUser.ts`, `getCurrentProfile.ts`, `requireFinancialRegistrar.ts`)
- `web/src/services/` — API services (memberService, photoService, financialService)
- `web/src/services/messaging/` — Provider-agnostic messaging layer (Brevo/Twilio abstraction with `providerFactory.ts`)
- `web/src/types/` — TypeScript interfaces (member, position)

**Routes:**
- `/registrar/members` — Member list/search table
- `/registrar/members/[id]` — Member detail page
- `/registrar/members/[id]/dossier` — Full dossier view
- `/registrar/members/[id]/bio` — Biography section
- `/registrar/members/[id]/id-card` — ID card generation
- `/registrar/import` — Bulk import functionality
- `/registrar/reports` — Report generation
- `/registrar/meetings` — Meeting management (new)
- `/registrar/financials` — Financial Ledger hub (assessment & collections overview, new)
- `/registrar/financials/rates` — Rate configuration and bill generation (new)
- `/registrar/financials/rates/history` — Rate history timeline + comparison tool (completed feature)
- `/registrar/financials/members` — Member financial summary page (completed feature)
- `/registrar/financials/payments` — Monthly payment recording (new)
- `/registrar/financials/dashboards` — Dashboard analytics (completed feature)
- `/registrar/financials/delinquency` — Delinquency aging report (completed feature)
- `/registrar/financials/audit` — Financial audit trail UI (completed feature)
- `/registrar/attendance/reports` — Attendance reports (completed feature)
- `/registrar/communications` — Communications hub (new)
- `/registrar/communications/history` — Communication history tracking
- `/verify/[id]` — Public verification page

**Role hierarchy:** `member` → `registrar` → `financial_registrar` → `super_admin`. Separation of duties between registrar and financial registrar roles; super_admin has access to everything.

**Auth pattern**: `requireUser()` in `web/src/lib/auth/requireUser.ts` enforces login on registrar routes. `requireFinancialRegistrar()` restricts financial pages to financial_registrar or super_admin. Middleware (`web/src/lib/supabase/middleware.ts`) manages Supabase cookie sessions.

---

### Mobile Application (React Native + Expo)

- **Framework**: React Native 0.74.5 with Expo SDK 51
- **Navigation**: @react-navigation/native + native-stack
- **Database/Auth**: Supabase JS client
- **Build System**: EAS Build (`eas.json`) — Android APK preview, AAB production

**Key directories:**
- `app/` — Expo Router screens (login, dashboard, member detail, photo capture)
- `src/` or `components/` — Shared UI components and utilities

**Key dependencies:**
- `expo-image-picker` — Photo capture/upload
- `expo-print` / `expo-sharing` — PDF export functionality
- `@react-native-picker/picker` — Native select dropdowns
- `react-native-screens` — Navigation optimization

**Features:** Member lookup, photo upload, dossier view, ID card generation (PDF), offline caching.

---

## Financial Ledger (New — 2026-05)

A financial management system for KSJI registration fee collection. Features include annual bill generation with age-based discounts, payment recording, rate configuration, and member financial summaries via materialized views.

**Key files:**
- `web/src/services/financialService.ts` — Financial API layer (getAssessmentsForYear, getPaymentsForYear)
- `web/src/lib/auth/requireFinancialRegistrar.ts` — Role-based access control for financial pages
- `web/src/app/registrar/financials/page.tsx` — Financial hub dashboard
- `web/src/components/financials/ActionCard.tsx` — Action card component

**Database:** Tables in Supabase include `assessments`, `payments`, `financial_rates`. Materialized view `member_financial_summary` for aggregated dashboards. RLS policies restrict access to financial_registrar and super_admin roles only.

**Migration script:** `setup_financial_ledger_complete.sql` in project root (safe to re-run).

---

### Completed Features (2026-05 Sprint)

#### F1: Rate History & Comparison View
- **Architecture**: Audit-style design using `rate_history` view on `financial_rates` table with `tsrange` for time-range queries
- **Key files**: `web/src/app/registrar/financials/rates/history/page.tsx` (client component), `web/src/services/rateService.ts`, `migrations/rate_history_schema.sql`
- **Pattern**: Client component fetches history via service layer; comparison tool uses `getRatesForDate()` for both dates

#### F2: Member Financial Summary Page
- **Architecture**: Materialized view `member_financial_summary` with concurrent refresh index. View aggregates assessments + payments per member into single queryable entity
- **Key files**: `web/src/app/registrar/financials/members/page.tsx` (server component), `web/src/services/financialService.ts`, `migrations/member_summary_view.sql`
- **Pattern**: Server component with search params filtering; uses materialized view to avoid N+1 queries

#### C3: GPS Geofencing Attendance Tracking
- **Architecture**: Mobile app uses `expo-location` for auto-check-in. Primary workflow is self-service GPS; manual check-in is safeguard
- **Key files**: `app/screens/meetings/AttendanceScreen.tsx` (mobile), attendance table extension in `setup_financial_ledger_complete.sql`

#### C4: QR Code Manual Check-In Fallback
- **Architecture**: QR code stored as text column on members table (`qr_code_value`). Scanned via mobile camera as fallback when GPS fails
- **Key files**: Integrated into attendance flow, `members` table extension with `qr_code_value TEXT UNIQUE`

#### C1a: Messaging Abstraction Layer (Provider-Agnostic) ✅ Completed
- **Architecture**: Unified messaging abstraction layer (`web/src/services/messaging/`) decouples application from provider. Factory pattern selects provider via `MESSAGING_PROVIDER` env var. Default is Brevo; Twilio and Resend are available as alternatives without changing application code.
- **Key files**: `web/src/services/messaging/types.ts` (interfaces), `providerFactory.ts` (factory), `brevoProvider.ts`, `twilioProvider.ts`. Uses Supabase Edge Functions for delivery tracking and webhook handling.
- **Pattern**: Provider interface defines `sendEmail()`, `sendSMS()`, `getStatus()`, `handleWebhook()`. Applications import via factory — switching providers requires only env var change.

#### C1b: Payment Reminder Orchestration ⏳ Pending (depends on C1a)
- **Architecture**: Supabase Edge Function + cron scheduler for automated SMS/email reminders based on payment due dates and delinquency status. Uses C1a messaging layer for delivery.
- **Status**: Foundation complete; edge function orchestration planned per `docs/communications_workflow.md`.

#### D3: Financial Dashboard Analytics ✅ Completed
- **Architecture**: Interactive charts and metrics for financial health trends using aggregated data queries. Provides visual representation of payment compliance, collection rates, and revenue trends over time.
- **Key files**: `web/src/app/registrar/financials/dashboards/page.tsx` — Server component with real-time aggregations
- **Pattern**: Dashboard uses materialized view patterns similar to F2 for performance

#### G1: Delinquency Aging Report (Print-Ready) ✅ Completed
- **Architecture**: PDF exportable report tracking members overdue by 90/180/365 days with formatted print output. Uses server-side rendering for consistent formatting across platforms.
- **Key files**: `web/src/app/registrar/financials/delinquency/page.tsx`, `DelinquencyPrintView.tsx`
- **Pattern**: Print-ready components use specialized CSS classes for proper PDF generation

#### D1a: Financial Audit Trail UI ✅ Completed
- **Architecture**: Visual interface for viewing audit logs of financial changes including who modified what and when. Uses the `audit_trail_schema.sql` migration for data persistence.
- **Key files**: `web/src/app/registrar/financials/audit/page.tsx`, `AuditLogClient.tsx`
- **Pattern**: Client component fetches audit entries via service layer with pagination

#### G2: Attendance Reports ✅ Completed
- **Architecture**: Post-meeting attendance summary generation with filtering by date, meeting, or member status. Provides comprehensive reporting on participation trends.
- **Key files**: `web/src/app/registrar/attendance/reports/page.tsx`
- **Pattern**: Server component with dynamic filtering using URL parameters

#### C5: Communications Hub & History ✅ Completed
- **Architecture**: Centralized interface for sending communications and tracking message history across all channels (email, SMS). Integrates with the messaging abstraction layer.
- **Key files**: `web/src/app/registrar/communications/page.tsx`, `history/page.tsx`
- **Pattern**: Hub-and-spoke architecture with history as secondary view

---

## Communications Layer (Planned — 2026-Q3)

Documentation: `docs/communications_workflow.md`

**Architecture Principles**:
- Provider layer must be replaceable — abstraction already implemented (`web/src/services/messaging/`)
- Application workflows emit communication requests; orchestrator resolves recipient, renders template, dispatches via configured provider
- Delivery state machine tracks CREATED → QUEUED → SENT → DELIVERED → OPENED → COMPLETE with exception states (FAILED, BOUNCED, ESCALATED)

**Current Implementation**: Provider abstraction layer and Brevo/Twilio implementations are complete. Full workflow orchestration (cron scheduler, reminder discovery, escalation engine) is planned per `docs/communications_workflow.md`.

## Key Patterns & Conventions

1. **Authentication**: Supabase auth via middleware cookies; `requireUser()` enforces login on registrar routes. `requireFinancialRegistrar()` for financial pages.
2. **Role-based Access Control (RBAC)**: Roles are `member` → `registrar` → `financial_registrar` → `super_admin`. Financial features use `requireFinancialRegistrar()`.
3. **Supabase RLS**: All new tables have ROW LEVEL SECURITY enabled with explicit policies per role. Materialized views require separate RLS policies (do not inherit from base tables).
4. **Type Safety**: Full TypeScript across web (`@types/react`, `typescript ^5.8`); mobile has `~5.3.3`
5. **API Layer**: Services in `web/src/services/` (memberService, photoService, financialService)
6. **Validation**: Dedicated validation modules (`web/src/lib/validation/`)
7. **Layout Shells**: `AppShell` for general admin; `RegistrarShell` for registrar-specific navigation with role-aware menu items.
8. **Build**: EAS for mobile distribution; `next build` for web

---

## Running the Project

### Web
```bash
cd web
npm run dev        # Start development server
npm run build      # Production build
npm run start      # Start production server
```

### Mobile
```bash
npx expo start     # Development (uses app.json)
eas build --platform android  # Android APK preview
eas build --platform android --profile production   # AAB for store
```

---

## Development Workflow

1. **Web changes**: Always run `npm run build` (which executes `next build`) to verify Next.js build integrity and TypeScript safety.
2. **Android changes**: Run `./gradlew assembleDebug` to verify the Android build.
3. **Large file overwrites**: Use full file overwrites for files >50 lines to avoid tool-call corruption.
4. **Git commit**: Suggest a git commit only after these local verifications pass.
5. **Check completed features**: Before implementing anything, check `FEATURES_AND_PLANS.md` → "Completed Features" section and CLAUDE.md → "Completed Features (2026-05 Sprint)" to avoid reimplementing already-done work.

---

**Change Logging Rule**: After every prompt, if there is a material change in the architecture or plans or any file in the code base, write it down immediately to prevent losing the change and increasing context size. This includes: schema migrations added, new features planned/approved, architectural decisions made, role changes, and workflow modifications.

---

- **Windows paths**: Use backslash-style paths (e.g., `C:\App\MemberApp`) when running commands.
- **next not recognized**: If `next` is not recognized, run commands using `npx next` or `npm run` directly from the `web` directory.
- **node_modules**: Do not run `npm install` unless `package.json` has changed; assume `node_modules` already exists.

---

## Git History Summary

**Latest (2026-05):** Financial Ledger system — assessment/collections management with annual bill generation, rate configuration, payment recording, materialized summary views, age-based discounts, RLS policies for financial data. Separation of duties: registrar vs financial_registrar roles + super_admin. Provider-agnostic messaging abstraction layer (Brevo/Twilio) implemented as foundation for automated reminders.

**Completed features this sprint:** F1 (Rate History & Comparison View), F2 (Member Financial Summary Page via Materialized Views), C3 (GPS Geofencing Attendance Tracking), C4 (QR Code Manual Check-In Fallback), C1a (Messaging Abstraction Layer), D3 (Dashboard Analytics), G1 (Delinquency Report Print-Ready), D1a (Audit Trail UI), G2 (Attendance Reports), C5 (Communications Hub & History).

**Previous:** offline caching, QR codes, bulk import, verification page, rank display fixes, Android photo upload improvements.

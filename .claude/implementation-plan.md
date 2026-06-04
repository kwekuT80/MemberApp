# Implementation Plan — Pending Features

Generated: 2026-05-29

---

## Priority Order: C1b → C2 → B1 → B2 → D2 → A3 → E1/E2

---

### Phase 1: C1b — Automated Payment Reminder Orchestration (P0)

**Dependencies:** C1a messaging layer (already complete)
**Est. Effort:** 3-5 days
**Status: CODE COMPLETE ✅** — All files created and TypeScript verified. Requires deployment to Supabase/Vercel.

#### What's needed:
- Supabase Edge Function (`supabase/functions/payment-reminders/index.ts`) to discover overdue members and dispatch reminders
- Cron schedule via Vercel (monthly on the 1st at 8 AM)
- Notification preference UI at `/registrar/settings/notifications` (new page)
- Reminder log tracking extension for communications history

#### Implementation Steps:
1. Create `supabase/functions/payment-reminders/index.ts` — Edge function using service role key to query members with unpaid payments, cross-reference notification preferences, send via C1a messaging provider
2. Add Vercel cron entry in `vercel.json` (monthly schedule: `0 8 1 * *`)
3. Extend communications history page to include reminder log entries
4. Build admin settings form for notification preferences

#### Files to Create/Modify:
- `supabase/functions/payment-reminders/index.ts` — EXISTS (from previous session, patched)
- `web/src/app/api/cron/payment-reminders/route.ts` — EXISTS (from previous session)
- `vercel.json` — CREATED (with monthly cron schedule)
- `migrations/notification_preferences.sql` — already exists, needs review
- `migrations/reminder_config_table.sql` — NEW (created today)
- `web/src/app/registrar/settings/notifications/page.tsx` — NEW (created today)
- `web/src/services/financialService.ts` — MODIFIED (added reminder config functions)

---

### Phase 2: C2 — Annual Bill Auto-Generation (P0)

**Dependencies:** None (standalone feature)
**Est. Effort:** 2-3 days

#### What's needed:
- Migration from `migrations/bill_generation_schema.sql` (exists but may not have been applied to Supabase)
- Edge Function at `supabase/functions/bill-generator/index.ts` (code exists in docs, needs creation as actual file)
- Vercel cron route at `web/src/app/api/cron/generate-bills/route.ts`
- Bill generation status widget component

#### Implementation Steps:
1. Apply migration SQL to Supabase
2. Create edge function files from documented code
3. Add cron route and update `vercel.json`
4. Build `BillGenerationStatus.tsx` widget for registrar dashboard

#### Files to Create/Modify:
- `supabase/functions/bill-generator/index.ts` — NEW
- `web/src/app/api/cron/generate-bills/route.ts` — NEW
- `migrations/bill_generation_schema.sql` — REVIEW/APPLY
- `vercel.json` — MODIFY (add cron schedule)
- `web/src/components/financials/BillGenerationStatus.tsx` — NEW

---

### Phase 3: B1 — Member Portal Payment History (P1)

**Dependencies:** None
**Est. Effort:** 1-2 days

#### Implementation Steps:
1. Add `getMemberPaymentHistory(memberId, year?)` to financialService.ts (already has detailed summary — just needs exposing publicly)
2. Create `/verify/[id]/payment-history/page.tsx` as public page (no auth required for members)
3. Build timeline component showing assessment → payment entries chronologically

#### Files to Create/Modify:
- `web/src/services/financialService.ts` — ADD function
- `web/src/app/verify/[id]/payment-history/page.tsx` — NEW
- `web/src/components/payment/PaymentTimeline.tsx` — NEW

---

### Phase 4: B2 — Self-Service Profile Updates (P1)

**Dependencies:** None
**Est. Effort:** 1 day

#### Implementation Steps:
1. Create `/member/profile/page.tsx` with profile editing UI
2. Use existing Supabase auth — member logs in, updates their own `profiles` row
3. Add server action or API route for secure profile updates (only allow updating own record)

#### Files to Create/Modify:
- `web/src/app/member/profile/page.tsx` — NEW
- `web/src/app/api/members/me/profile/route.ts` — NEW (server action endpoint)
- `web/src/components/profile/ProfileForm.tsx` — NEW

---

### Phase 5: D2 — Bulk Import with Financial Mapping (P1)

**Dependencies:** Existing import at `/registrar/import`
**Est. Effort:** 1-2 days

#### Implementation Steps:
1. Add financial column options to existing import form
2. On upload, parse and create corresponding `assessments` entries (year-based) or `payments` entries
3. Show preview/confirmation before committing

#### Files to Create/Modify:
- `web/src/app/registrar/import/page.tsx` — MODIFY (add financial mapping options)
- `web/src/services/importService.ts` — MODIFY (add financial record creation logic)

---

### Phase 6: A3 — Chapter Health Dashboard (P2)

**Dependencies:** D3 dashboard patterns (already complete)
**Est. Effort:** 1-2 days

#### Implementation Steps:
1. Query `members` table for growth trends (created_at over time)
2. Cross-reference with assessments/payments for compliance calculation
3. Build summary cards + trend charts

#### Files to Create/Modify:
- `web/src/app/registrar/dashboards/chapter-health/page.tsx` — NEW
- `web/src/services/dashboardService.ts` — NEW (aggregation queries)
- Chart components using same patterns as D3

---

### Phase 7: E1/E2 — Mobile App Enhancements (P2)

**Note:** No mobile app source files found in repository. These would need to be developed separately.

- **E1**: Add local SQLite/AsyncStorage queue for offline payment records, sync when connection restored
- **E2**: Extend member search API endpoint (`web/src/app/api/members/search/route.ts`) to accept `phone` query param

---

## Verification Checklist

Before marking each phase complete:
1. Next.js build passes (`npm run build` in web directory)
2. TypeScript compilation succeeds (no type errors)
3. RLS policies verified for all new database access patterns
4. Edge functions testable locally or via Supabase CLI

---

---

## Progress Update — 2026-05-30

### Phase 1 (C1b) Status: CODE COMPLETE ✅
All code files created and TypeScript verified. Remaining tasks are deployment configuration only.

**Files modified/created today for C1b:**
- `web/vercel.json` — NEW + UPDATED (monthly schedule revision: `0 8 1 * *`)
- `web/src/app/registrar/settings/notifications/page.tsx` — NEW
- `web/src/services/financialService.ts` — MODIFIED (added 3 functions)
- `migrations/reminder_config_table.sql` — NEW
- `supabase/functions/payment-reminders/index.ts` — PATCHED (bug fixes)

**Cron Schedule Revision:** Changed payment-reminders from daily to monthly (`0 8 * * *` → `0 8 1 * *`)

---

## Current Date: 2026-05-30
**Next Phase:** C2 — Annual Bill Auto-Generation (P0)

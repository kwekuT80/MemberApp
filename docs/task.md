# Task List: Financial & Attendance System Enhancements

- [x] **Phase 1: Database Migration & RLS Hardening**
  - [x] Create SQL migration file `C:\App\MemberApp\migrations\financial_and_attendance_updates.sql` with hardened helper functions, rate history, member financial summary view, and attendance table updates.
  - [x] Add `WITH (security_invoker = true)` on all views to respect underlying table RLS policies.
  - [x] Add `SECURITY DEFINER SET search_path = public` to `is_registrar` and `is_financial_registrar` functions.
- [x] **Phase 2: Backend Service Layer Updates**
  - [x] Create/update `rateService.ts` in `web/src/services/` with chronological timeline lookup, rates-for-date finder, and comparative diff logic.
  - [x] Update `financialService.ts` in `web/src/services/` to fetch aggregated summaries from the secured views.
  - [x] Update `attendanceService.ts` in `web/src/services/` to support GPS metadata columns and QR scan check-ins.
- [x] **Phase 3: Frontend Web Dashboard Components**
  - [x] Create `history/page.tsx` client component under `web/src/app/registrar/financials/rates/history/` to support rate history timelines and side-by-side comparisons.
  - [x] Create `members/page.tsx` page under `web/src/app/registrar/financials/members/` to display searchable member summaries, aggregate summary cards, and status tags.
- [x] **Phase 4: Verification & Integration**
  - [x] Verify that TypeScript compiles cleanly without error.
  - [x] Run `npm run build` in `/web` directory to confirm build passes.

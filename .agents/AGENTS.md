# KSJI Commandery Member App — Agent & Developer Guidelines

## Business Rules & Data Integrity Principles

### Deceased & Inactive Member Archival Policy
1. **Never Delete Deceased Members**:
   Deceased members must be permanently retained in the database (`status = 'Deceased'` or `is_deceased = true`) for historical, honor roll, biographical, and archival purposes (e.g., Master Record, Service Bio, Final Roll reports, Commandery history).
2. **Exclusion from Billing & Automated Communications**:
   All financial billing/invoicing, annual dues assessment, rate calculations, delinquency tracking, welfare inactive subscriber metrics, and automated reminders MUST explicitly filter out members with status `Deceased`, `Dismissed`, or `Transfer-Out`.
   - **Query Pattern**: `.not('status', 'in', '("Dismissed","Transfer-Out","Deceased")')` and filter out `is_deceased === true`.
   - **Reasoning**: Deceased members must remain archived, but sending annual dues bills or including them in active/inactive financial and welfare subscriber lists is insensitive and incorrect.

### Financial Assessments & Payment Ingestion Architecture
1. **Reference Document**: See [`docs/FINANCIAL_ASSESSMENT_DATABASE_ARCHITECTURE.md`](file:///c:/App/MemberApp/docs/FINANCIAL_ASSESSMENT_DATABASE_ARCHITECTURE.md) for the complete schema, audit baseline, and step-by-step ingestion protocol.
2. **Carryover Equation**:
   $$\text{Starting Balance}_{(Y+1)} = \text{Starting Balance}_{(Y)} + \text{Annual Assessment}_{(Y)} - \text{Total Payments}_{(Y)}$$
   - `financial_assessments.arrears_brought_forward` stores the starting balance at the beginning of each year.
   - `financial_payments` stores individual installments with `assessment_year`.
3. **Database Baseline**:
   - Payments in `financial_payments` strictly cover 2 years: **2025** (171 rows, GH₵ 48,500.00) and **2026** (258 rows, GH₵ 63,713.00).
   - 2025 starting balances (`arrears_brought_forward`) cover 71 members (net GH₵ 6,405.00).
   - Ending 2025 balances match 2026 starting balances cent-for-cent ($0.00 discrepancy).
   - Dismissed members are excluded from future annual assessments (e.g., 4 dismissed members excluded in 2026).

## Documentation & Manuals Reminders
1. **Member User Manual**: Create a simple, visual guide for general members covering the `/me` portal (viewing dues ledger, updating profile info, exemplification details, family info, personal standing reports).
2. **Officer & Admin Manual**: Create an operational handbook for users with elevated permissions (`registrar`, `financial_registrar`, `super_admin`) covering member registration, annual bill generation, rates configuration, payment logging, welfare fund management, attendance check-ins, and financial audit logs.


## Autonomous Execution & Approval Policy
1. **No Micro-Approvals or Over-Planning**: Do not stop to ask for confirmation or approval on routine tasks, bug fixes, or requested features.
2. **Direct End-to-End Execution**: When the user requests a task or asks to proceed, execute the changes, run necessary build/verification checks, and report the completed result directly without creating unnecessary blocking approval gates.

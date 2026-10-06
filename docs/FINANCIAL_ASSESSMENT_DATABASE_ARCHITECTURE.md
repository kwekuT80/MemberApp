# KSJI Commandery 500 — Financial Assessment & Payment Architecture

## 1. Executive Summary & Purpose
This document serves as the official, permanent architectural specification and operational guide for how **annual dues assessments**, **starting balances (arrears brought forward)**, and **payment records** are structured, calculated, and stored in the database.

Whenever new assessment sheets, annual billings, or bulk payment records are received from the financial secretary or treasury, this guide provides the exact data contract and mathematical reconciliation protocols to ensure 100% data integrity without discrepancies.

---

## 2. Core Database Schema & Architecture

### A. `financial_assessments` (Annual Assessment & Carryover Ledger)
Stores the annual dues assessment bill and prior arrears/credit carryover for each member per financial year.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Unique record identifier |
| `member_id` | `uuid` (FK) | References `members.id` |
| `year` | `integer` | Financial assessment year (e.g., `2025`, `2026`) |
| `arrears_brought_forward` | `numeric` | Starting balance at the beginning of this year. <br>• **Positive (> 0)** = Member owes past arrears from previous years.<br>• **Negative (< 0)** = Member has an advance credit surplus from overpayment.<br>• **Zero (= 0)** = Member was fully settled. |
| `annual_assessment` | `numeric` | Constitutional assessment levied for this specific year (e.g., `GH₵ 1,000` for 2025; `GH₵ 1,050` regular / `GH₵ 525` social/new initiate for 2026). |
| `created_at` | `timestamptz` | Record creation timestamp |

> **Unique Constraint**: `(member_id, year)` — A member can have only **one** assessment row per year.

---

### B. `financial_payments` (Transaction Payments Ledger)
Stores individual payment installments logged against a member's dues for a given assessment year.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Unique payment transaction identifier |
| `member_id` | `uuid` (FK) | References `members.id` |
| `assessment_year` | `integer` | The financial year to which this payment is credited (e.g., `2025`, `2026`). |
| `month` | `text` | The month or levy label for which the payment was tendered (e.g., `'Jan'`, `'Feb'`, `'Mar'`, `'April'`, ..., `'Dec'`). <br>*Note: Special voluntary relief appeals are also differentiated in this field.* |
| `amount` | `numeric` | Transaction amount paid in GH₵. |
| `recorded_by` | `uuid` (FK) | Officer who logged the entry (nullable). |
| `payment_date` | `timestamptz` | Date/time of record insertion. |

---

### C. `annual_assessment_rates` (Rate Configuration)
Defines the official baseline annual assessment rates per membership tier.

| Year | Regular Rate | Social Rate | Student/Initiate Rate | Status |
| :---: | :---: | :---: | :---: | :---: |
| **2025** | GH₵ 1,000.00 | GH₵ 500.00 | GH₵ 500.00 | Historical Baseline |
| **2026** | GH₵ 1,050.00 | GH₵ 700.00 | GH₵ 350.00 (Initiates: GH₵ 525) | Active Rate |

---

### D. `member_financial_summary` (Aggregated Snapshot View)
Cached denormalized summary per member used for high-speed dashboard loading.
- `total_assessed`: Cumulative assessments across active periods.
- `total_paid`: Sum of all payments in `financial_payments`.
- `outstanding_balance`: `total_assessed - total_paid`.
- `payment_status`: `'fully_paid'`, `'partially_paid'`, `'unpaid'`, or `'in_credit'`.

---

## 3. The Cross-Year Carryover Equation (Mathematical Law)

The fundamental accounting law governing dues transitions from Year $Y$ to Year $Y+1$:

$$\text{Starting Balance}_{(Y+1)} = \text{Starting Balance}_{(Y)} + \text{Annual Assessment}_{(Y)} - \text{Total Payments}_{(Y)}$$

### Term Breakdown:
1. **$\text{Starting Balance}_{(Y)}$**: `arrears_brought_forward` in `financial_assessments` for Year $Y$.
2. **$\text{Annual Assessment}_{(Y)}$**: `annual_assessment` in `financial_assessments` for Year $Y$.
3. **$\text{Total Payments}_{(Y)}$**: $\sum \text{amount}$ in `financial_payments` where `assessment_year` $= Y$.
4. **$\text{Starting Balance}_{(Y+1)}$**: `arrears_brought_forward` in `financial_assessments` for Year $Y+1$.

---

## 4. Current Database Baseline Audit (2025 & 2026 Records)

### A. The 2025 Starting Balance (Opening Position)
- **Table**: `financial_assessments` (`year = 2025`)
- **Total Members Assessed**: **71 members**
- **Net Balance Brought Forward**: **GH₵ 6,405.00**
  - **18 members**: Started 2025 owing historical arrears from 2024 and prior.
  - **17 members**: Started 2025 with advance credit balances (overpayments).
  - **36 members**: Started 2025 at exactly **GH₵ 0.00** (fully settled).

### B. Two-Year Payment Records
- **Table**: `financial_payments`
- **Total Payment Records**: **429 records** spanning **strictly two years**:
  1. **2025 Financial Year**: **171 payment records** totaling **GH₵ 48,500.00**.
  2. **2026 Financial Year**: **258 payment records** totaling **GH₵ 63,713.00**.
     - Regular monthly dues installments: **189 records** (GH₵ 53,813.00)
     - Voluntary relief & special recovery levies: **69 records** (GH₵ 9,900.00)
       - *Voluntary Relief (Flood Victims)*: 36 records (GH₵ 5,500.00)
       - *Voluntary Relief (Dansoman Market Fire)*: 31 records (GH₵ 4,200.00)
       - *Arrears Recovery (Dismissed Members)*: 2 records (GH₵ 200.00)

### C. Reconciliation Audit Result
- **Result**: **100% Mathematical Match** across all 67 continuing members (**GH₵ 0.00 discrepancy**).
- Every single continuing member's ending balance from 2025 carried into 2026 with cent-for-cent precision.

### D. Roster Nuance (71 in 2025 vs. 69 in 2026)
- **4 Members Removed in 2026**:
  *Charles Asiedu*, *Marshall Adaletey-Dosu*, *Prosper Kpobi*, and *Julius Yawson* were dismissed from the Commandery. In compliance with the Commandery Archival Policy, dismissed members are never billed annual dues assessments.
- **2 Members Added in 2026**:
  *Anthony Deenu* and *Lancelot Laryea* were initiated on July 11, 2026. They entered 2026 with `arrears_brought_forward = 0` and a pro-rated 2nd-half assessment of **GH₵ 525.00**.

---

## 5. Standard Operating Protocol for Ingesting Future Assessment Records

When a new annual assessment sheet (e.g., 2027 Assessment or new 2026 ledger updates) is provided, follow these sequential steps:

### Step 1: Member ID Resolution
Match members by name against the `members` table using full names and roll-book numbers. Avoid plain string matching; normalize spaces and case.

### Step 2: Apply Deceased & Dismissed Billing Policy
Verify each member's status:
- If `status IN ('Deceased', 'Dismissed', 'Transfer-Out')` or `is_deceased = true`: **DO NOT generate an annual assessment bill**.
- Historical arrears for dismissed members remain archived but are not carried forward as active billing receivables.

### Step 3: Compute or Validate `arrears_brought_forward`
For Year $N$:
1. Fetch Year $N-1$ assessment row (`arrears_brought_forward` and `annual_assessment`).
2. Sum all payments in `financial_payments` for `assessment_year = N-1`.
3. Compute:
   $$\text{Expected B/F} = \text{Arrears B/F}_{(N-1)} + \text{Annual Assessment}_{(N-1)} - \text{Total Payments}_{(N-1)}$$
4. Compare with the physical spreadsheet's "Bal B/F" column. Flag any variance before inserting.

### Step 4: Upsert into `financial_assessments`
```sql
INSERT INTO public.financial_assessments (
  member_id,
  year,
  arrears_brought_forward,
  annual_assessment
) VALUES (
  '<member_uuid>',
  2027,
  <computed_bf>,
  <tier_rate>
)
ON CONFLICT (member_id, year) 
DO UPDATE SET
  arrears_brought_forward = EXCLUDED.arrears_brought_forward,
  annual_assessment = EXCLUDED.annual_assessment;
```

### Step 5: Ingest Monthly Payments into `financial_payments`
When importing payments from monthly columns (`Jan`, `Feb`, ..., `Dec`):
- Only insert non-zero, positive amounts.
- Set `assessment_year` to the corresponding financial period year.
- Preserve the month string (`Jan`, `Feb`, etc.) or relief levy label.

### Step 6: Refresh `member_financial_summary`
Ensure the denormalized summary table is updated so member dossiers and the `/me` portal immediately display accurate standings.

---

## 6. Contrast with Welfare Contributions (`welfare_contributions`)
Do not confuse Commandery Annual Dues with the Welfare Scheme:
- **Commandery Dues** (`financial_payments`): Tracked per `assessment_year` (2025, 2026).
- **Welfare Fund** (`welfare_contributions`): Tracked per `period_year` and covers **3 years** in the database (2024, 2025, 2026) at monthly rates (GH₵ 25/month).

# KSJI Commandery #500 — Officer & Administrator Operations Handbook

This operational handbook provides standard operating procedures for Commandery officers with elevated permissions: **Registrar**, **Financial Registrar**, **Welfare Treasurer**, and **Super Administrator**.

---

## Table of Contents
1. [Role Hierarchy & Separation of Duties](#1-role-hierarchy--separation-of-duties)
2. [Registrar: Membership Administration](#2-registrar-membership-administration)
3. [Financial Registrar: Rates & Annual Billing](#3-financial-registrar-rates--annual-billing)
4. [Financial Registrar: Payments & MoMo Reconciliation](#4-financial-registrar-payments--momo-reconciliation)
5. [Financial Registrar: Delinquency & Aging Reports](#5-financial-registrar-delinquency--aging-reports)
6. [Welfare Treasurer: Welfare Fund Administration](#6-welfare-treasurer-welfare-fund-administration)
7. [Meeting Management & Attendance Operations](#7-meeting-management--attendance-operations)
8. [Automated Engagement & Reminder Engine](#8-automated-engagement--reminder-engine)
9. [Financial Audit Trails & Governance](#9-financial-audit-trails--governance)

---

## 1. Role Hierarchy & Separation of Duties

The system enforces constitutional separation of duties across four permission tiers:

| Role | Scope & Permissions | Restricted Surfaces |
| :--- | :--- | :--- |
| **`member`** | Personal dossier, ID card, dues ledger, MoMo upload, attendance. | No access to other members' records or commandery ledger. |
| **`registrar`** | Member approvals, roster management, dossier editing, meetings, attendance, notifications. | Cannot configure billing rates or record financial payments. |
| **`financial_registrar`** | Annual billing, rates configuration, payment recording, MoMo verification, delinquency reports. | Cannot alter ritual exemplification or position history. |
| **`welfare_treasurer`** | Welfare contribution recording, benefit disbursements, welfare arrears tracking. | Restricted to welfare fund ledger operations. |
| **`super_admin`** | Global administrative access across all operational hubs, audit logs, and role delegation. | Reserved for the Worthy President and designated system administrators. |

---

## 2. Registrar: Membership Administration

### A. Approving New User Accounts
1. Navigate to **Registrar Portal** (`/registrar/members`).
2. New member registrations appear with status `pending` in the approval queue.
3. Review the applicant's name and contact details:
   - If the applicant exists on the master roll, click **Link to Existing Record**.
   - If they are a newly initiated brother, confirm their initiation details and approve.

### B. Updating Member Dossiers
- Access a member's dossier via `/registrar/members/[id]/dossier`.
- **Exemplifications**: Record degree advancement dates (1st, 2nd & 3rd, 4th Degree Chevalier, Noble Degree).
- **Uniform Ranks & Commissions**: Record uniform blessings and military ranks.
- **Roll of Worthy Presidents**: Add past Worthy Presidents to the roll of honor.

### C. Archival Policy for Deceased & Transferred Members
> ⚠️ **CRITICAL CONSTITUTIONAL RULE**:
> **NEVER delete a deceased brother from the database.**
> When a brother passes on:
> 1. Set `status = 'Deceased'` and `is_deceased = true`.
> 2. Enter `date_of_death`, `burial_date`, and `burial_place`.
> 3. The system permanently archives his record on the **Final Roll** and automatically excludes him from all future dues assessments, billing runs, and automated communications.
> 4. For brothers transferring out of jurisdiction, set `status = 'Transfer-Out'` with target commandery details.

---

## 3. Financial Registrar: Rates & Annual Billing

### A. Annual Rate Configuration
Before generating bills for a new calendar year:
1. Navigate to **Rates & Billing** (`/registrar/financials/rates`).
2. Enter the approved Commandery dues rates for the year:
   - **Regular Rate**: Standard dues rate (e.g. `GH¢ 150.00`).
   - **Social Rate**: Rate for social/non-uniform members.
   - **Student Rate**: Concessionary rate for students.
3. Click **Save Rates**. The system automatically archives previous rates in the **Rate History Timeline** for historical audit.

### B. Executing the Annual Billing Run
1. In **Rates & Billing**, click **Generate Bills for [Year]**.
2. The billing engine executes the following automated pipeline:
   - Queries all living active members (excluding `Deceased`, `Dismissed`, and `Transfer-Out`).
   - Calculates age discounts:
     - Age < 70: Standard rate.
     - Age 70–74: 25% discount.
     - Age 75–79: 50% discount.
     - Age 80+: 100% exemption (assessment = `GH¢ 0.00`).
   - Pulls prior-year unpaid balances and rolls them into **Arrears Brought Forward**.
   - Generates and upserts individual assessment rows into `financial_assessments`.

---

## 4. Financial Registrar: Payments & MoMo Reconciliation

### A. Manual Payment Logging
1. Navigate to **Record Payments** (`/registrar/financials/payments`).
2. Search and select the member.
3. Enter payment details:
   - **Amount (GH¢)**.
   - **Payment Date**.
   - **Month & Year credited**.
   - **Payment Method**: Cash, Bank Transfer, or Mobile Money.
   - **Receipt Number / Transaction Reference**.
4. Click **Save Payment**. A receipt is logged, and the member's ledger recalculates instantly.

### B. Reconciling Member MoMo Uploads
1. Navigate to **MoMo Receipt Verification** (`/registrar/financials/verify`).
2. Review pending submissions:
   - Inspect the attached receipt screenshot.
   - Cross-reference the transaction ID against the Commandery bank/MoMo statement.
3. Click **Approve & Credit** to post the payment directly to the member's ledger, or **Decline** with an explanatory note.

---

## 5. Financial Registrar: Delinquency & Aging Reports

1. Navigate to **Delinquency Report** (`/registrar/financials/delinquency`).
2. The dashboard groups overdue accounts by aging brackets:
   - **30–90 Days (Current Cycle)**.
   - **90–180 Days (Overdue - Notice Required)**.
   - **180–365 Days (Critical Delinquency)**.
   - **365+ Days (Severe Arrears - Intervention Required)**.
3. Click **Export PDF / Print View** to generate a clean, executive summary for the Commandery Board of Trustees or General Meeting.

---

## 6. Welfare Treasurer: Welfare Fund Administration

1. Navigate to **Welfare Hub** (`/registrar/welfare`).
2. **Monthly Welfare Contributions**:
   - Record monthly welfare contributions per member (`/registrar/welfare/contributions`).
   - Track compliance against the monthly rate (`GH¢ 25.00/month`).
3. **Benefit Disbursements**:
   - Record fraternal payouts (`/registrar/welfare/disbursements`) for:
     - Bereavement support (member, spouse, parent).
     - Medical solidarity donations.
     - Fraternal goodwill presentations.
   - Operational expenses (bank charges, stationery) are tagged separately to preserve benefit metrics.
4. **Welfare Arrears**:
   - Review arrears tracking (`/registrar/welfare/arrears`) to identify brothers requiring fraternity support or welfare follow-up.

---

## 7. Meeting Management & Attendance Operations

### A. Scheduling a Meeting
1. Navigate to **Meetings** (`/registrar/meetings`).
2. Click **Create Meeting** and configure:
   - **Meeting Name & Type**: General Meeting, Officer Board, Emergency, or Drill.
   - **Date & Start Time**.
   - **GPS Geofence Center**: Latitude and longitude of the hall (e.g. Christ the King Parish Hall).
   - **Geofence Radius**: Recommended `100m–150m`.

### B. Monitoring Real-Time Check-Ins
1. During the meeting, open the **Attendance Scanner** (`/registrar/meetings/[id]/scan`).
2. Brothers checking in via mobile GPS appear automatically as **Present (GPS)**.
3. For brothers without smartphones or arriving with digital ID cards, scan their QR code using the webcam or camera to log them as **Present (QR Scan)**.
4. Use the search bar to execute a **Manual Check-In** if needed.

### C. Reviewing Excuse Requests
1. Access the **Pending Excuses** tab.
2. Review the submitted reasons and select **Approve (Excused)** or **Decline (Absent)**.

---

## 8. Automated Engagement & Reminder Engine

The Commandery utilizes an automated quarterly engagement workflow powered by Supabase Edge Functions and Resend:

- **Schedule**: Executes quarterly (January, April, July, October).
- **Communication Categorization**:
  - *Appreciation*: For members with fully cleared accounts.
  - *Encouragement*: For members who have paid 50%+ of their obligation.
  - *Gentle Reminder*: For members between 25% and 50% settlement.
  - *Delinquency Notice*: For members with zero payments recorded.
  - *Registrar Intervention Case*: Creates an escalated case in `registrar_queues` for members with 2+ years of unpaid arrears.
  - *Suspension Review*: Alerts the Worthy President and Registrar for accounts overdue by 3+ years.

---

## 9. Financial Audit Trails & Governance

To satisfy constitutional audit requirements:
1. Navigate to **Financial Audit Trail** (`/registrar/financials/audit`).
2. Every modification to rates, assessments, payments, and welfare entries is immutably logged with:
   - User ID & Email of the acting officer.
   - Exact timestamp.
   - Pre-change values vs post-change values (JSON diff).
   - Entity type and affected member ID.
3. Click **Download Audit Pack** to export full CSV/PDF logs for the annual Commandery Audit Committee.

---

*Commandery #500 Administration System — Built for fraternal integrity and operational excellence.*

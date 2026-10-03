# Master System Coherence & Integration Workplan
### Consolidating One Week of High-Velocity Feature Development into a Unified Platform
**Commandery #500 Management Suite**

---

## 1. Executive Summary & Context

Over the past week, the platform has seen extensive functional expansion across several major operational pillars:
1. **Initiation Cohorts & Cadet Transitions** (`/registrar/initiation-cohorts`)
2. **Historical & Deceased Member Archival Roll** (`/registrar/historical-members`)
3. **Meeting Operations, Preset Locations & QR Attendance** (`/registrar/meetings`, QR scan)
4. **Communications & Broadcast Engine** (`/registrar/communications` via SMS & Resend)
5. **Database Disaster Recovery & Automated Email Backups** (`/registrar/backup`)
6. **Digital ID Cards, QR Verification & Bio Service Narratives** (`/verify/[id]`, `/registrar/members/[id]/bio`)
7. **Officer Corps, Succession Timelines, Board of Trustees & Degree Temples** (`/registrar/officers`, `/registrar/presidents`)
8. **Financials, Rates Engine & Welfare Fund** (`/registrar/financials`, `/registrar/welfare`)

While each individual module functions effectively, they currently operate as **semi-independent silos**. 

The goal of this workplan is to weave these disparate components into an **interconnected, intuitive ecosystem** that reflects authentic KSJI fraternal governance.

---

## 2. Core Pillars of the Coherence Architecture

```mermaid
graph TD
  subgraph Central Core
    MP[Unified Fraternal Life-Cycle Engine]
  end

  subgraph Pillar A: Governance & Organization
    Off[Officer Corps & Mid-Term Succession]
    BoT[Constitutional Board of Trustees]
    DT[Degree Temples: 4th Chevaliers & 5th Nobles]
    Com[Standing Committees: Welfare, Audit, etc.]
  end

  subgraph Pillar B: Operations & Fraternal Life
    Coh[Initiation Cohorts]
    Meet[Meetings & Location Presets]
    Att[Live Attendance & QR Scanning]
    Comm[Targeted Communications: SMS & Email]
  end

  subgraph Pillar C: Credentials, History & Integrity
    Bio[Dossier & Auto-Generated Citation]
    ID[Digital ID & QR Verification]
    Hist[Memorial Roll & Deceased Archive]
    DR[Disaster Recovery & Scheduled Backup]
  end

  MP --> Pillar A: Governance & Organization
  MP --> Pillar B: Operations & Fraternal Life
  MP --> Pillar C: Credentials, History & Integrity
```

---

## 3. Workplan Phases & Feature Specifications

### Phase 1: The Unified Governance Hub & Degree Temples
**Objective:** Eliminate confusion between Local Officers, Degree Temples, Committees, and the Constitutional Board of Trustees.

1. **Governance Shell (`/registrar/governance`)**:
   - Single tabbed navigation bringing together:
     - **Tab 1: Commandery Officers**: Biennial elective & appointive officers with mid-term succession timelines.
     - **Tab 2: Board of Trustees**: Live generation of Incumbent Officers + Roll of Past Worthy Presidents.
     - **Tab 3: Degree Temples**: Dedicated rosters for **Chevaliers Temple (4th Degree)** headed by Grand Master, and **Nobles' Temple (5th Degree)** headed by Noble Grand Master.
     - **Tab 4: Standing Committees**: The official home for the **Welfare Committee** (Welfare Treasurer, Secretary, Chair), Audit Committee, and special event committees.
2. **Harmonized Permissions & Roles**:
   - Welfare Treasurer automatically receives permissions to log welfare contributions without needing administrative officer status.

---

### Phase 2: Fraternal Life-Cycle Integration (Cohorts $\rightarrow$ Active $\rightarrow$ Temples $\rightarrow$ Memorial Roll)
**Objective:** Connect the brother's chronological progression so no stage is an isolated silo.

1. **Lifelong Service Journey Timeline on Member Profile**:
   - Visually maps each brother from his **Initiation Cohort** $\rightarrow$ **Uniform Exemplification** $\rightarrow$ **Commandery Offices Held** $\rightarrow$ **Degree Elevations (4th Chevalier / 5th Noble)** $\rightarrow$ **Honor Roll / Memorial Roll**.
2. **Biographical Citation Synchronization**:
   - Automatically update the biographical service narrative whenever:
     - An officer tenure begins or ends.
     - A brother advances in degree.
     - A milestone cohort anniversary is reached.
3. **Cohort Elevation Tracker**:
   - On `/registrar/initiation-cohorts`, display cohort statistics: how many brothers have attained 4th Degree (Chevalier), 5th Degree (Noble), served as Worthy President, or entered the Memorial Roll.

---

### Phase 3: Operations Cross-Pollination (Meetings $\leftrightarrow$ Attendance $\leftrightarrow$ Communications) ✅ Complete
**Objective:** Leverage attendance, meeting locations, and roster data to drive intelligent communications, quorum verification, and targeted outreach.

1. **Targeted Broadcast Composer (`/registrar/communications/send` & `communicationService.ts`)**:
   - Direct integration enabling multi-channel (SMS & Email) dispatch targeted across distinct fraternity segments:
     - **All Active Living Members** (System-level exclusion of deceased and dismissed members per Ghana Data Protection Act 2012).
     - **Board of Trustees & Past Presidents** (Identified through executive tenure records).
     - **Nobles (5th Degree)** (Identified through highest degree certifications).
     - **Chevaliers (4th Degree Chapter)** (Identified through Chapter elevation records).
     - **Initiation Cohort Years** (Targeting by initiation year dropdown).
     - **Commandery Committees** (Targeting across the 9 official committees instituted in the *Committee Governance, Structure & Appointment Manual*, Feb 2026: Education & Rituals, Membership & Initiation, Liturgical & Spiritual, Cadets & Juniors, Military & Drill, Finance/Budget, Welfare, Social, Funeral).
     - **Financial Standing** (Delinquent/Arrears only, Partially Paid, Fully Paid).
     - **Custom Ad-Hoc Multi-Select** (Searchable individual selection).
   - **Cellular Carrier Protection**: Outbound SMS broadcasts are automatically rate-limited to 3 SMS/minute (20-second intervals) to prevent carrier spam blockades.
   - **Live Previews & Tag Interpolation**: Real-time SMS and HTML email previews supporting `{memberName}`, `{degree}`, and `{balance}` tags.

2. **Mandatory Officers Roll & Quorum Monitor Bar (`RegistrarMeetingsClient.tsx`)**:
   - Live visual monitor on meetings tracking attendance status (Present, Excused, Absent) across 7 mandatory offices:
     - Worthy President, 1st Vice President, 2nd Vice President, Commander (Captain), Recording Secretary, Financial Secretary, Treasurer.
   - Live Quorum badge indicating whether executive quorum (4+ officers) has formed.
   - Live Board of Trustees quorum counter (*X of Y Present*).
   - Direct 1-click **"⚡ Send Reminder to Unchecked Members"** trigger to broadcast real-time session notices to brothers yet to sign in.

3. **Attendance Scanning & Fraternal Honors (`/registrar/meetings/[meetingId]/scan`)**:
   - Camera QR scanner displays fraternal honors upon successful check-in: Degree Rank badge (`👑 Noble (5th Degree)`, `🏅 Chevalier (4th Degree)`, `⚔️ Knight`) and executive leadership office tag.

4. **Location Presets in Automated Notices (`communicationService.ts`)**:
   - Meeting notices automatically detect venue coordinates against `KSJI_VENUE_PRESETS` (St. Bernadette Soubirous School, St. Margaret-Mary Parish Hall, Dansoman SSNIT Flats), injecting venue name, physical address, and Google Maps direction links into SMS and HTML templates.

---

### Phase 4: Financial, Welfare & Good Standing Integrity
**Objective:** Align the strict "Deceased & Inactive Archival Policy" across all billing, ID verification, and welfare systems.

1. **Consistent Archival Filter Across All Financial Queries**:
   - Guarantee that members with status `Deceased`, `Dismissed`, or `Transfer-Out` are systematically excluded from dues assessments, automated delinquency SMS, and welfare subscriber quotas, while permanently retained in historical records.
2. **Dynamic Standing on Digital ID Cards (`/verify/[id]`)**:
   - Verification badges that reflect:
     - Official Degree attained (Knight, Chevalier, Noble).
     - Current Administrative Office or Past President status.
     - Fraternal Good Standing certification.

---

### Phase 5: Platform Reliability, Backup & Navigation Overhaul
**Objective:** Provide unified navigation and rock-solid platform reliability for administrators and general brothers.

1. **Top-Level Navigation Simplification**:
   - Consolidate navigation links into 4 clean clusters:
     - 🏛️ **Governance** (Officers, Board of Trustees, Degree Temples, Committees)
     - ⚔️ **Fraternal Life** (Roster, Cohorts, Meetings, Attendance, Broadcasts)
     - 💰 **Treasury & Welfare** (Dues, Rate Table, Welfare Fund, Receipts)
     - 📜 **Archives & System** (Historical Roll, Past Presidents, Disaster Recovery Backup)
2. **Scheduled Automated Backup Heartbeat**:
   - Background cron triggering weekly encrypted database backups delivered via Resend to the Registrar's disaster recovery inbox.

---

## 4. Implementation Phasing & Milestones

| Phase | Core Deliverable | Key Systems Integrated | Status |
|---|---|---|---|
| **Phase 1** | **Governance & Leadership Hub** | Officers, Trustees, Degree Temples, Committees | ✅ Complete |
| **Phase 2** | **Fraternal Service Journey** | Cohorts, Dossiers, Biographical Narratives, Historical Roll | ✅ Complete |
| **Phase 3** | **Operations Cross-Pollination** | Meetings, QR Attendance, Location Presets, Targeted SMS/Email | ✅ Complete |
| **Phase 4** | **Standing & Verification Engine** | Financial Invoicing, Welfare Fund, Digital IDs, Public QR Verify | ✅ Complete |
| **Phase 5** | **Navigation & Disaster Recovery** | Portal Shells (`/registrar` & `/me`), Automated Backup Schedules | ✅ Complete |

---

## 5. Review & Execution Strategy

- **Zero Disruption to Active Data**: All improvements build on top of existing database schemas and verified services.
- **Progressive Delivery**: Each phase can be deployed and verified independently without breaking existing member records or registrar workflows.

---

## 6. Privacy, Data Protection & Data Storage Compliance Policy
### Institutional Data Governance Standard for Commandery #500 Member App
*(Compliant with the Ghana Data Protection Act, 2012 [Act 843] and International Privacy Principles)*

### 1. Data Controller & Processing Boundaries
- **Data Controller:** St. Margaret-Mary Commandery No. 500, Knights of St. John International, P.O. Box DS 1234, Dansoman, Accra, Ghana.
- **Scope of Data Collected:** Personal identity records (titles, legal names, dates of birth, photos), contact points (mobile numbers, residential and email addresses), sacramental and fraternal exemplification records, military ranks, family and dependent benefit records, and treasury ledgers (dues assessments, welfare contributions, and disbursements).
- **Sole Fraternal Purpose:** All member data processed within this platform is strictly reserved for fraternal administration, voting eligibility, welfare scheme disbursement, pastoral care, and holy memorial archiving.
- **Commercial Prohibition:** Under no circumstances shall member data, contact lists, phone directories, or financial ledgers be sold, leased, shared, or distributed to third-party commercial, advertising, or marketing organizations.

### 2. Lawful Basis & Consent
- Data processing is grounded in **Legitimate Fraternal Interest** (Act 843 §18) necessary for membership governance under the Constitution of the Knights of St. John International.
- Members consent to fraternal notices (SMS and email) for official meetings, annual dues assessments, welfare benefit updates, and bereavement announcements upon initiation into Commandery #500.

### 3. Deceased & Inactive Archival Retention Policy ("The Right to Fraternal History")
- **Permanent Retention of Deceased Members:** Deceased brothers are **never erased or purged** from the database (`status = 'Deceased'` or `is_deceased = true`). In accordance with sacred fraternal traditions, deceased members are permanently retained in the Master Roll and Biographical Archive to honor their lifelong service to Church and Commandery.
- **Operational Billing Exclusions:** Deceased, dismissed, and transferred members are strictly insulated from annual dues assessments, delinquency collection queues, automated SMS broadcast alerts, and welfare active subscriber quotas.
- **Transferred & Dismissed Members:** Preserved with restricted super-admin viewing permissions for audit integrity and historical ledger balance reconciliation.

### 4. Data Storage, Architecture & Technical Security Measures
- **Storage Infrastructure:** Cloud-hosted PostgreSQL on Supabase enterprise cloud infrastructure, physically located in certified ISO/IEC 27001, SOC 2 Type II, and PCI DSS compliant enterprise data centers (AWS).
- **Encryption in Transit:** All client-server communication is strictly enforced over HTTPS using **TLS 1.3** cryptographic protocols.
- **Encryption at Rest:** Sensitive records, database volumes, and object storage backups are encrypted at rest using industry-standard **AES-256** encryption keys managed via cloud KMS.
- **Role-Based Access Control (RBAC) & Row-Level Security (RLS):**
  - *General Members (`/me`):* Governed by RLS policies permitting access strictly to their own profile, dependents, attendance metrics, and personal statement of standing.
  - *Registrars & Financial Officers:* Scoped administrative roles restricted by authenticated session tokens with immutable audit logging (`financial_audit_log`, `welfare_audit_log`).
  - *Public QR Verification (`/verify/[id]`):* Sanitized, read-only public payload exposing only verification validity, official degree attained, active leadership office, and good standing certification seal—omitting private financial balances, home addresses, phone numbers, and dependent data.

### 5. Automated Backup, Heartbeat & Disaster Recovery Governance
- **Automated Weekly Snapshots:** A serverless daemon cron (`/api/cron/backup`) triggers every Sunday at 00:00 UTC to compile a full relational snapshot across all 27 core database tables.
- **Data Integrity & Checksum Verification:** Each backup payload is validated with an unalterable **SHA-256** cryptographic hash and compressed with Gzip to minimize exposure surface.
- **Encrypted Vault Storage:** Snapshot archives are deposited into private Supabase storage vaults accessible only via 30-day time-limited signed URLs and delivered directly to the Commandery's official disaster recovery inbox.

### 6. Data Subject Rights & Rectification
- Every brother in good standing retains the right to:
  1. **Access:** View their complete personal dossier, family records, and dues ledger via the `/me` portal at any time.
  2. **Rectification:** Submit updates to their residential address, mobile numbers, occupation, and emergency contacts through their self-service portal.
  3. **Exportability:** Generate and print official signed Statements of Good Standing and Personal Audit Sheets for transfer or audit purposes.


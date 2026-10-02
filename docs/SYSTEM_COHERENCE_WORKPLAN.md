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

### Phase 3: Operations Cross-Pollination (Meetings $\leftrightarrow$ Attendance $\leftrightarrow$ Communications)
**Objective:** Leverage attendance, meeting locations, and roster data to drive intelligent communications.

1. **Targeted Broadcast Audiences in Communications**:
   - Direct integration between Communications and our new groups:
     - *Send to: Full Commandery*
     - *Send to: Board of Trustees Only*
     - *Send to: Specific Initiation Cohort*
     - *Send to: Degree Temples (Chevaliers / Nobles)*
     - *Send to: Committee Members*
2. **Attendance Quorum & Governance Alerts**:
   - Meeting check-in automatically alerts the presiding officer when:
     - A constitutional quorum of the Board of Trustees is present.
     - Specific mandatory officers (e.g. Recording Secretary, Commander) have checked in.
3. **Location Presets in Automated Notices**:
   - Meeting notices automatically inject the chosen preset location's map details into SMS and email alerts.

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

| Phase | Core Deliverable | Key Systems Integrated |
|---|---|---|
| **Phase 1** | **Governance & Leadership Hub** | Officers, Trustees, Degree Temples, Committees |
| **Phase 2** | **Fraternal Service Journey** | Cohorts, Dossiers, Biographical Narratives, Historical Roll |
| **Phase 3** | **Operations Cross-Pollination** | Meetings, QR Attendance, Location Presets, Targeted SMS/Email |
| **Phase 4** | **Standing & Verification Engine** | Financial Invoicing, Welfare Fund, Digital IDs, Public QR Verify |
| **Phase 5** | **Navigation & Disaster Recovery** | Portal Shells (`/registrar` & `/me`), Automated Backup Schedules |

---

## 5. Review & Execution Strategy

- **Zero Disruption to Active Data**: All improvements build on top of existing database schemas and verified services.
- **Progressive Delivery**: Each phase can be deployed and verified independently without breaking existing member records or registrar workflows.

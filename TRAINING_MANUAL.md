# 🛡️ KSJI Member Registry & Attendance Suite
## Official Training & Operations Manual

Welcome to the official training manual for the **KSJI Member Portal**. This application serves as the single source of truth for membership status, service records, and attendance tracking across all Commandery units. 

This guide is split into two sections: **Member Portal Operations** (for all brothers) and **Registrar Operations** (for administrative officers).

---

## 👥 Part 1: Member Portal Operations

Every brother uses the Member Portal to keep their official record up to date and check in to scheduled meetings.

### 1. Onboarding & Registration
To create your online profile:
1. Navigate to the login screen and toggle the pill to **Register Portal**.
2. Fill in your **First Name**, **Surname**, and **Phone / Mobile number**.
3. Under **Select Commandery**, type the name or number of your local unit (e.g., *St. Margaret-Mary No. 500*) and select it from the searchable dropdown.
4. **Registry Matching**: As you type your details, the system will automatically search the pre-existing database. If a matching record is found, a gold star indicator will appear: `✨ Registry Match Found`. This means you will be seamlessly linked to your history once approved!
5. Enter your email, set a strong password, and click **Submit Registration**.
6. **Waiting Room Status**: Once registered, your account status is set to `pending`. You must wait for your Registrar to link and activate your account before you can access the dashboard.

### 2. Updating Your Service Profile
Once logged in, use the navigation tabs at the top of the screen to complete your official record:
* **Overview**: View your digital membership status and a summary of your profile.
* **Edit Main Record**: Update your core bio, marital status, and spouse's name.
* **Family & Children**: Register children (names and birthdates) for family record-keeping.
* **Degree**: Record your current degree status (1st, 2nd, 3rd, or 4th Degree) along with exemplification dates and certificate numbers.
* **Positions**: Select positions held within the Commandery structure (e.g. *President*, *Commander*, *Sentinel*).
* **Military & Uniforms**: Record your uniformed ranks, height, chest measurements, and uniform status.
* **Emergency**: Keep emergency contacts and contact numbers updated for safety.

### 3. Geofenced Meeting Check-In
When attending a scheduled meeting:
1. Tap the **Attendance** tab in your member portal.
2. The page will instantly verify your current satellite coordinates. Ensure you allow location permissions on your smartphone.
3. Locate the meeting from the list of scheduled events.
4. **The Proximity Rule**: 
   * If you are within the specified radius (e.g., 100 meters) of the meeting coordinates, the system will show: `✅ Within Range!`. The **"Check In"** button will unlock. Click it to verify your presence.
   * If you are outside the boundary, the check-in button remains locked, and it displays: `⚠️ Too Far: Move closer to check in`.

### 4. Submitting Excuse Requests (Absences)
If you cannot attend an upcoming meeting:
1. In the **Attendance** tab, locate the upcoming meeting.
2. Click **Submit Excuse**.
3. Write a clear, brief reason for your absence (e.g., *Work travel*, *Unwell*) and click submit.
4. Your request will enter `PENDING` status. Once reviewed and approved by the Registrar, you will be flagged as **"Excused"** on the official attendance reports rather than "Absent."

---

## 🛡️ Part 2: Registrar Operations

Registrars have executive access to manage registrations, maintain member lifecycles, and coordinate meeting check-ins.

### 1. The Dashboard & The Waiting Room
The **Registrar Dashboard** is your command center (`/registrar`):
* **Summary Cards**: Instantly view the Total Registry size and pending onboarding counts.
* **⏳ Waiting Room**: Surfaces all pending registrations from new users.
  * **Approve & Link**: If the user's details match a pre-existing registry record, click this button to merge their active profile with their historical record.
  * **Approve as New**: If a new recruit registers who is not yet in the pre-existing database, click this to generate a clean registry entry for them.
  * **Link Manually**: If the match isn't automated (e.g., due to a change of email), click this button, type their name, select the correct record from your Roster, and click *Approve & Link to Selected*.
  * **Reject**: Deletes unauthorized or false signup requests.

### 2. Managing the Member Lifecycle (Suspensions & Dismissals)
To edit a member's official status, navigate to **Members**, select the brother, and click **Edit main record** to locate the **Lifecycle Status** controls:
* **Suspended**:
  * Set status to `Suspended`. The system automatically dates the suspension to today.
  * **🚨 The 3-Month Warning Alert**: On your dashboard, a prominent red warning banner will automatically display a list of all suspended members. If a member remains suspended for **90 days or more**, it triggers a critical warning: `⚠️ ACTION REQUIRED: Reinstatement or Dismissal window expired.`
* **Dismissed**:
  * If a member does not resolve their suspension issues within the 3-month window, set their status to `Dismissed`. The system will automatically date their dismissal and record it for archival history.
* **Reinstated (Active)**:
  * When a brother resolves all outstanding conflicts, toggle their status back to `Active`. The system will automatically record today’s date as their **Date of Reinstatement** to maintain a historical lifecycle timeline.

### 3. Creating & Managing Geofenced Meetings
To schedule a meeting and manage geofencing:
1. Tap the **Meetings** tab in your Registrar Portal (`/registrar/meetings`).
2. Complete the **Schedule Meeting** form:
   * **Meeting Title**: Enter a clear title (e.g. *June 2026 General Meeting*).
   * **Date & Time**: Specify the schedule.
   * **Latitude & Longitude**: The exact geographic coordinates of the meeting venue.
     * > 💡 **Pro-Tip**: Stand at the front of the meeting hall and click the **📌 Pin Current Location** button! The system will automatically acquire your coordinates and fill in the fields instantly!
   * **Radius**: Define how close members must be to check in (default is 100 meters).
3. Click **Schedule Meeting**. The geofence is now active!

### 4. Reviewing Excuses & Manual Overrides
Once a meeting is scheduled, click on it from your **Recent Meetings** list to open the live management dashboard:
* **✉️ Pending Absence Requests**:
  * Shows reasons submitted by members who cannot make it.
  * Click **Approve** to accept the excuse. They will instantly appear as **"Excused"** on reports.
  * Click **Decline** if the reason is insufficient. They will remain marked as "Absent."
* **📊 Live Attendance Roster**:
  * Displays a real-time list of all active members in your Commandery along with their check-in state: `PRESENT (GPS)`, `PRESENT (MANUAL)`, `EXCUSED`, or `ABSENT`.
  * **🔗 Manual Check-In Override**: For brothers who do not have smart devices or experience coordinate drift, click the manual check-in button. This overrides the geofence and marks them as Present instantly.

### 5. Reporting & Auditing
Use the **Reporting Hub** (`/registrar/reports`) to filter and audit records:
* Generate official **Registry Roster Sheets** matching military standard formats.
* Export print-ready PDFs for Commandery meetings.
* View and print dynamic **Service Bios & Testimonial Reports** detailing a member's complete history, honours, positions, degrees, and spouse information.

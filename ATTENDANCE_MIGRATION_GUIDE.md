# 📊 Historical Attendance Data Migration Guide

This guide details how to import your historical attendance matrix from an Excel (`.xlsx`) sheet directly into your live Supabase Membership Portal database.

We have written a high-performance, automated Node.js migration script located at:
📁 [import_attendance_matrix.js](file:///c:/App/MemberApp/scripts/import_attendance_matrix.js)

---

## 🛠️ Step 1: Format Your Excel File

The migration script reads your Excel file directly. Your sheet should follow this matrix format:

1. **Rows represent members**: Each row corresponds to a single brother.
2. **Columns represent meetings**: 
   * The first columns must contain **Surname** and **First Name**.
   * Subsequent columns represent specific meeting dates (e.g. `09-05-2026`, `11-04-2026`).
3. **Cell values represent presence**:
   * A cell with **`P`** (or `Present`) represents a check-in.
   * Empty cells or other letters represent absences.

> [!NOTE]
> Ensure your Excel filename is exactly:
> **`KSJI_500_Attendance_Matrix_Final_Reconciled.xlsx`**

---

## 📂 Step 2: Place the File in the Project Root

Move your Excel workbook file into the project root directory:
📍 `c:\App\MemberApp\KSJI_500_Attendance_Matrix_Final_Reconciled.xlsx`

---

## ⚡ Step 3: Run the Migration Command

1. Open your terminal or powershell.
2. Navigate to your project directory and execute:
   ```bash
   node c:\App\MemberApp\scripts\import_attendance_matrix.js
   ```

3. The script will execute the following steps automatically:
   * **Pre-fetch Roster**: Loads all currently active members from your database.
   * **Meeting Auto-Scheduling**: Loops through each date column in Excel and schedules the geofenced meeting automatically (if it doesn't already exist).
   * **Smart Name Matching**: Matches Excel names against your live database using first and last name combinations.
   * **Auto-Creation Safeguard**: If the script finds a name in the Excel file that does not yet exist in your database, it will **automatically create a minimal active registry entry** for that brother, saving you from having to enter them manually!
   * **Clean Rollout**: Deletes any pre-existing matrix attendance records for the dates being processed to prevent duplicate log entries if you re-run the script.
   * **Bulk Ingestion**: Upserts all `Present` check-in records into your live attendance roster in highly efficient database batches.

---

## 🔍 Step 4: Verify the Ingestion

Once the script completes, you will see a detailed execution summary in your terminal:
* **Total meetings processed** (e.g. 37 months)
* **Total attendance records saved** (e.g. 1034 rows)
* **Brothers auto-created** (e.g. 30 brothers)

You can immediately open your **Registrar Portal** or **Reporting Hub** on the web, navigate to the **Meetings** tab, and view your complete three-year historical logs and live charts!

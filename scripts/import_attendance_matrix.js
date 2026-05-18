/**
 * KSJI Attendance Matrix XLSX Importer
 * Automatically parses the attendance matrix spreadsheet and syncs with Supabase.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

// 1. Supabase Configurations
const SUPABASE_URL = 'https://pcsslgufwjzvolbtygwc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjc3NsZ3Vmd2p6dm9sYnR5Z3djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY0OTQ5NCwiZXhwIjoyMDkwMjI1NDk0fQ.CU0VoIqKl5cd9g86jSYFxjx4qPKocmJgILxAx29sESo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Default St. Margaret Mary Commandery No. 500 ID
const COMMANDERY_ID = 'b31c4884-9518-4fdf-bc55-98e3425189cc';

// Default Geofence parameters for historical meetings
const DEFAULT_LATITUDE = 5.6037;
const DEFAULT_LONGITUDE = -0.1870;
const DEFAULT_RADIUS = 100;

function parseDateHeader(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  // Convert DD-MM-YYYY -> YYYY-MM-DD
  const match = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (match) {
    const [, dd, mm, yyyy] = match;
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}

// Robust member matchmaking algorithm
function findMatchingMember(excelName, dbMembers) {
  if (!excelName) return null;
  const cleanExcelName = excelName.toLowerCase().replace(/[\s\.\-]+/g, ' ').trim();
  const excelWords = cleanExcelName.split(' ').filter(Boolean);

  // 1. Check exact full match in either order (First+Last or Last+First)
  let match = dbMembers.find(m => {
    const dbFull1 = `${m.first_name} ${m.surname}`.toLowerCase().replace(/[\s\.\-]+/g, ' ').trim();
    const dbFull2 = `${m.surname} ${m.first_name}`.toLowerCase().replace(/[\s\.\-]+/g, ' ').trim();
    return cleanExcelName === dbFull1 || cleanExcelName === dbFull2;
  });
  if (match) return match;

  // 2. Check if all surname words and at least one first name word are present in the Excel name
  match = dbMembers.find(m => {
    const firstWords = String(m.first_name).toLowerCase().replace(/[\s\.\-]+/g, ' ').split(' ').filter(Boolean);
    const surnameWords = String(m.surname).toLowerCase().replace(/[\s\.\-]+/g, ' ').split(' ').filter(Boolean);

    const hasSurname = surnameWords.every(w => excelWords.includes(w));
    const hasFirstName = firstWords.some(w => excelWords.includes(w));
    return hasSurname && hasFirstName;
  });
  if (match) return match;

  // 3. Fallback: Check if the Excel name contains the surname and first name as substrings
  match = dbMembers.find(m => {
    const sName = String(m.surname).toLowerCase().trim();
    const fName = String(m.first_name).toLowerCase().trim();
    return cleanExcelName.includes(sName) && (cleanExcelName.includes(fName) || fName.includes(cleanExcelName));
  });

  return match;
}

async function main() {
  const xlsxPath = path.join(__dirname, '..', 'KSJI_500_Attendance_Matrix_Final_Reconciled.xlsx');
  
  if (!fs.existsSync(xlsxPath)) {
    console.error(`❌ Excel file not found: ${xlsxPath}`);
    process.exit(1);
  }

  console.log(`\n======================================================`);
  console.log(`🛡️  KSJI 3-YEAR ATTENDANCE MATRIX MIGRATION STARTING  🛡️`);
  console.log(`======================================================\n`);

  console.log(`📖 Loading XLSX Workbook: ${xlsxPath}`);
  const workbook = XLSX.readFile(xlsxPath);
  const sheet = workbook.Sheets['Attendance Matrix'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  if (rows.length < 2) {
    console.error(`❌ Error: Sheet is empty or missing headers.`);
    process.exit(1);
  }

  // Column Parsing
  const headers = rows[0];
  const dateColumns = []; // Array of { index, rawDate, pgDate, meetingId }
  
  for (let c = 2; c < headers.length; c++) {
    const rawDate = headers[c];
    const pgDate = parseDateHeader(rawDate);
    if (pgDate) {
      dateColumns.push({ index: c, rawDate, pgDate });
    }
  }

  console.log(`📅 Found ${dateColumns.length} attendance meeting columns.`);

  // Load all Commandery members
  console.log(`⚡ Pre-fetching Commandery Members directory...`);
  const { data: dbMembers, error: mErr } = await supabase
    .from('members')
    .select('id, first_name, surname')
    .eq('commandery_id', COMMANDERY_ID);

  if (mErr) {
    console.error(`❌ Failed to fetch database members:`, mErr.message);
    process.exit(1);
  }
  console.log(`✅ Loaded ${dbMembers.length} active Commandery members for mapping.\n`);

  // --- Step 1: Ensure Meetings Exist ---
  console.log(`📌 Ensuring all ${dateColumns.length} historical meetings are scheduled...`);
  for (const dateCol of dateColumns) {
    const meetingTitle = `Commandery Monthly Meeting (${dateCol.rawDate})`;
    
    // Check if meeting exists
    const { data: extMtg, error: mtgLookupErr } = await supabase
      .from('meetings')
      .select('id')
      .eq('commandery_id', COMMANDERY_ID)
      .eq('title', meetingTitle)
      .eq('date', `${dateCol.pgDate}T00:00:00Z`)
      .maybeSingle();

    if (extMtg) {
      dateCol.meetingId = extMtg.id;
    } else {
      // Create new historical meeting
      const { data: newMtg, error: createMtgErr } = await supabase
        .from('meetings')
        .insert({
          commandery_id: COMMANDERY_ID,
          title: meetingTitle,
          date: `${dateCol.pgDate}T10:00:00Z`, // Default to 10 AM local
          latitude: DEFAULT_LATITUDE,
          longitude: DEFAULT_LONGITUDE,
          radius_meters: DEFAULT_RADIUS
        })
        .select()
        .single();

      if (createMtgErr) {
        console.error(`❌ Failed to schedule meeting on ${dateCol.pgDate}:`, createMtgErr.message);
        process.exit(1);
      }
      dateCol.meetingId = newMtg.id;
    }
  }
  console.log(`✅ All meetings prepared & mapped in Supabase.\n`);

  // --- Step 2: Parse and Upsert Attendance Matrix ---
  let attendanceCount = 0;
  let excuseCount = 0;
  let skippedMembers = [];
  let matchedMembersCount = 0;
  
  const checkInRows = []; // To insert into tblAttendance
  const excuseRows = [];  // To insert into tblAbsenceRequests

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const excelName = row[1];
    
    if (!excelName) continue;

    const matchedMember = findMatchingMember(excelName, dbMembers);
    if (!matchedMember) {
      skippedMembers.push(excelName);
      continue;
    }
    
    matchedMembersCount++;

    // Map each date column for this member
    for (const dateCol of dateColumns) {
      const cellValue = row[dateCol.index];
      if (!cellValue) continue; // Absent by default (no DB record required)

      const valLower = String(cellValue).toLowerCase().trim();
      if (valLower === 'present' || valLower === 'p') {
        checkInRows.push({
          meeting_id: dateCol.meetingId,
          member_id: matchedMember.id,
          method: 'manual',
          commandery_id: COMMANDERY_ID
        });
      } else if (valLower === 'excused' || valLower === 'e' || valLower === 'excuse') {
        excuseRows.push({
          meeting_id: dateCol.meetingId,
          member_id: matchedMember.id,
          reason: 'Historical Excel Excuse',
          status: 'approved'
        });
      }
    }
  }

  console.log(`⚡ Matchmaking Summary:`);
  console.log(`   - Matched and linked: ${matchedMembersCount} brothers.`);
  console.log(`   - Unmatched registry names: ${skippedMembers.length} (listed below)`);
  
  if (skippedMembers.length > 0) {
    console.log(`   🚨 Unmatched names list: [ ${skippedMembers.join(', ')} ]\n`);
  }

  // --- Clean Up Existing Records for these meetings to prevent duplicates ---
  const meetingIds = dateColumns.map(d => d.meetingId).filter(Boolean);
  if (meetingIds.length > 0) {
    console.log(`🧹 Cleaning up existing attendance records for the selected meetings...`);
    await supabase.from('attendance').delete().in('meeting_id', meetingIds);
    await supabase.from('absence_requests').delete().in('meeting_id', meetingIds);
    console.log(`✅ Existing records cleaned.`);
  }

  // --- Commit Attendance (Present) Records ---
  if (checkInRows.length > 0) {
    console.log(`🚀 Committing ${checkInRows.length} 'Present' check-ins in batches to Supabase...`);
    const chunkSize = 500;
    for (let i = 0; i < checkInRows.length; i += chunkSize) {
      const chunk = checkInRows.slice(i, i + chunkSize);
      const { error: insertErr } = await supabase
        .from('attendance')
        .insert(chunk);

      if (insertErr) {
        console.error(`❌ Attendance Batch Failed at index ${i}:`, insertErr.message);
        process.exit(1);
      }
      attendanceCount += chunk.length;
    }
  }

  // --- Commit Excuse Records ---
  if (excuseRows.length > 0) {
    console.log(`🚀 Committing ${excuseRows.length} 'Excused' absence requests in batches to Supabase...`);
    const chunkSize = 500;
    for (let i = 0; i < excuseRows.length; i += chunkSize) {
      const chunk = excuseRows.slice(i, i + chunkSize);
      const { error: insertErr } = await supabase
        .from('absence_requests')
        .insert(chunk);

      if (insertErr) {
        console.error(`❌ Excuse Batch Failed at index ${i}:`, insertErr.message);
        process.exit(1);
      }
      excuseCount += chunk.length;
    }
  }

  console.log(`\n======================================================`);
  console.log(`🎉  3-YEAR MATRIX MIGRATION COMPLETED SUCCESSFULLY  🎉`);
  console.log(`======================================================`);
  console.log(`✅ Matched Brothers:        ${matchedMembersCount}`);
  console.log(`📅 Meetings Processed:     ${dateColumns.length}`);
  console.log(`📊 Logged 'Present' Rows:  ${attendanceCount}`);
  console.log(`📝 Logged 'Excused' Rows:  ${excuseCount}`);
  console.log(`======================================================\n`);
}

main().catch(err => {
  console.error(`❌ Fatal Migration Error:`, err);
});

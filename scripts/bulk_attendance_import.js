/**
 * KSJI Attendance History Bulk Importer
 * Populates Supabase database with historical Excel/CSV attendance logs.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Supabase Configurations
const SUPABASE_URL = 'https://pcsslgufwjzvolbtygwc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjc3NsZ3Vmd2p6dm9sYnR5Z3djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY0OTQ5NCwiZXhwIjoyMDkwMjI1NDk0fQ.CU0VoIqKl5cd9g86jSYFxjx4qPKocmJgILxAx29sESo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Default St. Margaret Mary Commandery No. 500 ID
const DEFAULT_COMMANDERY_ID = 'b31c4884-9518-4fdf-bc55-98e3425189cc';

// Default Meeting Geofence values (for historical meetings)
const DEFAULT_LATITUDE = 5.6037; // Default Accra Center
const DEFAULT_LONGITUDE = -0.1870;
const DEFAULT_RADIUS = 100;

function toPgDate(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  
  // Try parsing DD/MM/YYYY or DD-MM-YYYY
  const match = String(value).match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})$/);
  if (match) {
    let [, dd, mm, yyyy] = match;
    if (yyyy.length === 2) yyyy = (parseInt(yyyy) > 30 ? '19' : '20') + yyyy;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  
  // Try Date Object
  const d = new Date(value);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return null;
}

// Simple CSV parser that handles quotes and commas correctly
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function runImport() {
  const csvPath = path.join(__dirname, 'attendance.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error(`\n❌ Error: "attendance.csv" file not found in ${__dirname}`);
    console.log(`\n💡 How to execute this import:`);
    console.log(`1. Export your Excel sheet to a CSV file named "attendance.csv".`);
    console.log(`2. Place it in the directory: ${__dirname}`);
    console.log(`3. Ensure it has the following headers (order must match):`);
    console.log(`   Surname, FirstName, Date, MeetingTitle, Status`);
    console.log(`   Example:`);
    console.log(`   Doe, John, 2026-05-18, May Plenary Meeting, Present`);
    console.log(`   Smith, Jane, 2026-04-12, April Plenary Meeting, Excused`);
    process.exit(1);
  }

  console.log(`\n======================================================`);
  console.log(`🛡️  KSJI HISTORICAL ATTENDANCE BULK IMPORT STARTING  🛡️`);
  console.log(`======================================================\n`);

  const fileContent = fs.readFileSync(csvPath, 'utf8');
  const lines = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  
  if (lines.length <= 1) {
    console.error(`❌ Error: CSV file is empty or has no data rows.`);
    process.exit(1);
  }

  // Parse Headers
  const headers = parseCSVLine(lines[0]);
  console.log(`📋 Detected CSV Headers:`, headers.join(' | '));
  
  // Statistics
  let successCount = 0;
  let failCount = 0;
  let meetingCache = {}; // Stores meeting_id by title+date to avoid duplicate queries/creates
  let memberCache = {};  // Stores member_id by Surname+FirstName to avoid duplicate queries

  // Pre-load all members to make lookup lightning fast
  console.log(`⚡ Pre-fetching Commandery Members directory...`);
  const { data: members, error: mErr } = await supabase
    .from('members')
    .select('id, first_name, surname')
    .eq('commandery_id', DEFAULT_COMMANDERY_ID);

  if (mErr) {
    console.error(`❌ Failed to fetch members list:`, mErr.message);
    process.exit(1);
  }

  console.log(`✅ Loaded ${members.length} members for local matchmaking.\n`);

  // Index members locally
  members.forEach(m => {
    const key = `${String(m.surname).toLowerCase().trim()}_${String(m.first_name).toLowerCase().trim()}`;
    memberCache[key] = m.id;
  });

  // Loop through lines (skip header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const columns = parseCSVLine(line);
    
    if (columns.length < 5) {
      console.log(`⚠️  Line ${i + 1}: Skipped (Insufficient columns).`);
      failCount++;
      continue;
    }

    const [surname, firstName, rawDate, meetingTitle, rawStatus] = columns;
    const pgDate = toPgDate(rawDate);
    
    if (!pgDate) {
      console.log(`⚠️  Line ${i + 1}: Skipped (Invalid Date format: "${rawDate}").`);
      failCount++;
      continue;
    }

    // 1. Match Member ID
    const memberKey = `${surname.toLowerCase().trim()}_${firstName.toLowerCase().trim()}`;
    let memberId = memberCache[memberKey];

    // Fuzzy fallback (try to match by surname and containing first name)
    if (!memberId) {
      const match = members.find(m => 
        String(m.surname).toLowerCase().trim() === surname.toLowerCase().trim() &&
        (String(firstName).toLowerCase().includes(String(m.first_name).toLowerCase()) || 
         String(m.first_name).toLowerCase().includes(String(firstName).toLowerCase()))
      );
      if (match) {
        memberId = match.id;
      }
    }

    if (!memberId) {
      console.log(`🚨 Line ${i + 1}: Unmatched Member in Registry - [${surname}, ${firstName}]. Skipping attendance log.`);
      failCount++;
      continue;
    }

    // 2. Fetch or Create Meeting Scoped to Date + Title
    const meetingCacheKey = `${meetingTitle.trim()}_${pgDate}`;
    let meetingId = meetingCache[meetingCacheKey];

    if (!meetingId) {
      // Look up in database
      const { data: extMtg, error: mtgLookupErr } = await supabase
        .from('meetings')
        .select('id')
        .eq('commandery_id', DEFAULT_COMMANDERY_ID)
        .eq('title', meetingTitle)
        .eq('date', `${pgDate}T00:00:00Z`)
        .maybeSingle();

      if (extMtg) {
        meetingId = extMtg.id;
        meetingCache[meetingCacheKey] = meetingId;
      } else {
        // Create new meeting for this historical record
        console.log(`📌 Creating Historical Meeting: "${meetingTitle}" on ${pgDate}`);
        const { data: newMtg, error: createMtgErr } = await supabase
          .from('meetings')
          .insert({
            commandery_id: DEFAULT_COMMANDERY_ID,
            title: meetingTitle,
            date: `${pgDate}T10:00:00Z`, // Default to 10:00 AM local
            latitude: DEFAULT_LATITUDE,
            longitude: DEFAULT_LONGITUDE,
            radius_meters: DEFAULT_RADIUS
          })
          .select()
          .single();

        if (createMtgErr) {
          console.error(`❌ Failed to create meeting:`, createMtgErr.message);
          failCount++;
          continue;
        }
        meetingId = newMtg.id;
        meetingCache[meetingCacheKey] = meetingId;
      }
    }

    // Normalize Status
    let status = 'Absent';
    const statusLower = rawStatus.toLowerCase().trim();
    if (statusLower.includes('present') || statusLower === 'p') status = 'Present';
    else if (statusLower.includes('excuse') || statusLower === 'e' || statusLower === 'ex') status = 'Excused';

    // 3. Upsert Attendance Record
    const { error: attErr } = await supabase
      .from('attendance')
      .upsert({
        meeting_id: meetingId,
        member_id: memberId,
        status: status,
        method: status === 'Present' ? 'manual' : null,
        verified: status === 'Present'
      }, {
        onConflict: 'meeting_id,member_id'
      });

    if (attErr) {
      console.error(`❌ Row ${i + 1}: Failed to log attendance for ${firstName} ${surname}:`, attErr.message);
      failCount++;
    } else {
      successCount++;
    }
  }

  console.log(`\n======================================================`);
  console.log(`🎉  IMPORT COMPLETED SUCCESSFULLY  🎉`);
  console.log(`======================================================`);
  console.log(`✅ Successfully Logged:  ${successCount} records`);
  console.log(`⚠️  Skipped / Failed:     ${failCount} records`);
  console.log(`📅 Meetings Processed:  ${Object.keys(meetingCache).length} meetings`);
  console.log(`======================================================\n`);
}

runImport().catch(err => {
  console.error(`\n❌ Fatal Execution Error:`, err.message);
});

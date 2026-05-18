const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pcsslgufwjzvolbtygwc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjc3NsZ3Vmd2p6dm9sYnR5Z3djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY0OTQ5NCwiZXhwIjoyMDkwMjI1NDk0fQ.CU0VoIqKl5cd9g86jSYFxjx4qPKocmJgILxAx29sESo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const COMMANDERY_ID = 'b31c4884-9518-4fdf-bc55-98e3425189cc';

// Manual overrides for the two tricky matches
const MANUAL_MATCHES = {
  'ISMEAL BUABEY KAKRABA-QUARSHIE': '0f6451a3-dee0-49a3-aa02-8f4d774e0c15',
  'CHARLES WALABO ANTHONY AKWAKOKU': '57107a40-e059-4526-9c05-d0447b6e8ae7'
};

function normalizeName(name) {
  return name
    .toUpperCase()
    .replace(/^(MR\.|MRS\.|CAPT\.|LT\.|REV\.|DR\.|BRO\.)\s+/g, '')
    .replace(/[^A-Z\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function namesMatch(list1, list2) {
  if (!list1.length || !list2.length) return false;
  const intersection = list1.filter(n => list2.includes(n));
  return intersection.length >= 2;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  dateStr = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  if (/^\d{4}$/.test(dateStr)) return `${dateStr}-01-01`; // Standardize year-only to Jan 1st
  return null;
}

async function main() {
  console.log('🏁 Starting district insurance data import with dedicated Dependents table...');

  // 0. Verify the dependents table exists
  const { error: tableCheckErr } = await supabase.from('dependents').select('id').limit(1);
  if (tableCheckErr) {
    console.error('\n❌ ERROR: The "dependents" table does not exist in your database yet!');
    console.error('👉 Please copy the SQL from "dependents_schema.sql" and run it in your Supabase SQL Editor first, then run this script again.\n');
    process.exit(1);
  }

  // 1. Fetch all DB members
  const { data: dbMembers, error: dbErr } = await supabase
    .from('members')
    .select('id, first_name, surname, other_names')
    .eq('commandery_id', COMMANDERY_ID);

  if (dbErr) {
    console.error('Error fetching database members:', dbErr);
    process.exit(1);
  }
  console.log(`Loaded ${dbMembers.length} members from DB.`);

  // 2. Parse text file
  const filePath = path.join(__dirname, '..', 'district insurance data.txt');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  const insuranceBrothers = [];
  let currentBrother = null;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    const matchHeader = line.match(/^(\d+)\.\s*(?:•\s*)?(.*)$/);
    if (matchHeader) {
      if (currentBrother) {
        insuranceBrothers.push(currentBrother);
      }
      currentBrother = {
        index: parseInt(matchHeader[1]),
        fullName: matchHeader[2].replace(/•/g, '').trim(),
        dob: null,
        spouse: null,
        children: [],
        dependents: []
      };
      continue;
    }

    if (!currentBrother) continue;

    if (line.includes('Date of Birth:')) {
      currentBrother.dob = line.split('Date of Birth:')[1].trim();
    } else if (line.includes('Spouse:')) {
      const spousePart = line.split('Spouse:')[1].trim();
      const dobMatch = spousePart.match(/^(.*?)\s*\(DOB:\s*(.*?)\)$/);
      if (dobMatch) {
        currentBrother.spouse = {
          name: dobMatch[1].trim(),
          dob: dobMatch[2].trim()
        };
      } else {
        currentBrother.spouse = {
          name: spousePart,
          dob: null
        };
      }
    } else if (line.includes('Child 1:') || line.includes('Child 2:')) {
      const childPart = line.split(/Child \d+:/)[1].trim();
      const dobMatch = childPart.match(/^(.*?)\s*\(DOB:\s*(.*?)\)$/);
      if (dobMatch) {
        currentBrother.children.push({
          name: dobMatch[1].trim(),
          dob: dobMatch[2].trim()
        });
      } else {
        currentBrother.children.push({
          name: childPart,
          dob: null
        });
      }
    } else if (line.includes('Dependant 1:') || line.includes('Dependant 2:')) {
      const depPart = line.split(/Dependant \d+:/)[1].trim();
      const dobMatch = depPart.match(/^(.*?)\s*\(DOB:\s*(.*?)\)$/);
      if (dobMatch) {
        currentBrother.dependents.push({
          name: dobMatch[1].trim(),
          dob: dobMatch[2].trim()
        });
      } else {
        currentBrother.dependents.push({
          name: depPart,
          dob: null
        });
      }
    }
  }

  if (currentBrother) {
    insuranceBrothers.push(currentBrother);
  }
  console.log(`Parsed ${insuranceBrothers.length} profiles from text file.`);

  // 3. Process each record
  let successCount = 0;

  for (const ib of insuranceBrothers) {
    let memberId = MANUAL_MATCHES[ib.fullName];

    if (!memberId) {
      // Find matches in DB
      const ibNorm = normalizeName(ib.fullName);
      for (const dbm of dbMembers) {
        const dbName = `${dbm.first_name} ${dbm.other_names || ''} ${dbm.surname}`;
        const dbNorm = normalizeName(dbName);
        if (namesMatch(ibNorm, dbNorm)) {
          memberId = dbm.id;
          break;
        }
      }
    }

    if (!memberId) {
      console.warn(`⚠️ Skipped: Could not find matching member for "${ib.fullName}"`);
      continue;
    }

    const parsedDob = parseDate(ib.dob);
    console.log(`⚡ Processing "${ib.fullName}" (ID: ${memberId}). DOB: ${parsedDob}`);

    // A. Update Member Date of Birth
    if (parsedDob) {
      const { error: memErr } = await supabase
        .from('members')
        .update({ date_of_birth: parsedDob })
        .eq('id', memberId);

      if (memErr) {
        console.error(`Error updating member DOB for ${ib.fullName}:`, memErr);
      }
    }

    // B. Handle Spouse Record
    if (ib.spouse) {
      const spousePayload = {
        member_id: memberId,
        spouse_name: ib.spouse.name,
        spouse_dob: parseDate(ib.spouse.dob)
      };

      const { error: spouseErr } = await supabase
        .from('spouse')
        .upsert(spousePayload, { onConflict: 'member_id' });

      if (spouseErr) {
        console.error(`Error upserting spouse for ${ib.fullName}:`, spouseErr);
      }
    }

    // C. Clean and Insert Children
    const { error: delErr } = await supabase
      .from('children')
      .delete()
      .eq('member_id', memberId);

    if (delErr) {
      console.error(`Error cleaning old children for ${ib.fullName}:`, delErr);
    }

    for (const child of ib.children) {
      const childPayload = {
        member_id: memberId,
        child_name: child.name,
        birth_date: parseDate(child.dob)
      };

      const { error: childErr } = await supabase
        .from('children')
        .insert(childPayload);

      if (childErr) {
        console.error(`Error inserting child for ${ib.fullName}:`, childErr);
      }
    }

    // D. Clean and Insert Dependents into dedicated "dependents" table
    const { error: delDepErr } = await supabase
      .from('dependents')
      .delete()
      .eq('member_id', memberId);

    if (delDepErr) {
      console.error(`Error cleaning old dependents for ${ib.fullName}:`, delDepErr);
    }

    for (const dep of ib.dependents) {
      const depPayload = {
        member_id: memberId,
        dependent_name: dep.name,
        birth_date: parseDate(dep.dob),
        relationship: 'Dependant' // Default relationship value
      };

      const { error: depErr } = await supabase
        .from('dependents')
        .insert(depPayload);

      if (depErr) {
        console.error(`Error inserting dependent for ${ib.fullName}:`, depErr);
      }
    }

    successCount++;
  }

  console.log(`\n🎉 IMPORT FINISHED! Successfully imported ${successCount} / ${insuranceBrothers.length} records.`);
}

main().catch(console.error);

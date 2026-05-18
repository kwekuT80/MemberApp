const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pcsslgufwjzvolbtygwc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjc3NsZ3Vmd2p6dm9sYnR5Z3djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY0OTQ5NCwiZXhwIjoyMDkwMjI1NDk0fQ.CU0VoIqKl5cd9g86jSYFxjx4qPKocmJgILxAx29sESo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const COMMANDERY_ID = 'b31c4884-9518-4fdf-bc55-98e3425189cc';

// Helper to normalize names for comparison
function normalizeName(name) {
  return name
    .toUpperCase()
    .replace(/^(MR\.|MRS\.|CAPT\.|LT\.|REV\.|DR\.|BRO\.)\s+/g, '')
    .replace(/[^A-Z\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

// Check if two name lists match
function namesMatch(list1, list2) {
  // If one name list is empty, no match
  if (!list1.length || !list2.length) return false;
  
  // Find intersection
  const intersection = list1.filter(n => list2.includes(n));
  
  // If they share at least 2 name components, or if they have surname and first name matches
  if (intersection.length >= 2) return true;
  
  return false;
}

async function main() {
  // Read all members from db
  const { data: dbMembers, error } = await supabase
    .from('members')
    .select('id, first_name, surname, other_names')
    .eq('commandery_id', COMMANDERY_ID);

  if (error) {
    console.error('Error fetching members:', error);
    process.exit(1);
  }

  console.log(`Loaded ${dbMembers.length} members from DB.`);

  // Parse text file
  const filePath = path.join(__dirname, '..', 'district insurance data.txt');
  const content = fs.readFileSync(filePath, 'utf8');

  const lines = content.split('\n');
  const insuranceBrothers = [];
  let currentBrother = null;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Check if line starts with a number like "1.	DAVID KOMLA BONDORIN" or "21.	•  JONATHAN..."
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

    // Check for fields
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

  console.log(`Parsed ${insuranceBrothers.length} brothers from insurance text file.`);

  // Perform matches
  let matchedCount = 0;
  const matches = [];
  const unmatched = [];

  for (const ib of insuranceBrothers) {
    const ibNorm = normalizeName(ib.fullName);
    let matchedMember = null;

    for (const dbm of dbMembers) {
      const dbmName = `${dbm.first_name} ${dbm.other_names || ''} ${dbm.surname}`;
      const dbmNorm = normalizeName(dbmName);
      
      if (namesMatch(ibNorm, dbmNorm)) {
        matchedMember = dbm;
        break;
      }
    }

    if (matchedMember) {
      matchedCount++;
      matches.push({
        insurance: ib,
        db: matchedMember
      });
    } else {
      unmatched.push(ib);
    }
  }

  console.log(`\nMatches found: ${matchedCount} / ${insuranceBrothers.length}`);
  
  console.log('\n--- Match Samples ---');
  matches.slice(0, 10).forEach(m => {
    console.log(`- Insurance: "${m.insurance.fullName}" matches DB: "${m.db.first_name} ${m.db.surname}"`);
  });

  console.log('\n--- Unmatched Samples ---');
  unmatched.slice(0, 10).forEach(m => {
    console.log(`- "${m.fullName}"`);
  });
}

main().catch(console.error);

// scripts/import_financials.js
// Script to parse May_Assessment.csv and seed the financial_assessments and financial_payments tables.
// Requires @supabase/supabase-js, dotenv, and fs

require('dotenv').config({ path: '../web/.env.local' });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Helper to parse basic CSV with quotes (since some values have commas like " 1,050 ")
function parseCSV(line) {
  const result = [];
  let inQuotes = false;
  let currentVal = '';
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(currentVal.trim());
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  result.push(currentVal.trim());
  return result;
}

// Helper to clean numeric values like " 1,050 " or "-535"
function cleanNumber(str) {
  if (!str || str === '-') return 0.0;
  const numStr = str.replace(/,/g, '').replace(/"/g, '').replace(/ /g, '');
  const parsed = parseFloat(numStr);
  return isNaN(parsed) ? 0.0 : parsed;
}

// Simple Levenshtein distance for fuzzy matching
function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  return matrix[b.length][a.length];
}

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('======================================================');
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY not found!');
    console.error('The script requires the service_role key to bypass RLS.');
    console.error('Please add SUPABASE_SERVICE_ROLE_KEY to web/.env.local');
    console.error('======================================================');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Fetch all members
  const { data: members, error: memError } = await supabase.from('members').select('id, first_name, surname, other_names');
  if (memError) {
    console.error('Error fetching members:', memError);
    return;
  }

  // 2. Read CSV
  const csvText = fs.readFileSync('./May_Assessment.csv', 'utf8');
  const lines = csvText.split('\n');

  // Headers should be line 1 (index 0 is just row numbers maybe)
  // No.,Name,Bal B/f,Supreme,2026 Assessment,Total Assessment,Jan,Feb,Mar,April,May,June,July,Aug,Sept,Oct,Nov,Dec,Total Payment for 2026,Outstanding
  const months = ['Jan', 'Feb', 'Mar', 'April', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  
  let importedCount = 0;

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cols = parseCSV(line);
    
    // Stop at "TOTAL" row
    if (cols[1] === 'TOTAL' || !cols[1]) break;

    const fullNameCsv = cols[1].toLowerCase().replace(/\s+/g, ' ').trim();
    const arrearsBf = cleanNumber(cols[2]);
    const annualAssessment = cleanNumber(cols[4]);

    // Find best match in DB
    let bestMatch = null;
    let bestScore = -1;

    function getTokens(str) {
      return str.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(/\s+/).filter(Boolean);
    }

    const csvTokens = getTokens(fullNameCsv);

    for (const m of members) {
      const dbStr = `${m.first_name || ''} ${m.other_names || ''} ${m.surname || ''}`;
      const dbTokens = getTokens(dbStr);

      let score = 0;
      for (const c of csvTokens) {
        if (c.length === 1) {
          if (dbTokens.some(d => d.startsWith(c))) score += 0.5;
        } else {
          let maxSim = 0;
          for (const d of dbTokens) {
            if (d.length <= 1) continue;
            const lev = levenshtein(c, d);
            const sim = 1 - (lev / Math.max(c.length, d.length));
            if (sim > maxSim) maxSim = sim;
          }
          if (maxSim > 0.8) score += 1;
          else if (maxSim > 0.6) score += 0.5;
        }
      }

      const matchRatio = score / csvTokens.length;

      if (matchRatio > bestScore) {
        bestScore = matchRatio;
        bestMatch = m;
      }
    }

    // Require at least 60% of CSV name tokens to strongly match DB tokens
    if (bestMatch && bestScore >= 0.6) {
      console.log(`Matched: [CSV] ${cols[1]} -> [DB] ${bestMatch.first_name} ${bestMatch.surname}`);
      
      // Insert Assessment
      const { data: assData, error: assError } = await supabase
        .from('financial_assessments')
        .upsert({
          member_id: bestMatch.id,
          year: 2026,
          arrears_brought_forward: arrearsBf,
          annual_assessment: annualAssessment,
        }, { onConflict: 'member_id, year' })
        .select()
        .single();
      
      if (assError) {
        console.error('Error inserting assessment:', assError);
        continue;
      }

      // Clear existing 2026 payments for this member to prevent duplicates on re-run
      await supabase
        .from('financial_payments')
        .delete()
        .eq('member_id', bestMatch.id)
        .eq('assessment_year', 2026);

      // Insert Payments
      for (let mIdx = 0; mIdx < 12; mIdx++) {
        const payColIdx = 6 + mIdx; // Jan starts at col 6
        const valStr = cols[payColIdx];
        const valNum = cleanNumber(valStr);

        if (valNum > 0) {
          const { error: payError } = await supabase
            .from('financial_payments')
            .insert({
              member_id: bestMatch.id,
              assessment_year: 2026,
              month: months[mIdx],
              amount: valNum,
            });
            
          if (payError) {
             console.error(`Error inserting payment for ${months[mIdx]}:`, payError);
          }
        }
      }
      importedCount++;
    } else {
      console.log(`WARNING: Could not find good match for CSV Name: "${cols[1]}" (Best score: ${bestScore})`);
    }
  }

  console.log(`\nImport complete! Successfully imported financial data for ${importedCount} members.`);
}

run();

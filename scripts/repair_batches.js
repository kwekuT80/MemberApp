const fs = require('fs');
const path = require('path');
const { importMember, supabase } = require('./bulk_import');

async function repair(batchFile) {
  const dataPath = path.join(__dirname, batchFile);
  if (!fs.existsSync(dataPath)) {
    console.error(`File not found: ${dataPath}`);
    return;
  }

  const rawData = fs.readFileSync(dataPath, 'utf8');
  const batch = JSON.parse(rawData);

  console.log(`\n>>> Starting REPAIR for ${batchFile} (${batch.length} records) <<<`);

  for (const record of batch) {
    const fn = record.member_info.first_name || '';
    const sn = record.member_info.surname || '';
    
    // Lookup member by name
    const { data: matches, error } = await supabase
      .from('members')
      .select('id')
      .eq('surname', sn)
      .ilike('first_name', `%${fn}%`);

    if (error) {
      console.error(`Search error for ${fn} ${sn}:`, error.message);
      continue;
    }

    if (matches && matches.length === 1) {
      const existingId = matches[0].id;
      await importMember(record, existingId);
    } else if (matches && matches.length > 1) {
      console.warn(`Ambiguous match for ${fn} ${sn} (${matches.length} found). Skipping.`);
    } else {
      console.warn(`No match found for ${fn} ${sn}. Skipping.`);
    }
  }
}

async function main() {
  await repair('batch_01_data.json');
  await repair('batch_02_data.json');
  console.log('\n--- Repair process finished. ---');
}

main();

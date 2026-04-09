const fs = require('fs');
const path = require('path');
const { importMember } = require('./bulk_import');

async function main() {
  const batchFile = process.argv[2] || 'batch_02_data.json';
  const dataPath = path.join(__dirname, batchFile);
  
  if (!fs.existsSync(dataPath)) {
    console.error(`File not found: ${dataPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(dataPath, 'utf8');
  const batch = JSON.parse(rawData);

  console.log(`Starting import of ${batch.length} records...`);

  for (const member of batch) {
    try {
      await importMember(member);
    } catch (err) {
      console.error(`Failed to import ${member.member_info.first_name} ${member.member_info.surname}:`, err);
    }
  }

  console.log('Batch import finished.');
}

main();

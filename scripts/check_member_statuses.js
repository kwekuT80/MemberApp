const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pcsslgufwjzvolbtygwc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjc3NsZ3Vmd2p6dm9sYnR5Z3djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY0OTQ5NCwiZXhwIjoyMDkwMjI1NDk0fQ.CU0VoIqKl5cd9g86jSYFxjx4qPKocmJgILxAx29sESo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const COMMANDERY_ID = 'b31c4884-9518-4fdf-bc55-98e3425189cc';

async function main() {
  const { data: members, error } = await supabase
    .from('members')
    .select('id, first_name, surname, status')
    .eq('commandery_id', COMMANDERY_ID);

  if (error) {
    console.error(error);
    process.exit(1);
  }

  console.log(`Total members in database: ${members.length}`);
  
  const statusCounts = {};
  members.forEach(m => {
    const status = m.status || 'Active';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  console.log('Status counts:', statusCounts);
  
  console.log('\nList of non-Active members:');
  members.forEach(m => {
    if (m.status !== 'Active') {
      console.log(`- ${m.first_name} ${m.surname}: Status = ${m.status}`);
    }
  });
}

main().catch(console.error);

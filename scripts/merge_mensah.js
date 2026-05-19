const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pcsslgufwjzvolbtygwc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjc3NsZ3Vmd2p6dm9sYnR5Z3djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY0OTQ5NCwiZXhwIjoyMDkwMjI1NDk0fQ.CU0VoIqKl5cd9g86jSYFxjx4qPKocmJgILxAx29sESo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const JSK_ID = '92716316-1f3c-4384-b9db-38fb740babd5';
const JULIUS_ID = 'c158ba7f-e3d5-4895-a613-e37c353cb99c';

async function main() {
  console.log('🔄 Merging Julius Mensah and J. S. K. Mensah records...');

  // 1. Re-map all attendance logs
  console.log('⚡ Re-mapping attendance logs...');
  const { data: attUpdate, error: attErr } = await supabase
    .from('attendance')
    .update({ member_id: JULIUS_ID })
    .eq('member_id', JSK_ID)
    .select();

  if (attErr) {
    console.error('Error updating attendance:', attErr);
    process.exit(1);
  }
  console.log(`✅ Successfully re-mapped ${attUpdate.length} attendance check-ins.`);

  // 2. Update Julius's middle/other name to include the "K." initial
  console.log("⚡ Updating Julius's other_names...");
  const { data: memUpdate, error: memErr } = await supabase
    .from('members')
    .update({ other_names: 'Saviour K.' })
    .eq('id', JULIUS_ID)
    .select();

  if (memErr) {
    console.error('Error updating member:', memErr);
    process.exit(1);
  }
  console.log(`✅ Successfully updated name: ${memUpdate[0].first_name} ${memUpdate[0].other_names} ${memUpdate[0].surname}`);

  // 3. Delete J. S. K. minimal record
  console.log('⚡ Deleting duplicate minimal record...');
  const { data: memDel, error: delErr } = await supabase
    .from('members')
    .delete()
    .eq('id', JSK_ID)
    .select();

  if (delErr) {
    console.error('Error deleting duplicate:', delErr);
    process.exit(1);
  }
  console.log(`✅ Successfully deleted duplicate record ID: ${JSK_ID}`);

  console.log('\n🎉 MERGE COMPLETED SUCCESSFULLY!');
}

main().catch(console.error);

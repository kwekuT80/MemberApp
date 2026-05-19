const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pcsslgufwjzvolbtygwc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjc3NsZ3Vmd2p6dm9sYnR5Z3djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY0OTQ5NCwiZXhwIjoyMDkwMjI1NDk0fQ.CU0VoIqKl5cd9g86jSYFxjx4qPKocmJgILxAx29sESo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const COMMANDERY_ID = 'b31c4884-9518-4fdf-bc55-98e3425189cc';

async function main() {
  console.log('🧹 Beginning database meeting and attendance cleanup...');

  // 1. Fetch all meetings for St. Margaret Mary Commandery No. 500 starting with "Commandery Monthly Meeting ("
  const { data: mtgs, error: mtgErr } = await supabase
    .from('meetings')
    .select('id, title')
    .eq('commandery_id', COMMANDERY_ID)
    .like('title', 'Commandery Monthly Meeting (%');

  if (mtgErr) {
    console.error('Error fetching meetings:', mtgErr.message);
    process.exit(1);
  }

  console.log(`🔍 Found ${mtgs.length} historical meetings to clean.`);

  if (mtgs.length > 0) {
    const meetingIds = mtgs.map(m => m.id);

    // 2. Delete attendance records for these meetings
    console.log('⚡ Deleting related attendance records...');
    const { error: attDelErr } = await supabase
      .from('attendance')
      .delete()
      .in('meeting_id', meetingIds);

    if (attDelErr) {
      console.error('Error deleting attendance:', attDelErr.message);
    }

    // 3. Delete absence requests for these meetings
    console.log('⚡ Deleting related absence requests...');
    const { error: absDelErr } = await supabase
      .from('absence_requests')
      .delete()
      .in('meeting_id', meetingIds);

    if (absDelErr) {
      console.error('Error deleting excuses:', absDelErr.message);
    }

    // 4. Delete the meetings themselves
    console.log('⚡ Deleting meetings...');
    const { error: mtgDelErr } = await supabase
      .from('meetings')
      .delete()
      .in('id', meetingIds);

    if (mtgDelErr) {
      console.error('Error deleting meetings:', mtgDelErr.message);
      process.exit(1);
    }
    
    console.log('✅ Clean up completed successfully!');
  } else {
    console.log('ℹ️ No meetings found to delete.');
  }
}

main().catch(console.error);

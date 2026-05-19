const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pcsslgufwjzvolbtygwc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjc3NsZ3Vmd2p6dm9sYnR5Z3djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY0OTQ5NCwiZXhwIjoyMDkwMjI1NDk0fQ.CU0VoIqKl5cd9g86jSYFxjx4qPKocmJgILxAx29sESo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const JSK_ID = '92716316-1f3c-4384-b9db-38fb740babd5';
const JULIUS_ID = 'c158ba7f-e3d5-4895-a613-e37c353cb99c';

async function main() {
  const { data: m1 } = await supabase.from('members').select('*').eq('id', JSK_ID).single();
  const { data: m2 } = await supabase.from('members').select('*').eq('id', JULIUS_ID).single();

  console.log('--- J. S. K. Mensah Profile ---');
  console.log(m1);

  console.log('\n--- Julius Mensah Profile ---');
  console.log(m2);

  const { count: c1 } = await supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('member_id', JSK_ID);
  const { count: c2 } = await supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('member_id', JULIUS_ID);

  console.log(`\nAttendance count for J. S. K.: ${c1}`);
  console.log(`Attendance count for Julius: ${c2}`);
}

main().catch(console.error);

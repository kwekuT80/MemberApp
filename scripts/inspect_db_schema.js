const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pcsslgufwjzvolbtygwc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjc3NsZ3Vmd2p6dm9sYnR5Z3djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY0OTQ5NCwiZXhwIjoyMDkwMjI1NDk0fQ.CU0VoIqKl5cd9g86jSYFxjx4qPKocmJgILxAx29sESo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('--- COMMANDERIES LIST ---');
  const { data: coms, error: comErr } = await supabase
    .from('commanderies')
    .select('*');
  console.log('Commanderies in database:', coms);

  console.log('\n--- REGISTRAR / USER PROFILES ---');
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('*');
  console.log('Profiles in database:', profiles);

  console.log('\n--- RLS POLICIES FOR MEETINGS ---');
  const { data: policies, error: polErr } = await supabase
    .rpc('get_policies_for_meetings'); // Wait, if get_policies_for_meetings RPC doesn't exist, we can select from pg_policies using an arbitrary query, or run raw SQL if we have custom RPCs. Let's try raw select if supported, or select from pg_policies.
  
  // Since we can query pg_policies using supabase.rpc or a simple supabase call on a view if exposed, let's fetch policies by selecting from pg_catalog.pg_policies if allowed. Or we can just insert a test meeting from the script using the registrar's auth token!
  // Wait, let's test if a meeting can be inserted from the service_role key first, and then with authenticated profile.
  // Actually, we can fetch all policies directly using supabase.from('pg_policies')? No, pg_policies is a pg system catalog. Let's do a direct test of the meetings RLS policies by trying to insert a meeting with a fake commandery_id using service_role, and see what happens.
  // Wait, let's write a script that fetches the actual RLS policies via SQL!
  const { data: rawPol, error: rawPolErr } = await supabase
    .from('meetings')
    .select('id')
    .limit(1);
  
  console.log('Test meetings fetch:', rawPol, rawPolErr);
}

main().catch(console.error);

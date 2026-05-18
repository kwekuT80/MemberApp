const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pcsslgufwjzvolbtygwc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjc3NsZ3Vmd2p6dm9sYnR5Z3djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY0OTQ5NCwiZXhwIjoyMDkwMjI1NDk0fQ.CU0VoIqKl5cd9g86jSYFxjx4qPKocmJgILxAx29sESo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('Checking "dependents"...');
  const r1 = await supabase.from('dependents').select('*').limit(1);
  console.log('dependents status:', r1.status, r1.error ? r1.error.message : 'OK');

  console.log('\nChecking "dependants"...');
  const r2 = await supabase.from('dependants').select('*').limit(1);
  console.log('dependants status:', r2.status, r2.error ? r2.error.message : 'OK');
}

main().catch(console.error);

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pcsslgufwjzvolbtygwc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjc3NsZ3Vmd2p6dm9sYnR5Z3djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY0OTQ5NCwiZXhwIjoyMDkwMjI1NDk0fQ.CU0VoIqKl5cd9g86jSYFxjx4qPKocmJgILxAx29sESo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const COMMANDERY_ID = 'b31c4884-9518-4fdf-bc55-98e3425189cc';

async function main() {
  const { data: members, error } = await supabase
    .from('members')
    .select('id, first_name, surname, other_names')
    .eq('commandery_id', COMMANDERY_ID);

  if (error) {
    console.error(error);
    process.exit(1);
  }

  console.log('Searching for "Kakraba" or "Quarshie":');
  const match1 = members.filter(m => 
    m.first_name.includes('Ism') || 
    m.surname.includes('Quarshie') || 
    m.surname.includes('Kakraba') ||
    (m.other_names && m.other_names.includes('Kakraba'))
  );
  console.log(match1);

  console.log('\nSearching for "Charles" or "Walabo" or "Akwakoku":');
  const match2 = members.filter(m => 
    m.first_name.includes('Cha') || 
    m.surname.includes('Akw') || 
    m.surname.includes('Udzu') ||
    (m.other_names && m.other_names.includes('Walabo'))
  );
  console.log(match2);
}

main().catch(console.error);

require('dotenv').config({ path: '../web/.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Use ANON key to simulate a regular user connection
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRls() {
  // 1. Authenticate as Nii Armah
  // We need his email to sign in. Let's find his email using service role first.
  const adminClient = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: user } = await adminClient.auth.admin.getUserById('c18e92e0-2d49-4af2-8ab6-9c6e70f6b31b');
  console.log('User email:', user?.user?.email);

  // Or simpler: let's just make the query as the user by impersonating the JWT.
  // Actually we can't easily impersonate without a JWT or signing in.
  // Let's sign in with a test user or just check the RLS directly.
  
  // Let's execute the query using the admin client to see if the row exists.
  const { data: member } = await adminClient.from('members').select('id, user_id').eq('user_id', 'c18e92e0-2d49-4af2-8ab6-9c6e70f6b31b').single();
  console.log('Member:', member);

  if (member) {
    const { data: ass } = await adminClient.from('financial_assessments').select('*').eq('member_id', member.id);
    console.log('Assessments:', ass);
  }
}
testRls();

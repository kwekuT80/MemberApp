require('dotenv').config({ path: '../web/.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  const { data: member } = await supabase.from('members').select('id, user_id, first_name, surname').ilike('first_name', '%Armah%');
  console.log('Member:', member);

  if (member && member.length > 0) {
    const { data: ass } = await supabase.from('financial_assessments').select('*').eq('member_id', member[0].id);
    console.log('Assessments:', ass);

    const { data: pay } = await supabase.from('financial_payments').select('*').eq('member_id', member[0].id);
    console.log('Payments:', pay);
  }
}
debug();

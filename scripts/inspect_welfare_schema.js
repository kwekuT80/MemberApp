const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pcsslgufwjzvolbtygwc.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjc3NsZ3Vmd2p6dm9sYnR5Z3djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY0OTQ5NCwiZXhwIjoyMDkwMjI1NDk0fQ.CU0VoIqKl5cd9g86jSYFxjx4qPKocmJgILxAx29sESo';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// A stable probe UUID (not a real entity, will be cleaned up)
const PROBE_UUID = '00000000-0000-0000-0000-000000000001';

async function inspect() {

  // ── 1. Probe welfare_audit_log action constraint ───────────────────────────
  console.log('=== 1. Testing audit log: action=rate_change entity_type=welfare_rate ===');
  const { data: auditProbe, error: auditErr } = await supabase
    .from('welfare_audit_log')
    .insert({
      action: 'rate_change',
      entity_type: 'welfare_rate',
      entity_id: PROBE_UUID,
      changed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (auditErr) {
    console.log('❌ INSERT FAILED — constraint exists that blocks rate_change/welfare_rate:');
    console.log('   Code:', auditErr.code, '| Message:', auditErr.message);
  } else {
    console.log('✅ INSERT SUCCEEDED — no constraint blocks rate_change or welfare_rate');
    if (auditProbe?.id) {
      await supabase.from('welfare_audit_log').delete().eq('id', auditProbe.id);
      console.log('   Probe row deleted.');
    }
  }

  // ── 2. Check existing rows + columns in welfare_contribution_rates ─────────
  console.log('\n=== 2. Existing welfare_contribution_rates rows ===');
  const { data: existingRates, error: ratesErr } = await supabase
    .from('welfare_contribution_rates')
    .select('*')
    .order('year', { ascending: false });
  if (ratesErr) {
    console.log('Error fetching rates:', ratesErr.message);
  } else {
    console.log('Rows:', JSON.stringify(existingRates, null, 2));
  }

  // ── 3. Check RLS status by attempting an insert with invalid role ──────────
  console.log('\n=== 3. Testing welfare_contribution_rates: can service_role INSERT? ===');
  const { data: rateProbe, error: rateErr } = await supabase
    .from('welfare_contribution_rates')
    .upsert({ year: 1900, monthly_rate: 99.00, notes: 'PROBE - DELETE ME' }, { onConflict: 'year' })
    .select()
    .single();
  if (rateErr) {
    console.log('❌ UPSERT FAILED:', rateErr.message);
  } else {
    console.log('✅ UPSERT SUCCEEDED (service_role bypasses RLS as expected)');
    console.log('   Probe row:', rateProbe);
    // Clean up
    if (rateProbe?.id) {
      await supabase.from('welfare_contribution_rates').delete().eq('id', rateProbe.id);
      console.log('   Probe row deleted.');
    }
  }

  // ── 4. Check if monthly_rate > 0 constraint exists (probe with 0) ─────────
  console.log('\n=== 4. Testing CHECK constraint: monthly_rate=0 (should fail if constrained) ===');
  const { data: zeroProbe, error: zeroErr } = await supabase
    .from('welfare_contribution_rates')
    .insert({ year: 1901, monthly_rate: 0, notes: 'PROBE zero rate' })
    .select()
    .single();
  if (zeroErr) {
    console.log('✅ Zero rate INSERT blocked:', zeroErr.message, '(CHECK constraint exists)');
  } else {
    console.log('⚠️  Zero rate INSERT SUCCEEDED — no > 0 CHECK constraint on monthly_rate');
    if (zeroProbe?.id) {
      await supabase.from('welfare_contribution_rates').delete().eq('id', zeroProbe.id);
      console.log('   Probe row deleted.');
    }
  }

  // ── 5. Check if UNIQUE constraint on year exists (probe duplicate year) ────
  console.log('\n=== 5. Testing UNIQUE constraint on year ===');
  const { data: yearProbe1 } = await supabase
    .from('welfare_contribution_rates')
    .select('year')
    .order('year', { ascending: false })
    .limit(1)
    .single();
  
  if (yearProbe1) {
    const { error: dupErr } = await supabase
      .from('welfare_contribution_rates')
      .insert({ year: yearProbe1.year, monthly_rate: 10.00, notes: 'PROBE duplicate year' });
    if (dupErr) {
      console.log('✅ Duplicate year blocked:', dupErr.message, '(UNIQUE constraint exists)');
    } else {
      console.log('⚠️  Duplicate year INSERT SUCCEEDED — no UNIQUE constraint on year');
    }
  } else {
    console.log('No existing rows to test duplicate year against.');
  }

  // ── 6. Check updated_at trigger exists ────────────────────────────────────
  console.log('\n=== 6. Check updated_at column type ===');
  const { data: colCheck, error: colErr } = await supabase
    .from('welfare_contribution_rates')
    .select('updated_at')
    .limit(1)
    .single();
  if (colErr) {
    console.log('Cannot read updated_at:', colErr.message);
  } else {
    console.log('updated_at column value:', colCheck?.updated_at, '(column exists)');
  }
}

inspect().catch(console.error);

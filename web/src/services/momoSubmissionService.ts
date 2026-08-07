import { createClient } from '@/lib/supabase/client';

export interface MoMoSubmission {
  id?: string;
  member_id: string;
  payment_category: 'assessment' | 'welfare' | 'voluntary_relief';
  amount: number;
  transaction_ref: string;
  sender_phone?: string;
  receipt_notes?: string;
  status?: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at?: string;
  members?: {
    first_name: string;
    surname: string;
    title?: string;
  };
}

export async function submitMoMoPayment(submission: Omit<MoMoSubmission, 'id' | 'status' | 'created_at'>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('momo_payment_submissions')
    .insert([submission])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getMemberMoMoSubmissions(memberId: string): Promise<MoMoSubmission[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('momo_payment_submissions')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching member MoMo submissions:', error);
    return [];
  }
  return data || [];
}

export async function getPendingMoMoSubmissionsForRole(role: string): Promise<MoMoSubmission[]> {
  const supabase = createClient();
  let query = supabase
    .from('momo_payment_submissions')
    .select('*, members(first_name, surname, title)')
    .order('created_at', { ascending: false });

  if (role === 'financial_registrar') {
    query = query.in('payment_category', ['assessment', 'voluntary_relief']);
  } else if (role === 'welfare_treasurer') {
    query = query.eq('payment_category', 'welfare');
  } else if (role !== 'super_admin') {
    return []; // No permissions
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching pending submissions:', error);
    return [];
  }
  return data || [];
}

export async function approveMoMoSubmission(
  submission: MoMoSubmission,
  currentUserId: string,
  year: number = new Date().getFullYear()
) {
  const supabase = createClient();

  if (submission.payment_category === 'welfare') {
    // Insert into welfare_contributions
    const { error: contribErr } = await supabase
      .from('welfare_contributions')
      .insert([{
        member_id: submission.member_id,
        period_year: year,
        period_month: new Date().getMonth() + 1,
        amount: submission.amount,
        payment_date: new Date().toISOString(),
        payment_method: 'Mobile Money',
        reference_no: submission.transaction_ref,
        notes: `Submitted via MoMo Verification (Ref: ${submission.transaction_ref})`,
        recorded_by: currentUserId
      }]);
    if (contribErr) throw contribErr;
  } else {
    // Insert into financial_payments (for assessment dues or voluntary_relief)
    let monthLabel = 'Annual Assessment';
    if (submission.payment_category === 'voluntary_relief') {
      monthLabel = 'Voluntary Relief Donation';
    }

    const { error: payErr } = await supabase
      .from('financial_payments')
      .insert([{
        member_id: submission.member_id,
        assessment_year: year,
        month: monthLabel,
        amount: submission.amount,
        payment_date: new Date().toISOString(),
        recorded_by: currentUserId
      }]);
    if (payErr) throw payErr;
  }

  // Update submission status to approved
  const { data, error: updateErr } = await supabase
    .from('momo_payment_submissions')
    .update({
      status: 'approved',
      reviewed_by: currentUserId,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', submission.id)
    .select()
    .single();

  if (updateErr) throw updateErr;
  return data;
}

export async function rejectMoMoSubmission(
  submissionId: string,
  rejectionReason: string,
  currentUserId: string
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('momo_payment_submissions')
    .update({
      status: 'rejected',
      rejection_reason: rejectionReason,
      reviewed_by: currentUserId,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', submissionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

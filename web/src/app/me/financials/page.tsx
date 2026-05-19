'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import MemberShell from '@/components/layout/MemberShell';

export default function FinancialsPage() {
  const supabase = createClient();
  const [assessment, setAssessment] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: member } = await supabase
        .from('members')
        .select('id')
        .eq('user_id', user.id)
        .single();
        
      if (!member) {
        setLoading(false);
        return;
      }

      const currentYear = new Date().getFullYear();

      // Fetch assessment for current year
      const { data: assData } = await supabase
        .from('financial_assessments')
        .select('*')
        .eq('member_id', member.id)
        .eq('year', currentYear)
        .single();

      if (assData) setAssessment(assData);

      // Fetch payments for current year
      const { data: payData } = await supabase
        .from('financial_payments')
        .select('*')
        .eq('member_id', member.id)
        .eq('assessment_year', currentYear)
        .order('payment_date', { ascending: true });

      if (payData) setPayments(payData);

      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <MemberShell title="Financial Ledger" subtitle="Loading your financial records...">
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </MemberShell>
    );
  }

  const currentYear = new Date().getFullYear();
  const arrears = assessment ? parseFloat(assessment.arrears_brought_forward) : 0;
  const annual = assessment ? parseFloat(assessment.annual_assessment) : 0;
  const totalAssessment = arrears + annual;
  const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const outstanding = totalAssessment - totalPaid;

  const currencyFormat = (num: number) => {
    return `GH¢ ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <MemberShell title="Financial Ledger" subtitle={`Your ${currentYear} dues and assessments`}>
      
      {/* Summary Cards */}
      <div className="grid-cols-2">
        <div className="summary-card" style={{ background: '#fff' }}>
          <div className="label" style={{ marginBottom: 4 }}>⏳ Arrears B/F</div>
          <div className="main-title" style={{ fontSize: 24, color: 'var(--navy)' }}>{currencyFormat(arrears)}</div>
        </div>
        
        <div className="summary-card" style={{ background: '#fff' }}>
          <div className="label" style={{ marginBottom: 4 }}>💰 {currentYear} Assessment</div>
          <div className="main-title" style={{ fontSize: 24, color: 'var(--navy)' }}>{currencyFormat(annual)}</div>
        </div>

        <div className="summary-card" style={{ background: 'var(--gold-faint)' }}>
          <div className="label" style={{ marginBottom: 4 }}>✅ Total Paid</div>
          <div className="main-title" style={{ fontSize: 24, color: 'var(--gold)' }}>{currencyFormat(totalPaid)}</div>
        </div>

        <div className="summary-card" style={{ background: outstanding > 0 ? '#FEF2F2' : '#F0FDF4', borderColor: outstanding > 0 ? '#FECACA' : '#BBF7D0' }}>
          <div className="label" style={{ marginBottom: 4, color: outstanding > 0 ? '#991B1B' : '#166534' }}>
             {outstanding > 0 ? '⚠️' : '🎉'} Outstanding Balance
          </div>
          <div className="main-title" style={{ fontSize: 24, color: outstanding > 0 ? '#991B1B' : '#166534' }}>
            {currencyFormat(outstanding)}
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="card" style={{ marginTop: 24, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg)', background: '#F8FAFC' }}>
          <h2 style={{ margin: 0, fontSize: 18, color: 'var(--navy)' }}>Payment History ({currentYear})</h2>
        </div>
        
        {payments.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--grey)' }}>
            No payments recorded for this year yet.
          </div>
        ) : (
          <table className="member-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Amount</th>
                <th style={{ textAlign: 'right' }}>Date Logged</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(pay => (
                <tr key={pay.id}>
                  <td style={{ fontWeight: 700 }}>{pay.month}</td>
                  <td style={{ color: '#166534', fontWeight: 800 }}>{currencyFormat(parseFloat(pay.amount))}</td>
                  <td style={{ textAlign: 'right', color: 'var(--grey)' }}>{new Date(pay.payment_date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </MemberShell>
  );
}

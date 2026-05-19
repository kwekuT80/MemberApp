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
      <div className="space-y-6 pt-6">
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm font-semibold uppercase mb-1 flex items-center">
               ⏳ Arrears B/F
            </div>
            <div className="text-2xl font-bold text-gray-900">{currencyFormat(arrears)}</div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm font-semibold uppercase mb-1 flex items-center">
               💰 {currentYear} Assessment
            </div>
            <div className="text-2xl font-bold text-gray-900">{currencyFormat(annual)}</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm font-semibold uppercase mb-1 flex items-center">
               ✅ Total Paid
            </div>
            <div className="text-2xl font-bold text-green-700">{currencyFormat(totalPaid)}</div>
          </div>

          <div className={`rounded-xl p-6 shadow-sm border ${outstanding > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <div className={`text-sm font-semibold uppercase mb-1 flex items-center ${outstanding > 0 ? 'text-red-700' : 'text-green-700'}`}>
               {outstanding > 0 ? '⚠️' : '🎉'} Outstanding Balance
            </div>
            <div className={`text-2xl font-bold ${outstanding > 0 ? 'text-red-700' : 'text-green-700'}`}>
              {currencyFormat(outstanding)}
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900">Payment History ({currentYear})</h2>
          </div>
          
          {payments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No payments recorded for this year yet.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-100">
                  <th className="px-6 py-3 text-sm font-semibold text-gray-500 uppercase">Month</th>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-500 uppercase">Date Logged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map(pay => (
                  <tr key={pay.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{pay.month}</td>
                    <td className="px-6 py-4 text-green-700 font-bold">{currencyFormat(parseFloat(pay.amount))}</td>
                    <td className="px-6 py-4 text-gray-500 text-sm">{new Date(pay.payment_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </MemberShell>
  );
}

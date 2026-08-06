'use client';

import React, { useEffect, useState } from 'react';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { 
  getWelfareDisbursements, 
  recordWelfareDisbursement, 
  deleteWelfareDisbursement, 
  getWelfareCategories 
} from '@/services/welfareService';
import { createClient } from '@/lib/supabase/client';
import { formatDisplayDate } from '@/lib/utils/ksji-logic';
import { WelfareDisbursement, WelfareCategory } from '@/types/welfare';

export default function WelfareDisbursementsPage() {
  const [disbursements, setDisbursements] = useState<WelfareDisbursement[]>([]);
  const [categories, setCategories] = useState<WelfareCategory[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'benefits' | 'expenses'>('all');
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [memberId, setMemberId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('500');
  const [disbursementDate, setDisbursementDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'bank_transfer' | 'cash' | 'cheque'>('mobile_money');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [list, cats, { data: memberList }] = await Promise.all([
        getWelfareDisbursements(),
        getWelfareCategories(),
        supabase.from('members').select('id, first_name, surname, title').order('surname'),
      ]);
      setDisbursements(list);
      setCategories(cats);
      setMembers(memberList || []);
    } catch (err) {
      console.error('Failed to load welfare disbursements:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleCategorySelect = (catId: string) => {
    setCategoryId(catId);
    const cat = categories.find(c => c.id === catId);
    if (cat) {
      setAmount(cat.default_amount.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId || !amount) {
      alert('Please select a recipient member and enter an amount');
      return;
    }

    const selectedCat = categories.find(c => c.id === categoryId);
    const categoryName = selectedCat ? selectedCat.name : 'General Welfare Aid';

    setSubmitting(true);
    try {
      await recordWelfareDisbursement({
        member_id: memberId,
        category_id: categoryId || undefined,
        category_name: categoryName,
        amount: parseFloat(amount),
        disbursement_date: disbursementDate,
        payment_method: paymentMethod,
        reference_no: referenceNo || undefined,
        notes: notes || undefined,
      });

      alert('Welfare benefit payout logged successfully!');
      setShowModal(false);
      // Reset form
      setMemberId('');
      setCategoryId('');
      setReferenceNo('');
      setNotes('');
      loadData();
    } catch (err: any) {
      console.error('Record disbursement error:', err);
      alert(err.message || 'Failed to log disbursement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this benefit payout entry? An audit log entry will be recorded.')) return;
    try {
      await deleteWelfareDisbursement(id);
      loadData();
    } catch (err) {
      alert('Failed to delete entry');
    }
  };

  const exportCSV = () => {
    const headers = ['Recipient Member', 'Category', 'Disbursement Date', 'Method', 'Reference', 'Notes', 'Amount (GHc)'];
    const rows = filtered.map(d => [
      d.members ? `${d.members.first_name} ${d.members.surname}` : 'Unknown',
      d.category_name,
      d.disbursement_date,
      d.payment_method,
      d.reference_no || '',
      `"${(d.notes || '').replace(/"/g, '""')}"`,
      d.amount
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `welfare_disbursements_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isExpenseCategory = (catName: string) => {
    const cat = (catName || '').toLowerCase();
    return (
      cat.includes('operational') ||
      cat.includes('logistics') ||
      cat.includes('printing') ||
      cat.includes('stationery') ||
      cat.includes('bank') ||
      cat.includes('fee') ||
      cat.includes('charge')
    );
  };

  const benefitsList = disbursements.filter(d => !isExpenseCategory(d.category_name));
  const expensesList = disbursements.filter(d => isExpenseCategory(d.category_name));

  const totalBenefitsAmount = benefitsList.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const totalExpensesAmount = expensesList.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  const filtered = disbursements.filter(d => {
    const isExp = isExpenseCategory(d.category_name);
    if (activeTab === 'benefits' && isExp) return false;
    if (activeTab === 'expenses' && !isExp) return false;

    const name = d.members ? `${d.members.first_name} ${d.members.surname}`.toLowerCase() : '';
    const cat = (d.category_name || '').toLowerCase();
    const notes = (d.notes || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || cat.includes(query) || notes.includes(query);
  });

  return (
    <RegistrarShell title="Welfare Outflows Ledger" subtitle="Separate ledger for Constitutional Welfare Benefits and Operational Welfare Expenses">
      <div style={{ padding: '24px 0', fontFamily: 'Inter, sans-serif' }}>

        {/* Executive Summary Cards: Benefits vs Expenses */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #e2e8f0', borderLeft: '4px solid #ef4444' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🎁 Constitutional Welfare Benefits
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#991b1b', marginTop: 4, fontFamily: 'monospace' }}>
              GH₵ {totalBenefitsAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              {benefitsList.length} Member Benefit Payouts
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #e2e8f0', borderLeft: '4px solid #0284c7' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🧾 Operational & Admin Expenses
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#0369a1', marginTop: 4, fontFamily: 'monospace' }}>
              GH₵ {totalExpensesAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              {expensesList.length} Logistics & Bank Fees
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #e2e8f0', borderLeft: '4px solid #0f172a' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              💸 Total Welfare Outflows
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', marginTop: 4, fontFamily: 'monospace' }}>
              GH₵ {(totalBenefitsAmount + totalExpensesAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              {disbursements.length} Combined Outflow Entries
            </div>
          </div>
        </div>

        {/* Tab Filter Bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              background: activeTab === 'all' ? '#0f172a' : '#f1f5f9',
              color: activeTab === 'all' ? '#fff' : '#475569'
            }}
          >
            All Outflows ({disbursements.length})
          </button>
          <button
            onClick={() => setActiveTab('benefits')}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              background: activeTab === 'benefits' ? '#be123c' : '#f1f5f9',
              color: activeTab === 'benefits' ? '#fff' : '#475569'
            }}
          >
            🎁 Constitutional Benefits ({benefitsList.length})
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              background: activeTab === 'expenses' ? '#0369a1' : '#f1f5f9',
              color: activeTab === 'expenses' ? '#fff' : '#475569'
            }}
          >
            🧾 Operational Expenses ({expensesList.length})
          </button>
        </div>
        
        {/* Actions & Filters Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <input 
            type="text"
            placeholder="🔍 Search recipient, category or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #CBD5E1', width: 340, fontSize: 14 }}
          />

          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              onClick={exportCSV} 
              style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '10px 20px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
            >
              📥 Export CSV
            </button>
            <button 
              onClick={() => setShowModal(true)} 
              style={{ background: '#EF4444', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}
            >
              🎁 Log Approved Outflow
            </button>
          </div>
        </div>

        {/* Disbursements Table */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading disbursements ledger...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>No welfare outflow entries found.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px' }}>Beneficiary / Entity</th>
                  <th style={{ padding: '12px 16px' }}>Classification & Category</th>
                  <th style={{ padding: '12px 16px' }}>Date</th>
                  <th style={{ padding: '12px 16px' }}>Method</th>
                  <th style={{ padding: '12px 16px' }}>Approval Notes</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount Paid</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => {
                  const isExp = isExpenseCategory(d.category_name);
                  return (
                    <tr key={d.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0F172A' }}>
                        {d.members ? `${d.members.first_name} ${d.members.surname}` : 'Commandery Operational Account'}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#334155' }}>
                        <span style={{ 
                          background: isExp ? '#E0F2FE' : '#FEF2F2', 
                          color: isExp ? '#0369A1' : '#991B1B', 
                          padding: '4px 10px', 
                          borderRadius: 100, 
                          fontSize: 12, 
                          fontWeight: 700 
                        }}>
                          {isExp ? '🧾 Operational: ' : '🎁 Benefit: '}{d.category_name}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748B' }}>
                        {formatDisplayDate(d.disbursement_date)}
                      </td>
                      <td style={{ padding: '14px 16px', textTransform: 'capitalize', color: '#64748B' }}>
                        {d.payment_method?.replace('_', ' ')}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748B', fontSize: 13 }}>
                        {d.notes || 'Chairman offline resolution'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 900, color: isExp ? '#0369a1' : '#EF4444', fontFamily: 'monospace' }}>
                        GH₵ {Number(d.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button 
                          onClick={() => handleDelete(d.id)}
                          style={{ background: 'none', border: 'none', color: '#EF4444', fontWeight: 800, cursor: 'pointer' }}
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Record Disbursement Modal */}
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ background: 'white', borderRadius: 16, padding: 32, maxWidth: 520, width: '90%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Log Offline-Approved Benefit Payout</h3>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 6 }}>RECIPIENT MEMBER</label>
                  <select 
                    value={memberId} 
                    onChange={e => setMemberId(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1' }}
                  >
                    <option value="">-- Choose Member --</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.surname.toUpperCase()}, {m.first_name} ({m.title || 'Bro.'})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 6 }}>BENEFIT CATEGORY</label>
                  <select 
                    value={categoryId} 
                    onChange={e => handleCategorySelect(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1' }}
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Default GH₵ {c.default_amount})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 6 }}>PAYOUT AMOUNT (GH₵)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 6 }}>DISBURSEMENT DATE</label>
                    <input 
                      type="date"
                      value={disbursementDate}
                      onChange={e => setDisbursementDate(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 6 }}>PAYMENT MODE</label>
                    <select 
                      value={paymentMethod} 
                      onChange={e => setPaymentMethod(e.target.value as any)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1' }}
                    >
                      <option value="mobile_money">Mobile Money</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 6 }}>REFERENCE / RECEIPT NO</label>
                    <input 
                      type="text"
                      placeholder="e.g. DISB-091238"
                      value={referenceNo}
                      onChange={e => setReferenceNo(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 6 }}>OFFLINE APPROVAL / COMMITTEE NOTES</label>
                  <textarea 
                    rows={3}
                    placeholder="Notes on Chairman approval resolution, committee approval date, or bereavement details..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                  <button type="button" onClick={() => setShowModal(false)} style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '10px 20px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} style={{ background: '#EF4444', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}>
                    {submitting ? 'Saving...' : 'Log Payout'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </RegistrarShell>
  );
}

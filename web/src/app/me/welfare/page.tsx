'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import MemberShell from '@/components/layout/MemberShell';
import { getWelfareContributions, getWelfareDisbursements, getWelfareCategories } from '@/services/welfareService';
import { WelfareContribution, WelfareDisbursement, WelfareCategory } from '@/types/welfare';
import { formatDisplayDate } from '@/lib/utils/ksji-logic';

export default function MemberWelfarePage() {
  const [contributions, setContributions] = useState<WelfareContribution[]>([]);
  const [disbursements, setDisbursements] = useState<WelfareDisbursement[]>([]);
  const [categories, setCategories] = useState<WelfareCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get linked member record
        const { data: profile } = await supabase
          .from('profiles')
          .select('member_id')
          .eq('id', user.id)
          .single();

        const memberId = profile?.member_id;

        if (memberId) {
          const { data: memberData } = await supabase
            .from('members')
            .select('*')
            .eq('id', memberId)
            .single();
          setMember(memberData);

          const [myContribs, myDisb, cats] = await Promise.all([
            getWelfareContributions({ memberId }),
            getWelfareDisbursements({ memberId }),
            getWelfareCategories(),
          ]);
          setContributions(myContribs);
          setDisbursements(myDisb);
          setCategories(cats);
        }
      } catch (err) {
        console.error('Failed to load personal welfare data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const totalMyContrib = contributions.reduce((acc, c) => acc + Number(c.amount || 0), 0);
  const totalMyDisb = disbursements.reduce((acc, d) => acc + Number(d.amount || 0), 0);

  return (
    <MemberShell title="My Welfare Scheme Portal" subtitle="Personal welfare subscription records and benefit payout history">
      <div style={{ padding: '24px 0', color: '#1E293B', fontFamily: 'Inter, sans-serif' }}>
        
        {/* Member Welfare Banner */}
        <div style={{ 
          background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)', 
          borderRadius: 20, 
          padding: 32, 
          color: 'white',
          marginBottom: 32,
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.2)'
        }}>
          <div style={{ color: '#F59E0B', fontWeight: 900, fontSize: 13, letterSpacing: 1 }}>
            COMMANDERY WELFARE SCHEME
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: '8px 0 16px' }}>
            {member ? `${member.first_name} ${member.surname}` : 'Member Welfare Account'}
          </h1>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, marginTop: 24, borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>TOTAL CONTRIBUTED</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#10B981', fontFamily: 'monospace' }}>
                GH₵ {totalMyContrib.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>BENEFITS RECEIVED</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#F59E0B', fontFamily: 'monospace' }}>
                GH₵ {totalMyDisb.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>SUBSCRIPTION STATUS</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#34D399', marginTop: 4 }}>
                ✓ ACTIVE SUBSCRIBER
              </div>
            </div>
          </div>
        </div>

        {/* Entitlement Guidelines */}
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, color: '#0F172A' }}>
          📜 Welfare Benefit Entitlements
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 36 }}>
          {categories.map(c => (
            <div key={c.id} style={{ background: 'white', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#0F172A' }}>{c.name}</div>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>{c.description || 'Standard Commandery Welfare Benefit.'}</div>
              <div style={{ marginTop: 12, fontWeight: 900, color: '#10B981', fontSize: 16, fontFamily: 'monospace' }}>
                GH₵ {Number(c.default_amount).toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* Personal Tables Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
          
          {/* Contribution History */}
          <div style={cardTableStyle}>
            <div style={tableHeaderStyle}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>My Welfare Dues History</h3>
            </div>
            {loading ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#64748B' }}>Loading history...</div>
            ) : contributions.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>No contributions recorded yet.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                    <th style={{ padding: '10px 16px' }}>Date</th>
                    <th style={{ padding: '10px 16px' }}>Period</th>
                    <th style={{ padding: '10px 16px' }}>Method</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {contributions.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 16px', color: '#64748B' }}>{formatDisplayDate(c.payment_date)}</td>
                      <td style={{ padding: '12px 16px', color: '#64748B' }}>{c.period_year}</td>
                      <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: '#64748B' }}>{c.payment_method?.replace('_', ' ')}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#10B981', fontFamily: 'monospace' }}>
                        GH₵ {Number(c.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Benefits Received */}
          <div style={cardTableStyle}>
            <div style={tableHeaderStyle}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>My Received Benefits</h3>
            </div>
            {loading ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#64748B' }}>Loading benefits...</div>
            ) : disbursements.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>No benefit payouts received.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                    <th style={{ padding: '10px 16px' }}>Benefit Category</th>
                    <th style={{ padding: '10px 16px' }}>Date</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>Amount Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {disbursements.map(d => (
                    <tr key={d.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700 }}>{d.category_name}</td>
                      <td style={{ padding: '12px 16px', color: '#64748B' }}>{formatDisplayDate(d.disbursement_date)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#EF4444', fontFamily: 'monospace' }}>
                        GH₵ {Number(d.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>

      </div>
    </MemberShell>
  );
}

const cardTableStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: 16,
  border: '1px solid #E2E8F0',
  overflow: 'hidden',
  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
};

const tableHeaderStyle: React.CSSProperties = {
  padding: '16px 20px',
  background: '#F8FAFC',
  borderBottom: '1px solid #E2E8F0',
};

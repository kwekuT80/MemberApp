'use client';

import React, { useState } from 'react';
import { 
  FaUsers, 
  FaFileInvoiceDollar, 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaDollarSign,
  FaBalanceScale,
  FaCalculator,
  FaLightbulb
} from 'react-icons/fa';

interface SummaryMember {
  id: string;
  full_name: string;
  phone_number?: string;
  email?: string;
  total_assessed: string | number;
  total_paid: string | number;
  outstanding_balance: string | number;
  payment_status: string;
}

interface InfographicDashboardProps {
  summaries: SummaryMember[];
}

export default function InfographicDashboard({ summaries }: InfographicDashboardProps) {
  // Modal tracking state
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  // CRITICAL REQUIREMENT: Exclude members with zero (0) assessment from the infographic data
  const infoMembers = summaries.filter(m => parseFloat(String(m.total_assessed || 0)) > 0);
  const totalMembersCount = infoMembers.length;

  // 1. Key Summary Calculations
  const totalAssessedSum = infoMembers.reduce((sum, m) => sum + parseFloat(String(m.total_assessed || 0)), 0);
  const totalPaidSum = infoMembers.reduce((sum, m) => sum + parseFloat(String(m.total_paid || 0)), 0);
  const netOutstandingSum = totalAssessedSum - totalPaidSum;

  const totalIndebtednessBeforeOffsets = infoMembers.reduce((sum, m) => {
    const bal = parseFloat(String(m.outstanding_balance || 0));
    return bal > 0 ? sum + bal : sum;
  }, 0);

  const totalOverpaymentsSum = infoMembers.reduce((sum, m) => {
    const bal = parseFloat(String(m.outstanding_balance || 0));
    return bal < 0 ? sum + Math.abs(bal) : sum;
  }, 0);

  // 2. Payment Status Breakdown
  const fullyPaidMembers = infoMembers.filter(m => parseFloat(String(m.outstanding_balance || 0)) <= 0);
  const delinquentMembers = infoMembers.filter(m => parseFloat(String(m.total_paid || 0)) === 0);
  const partiallyPaidMembers = infoMembers.filter(m => 
    parseFloat(String(m.outstanding_balance || 0)) > 0 && parseFloat(String(m.total_paid || 0)) > 0
  );

  const fullyPaidCount = fullyPaidMembers.length;
  const delinquentCount = delinquentMembers.length;
  const partiallyPaidCount = partiallyPaidMembers.length;

  const fullyPaidPct = totalMembersCount > 0 ? (fullyPaidCount / totalMembersCount) * 100 : 0;
  const delinquentPct = totalMembersCount > 0 ? (delinquentCount / totalMembersCount) * 100 : 0;
  const partiallyPaidPct = totalMembersCount > 0 ? (partiallyPaidCount / totalMembersCount) * 100 : 0;

  // 3. Members By Outstanding Balance Range (Buckets)
  const bucketAbove2k = infoMembers.filter(m => parseFloat(String(m.outstanding_balance || 0)) > 2000);
  const bucket1kTo2k = infoMembers.filter(m => {
    const b = parseFloat(String(m.outstanding_balance || 0));
    return b >= 1000 && b <= 2000;
  });
  const bucket500To1k = infoMembers.filter(m => {
    const b = parseFloat(String(m.outstanding_balance || 0));
    return b >= 500 && b < 1000;
  });
  const bucket1To500 = infoMembers.filter(m => {
    const b = parseFloat(String(m.outstanding_balance || 0));
    return b > 0 && b < 500;
  });
  const bucketNilOrOverpaid = infoMembers.filter(m => parseFloat(String(m.outstanding_balance || 0)) <= 0);

  const bucketCounts = [
    { label: 'Above 2,000', count: bucketAbove2k.length, color: '#dc2626' },
    { label: '1,000 – 1,999', count: bucket1kTo2k.length, color: '#ea580c' },
    { label: '500 – 999', count: bucket500To1k.length, color: '#f59e0b' },
    { label: '1 – 499', count: bucket1To500.length, color: '#16a34a' },
    { label: 'Nil or Overpaid', count: bucketNilOrOverpaid.length, color: '#64748b' }
  ];

  const maxBucketCount = Math.max(...bucketCounts.map(b => b.count), 1);

  // 4. Assessed vs Collected rates
  const collectionRate = totalAssessedSum > 0 ? (totalPaidSum / totalAssessedSum) * 100 : 0;
  const outstandingRate = 100 - collectionRate;

  // 5. Outstanding Balance Distribution (Amounts in Buckets)
  const amtAbove2k = bucketAbove2k.reduce((sum, m) => sum + parseFloat(String(m.outstanding_balance || 0)), 0);
  const amt1kTo2k = bucket1kTo2k.reduce((sum, m) => sum + parseFloat(String(m.outstanding_balance || 0)), 0);
  const amt500To1k = bucket500To1k.reduce((sum, m) => sum + parseFloat(String(m.outstanding_balance || 0)), 0);
  const amt1To500 = bucket1To500.reduce((sum, m) => sum + parseFloat(String(m.outstanding_balance || 0)), 0);
  const amtNilOrOverpaid = bucketNilOrOverpaid.reduce((sum, m) => sum + parseFloat(String(m.outstanding_balance || 0)), 0); // negative or zero

  const bucketAmounts = [
    { label: 'Above 2,000', amount: amtAbove2k, color: '#dc2626' },
    { label: '1,000 – 1,999', amount: amt1kTo2k, color: '#ea580c' },
    { label: '500 – 999', amount: amt500To1k, color: '#f59e0b' },
    { label: '1 – 499', amount: amt1To500, color: '#16a34a' },
    { label: 'Overpaid', amount: amtNilOrOverpaid, color: '#64748b' }
  ];

  const maxBucketAmount = Math.max(...bucketAmounts.map(b => Math.abs(b.amount)), 1);

  // 7. Payment Status - Members & Outstanding Amount
  const delinquentAmt = delinquentMembers.reduce((sum, m) => sum + parseFloat(String(m.outstanding_balance || 0)), 0);
  const partiallyPaidAmt = partiallyPaidMembers.reduce((sum, m) => sum + parseFloat(String(m.outstanding_balance || 0)), 0);
  const fullyPaidAmt = fullyPaidMembers.reduce((sum, m) => sum + parseFloat(String(m.outstanding_balance || 0)), 0); // likely negative (overpaid)

  // 9. Statistics Calculations
  const allOutstandingValues = infoMembers.map(m => parseFloat(String(m.outstanding_balance || 0)));
  const positiveOutstandingValues = allOutstandingValues.filter(v => v > 0);
  
  const highestOutstanding = allOutstandingValues.length > 0 ? Math.max(...allOutstandingValues) : 0;
  const averageOutstandingAll = totalMembersCount > 0 ? netOutstandingSum / totalMembersCount : 0;
  const averageOutstandingExcludingOverpaid = positiveOutstandingValues.length > 0 
    ? positiveOutstandingValues.reduce((sum, val) => sum + val, 0) / positiveOutstandingValues.length 
    : 0;

  // Helper function for Median
  const getMedian = (values: number[]) => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const half = Math.floor(sorted.length / 2);
    if (sorted.length % 2 !== 0) {
      return sorted[half];
    }
    return (sorted[half - 1] + sorted[half]) / 2;
  };
  const medianOutstanding = positiveOutstandingValues.length > 0 ? getMedian(positiveOutstandingValues) : 0;

  // Formatting helpers
  const fmt = (n: number) => `GH₵${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtAbs = (n: number) => {
    if (n < 0) {
      return `(GH₵${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
    }
    return `GH₵${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // ─── CARD 1 RENDER ───
  const renderCard1 = (isModal: boolean) => (
    <div className="summary-tile-grid" style={isModal ? { gap: 16 } : undefined}>
      <div className="summary-tile" style={{ background: '#f0f4f8' }}>
        <div className="summary-tile-icon-bg" style={{ background: '#e1e7f0', color: 'var(--navy)' }}>
          <FaUsers />
        </div>
        <div className="summary-tile-content">
          <div className="summary-tile-label" style={isModal ? { fontSize: 11, whiteSpace: 'normal', overflow: 'visible' } : undefined}>Total Members</div>
          <div className="summary-tile-value" style={isModal ? { fontSize: 20, whiteSpace: 'normal', overflow: 'visible' } : undefined}>{totalMembersCount}</div>
        </div>
      </div>

      <div className="summary-tile" style={{ background: '#f0fdf4', border: '1px solid #dcfce7' }}>
        <div className="summary-tile-icon-bg" style={{ background: '#dcfce7', color: '#16a34a' }}>
          <FaFileInvoiceDollar />
        </div>
        <div className="summary-tile-content">
          <div className="summary-tile-label" style={isModal ? { fontSize: 11, whiteSpace: 'normal', overflow: 'visible', color: '#15803d' } : { color: '#15803d' }}>Total Assessed</div>
          <div className="summary-tile-value" style={isModal ? { fontSize: 18, whiteSpace: 'normal', overflow: 'visible', color: '#15803d' } : { color: '#15803d' }}>{fmt(totalAssessedSum)}</div>
        </div>
      </div>

      <div className="summary-tile" style={{ background: '#ecfdf5', border: '1px solid #d1fae5' }}>
        <div className="summary-tile-icon-bg" style={{ background: '#d1fae5', color: 'var(--success)' }}>
          <FaCheckCircle />
        </div>
        <div className="summary-tile-content">
          <div className="summary-tile-label" style={isModal ? { fontSize: 11, whiteSpace: 'normal', overflow: 'visible', color: 'var(--success)' } : { color: 'var(--success)' }}>Total Paid</div>
          <div className="summary-tile-value" style={isModal ? { fontSize: 18, whiteSpace: 'normal', overflow: 'visible', color: 'var(--success)' } : { color: 'var(--success)' }}>{fmt(totalPaidSum)}</div>
        </div>
      </div>

      <div className="summary-tile" style={{ background: '#fffbeb', border: '1px solid #fef3c7' }}>
        <div className="summary-tile-icon-bg" style={{ background: '#fef3c7', color: '#d97706' }}>
          <FaExclamationTriangle />
        </div>
        <div className="summary-tile-content">
          <div className="summary-tile-label" style={isModal ? { fontSize: 11, whiteSpace: 'normal', overflow: 'visible', color: '#b45309' } : { color: '#b45309' }}>Net Outstanding</div>
          <div className="summary-tile-value" style={isModal ? { fontSize: 18, whiteSpace: 'normal', overflow: 'visible', color: '#b45309' } : { color: '#b45309' }}>{fmt(netOutstandingSum)}</div>
        </div>
      </div>

      <div className="summary-tile" style={{ background: '#fff5f5', border: '1px solid #fee2e2' }}>
        <div className="summary-tile-icon-bg" style={{ background: '#fee2e2', color: 'var(--danger)' }}>
          <FaDollarSign />
        </div>
        <div className="summary-tile-content">
          <div className="summary-tile-label" style={isModal ? { fontSize: 11, whiteSpace: 'normal', overflow: 'visible', color: 'var(--danger)' } : { color: 'var(--danger)' }}>Total Overpayments</div>
          <div className="summary-tile-value" style={isModal ? { fontSize: 18, whiteSpace: 'normal', overflow: 'visible', color: 'var(--danger)' } : { color: 'var(--danger)' }}>{fmt(totalOverpaymentsSum)}</div>
        </div>
      </div>

      <div className="summary-tile" style={{ background: '#f5f3ff', border: '1px solid #edd9ff' }}>
        <div className="summary-tile-icon-bg" style={{ background: '#e8dbff', color: '#7c3aed' }}>
          <FaBalanceScale />
        </div>
        <div className="summary-tile-content">
          <div className="summary-tile-label" style={isModal ? { fontSize: 11, whiteSpace: 'normal', overflow: 'visible', color: '#6d28d9' } : { color: '#6d28d9' }}>Actual Indebtedness</div>
          <div className="summary-tile-value" style={isModal ? { fontSize: 18, whiteSpace: 'normal', overflow: 'visible', color: '#6d28d9' } : { color: '#6d28d9', fontSize: 11 }}>{fmt(totalIndebtednessBeforeOffsets)}</div>
        </div>
      </div>
    </div>
  );

  // ─── CARD 2 RENDER ───
  const renderCard2 = (isModal: boolean) => {
    const size = isModal ? 180 : 120;
    const r = isModal ? 70 : 50;
    const circ = 2 * Math.PI * r;
    const fp = (fullyPaidPct / 100) * circ;
    const pp = (partiallyPaidPct / 100) * circ;
    const del = (delinquentPct / 100) * circ;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: isModal ? 16 : 12 }}>
        <div style={{ display: 'flex', gap: isModal ? 30 : 20, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="transparent" stroke="#f1f5f9" strokeWidth={isModal ? 16 : 12} />
            {fp > 0 && (
              <circle cx={size / 2} cy={size / 2} r={r} fill="transparent" stroke="#16a34a" strokeWidth={isModal ? 16 : 12} 
                strokeDasharray={`${fp} ${circ}`} strokeDashoffset={0} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
            )}
            {pp > 0 && (
              <circle cx={size / 2} cy={size / 2} r={r} fill="transparent" stroke="#f59e0b" strokeWidth={isModal ? 16 : 12} 
                strokeDasharray={`${pp} ${circ}`} strokeDashoffset={-fp} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
            )}
            {del > 0 && (
              <circle cx={size / 2} cy={size / 2} r={r} fill="transparent" stroke="#dc2626" strokeWidth={isModal ? 16 : 12} 
                strokeDasharray={`${del} ${circ}`} strokeDashoffset={-(fp + pp)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
            )}
          </svg>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: isModal ? 28 : 18, fontWeight: 900, color: 'var(--navy)' }}>{totalMembersCount}</span>
            <span style={{ fontSize: isModal ? 10 : 8, fontWeight: 800, color: 'var(--grey)', textTransform: 'uppercase' }}>Members</span>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: isModal ? 12 : 8, minWidth: 160 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: '#16a34a' }}></div>
            <div style={{ fontSize: isModal ? 14 : 11, fontWeight: 700 }}>
              Fully Paid <span style={{ color: 'var(--grey)' }}>({fullyPaidCount} - {fullyPaidPct.toFixed(1)}%)</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: '#f59e0b' }}></div>
            <div style={{ fontSize: isModal ? 14 : 11, fontWeight: 700 }}>
              Partially Paid <span style={{ color: 'var(--grey)' }}>({partiallyPaidCount} - {partiallyPaidPct.toFixed(1)}%)</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: '#dc2626' }}></div>
            <div style={{ fontSize: isModal ? 14 : 11, fontWeight: 700 }}>
              Delinquent <span style={{ color: 'var(--grey)' }}>({delinquentCount} - {delinquentPct.toFixed(1)}%)</span>
            </div>
          </div>
        </div>
        </div>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: isModal ? 13 : 11, fontWeight: 600, lineHeight: 1.5, color: 'var(--grey)' }}>
          💡 The majority of members ({partiallyPaidPct.toFixed(1)}%) have made partial payments. Only {delinquentCount} Brother{delinquentCount !== 1 ? 's' : ''} ({delinquentPct.toFixed(1)}%) {delinquentCount === 1 ? 'has' : 'have'} not made any payment.
        </div>
      </div>
    );
  };

  // ─── CARD 3 RENDER ───
  const renderCard3 = (isModal: boolean) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isModal ? 14 : 10 }}>
      {bucketCounts.map(b => {
        const widthPct = (b.count / maxBucketCount) * 100;
        return (
          <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: isModal ? 110 : 95, fontSize: isModal ? 12 : 10, fontWeight: 800, color: 'var(--grey)', textAlign: 'right' }}>
              {b.label}
            </div>
            <div style={{ flex: 1, height: isModal ? 24 : 16, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${widthPct}%`, height: '100%', background: b.color, borderRadius: 4 }}></div>
            </div>
            <div style={{ width: 24, fontSize: isModal ? 13 : 11, fontWeight: 900, color: 'var(--navy)' }}>
              {b.count}
            </div>
          </div>
        );
      })}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: isModal ? 13 : 10.5, fontWeight: 600, lineHeight: 1.5, color: 'var(--grey)', marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div>• {( (bucket1To500.length + bucketNilOrOverpaid.length) / totalMembersCount * 100 ).toFixed(1)}% of members owe GH₵500 or less.</div>
        <div>• {( (bucketAbove2k.length + bucket1kTo2k.length) / totalMembersCount * 100 ).toFixed(1)}% of members owe GH₵1,000 or more.</div>
      </div>
    </div>
  );

  // ─── CARD 4 RENDER ───
  const renderCard4 = (isModal: boolean) => {
    const size = isModal ? 180 : 120;
    const r = isModal ? 70 : 50;
    const circ = 2 * Math.PI * r;
    const coll = (collectionRate / 100) * circ;
    const out = (outstandingRate / 100) * circ;

    return (
      <>
        <div style={{ display: 'flex', gap: isModal ? 30 : 20, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="transparent" stroke="#f1f5f9" strokeWidth={isModal ? 16 : 12} />
            {coll > 0 && (
              <circle cx={size / 2} cy={size / 2} r={r} fill="transparent" stroke="#16a34a" strokeWidth={isModal ? 16 : 12} 
                strokeDasharray={`${coll} ${circ}`} strokeDashoffset={0} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
            )}
            {out > 0 && (
              <circle cx={size / 2} cy={size / 2} r={r} fill="transparent" stroke="#dc2626" strokeWidth={isModal ? 16 : 12} 
                strokeDasharray={`${out} ${circ}`} strokeDashoffset={-coll} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
            )}
          </svg>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: isModal ? 20 : 13, fontWeight: 950, color: '#16a34a' }}>{collectionRate.toFixed(1)}%</span>
            <span style={{ fontSize: isModal ? 9 : 7, fontWeight: 800, color: 'var(--grey)', textTransform: 'uppercase' }}>Collection</span>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: isModal ? 12 : 10, minWidth: 180 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: '#1D4ED8' }}></div>
              <span style={{ fontSize: isModal ? 11 : 9.5, fontWeight: 800, color: 'var(--grey)' }}>TOTAL ASSESSED (100%)</span>
            </div>
            <div style={{ fontSize: isModal ? 15 : 12, fontWeight: 900, color: 'var(--navy)' }}>{fmt(totalAssessedSum)}</div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: '#16a34a' }}></div>
              <span style={{ fontSize: isModal ? 11 : 9.5, fontWeight: 800, color: 'var(--success)' }}>TOTAL PAID ({collectionRate.toFixed(1)}%)</span>
            </div>
            <div style={{ fontSize: isModal ? 15 : 12, fontWeight: 900, color: 'var(--success)' }}>{fmt(totalPaidSum)}</div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: '#dc2626' }}></div>
              <span style={{ fontSize: isModal ? 11 : 9.5, fontWeight: 800, color: 'var(--danger)' }}>NET OUTSTANDING ({outstandingRate.toFixed(1)}%)</span>
            </div>
            <div style={{ fontSize: isModal ? 15 : 12, fontWeight: 900, color: 'var(--danger)' }}>{fmt(netOutstandingSum)}</div>
          </div>
          </div>
        </div>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: isModal ? 13 : 11, fontWeight: 600, lineHeight: 1.5, color: 'var(--grey)' }}>
          📈 We have collected {collectionRate.toFixed(1)}% of the total assessments. {fmt(netOutstandingSum)} remains outstanding.
        </div>
      </>
    );
  };

  // ─── CARD 5 RENDER ───
  const renderCard5 = (isModal: boolean) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isModal ? 14 : 10 }}>
      {bucketAmounts.map(b => {
        const amtVal = Math.abs(b.amount);
        const widthPct = (amtVal / maxBucketAmount) * 100;
        return (
          <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: isModal ? 110 : 95, fontSize: isModal ? 12 : 10, fontWeight: 800, color: 'var(--grey)', textAlign: 'right' }}>
              {b.label}
            </div>
            <div style={{ flex: 1, height: isModal ? 24 : 16, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${widthPct}%`, height: '100%', background: b.color, borderRadius: 4 }}></div>
            </div>
            <div style={{ width: isModal ? 100 : 85, fontSize: isModal ? 12.5 : 10.5, fontWeight: 900, color: b.amount < 0 ? 'var(--danger)' : 'var(--navy)' }}>
              {fmtAbs(b.amount)}
            </div>
          </div>
        );
      })}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: isModal ? 13 : 10.5, fontWeight: 600, lineHeight: 1.5, color: 'var(--grey)', marginTop: 4, display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: isModal ? 10 : 8, fontWeight: 800, color: '#15803d', textTransform: 'uppercase', marginBottom: 2 }}>Total Outstanding</div>
          <div style={{ fontSize: isModal ? 14 : 11, fontWeight: 900, color: '#15803d' }}>{fmt(netOutstandingSum)}</div>
        </div>
        <div style={{ flex: 1, background: '#fff5f5', border: '1px solid #fee2e2', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: isModal ? 10 : 8, fontWeight: 800, color: 'var(--danger)', textTransform: 'uppercase', marginBottom: 2 }}>Total Overpayments</div>
          <div style={{ fontSize: isModal ? 14 : 11, fontWeight: 900, color: 'var(--danger)' }}>{fmt(totalOverpaymentsSum)}</div>
        </div>
      </div>
    </div>
  );

  // ─── CARD 6 RENDER ───
  const renderCard6 = (isModal: boolean) => {
    const w = isModal ? 550 : 300;
    const h = isModal ? 220 : 150;
    const baselineY = isModal ? 180 : 130;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ height: h, width: '100%', position: 'relative' }}>
          <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
            <line x1="0" y1={baselineY} x2={w} y2={baselineY} stroke="#cbd5e1" strokeWidth="1" />

            {/* Billed */}
            <rect x={isModal ? 30 : 20} y={isModal ? 30 : 20} width={isModal ? 60 : 35} height={isModal ? 150 : 110} fill="#1e3a8a" rx="3" />
            
            {/* Paid */}
            <rect x={isModal ? 160 : 90} y={isModal ? 30 : 20} width={isModal ? 60 : 35} height={isModal ? 110 : 80} fill="#16a34a" rx="3" />
            
            {/* Owed */}
            <rect x={isModal ? 290 : 160} y={isModal ? 140 : 100} width={isModal ? 60 : 35} height={isModal ? 40 : 30} fill="#dc2626" rx="3" />
            
            {/* Overpaid */}
            <rect x={isModal ? 420 : 230} y={isModal ? 165 : 115} width={isModal ? 60 : 35} height={isModal ? 15 : 15} fill="#64748b" rx="3" />

            {/* Connecting lines */}
            <line x1={isModal ? 90 : 55} y1={isModal ? 30 : 20} x2={isModal ? 160 : 90} y2={isModal ? 30 : 20} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,3" />
            <line x1={isModal ? 220 : 125} y1={isModal ? 140 : 100} x2={isModal ? 290 : 160} y2={isModal ? 140 : 100} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,3" />
            <line x1={isModal ? 350 : 195} y1={baselineY} x2={isModal ? 420 : 230} y2={baselineY} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,3" />
          </svg>

          {/* Value Labels Overlay */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 5px', fontSize: isModal ? 10 : 7.5, fontWeight: 800, color: 'var(--grey)', textTransform: 'uppercase', marginTop: 4 }}>
            <div style={{ width: isModal ? 80 : 50, textAlign: 'center' }}>Billed<br/><span style={{ color: 'var(--navy)' }}>{fmt(totalAssessedSum)}</span></div>
            <div style={{ width: isModal ? 80 : 50, textAlign: 'center' }}>Paid<br/><span style={{ color: 'var(--success)' }}>({fmt(totalPaidSum)})</span></div>
            <div style={{ width: isModal ? 80 : 50, textAlign: 'center' }}>Owed<br/><span style={{ color: 'var(--danger)' }}>({fmt(netOutstandingSum)})</span></div>
            <div style={{ width: isModal ? 80 : 50, textAlign: 'center' }}>Overpaid<br/><span style={{ color: '#64748b' }}>{fmt(totalOverpaymentsSum)}</span></div>
          </div>
        </div>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: isModal ? 13 : 10.5, fontWeight: 600, lineHeight: 1.5, color: 'var(--grey)', display: 'flex', gap: 8, width: '100%' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, background: '#f8fafc', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <span style={{ fontSize: isModal ? 10 : 7.5, fontWeight: 800, color: 'var(--grey)', textTransform: 'uppercase' }}>Actual Debt (Before Offsets)</span>
            <span style={{ fontSize: isModal ? 14 : 10.5, fontWeight: 900, color: 'var(--navy)' }}>{fmt(totalIndebtednessBeforeOffsets)}</span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, background: '#f8fafc', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <span style={{ fontSize: isModal ? 10 : 7.5, fontWeight: 800, color: 'var(--grey)', textTransform: 'uppercase' }}>Net Debt (After Offsets)</span>
            <span style={{ fontSize: isModal ? 14 : 10.5, fontWeight: 900, color: 'var(--navy)' }}>{fmt(netOutstandingSum)}</span>
          </div>
        </div>
      </div>
    );
  };

  // ─── CARD 7 RENDER ───
  const renderCard7 = (isModal: boolean) => {
    const w = isModal ? 550 : 300;
    const h = isModal ? 220 : 160;
    const baselineY = isModal ? 180 : 130;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ height: h, width: '100%', position: 'relative' }}>
          <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
            <line x1="0" y1={baselineY} x2={w} y2={baselineY} stroke="#cbd5e1" strokeWidth="1" />
            <line x1="0" y1={isModal ? 40 : 30} x2={w} y2={isModal ? 40 : 30} stroke="#f1f5f9" strokeWidth="1" />
            <line x1="0" y1={isModal ? 110 : 80} x2={w} y2={isModal ? 110 : 80} stroke="#f1f5f9" strokeWidth="1" />

            {/* Delinquent Column */}
            <rect x={isModal ? 65 : 35} y={baselineY - Math.max(15, (delinquentCount / totalMembersCount) * (isModal ? 140 : 100))} width={isModal ? 50 : 30} height={Math.max(15, (delinquentCount / totalMembersCount) * (isModal ? 140 : 100))} fill="#dc2626" opacity="0.15" rx="2" />
            
            {/* Partially Paid Column */}
            <rect x={isModal ? 245 : 135} y={baselineY - Math.max(15, (partiallyPaidCount / totalMembersCount) * (isModal ? 140 : 100))} width={isModal ? 50 : 30} height={Math.max(15, (partiallyPaidCount / totalMembersCount) * (isModal ? 140 : 100))} fill="#f59e0b" opacity="0.15" rx="2" />
            
            {/* Fully Paid Column */}
            <rect x={isModal ? 425 : 235} y={baselineY - Math.max(15, (fullyPaidCount / totalMembersCount) * (isModal ? 140 : 100))} width={isModal ? 50 : 30} height={Math.max(15, (fullyPaidCount / totalMembersCount) * (isModal ? 140 : 100))} fill="#16a34a" opacity="0.15" rx="2" />

            {/* Line Graph */}
            {(() => {
              const maxAmt = Math.max(delinquentAmt, partiallyPaidAmt, 1);
              const getY = (val: number) => {
                if (val <= 0) return baselineY + 12;
                return baselineY - (val / maxAmt) * (isModal ? 130 : 100);
              };

              const x1 = isModal ? 90 : 50;
              const x2 = isModal ? 270 : 150;
              const x3 = isModal ? 450 : 250;

              const y1 = getY(delinquentAmt);
              const y2 = getY(partiallyPaidAmt);
              const y3 = getY(fullyPaidAmt);

              return (
                <>
                  <path d={`M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3}`} fill="none" stroke="#dc2626" strokeWidth={isModal ? 3.5 : 2.5} strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx={x1} cy={y1} r={isModal ? 7 : 5} fill="#dc2626" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx={x2} cy={y2} r={isModal ? 7 : 5} fill="#dc2626" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx={x3} cy={y3} r={isModal ? 7 : 5} fill="#dc2626" stroke="#ffffff" strokeWidth="1.5" />

                  <text x={x1} y={y1 - 12} fontSize={isModal ? 10 : 8} fontWeight="800" textAnchor="middle" fill="#dc2626">{fmtAbs(delinquentAmt)}</text>
                  <text x={x2} y={y2 - 12} fontSize={isModal ? 10 : 8} fontWeight="800" textAnchor="middle" fill="#dc2626">{fmtAbs(partiallyPaidAmt)}</text>
                  <text x={x3} y={y3 + 18} fontSize={isModal ? 10 : 8} fontWeight="800" textAnchor="middle" fill="#dc2626">{fmtAbs(fullyPaidAmt)}</text>
                </>
              );
            })()}
          </svg>

          <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: isModal ? 10.5 : 8.5, fontWeight: 800, color: 'var(--grey)', textTransform: 'uppercase', marginTop: 4 }}>
            <div style={{ textAlign: 'center', width: isModal ? 120 : 80 }}>Delinquent<br/><span style={{ color: 'var(--navy)' }}>{delinquentCount} Members</span></div>
            <div style={{ textAlign: 'center', width: isModal ? 120 : 80 }}>Partial Paid<br/><span style={{ color: 'var(--navy)' }}>{partiallyPaidCount} Members</span></div>
            <div style={{ textAlign: 'center', width: isModal ? 120 : 80 }}>Fully Paid<br/><span style={{ color: 'var(--navy)' }}>{fullyPaidCount} Members</span></div>
          </div>
        </div>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: isModal ? 13 : 10.5, fontWeight: 600, lineHeight: 1.5, color: 'var(--grey)', width: '100%' }}>
          💡 Partially paid members account for {((partiallyPaidAmt / totalIndebtednessBeforeOffsets) * 100).toFixed(1)}% of the outstanding indebtedness.
        </div>
      </div>
    );
  };

  // ─── CARD 8 RENDER ───
  const renderCard8 = (isModal: boolean) => {
    const w = isModal ? 550 : 300;
    const h = isModal ? 220 : 160;
    const baselineY = isModal ? 180 : 130;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ height: h, width: '100%', position: 'relative' }}>
          <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
            <line x1="0" y1={isModal ? 40 : 30} x2={w} y2={isModal ? 40 : 30} stroke="#f1f5f9" strokeWidth="1" />
            <line x1="0" y1={isModal ? 110 : 80} x2={w} y2={isModal ? 110 : 80} stroke="#f1f5f9" strokeWidth="1" />
            <line x1="0" y1={baselineY} x2={w} y2={baselineY} stroke="#cbd5e1" strokeWidth="1" />

            {bucketCounts.map((b, idx) => {
              const colW = isModal ? 46 : 26;
              const colSpacing = isModal ? 100 : 56;
              const x = (isModal ? 30 : 15) + idx * colSpacing;
              const barHeight = (b.count / maxBucketCount) * (isModal ? 140 : 100);
              const y = baselineY - barHeight;

              return (
                <g key={b.label}>
                  <rect x={x} y={y} width={colW} height={barHeight} fill={b.color} rx="3" />
                  <text x={x + colW / 2} y={y - 8} fontSize={isModal ? 11 : 9} fontWeight="800" textAnchor="middle" fill="var(--navy)">{b.count}</text>
                </g>
              );
            })}
          </svg>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 2px', fontSize: isModal ? 9 : 7, fontWeight: 800, color: 'var(--grey)', textTransform: 'uppercase', marginTop: 4 }}>
            <div style={{ width: isModal ? 60 : 44, textAlign: 'center' }}>&gt;2,000</div>
            <div style={{ width: isModal ? 60 : 44, textAlign: 'center' }}>1k–2k</div>
            <div style={{ width: isModal ? 60 : 44, textAlign: 'center' }}>500–999</div>
            <div style={{ width: isModal ? 60 : 44, textAlign: 'center' }}>1–499</div>
            <div style={{ width: isModal ? 60 : 44, textAlign: 'center' }}>Nil/Overpaid</div>
          </div>
        </div>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: isModal ? 13 : 10.5, fontWeight: 600, lineHeight: 1.5, color: 'var(--grey)', textAlign: 'center', width: '100%' }}>
          🎯 <strong>{( (bucket1To500.length) / totalMembersCount * 100 ).toFixed(1)}%</strong> of assessed members owe between GH₵1 and GH₵499.
        </div>
      </div>
    );
  };

  // ─── CARD 9 RENDER ───
  const renderCard9 = (isModal: boolean) => (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isModal ? 16 : 10 }}>
      <div style={{ borderLeft: '3px solid #dc2626', paddingLeft: 8 }}>
        <div style={{ fontSize: isModal ? 10 : 8, fontWeight: 800, color: 'var(--grey)', textTransform: 'uppercase' }}>Highest Owed</div>
        <div style={{ fontSize: isModal ? 15 : 11.5, fontWeight: 900, color: 'var(--navy)', marginTop: 2 }}>{fmt(highestOutstanding)}</div>
      </div>
      <div style={{ borderLeft: '3px solid #1D4ED8', paddingLeft: 8 }}>
        <div style={{ fontSize: isModal ? 10 : 8, fontWeight: 800, color: 'var(--grey)', textTransform: 'uppercase' }}>Average (All)</div>
        <div style={{ fontSize: isModal ? 15 : 11.5, fontWeight: 900, color: 'var(--navy)', marginTop: 2 }}>{fmt(averageOutstandingAll)}</div>
      </div>
      <div style={{ borderLeft: '3px solid #ea580c', paddingLeft: 8 }}>
        <div style={{ fontSize: isModal ? 10 : 8, fontWeight: 800, color: 'var(--grey)', textTransform: 'uppercase' }}>Average (Owed Only)</div>
        <div style={{ fontSize: isModal ? 15 : 11.5, fontWeight: 900, color: 'var(--navy)', marginTop: 2 }}>{fmt(averageOutstandingExcludingOverpaid)}</div>
      </div>
      <div style={{ borderLeft: '3px solid #16a34a', paddingLeft: 8 }}>
        <div style={{ fontSize: isModal ? 10 : 8, fontWeight: 800, color: 'var(--grey)', textTransform: 'uppercase' }}>Median Owed</div>
        <div style={{ fontSize: isModal ? 15 : 11.5, fontWeight: 900, color: 'var(--navy)', marginTop: 2 }}>{fmt(medianOutstanding)}</div>
      </div>
      <div style={{ borderLeft: '3px solid #64748b', paddingLeft: 8 }}>
        <div style={{ fontSize: isModal ? 10 : 8, fontWeight: 800, color: 'var(--grey)', textTransform: 'uppercase' }}>Total Overpaid</div>
        <div style={{ fontSize: isModal ? 15 : 11.5, fontWeight: 900, color: 'var(--navy)', marginTop: 2 }}>{fmt(totalOverpaymentsSum)}</div>
      </div>
      <div style={{ borderLeft: '3px solid #7c3aed', paddingLeft: 8 }}>
        <div style={{ fontSize: isModal ? 10 : 8, fontWeight: 800, color: 'var(--grey)', textTransform: 'uppercase' }}>Debt Before Offsets</div>
        <div style={{ fontSize: isModal ? 15 : 11.5, fontWeight: 900, color: 'var(--navy)', marginTop: 2 }}>{fmt(totalIndebtednessBeforeOffsets)}</div>
      </div>
    </div>
    <div style={{ background: '#f5f3ff', border: '1px solid #edd9ff', borderRadius: 8, padding: '10px 12px', fontSize: isModal ? 13 : 11, fontWeight: 600, lineHeight: 1.5, color: '#6d28d9', marginTop: isModal ? 16 : 10, display: 'flex', alignItems: 'center', gap: 8 }}>
      <FaCalculator style={{ flexShrink: 0 }} />
      <span>Mean outstanding balance for those with active debt is <strong>{fmt(averageOutstandingExcludingOverpaid)}</strong>, while the median is <strong>{fmt(medianOutstanding)}</strong>.</span>
    </div>
  </>
  );

  if (totalMembersCount === 0) {
    return (
      <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--grey)' }}>
        <FaExclamationTriangle style={{ fontSize: 40, color: 'var(--warning)', marginBottom: 16 }} />
        <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)', marginBottom: 8 }}>No Infographic Data Available</h3>
        <p style={{ maxWidth: 460, margin: '0 auto', fontSize: 13, lineHeight: 1.6 }}>
          All matching members have zero (GH₵0.00) assessments. Members with zero assessments are excluded from the infographic calculations.
        </p>
      </div>
    );
  }

  return (
    <div className="no-print">
      
      {/* ─── 3x3 DASHBOARD GRID ─── */}
      <div className="info-grid">

        {/* ── CARD 1: KEY SUMMARY ── */}
        <div className="info-card" onClick={() => setSelectedCard(1)} style={{ cursor: 'pointer' }}>
          <div className="info-card-header">
            <span className="info-card-number">1</span>
            <h3 className="info-card-title">Key Summary</h3>
          </div>
          <div className="info-card-body" style={{ minHeight: 280 }}>
            {renderCard1(false)}
          </div>
        </div>

        {/* ── CARD 2: PAYMENT STATUS BREAKDOWN ── */}
        <div className="info-card" onClick={() => setSelectedCard(2)} style={{ cursor: 'pointer' }}>
          <div className="info-card-header">
            <span className="info-card-number">2</span>
            <h3 className="info-card-title">Payment Status Breakdown</h3>
          </div>
          <div className="info-card-body" style={{ minHeight: 280 }}>
            {renderCard2(false)}
          </div>
        </div>

        {/* ── CARD 3: MEMBERS BY OUTSTANDING BALANCE RANGE ── */}
        <div className="info-card" onClick={() => setSelectedCard(3)} style={{ cursor: 'pointer' }}>
          <div className="info-card-header">
            <span className="info-card-number">3</span>
            <h3 className="info-card-title">Members By Balance Range</h3>
          </div>
          <div className="info-card-body" style={{ minHeight: 280 }}>
            {renderCard3(false)}
          </div>
        </div>

        {/* ── CARD 4: ASSESSED vs COLLECTED ── */}
        <div className="info-card" onClick={() => setSelectedCard(4)} style={{ cursor: 'pointer' }}>
          <div className="info-card-header">
            <span className="info-card-number">4</span>
            <h3 className="info-card-title">Assessed vs Collected</h3>
          </div>
          <div className="info-card-body" style={{ minHeight: 280 }}>
            {renderCard4(false)}
          </div>
        </div>

        {/* ── CARD 5: OUTSTANDING BALANCE DISTRIBUTION (AMOUNT) ── */}
        <div className="info-card" onClick={() => setSelectedCard(5)} style={{ cursor: 'pointer' }}>
          <div className="info-card-header">
            <span className="info-card-number">5</span>
            <h3 className="info-card-title">Balance Distribution (Amount)</h3>
          </div>
          <div className="info-card-body" style={{ minHeight: 280 }}>
            {renderCard5(false)}
          </div>
        </div>

        {/* ── CARD 6: ASSESSMENTS, PAYMENTS & BALANCE FLOW ── */}
        <div className="info-card" onClick={() => setSelectedCard(6)} style={{ cursor: 'pointer' }}>
          <div className="info-card-header">
            <span className="info-card-number">6</span>
            <h3 className="info-card-title">Balance Flow (Waterfall)</h3>
          </div>
          <div className="info-card-body" style={{ minHeight: 280 }}>
            {renderCard6(false)}
          </div>
        </div>

        {/* ── CARD 7: PAYMENT STATUS - MEMBERS & OUTSTANDING AMOUNT ── */}
        <div className="info-card" onClick={() => setSelectedCard(7)} style={{ cursor: 'pointer' }}>
          <div className="info-card-header">
            <span className="info-card-number">7</span>
            <h3 className="info-card-title">Status - Members & Amounts</h3>
          </div>
          <div className="info-card-body" style={{ minHeight: 280 }}>
            {renderCard7(false)}
          </div>
        </div>

        {/* ── CARD 8: OUTSTANDING BALANCE BAND ANALYSIS ── */}
        <div className="info-card" onClick={() => setSelectedCard(8)} style={{ cursor: 'pointer' }}>
          <div className="info-card-header">
            <span className="info-card-number">8</span>
            <h3 className="info-card-title">Balance Band Analysis</h3>
          </div>
          <div className="info-card-body" style={{ minHeight: 280 }}>
            {renderCard8(false)}
          </div>
        </div>

        {/* ── CARD 9: OUTSTANDING BALANCE STATISTICS ── */}
        <div className="info-card" onClick={() => setSelectedCard(9)} style={{ cursor: 'pointer' }}>
          <div className="info-card-header">
            <span className="info-card-number">9</span>
            <h3 className="info-card-title">Balance Statistics</h3>
          </div>
          <div className="info-card-body" style={{ minHeight: 280 }}>
            {renderCard9(false)}
          </div>
        </div>

      </div>

      {/* ─── BOTTOM FULL-WIDTH TAKEAWAY BANNER ─── */}
      <div className="takeaway-banner">
        <span className="takeaway-label">
          <FaLightbulb style={{ marginRight: 6, verticalAlign: 'middle', marginTop: -2 }} />
          Key Takeaway
        </span>
        <div className="takeaway-text">
          We have collected {collectionRate.toFixed(2)}% of the total assessments. {fmt(netOutstandingSum)} remains outstanding after accounting for {fmt(totalOverpaymentsSum)} in overpayments.
        </div>
      </div>

      {/* ─── ENLARGED MODAL DIALOG ─── */}
      {selectedCard !== null && (
        <div className="modal-overlay" onClick={() => setSelectedCard(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <span className="info-card-number">{selectedCard}</span>
                <h3 className="info-card-title" style={{ color: '#FFFFFF', margin: 0 }}>
                  {selectedCard === 1 && "Key Summary"}
                  {selectedCard === 2 && "Payment Status Breakdown"}
                  {selectedCard === 3 && "Members By Balance Range"}
                  {selectedCard === 4 && "Assessed vs Collected"}
                  {selectedCard === 5 && "Balance Distribution (Amount)"}
                  {selectedCard === 6 && "Balance Flow (Waterfall)"}
                  {selectedCard === 7 && "Status - Members & Amounts"}
                  {selectedCard === 8 && "Balance Band Analysis"}
                  {selectedCard === 9 && "Balance Statistics"}
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedCard(null)}>&times;</button>
            </div>
            <div className="modal-body">
              {selectedCard === 1 && renderCard1(true)}
              {selectedCard === 2 && renderCard2(true)}
              {selectedCard === 3 && renderCard3(true)}
              {selectedCard === 4 && renderCard4(true)}
              {selectedCard === 5 && renderCard5(true)}
              {selectedCard === 6 && renderCard6(true)}
              {selectedCard === 7 && renderCard7(true)}
              {selectedCard === 8 && renderCard8(true)}
              {selectedCard === 9 && renderCard9(true)}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

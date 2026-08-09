'use client';

import React from 'react';

interface DuesBenchmarkTrackerProps {
  currentYear: number;
  currentMonth: number;
  lastYearArrears: number;
  currentAssessment: number;
  totalAssessed: number;
  paymentsThisYear: number;
  requiredDuesThreshold: number;
  standing: 'In Good Standing' | 'Not In Good Standing' | 'Exempt (Roll of Honor)' | 'Exempt';
}

export default function DuesBenchmarkTracker({
  currentYear,
  currentMonth,
  lastYearArrears,
  currentAssessment,
  totalAssessed,
  paymentsThisYear,
  requiredDuesThreshold,
  standing
}: DuesBenchmarkTrackerProps) {
  const isFirstHalf = currentMonth < 9; // Jan-Aug = 1st Half (50% target)
  const isGood = standing === 'In Good Standing';

  // Benchmark targets
  const halfTarget = lastYearArrears + (currentAssessment * 0.5);
  const fullTarget = totalAssessed;

  // Percentage calculations
  const totalPercentage = totalAssessed > 0 ? Math.min(100, Math.round((paymentsThisYear / totalAssessed) * 100)) : 100;
  const halfPercentage = halfTarget > 0 ? Math.min(100, Math.round((paymentsThisYear / halfTarget) * 100)) : 100;

  const formatCurrency = (val: number) =>
    `GH₵ ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const amountOwedForFirstHalf = Math.max(0, halfTarget - paymentsThisYear);
  const amountOwedForFull = Math.max(0, fullTarget - paymentsThisYear);

  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      border: '1px solid #E2E8F0',
      padding: '24px 28px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
      marginBottom: 28
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 900, color: '#64748B', letterSpacing: 1, textTransform: 'uppercase' }}>
            🎯 ANNUAL FINANCIAL DUES STANDING TRACKER ({currentYear})
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 900, margin: '4px 0 0', color: '#0F172A' }}>
            {isFirstHalf ? '1st Half Standing Goal (50% Assessment + Arrears by Aug 31)' : '2nd Half Full Settlement Goal (100% Assessment by Sept 1)'}
          </h3>
        </div>

        {/* Status Pill */}
        <div style={{
          background: isGood ? '#DCFCE7' : '#FEF3C7',
          color: isGood ? '#166534' : '#92400E',
          border: `1px solid ${isGood ? '#86EFAC' : '#FCD34D'}`,
          padding: '6px 16px',
          borderRadius: 50,
          fontSize: 13,
          fontWeight: 900,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6
        }}>
          <span>{isGood ? '✅' : '⚠️'}</span>
          <span>{isGood ? 'Good Standing Target Met' : 'Action Needed for Good Standing'}</span>
        </div>
      </div>

      {/* Progress Bar Track */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 6 }}>
          <span>Paid to Date: {formatCurrency(paymentsThisYear)}</span>
          <span>Total Assessed: {formatCurrency(totalAssessed)} ({totalPercentage}%)</span>
        </div>

        {/* Outer Bar */}
        <div style={{ height: 16, width: '100%', background: '#F1F5F9', borderRadius: 20, overflow: 'hidden', position: 'relative', border: '1px solid #CBD5E1' }}>
          
          {/* Fill Bar */}
          <div style={{
            height: '100%',
            width: `${totalPercentage}%`,
            background: isGood 
              ? 'linear-gradient(90deg, #10B981 0%, #059669 100%)' 
              : 'linear-gradient(90deg, #F59E0B 0%, #D97706 100%)',
            borderRadius: 20,
            transition: 'width 0.6s ease'
          }} />

          {/* 50% Marker Pin (if first half active) */}
          {isFirstHalf && (
            <div style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${Math.min(100, Math.round((halfTarget / Math.max(1, totalAssessed)) * 100))}%`,
              width: 3,
              background: '#0F172A',
              zIndex: 2
            }} title="1st Half 50% Standing Benchmark Target" />
          )}

        </div>
      </div>

      {/* Benchmark Milestones Card Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        
        {/* Milestone 1: 1st Half Benchmark */}
        <div style={{
          background: isFirstHalf ? (paymentsThisYear >= halfTarget ? '#F0FDF4' : '#FFFBEB') : '#F8FAFC',
          border: `1px solid ${isFirstHalf ? (paymentsThisYear >= halfTarget ? '#BBF7D0' : '#FCD34D') : '#E2E8F0'}`,
          borderRadius: 12,
          padding: '12px 16px'
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B' }}>1ST HALF BENCHMARK (DUE AUG 31)</div>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#0F172A', marginTop: 2, fontFamily: 'monospace' }}>
            {formatCurrency(halfTarget)}
          </div>
          <div style={{ fontSize: 11, fontWeight: 800, marginTop: 4, color: paymentsThisYear >= halfTarget ? '#166534' : '#B45309' }}>
            {paymentsThisYear >= halfTarget 
              ? '✓ Goal Met (50%+ Paid)' 
              : `⚠️ Owed: ${formatCurrency(amountOwedForFirstHalf)}`}
          </div>
        </div>

        {/* Milestone 2: 2nd Half Full Settlement */}
        <div style={{
          background: !isFirstHalf ? (paymentsThisYear >= fullTarget ? '#F0FDF4' : '#FEF2F2') : '#F8FAFC',
          border: `1px solid ${!isFirstHalf ? (paymentsThisYear >= fullTarget ? '#BBF7D0' : '#FECACA') : '#E2E8F0'}`,
          borderRadius: 12,
          padding: '12px 16px'
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B' }}>2ND HALF FULL SETTLEMENT (DUE SEPT 1)</div>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#0F172A', marginTop: 2, fontFamily: 'monospace' }}>
            {formatCurrency(fullTarget)}
          </div>
          <div style={{ fontSize: 11, fontWeight: 800, marginTop: 4, color: paymentsThisYear >= fullTarget ? '#166534' : '#DC2626' }}>
            {paymentsThisYear >= fullTarget 
              ? '✓ 100% Fully Settled' 
              : `⚠️ Owed: ${formatCurrency(amountOwedForFull)}`}
          </div>
        </div>

      </div>

    </div>
  );
}

// src/screens/FinancialHubScreen.js
// Dedicated financial registrar hub — aggregate stats, quick actions, delinquency overview.

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../db/supabase';
import { Colors, Spacing, Typography, Radii, Shadows } from '../styles/theme';

export default function FinancialHubScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [delinquency, setDelinquency] = useState([]);
  const [rates, setRates] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const currentYear = new Date().getFullYear();

      // Fetch all assessments for the year
      const { data: assessments } = await supabase
        .from('financial_assessments')
        .select('*')
        .eq('year', currentYear);

      // Fetch all payments for the year
      const { data: payments } = await supabase
        .from('financial_payments')
        .select('*')
        .eq('assessment_year', currentYear);

      // Compute aggregate stats
      if (assessments && assessments.length > 0) {
        const totalAssessed = assessments.reduce(
          (sum, a) => sum + parseFloat(a.arrears_brought_forward || 0) + parseFloat(a.annual_assessment || 0), 0
        );
        const totalCollected = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

        setStats({
          membersBilled: assessments.length,
          totalAssessed,
          totalCollected,
          totalOutstanding: totalAssessed - totalCollected,
          complianceRate: totalAssessed > 0 ? ((totalCollected / totalAssessed) * 100).toFixed(1) : '0.0',
        });
      }

      // Compute delinquency client-side from assessments + payments + members
      let delinqResult = [];
      try {
        const { data: delinqRpcs } = await supabase.rpc('get_delinquent_members', { p_year: currentYear });
        if (delinqRpcs) delinqResult = delinqRpcs;
      } catch (_) {
        // RPC not available — compute client-side
        const membersData = assessments?.map(a => a.member_id);
        if (membersData?.length > 0) {
          const { data: allPayments } = await supabase
            .from('financial_payments')
            .select('*')
            .in('member_id', membersData)
            .eq('assessment_year', currentYear);

          delinqResult = assessments
            .map(a => {
              const memberPayments = (allPayments || []).filter(p => p.member_id === a.member_id);
              const totalPaid = memberPayments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
              const assessed = parseFloat(a.arrears_brought_forward || 0) + parseFloat(a.annual_assessment || 0);
              const outstanding = Math.max(0, assessed - totalPaid);

              // Find last payment date to calculate days overdue
              let lastPaymentDate = null;
              memberPayments.forEach(p => {
                const d = new Date(p.payment_date);
                if (!lastPaymentDate || d > lastPaymentDate) lastPaymentDate = d;
              });

              let daysOverdue = 0;
              if (outstanding > 0 && lastPaymentDate) {
                // Days since last payment vs. expected (assume annual due date of Jan 1 or assessment year start)
                const dueDate = new Date(currentYear, 0, 1); // Jan 1 of assessment year
                daysOverdue = Math.floor((new Date() - dueDate) / (1000 * 60 * 60 * 24));
              } else if (outstanding > 0 && !lastPaymentDate) {
                // No payments yet — assume they're overdue
                const dueDate = new Date(currentYear, 0, 1);
                daysOverdue = Math.floor((new Date() - dueDate) / (1000 * 60 * 60 * 24));
              }

              return { member_id: a.member_id, outstanding, days_overdue: daysOverdue };
            })
            .filter(d => d.outstanding > 0 && d.days_overdue >= 90)
            .sort((a, b) => b.days_overdue - a.days_overdue);
        }
      }

      // Enrich with member names if needed
      if (delinqResult.length > 0 && (!delinqResult[0].surname || !delinqResult[0].title)) {
        const memberIds = delinqResult.map(d => d.member_id);
        const { data: memberNames } = await supabase
          .from('members')
          .select('id, first_name, surname, title')
          .in('id', memberIds);

        if (memberNames) {
          const nameMap = {};
          memberNames.forEach(m => nameMap[m.id] = m);
          delinqResult = delinqResult.map(d => ({
            ...d,
            ...(nameMap[d.member_id] || {}),
          }));
        }
      }

      setDelinquency(delinqResult);

      // Fetch current rates
      const { data: ratesData } = await supabase
        .from('financial_rates')
        .select('*')
        .eq('year', currentYear)
        .single();
      if (ratesData) setRates(ratesData);

    } catch (e) {
      console.warn('FinancialHub data fetch failed:', e.message);
    } finally {
      setLoading(false);
    }
  }

  const fmt = (n) => `GH¢ ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading || !stats) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.gold} />
        <Text style={styles.loadingText}>Loading Financial Hub...</Text>
      </SafeAreaView>
    );
  }

  // Action card component
  const ActionCard = ({ icon, title, description, onPress, color }) => (
    <TouchableOpacity
      style={[styles.actionCard, { borderLeftColor: color || Colors.gold }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.actionIconWrap}>
        <Text style={styles.actionIcon}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDesc} numberOfLines={2}>{description}</Text>
      </View>
      <Text style={styles.actionChevron}>›</Text>
    </TouchableOpacity>
  );

  // Stat card component
  const StatCard = ({ icon, label, value, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navy} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>K.S.J.I FINANCIAL LEDGER</Text>
          <Text style={styles.headerTitle}>{new Date().getFullYear()} Management Hub</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => { setLoading(true); fetchData(); }}
          activeOpacity={0.7}
        >
          <Text style={styles.refreshBtnText}>↻</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Aggregate Stats ── */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="📋" label="Members Billed" value={String(stats.membersBilled)} color={Colors.chartBlue} />
          <StatCard icon="💰" label="Total Assessed" value={fmt(stats.totalAssessed)} color={Colors.navy} />
          <StatCard icon="✅" label="Collected" value={fmt(stats.totalCollected)} color={Colors.chartGreen} />
          <StatCard
            icon={stats.totalOutstanding > 0 ? '⚠️' : '🎉'}
            label="Outstanding"
            value={fmt(Math.max(0, stats.totalOutstanding))}
            color={stats.totalOutstanding > 0 ? '#DC2626' : Colors.chartGreen}
          />
        </View>

        {/* Compliance Rate Banner */}
        <View style={[styles.complianceBanner, { backgroundColor: parseFloat(stats.complianceRate) >= 80 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)' }]}>
          <Text style={styles.complianceLabel}>Collection Compliance Rate</Text>
          <Text style={[styles.complianceValue, parseFloat(stats.complianceRate) >= 80 ? { color: Colors.chartGreen } : {}]}>
            {stats.complianceRate}%
          </Text>
        </View>

        {/* Current Rates Quick View */}
        {rates && (
          <View style={styles.ratesCard}>
            <View style={styles.ratesHeaderRow}>
              <Text style={styles.sectionTitle} style={{ marginBottom: 0 }}>Current Rates ({rates.year || new Date().getFullYear()})</Text>
              <TouchableOpacity onPress={() => navigation.navigate('FinancialHubRates')}>
                <Text style={styles.linkText}>Edit →</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.ratesRow}>
              <Text style={styles.ratesLabel}>Regular</Text>
              <Text style={styles.ratesValue}>{fmt(rates.regular_rate || 0)}</Text>
            </View>
            <View style={styles.ratesRow}>
              <Text style={styles.ratesLabel}>Social</Text>
              <Text style={styles.ratesValue}>{fmt(rates.social_rate || 0)}</Text>
            </View>
            <View style={styles.ratesRow}>
              <Text style={styles.ratesLabel}>Student</Text>
              <Text style={styles.ratesValue}>{fmt(rates.student_rate || 0)}</Text>
            </View>
          </View>
        )}

        {/* ── Quick Actions ── */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <ActionCard
          icon="👥"
          title="Member Financial Summaries"
          description="Browse all members' financial status in one place — total assessed, paid, and outstanding."
          onPress={() => navigation.navigate('ViewMemberFinancials')}
          color="#0369A1"
        />
        <ActionCard
          icon="💳"
          title="Record Monthly Payments"
          description="Log payment receipts for individual members by month and amount."
          onPress={() => navigation.navigate('FinancialHubPayments')}
          color="#16A34A"
        />
        <ActionCard
          icon="⚙️"
          title="Set Rates & Generate Bills"
          description="Configure yearly assessment rates for Regular, Social, and Student members."
          onPress={() => navigation.navigate('FinancialHubRates')}
          color="#1D4ED8"
        />

        {/* ── Delinquency Overview ── */}
        <Text style={styles.sectionTitle}>Delinquency Alerts</Text>
        {delinquency.length > 0 ? (
          <View style={styles.delinqList}>
            {delinquency.slice(0, 5).map((item) => (
              <TouchableOpacity
                key={item.member_id}
                style={styles.delinqItem}
                onPress={() => navigation.navigate('ViewMemberFinancials')}
                activeOpacity={0.7}
              >
                <View style={styles.delinqInfo}>
                  <Text style={styles.delinqName}>{item.title || ''} {item.surname}</Text>
                  <Text style={styles.delinqDetail}>Outstanding: {fmt(item.outstanding)}</Text>
                </View>
                <View style={[
                  styles.delinqBadge,
                  item.days_overdue >= 180 ? styles.badgeCritical :
                    item.days_overdue >= 90 ? styles.badgeWarning : styles.badgeMild
                ]}>
                  <Text style={[
                    styles.delinqBadgeText,
                    item.days_overdue >= 180 ? styles.badgeCriticalText :
                      item.days_overdue >= 90 ? styles.badgeWarningText : {}
                  ]}>
                    {item.days_overdue >= 180 ? '180+ Days' :
                     item.days_overdue >= 90 ? '90-180 Days' : '90+ Days'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            {delinquency.length > 5 && (
              <TouchableOpacity style={styles.viewAllBtn}>
                <Text style={styles.viewAllText}>View all {delinquency.length} delinquent members →</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.emptyDelinq}>
            <Text style={styles.emptyDelinqIcon}>✅</Text>
            <Text style={styles.emptyDelinqText}>No delinquent members found.</Text>
          </View>
        )}

        {/* ── Advanced Reports ── */}
        <Text style={styles.sectionTitle}>Advanced Reports</Text>
        <ActionCard
          icon="📊"
          title="Rate History & Comparison"
          description="Audit timeline of rate changes. Compare rates across any two dates."
          onPress={() => navigation.navigate('FinancialHubRatesHistory')}
          color="#7C3AED"
        />
        <ActionCard
          icon="📉"
          title="Delinquency Aging Report"
          description="Full aging report with contact info and printable output."
          onPress={() => navigation.navigate('FinancialHubDelinquency')}
          color="#B91C1C"
        />
        <ActionCard
          icon="📋"
          title="Financial Audit Trail"
          description="Immutable log of all payment records and rate configuration changes."
          onPress={() => navigation.navigate('FinancialHubAudit')}
          color="#374151"
        />

        {/* Discount Reference */}
        <View style={styles.discountRef}>
          <Text style={styles.discountTitle}>📖 Age Discount Schedule</Text>
          {[
            { bracket: 'Over 80 years', discount: '100%', example: 'GH¢ 0.00' },
            { bracket: '75 – 80 years', discount: '50%', example: 'Example rate applies' },
            { bracket: '70 – 75 years', discount: '25%', example: 'Example rate applies' },
            { bracket: 'Under 70 years', discount: '0% (Full Rate)', example: 'Full rate charged' },
          ].map(row => (
            <View key={row.bracket} style={styles.discountRow}>
              <Text style={styles.discountBracket}>{row.bracket}</Text>
              <Text style={[styles.discountBadge, { backgroundColor: row.discount === '100%' ? '#FEF3C7' : Colors.navySubtle }]}>
                {row.discount}
              </Text>
            </View>
          ))}
        </View>

        {/* Bottom spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.navy },
  loadingText: { color: Colors.gold, fontSize: 14, fontWeight: '600', marginTop: 12 },

  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  headerEyebrow: { color: Colors.gold, fontSize: 9, fontWeight: '850', letterSpacing: 1.5, textTransform: 'uppercase' },
  headerTitle: { color: Colors.white, fontSize: Typography.sizes.xl + 2, fontWeight: '900', marginTop: 2 },
  refreshBtn: { padding: 8 },
  refreshBtnText: { color: Colors.gold, fontSize: 22, fontWeight: '700' },

  scrollContent: { padding: Spacing.lg },

  sectionTitle: { color: Colors.grey400, fontSize: 11, fontWeight: '850', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1.2 },

  // Stats Grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: Spacing.lg },
  statCard: { width: '48%', backgroundColor: Colors.white, borderRadius: Radii.md, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderLeftWidth: 4, ...Shadows.card },
  statIcon: { fontSize: 26, marginRight: 12 },
  statValue: { fontSize: 18, fontWeight: '850', color: Colors.navy },
  statLabel: { fontSize: 11, color: Colors.grey400, fontWeight: '600' },

  // Compliance Banner
  complianceBanner: { borderRadius: Radii.md, padding: Spacing.lg, marginBottom: Spacing.xl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  complianceLabel: { color: Colors.grey300, fontSize: 11, fontWeight: '700' },
  complianceValue: { color: Colors.gold, fontSize: 28, fontWeight: '900' },

  // Rates Card
  ratesCard: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: Radii.md, padding: Spacing.lg, marginBottom: Spacing.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  ratesHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  ratesRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  ratesLabel: { color: Colors.grey300, fontSize: 14, fontWeight: '600' },
  ratesValue: { color: Colors.white, fontSize: 15, fontWeight: '800' },

  // Action Cards
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radii.md, padding: Spacing.lg, marginBottom: Spacing.sm, borderLeftWidth: 4, ...Shadows.card },
  actionIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  actionIcon: { fontSize: 20 },
  actionTitle: { color: Colors.navy, fontSize: 15, fontWeight: '800' },
  actionDesc: { color: Colors.grey400, fontSize: 12, marginTop: 3 },
  actionChevron: { color: Colors.grey300, fontSize: 26, marginLeft: 10 },

  // Delinquency
  delinqList: { marginBottom: Spacing.xl },
  delinqItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: Radii.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' },
  delinqName: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  delinqDetail: { color: '#FBBF24', fontSize: 12, fontWeight: '600', marginTop: 2 },
  delinqBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radii.pill },
  badgeCritical: { backgroundColor: 'rgba(220,38,38,0.2)' },
  badgeCriticalText: { color: '#FCA5A5', fontWeight: '700' },
  badgeWarning: { backgroundColor: 'rgba(245,158,11,0.2)' },
  badgeWarningText: { color: '#FCD34D', fontWeight: '700' },
  badgeMild: { backgroundColor: 'rgba(59,130,246,0.15)' },
  delinqBadgeText: { color: '#93C5FD', fontSize: 10, fontWeight: '800' },
  viewAllBtn: { paddingVertical: 10 },
  viewAllText: { color: Colors.gold, fontSize: 13, fontWeight: '700', textAlign: 'center' },

  emptyDelinq: { backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: Radii.md, padding: Spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(16,185,129,0.15)' },
  emptyDelinqIcon: { fontSize: 32, marginBottom: 8 },
  emptyDelinqText: { color: '#34D399', fontSize: 14, fontWeight: '600' },

  // Discount Reference
  discountRef: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: Radii.md, padding: Spacing.lg, marginBottom: Spacing.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  discountTitle: { color: Colors.white, fontSize: 14, fontWeight: '800', marginBottom: 12 },
  discountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  discountBracket: { color: Colors.grey300, fontSize: 13, flex: 1 },
  discountBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radii.pill },

  // Utility
  linkText: { color: Colors.gold, fontSize: 13, fontWeight: '700' },
});

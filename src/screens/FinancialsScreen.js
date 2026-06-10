import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../db/supabase';
import { Colors, Spacing, Typography, Radii, Shadows } from '../styles/theme';

export default function FinancialsScreen({ navigation, route }) {
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState(null);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    fetchFinancials();
  }, []);

  async function fetchFinancials() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('member_id')
      .eq('id', user.id)
      .single();
      
    if (!profile || !profile.member_id) {
      setLoading(false);
      return;
    }

    // Determine which member's finances to display:
    // - If route.params?.memberId provided (admin viewing another member), use that
    // - Otherwise fall back to the logged-in user's own record
    let memberId = null;

    if (route && route.params && route.params.memberId) {
      memberId = route.params.memberId;
    } else if (profile && profile.member_id) {
      memberId = profile.member_id;
    }

    if (!memberId) {
      setLoading(false);
      return;
    }
    const currentYear = new Date().getFullYear();

    // Assessment
    const { data: assData } = await supabase
      .from('financial_assessments')
      .select('*')
      .eq('member_id', memberId)
      .eq('year', currentYear)
      .single();

    if (assData) setAssessment(assData);

    // Payments
    const { data: payData } = await supabase
      .from('financial_payments')
      .select('*')
      .eq('member_id', memberId)
      .eq('assessment_year', currentYear)
      .order('payment_date', { ascending: true });

    if (payData) setPayments(payData);

    setLoading(false);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingSafe}>
        <ActivityIndicator size="large" color={Colors.gold} />
        <Text style={styles.loadingText}>FETCHING DIGITAL LEDGER...</Text>
      </SafeAreaView>
    );
  }

  const currentYear = new Date().getFullYear();
  const arrears = assessment ? parseFloat(assessment.arrears_brought_forward) : 0;
  const annual = assessment ? parseFloat(assessment.annual_assessment) : 0;
  const totalAssessment = arrears + annual;
  const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const outstanding = totalAssessment - totalPaid;
  
  const paymentPercentage = totalAssessment > 0 ? (totalPaid / totalAssessment) * 100 : 0;

  const currencyFormat = (num) => `GH¢ ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navy} />
      
      {/* ── Brand Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerEyebrow}>K.S.J.I MEMBER SERVICE</Text>
          <Text style={styles.headerTitle}>Financial Ledger</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('FinancialHub')} style={styles.hubBtn}>
          <Text style={styles.hubBtnText}>🏠 Hub</Text>
        </TouchableOpacity>
        <View style={styles.yearBadge}>
          <Text style={styles.yearBadgeText}>{currentYear}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* ── LEDGER SUMMIT (PREMIUM GLASSMORPHIC STATEMENT CARD) ── */}
        <View style={styles.glassStatementCard}>
          <View style={styles.outstandingHeader}>
            <Text style={styles.outstandingLabel}>OUTSTANDING BALANCE</Text>
            <View style={[styles.statusBadge, outstanding > 0 ? styles.statusOwe : styles.statusClear]}>
              <Text style={[styles.statusBadgeText, outstanding > 0 ? styles.statusOweText : styles.statusClearText]}>
                {outstanding > 0 ? 'Dues Outstanding' : 'Account Cleared'}
              </Text>
            </View>
          </View>

          <Text style={[styles.outstandingAmount, outstanding > 0 ? styles.amountOwe : styles.amountClear]}>
            {currencyFormat(outstanding)}
          </Text>

          {/* Premium Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabelLeft}>Collection Progress</Text>
              <Text style={styles.progressLabelRight}>{paymentPercentage.toFixed(1)}%</Text>
            </View>
            <View style={styles.progressBarBackground}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: `${Math.min(paymentPercentage, 100)}%`,
                    backgroundColor: paymentPercentage >= 100 ? Colors.chartGreen : Colors.gold
                  }
                ]} 
              />
            </View>
          </View>
        </View>

        {/* ── BILLING BREAKDOWN (HIGH-CONTRAST CARD) ── */}
        <View style={styles.breakdownCard}>
          <Text style={styles.sectionHeader}>Assessment Breakdown</Text>
          
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownLabelGroup}>
              <View style={[styles.dotMarker, { backgroundColor: Colors.navySubtle }]} />
              <Text style={styles.breakdownLabel}>Arrears Brought Forward (B/F)</Text>
            </View>
            <Text style={styles.breakdownValue}>{currencyFormat(arrears)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.breakdownRow}>
            <View style={styles.breakdownLabelGroup}>
              <View style={[styles.dotMarker, { backgroundColor: Colors.gold }]} />
              <Text style={styles.breakdownLabel}>Annual Dues Assessment</Text>
            </View>
            <Text style={styles.breakdownValue}>{currencyFormat(annual)}</Text>
          </View>

          <View style={styles.thickDivider} />

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabelBold}>Total Assessed Dues</Text>
            <Text style={styles.breakdownValueBold}>{currencyFormat(totalAssessment)}</Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabelBold, { color: Colors.chartGreen }]}>Total Paid to Date</Text>
            <Text style={[styles.breakdownValueBold, { color: Colors.chartGreen }]}>{currencyFormat(totalPaid)}</Text>
          </View>
        </View>

        {/* ── TRANSACTION JOURNAL (TIMELINE STYLE) ── */}
        <Text style={styles.sectionTitle}>Payment Log & Receipt History</Text>
        
        {payments.length === 0 ? (
          <View style={styles.emptyJournal}>
            <Text style={styles.emptyJournalIcon}>📭</Text>
            <Text style={styles.emptyJournalText}>No transactions logged for {currentYear} yet.</Text>
          </View>
        ) : (
          <View style={styles.journalTimeline}>
            {payments.map((p, idx) => (
              <View key={p.id} style={styles.journalItem}>
                {/* Timeline Axis */}
                <View style={styles.timelineAxis}>
                  <View style={styles.timelineNode} />
                  {idx !== payments.length - 1 && <View style={styles.timelineConnector} />}
                </View>

                {/* Journal Details */}
                <View style={styles.journalDetailsCard}>
                  <View style={styles.journalTop}>
                    <Text style={styles.journalMonth}>{p.month}</Text>
                    <Text style={styles.journalAmount}>{currencyFormat(parseFloat(p.amount))}</Text>
                  </View>
                  <View style={styles.journalBottom}>
                    <Text style={styles.journalLabel}>Official Receipt</Text>
                    <Text style={styles.journalDate}>{new Date(p.payment_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingSafe: { 
    flex: 1, 
    backgroundColor: Colors.navy, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    color: Colors.gold, 
    marginTop: Spacing.md, 
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5 
  },
  safe: {
    flex: 1,
    backgroundColor: Colors.navy
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)'
  },
  backBtn: { marginRight: 4 },
  backBtnText: { color: Colors.gold, fontWeight: '700', fontSize: 13 },
  hubBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radii.sm, backgroundColor: 'rgba(255,255,255,0.08)', marginLeft: 4 },
  hubBtnText: { color: Colors.gold, fontSize: 12, fontWeight: '700' },
  headerEyebrow: { 
    color: Colors.gold, 
    fontSize: 10, 
    fontWeight: '850', 
    letterSpacing: 1.5,
    textTransform: 'uppercase' 
  },
  headerTitle: { 
    color: Colors.white, 
    fontSize: Typography.sizes.xl + 2, 
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 2
  },
  yearBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: Radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 4
  },
  yearBadgeText: {
    color: Colors.gold,
    fontSize: 14,
    fontWeight: '800'
  },
  container: { 
    padding: Spacing.lg, 
    paddingBottom: 120 
  },

  // Glassmorphic Card
  glassStatementCard: {
    backgroundColor: Colors.navyLight,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    borderRadius: Radii.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    ...Shadows.glass
  },
  outstandingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm
  },
  outstandingLabel: {
    color: Colors.grey300,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radii.pill,
    borderWidth: 1
  },
  statusOwe: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderColor: 'rgba(244, 63, 94, 0.3)'
  },
  statusOweText: {
    color: '#FB7185',
  },
  statusClear: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  statusClearText: {
    color: '#34D399',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  outstandingAmount: {
    fontSize: Typography.sizes.hero + 4,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: Spacing.xl
  },
  amountOwe: {
    color: Colors.white
  },
  amountClear: {
    color: Colors.chartGreen
  },
  progressSection: {
    marginTop: Spacing.sm
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs + 2
  },
  progressLabelLeft: {
    color: Colors.grey400,
    fontSize: 11,
    fontWeight: '700'
  },
  progressLabelRight: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: '900'
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: Radii.pill,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: Radii.pill
  },

  // Breakdown Card
  breakdownCard: {
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    ...Shadows.card
  },
  sectionHeader: {
    color: Colors.navy,
    fontSize: 14,
    fontWeight: '850',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.lg
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4
  },
  breakdownLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  dotMarker: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8
  },
  breakdownLabel: {
    color: Colors.grey500,
    fontSize: 13,
    fontWeight: '600'
  },
  breakdownValue: {
    color: Colors.navy,
    fontSize: 14,
    fontWeight: '700'
  },
  breakdownLabelBold: {
    color: Colors.navy,
    fontSize: 14,
    fontWeight: '800'
  },
  breakdownValueBold: {
    color: Colors.navy,
    fontSize: 16,
    fontWeight: '900'
  },
  divider: {
    height: 1,
    backgroundColor: Colors.grey100,
    marginVertical: Spacing.sm
  },
  thickDivider: {
    height: 2,
    backgroundColor: Colors.grey200,
    marginVertical: Spacing.md
  },

  // Timeline
  sectionTitle: { 
    color: Colors.white, 
    fontSize: 13, 
    fontWeight: '850', 
    marginBottom: Spacing.lg, 
    textTransform: 'uppercase', 
    letterSpacing: 1.5 
  },
  emptyJournal: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: Radii.md,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)'
  },
  emptyJournalIcon: {
    fontSize: 28,
    marginBottom: Spacing.sm
  },
  emptyJournalText: {
    color: Colors.grey400,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center'
  },
  journalTimeline: {
    paddingLeft: 4
  },
  journalItem: {
    flexDirection: 'row',
    marginBottom: Spacing.md
  },
  timelineAxis: {
    width: 16,
    alignItems: 'center'
  },
  timelineNode: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.gold,
    borderWidth: 2,
    borderColor: Colors.navy,
    zIndex: 10,
    marginTop: 18
  },
  timelineConnector: {
    position: 'absolute',
    top: 24,
    bottom: -16,
    width: 2,
    backgroundColor: 'rgba(212, 175, 55, 0.2)'
  },
  journalDetailsCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginLeft: Spacing.sm
  },
  journalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  journalMonth: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '800'
  },
  journalAmount: {
    color: Colors.chartGreen,
    fontSize: 15,
    fontWeight: '900'
  },
  journalBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4
  },
  journalLabel: {
    color: Colors.grey500,
    fontSize: 11,
    fontWeight: '600'
  },
  journalDate: {
    color: Colors.grey400,
    fontSize: 11,
    fontWeight: '700'
  }
});

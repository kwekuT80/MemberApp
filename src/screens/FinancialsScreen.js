import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../db/supabase';
import { Colors, Spacing, Typography, Radii, Shadows } from '../styles/theme';

export default function FinancialsScreen({ navigation }) {
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

    const memberId = profile.member_id;
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
        <Text style={styles.loadingText}>Loading Ledger...</Text>
      </SafeAreaView>
    );
  }

  const currentYear = new Date().getFullYear();
  const arrears = assessment ? parseFloat(assessment.arrears_brought_forward) : 0;
  const annual = assessment ? parseFloat(assessment.annual_assessment) : 0;
  const totalAssessment = arrears + annual;
  const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const outstanding = totalAssessment - totalPaid;

  const currencyFormat = (num) => `GH¢ ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Financial Ledger</Text>
        <Text style={styles.headerSubtitle}>{currentYear} Dues & Assessments</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Summary Block */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Arrears B/F:</Text>
            <Text style={styles.summaryValue}>{currencyFormat(arrears)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Annual Assessment:</Text>
            <Text style={styles.summaryValue}>{currencyFormat(annual)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Due:</Text>
            <Text style={styles.summaryValueBold}>{currencyFormat(totalAssessment)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Paid:</Text>
            <Text style={[styles.summaryValueBold, { color: Colors.chartGreen }]}>{currencyFormat(totalPaid)}</Text>
          </View>
          
          <View style={[styles.outstandingBox, outstanding > 0 ? styles.boxOwe : styles.boxClear]}>
            <Text style={[styles.outstandingLabel, outstanding > 0 ? styles.textOwe : styles.textClear]}>Outstanding Balance</Text>
            <Text style={[styles.outstandingAmount, outstanding > 0 ? styles.textOwe : styles.textClear]}>{currencyFormat(outstanding)}</Text>
          </View>
        </View>

        {/* Payments List */}
        <Text style={styles.sectionTitle}>Payment History</Text>
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colMonth, styles.tableHeaderText]}>Month</Text>
            <Text style={[styles.colAmount, styles.tableHeaderText]}>Amount</Text>
            <Text style={[styles.colDate, styles.tableHeaderText]}>Date</Text>
          </View>
          
          {payments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No payments recorded for this year.</Text>
            </View>
          ) : (
            payments.map((p, idx) => (
              <View key={p.id} style={[styles.tableRow, idx === payments.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={styles.colMonth}>{p.month}</Text>
                <Text style={[styles.colAmount, styles.amountGreen]}>{currencyFormat(parseFloat(p.amount))}</Text>
                <Text style={styles.colDate}>{new Date(p.payment_date).toLocaleDateString()}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingSafe: { flex: 1, backgroundColor: Colors.navy, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: Colors.gold, marginTop: Spacing.md, fontWeight: '600' },
  safe: { flex: 1, backgroundColor: Colors.navy },
  header: { padding: Spacing.xl, paddingTop: Spacing.lg },
  headerTitle: { color: Colors.white, fontSize: Typography.sizes.xxl, fontWeight: '800' },
  headerSubtitle: { color: Colors.gold, fontSize: Typography.sizes.md, marginTop: 4 },
  
  container: { padding: Spacing.lg, paddingBottom: 100 },
  
  summaryCard: {
    backgroundColor: Colors.white,
    padding: Spacing.xl,
    borderRadius: Radii.lg,
    marginBottom: Spacing.xl,
    ...Shadows.card,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  summaryLabel: { color: Colors.grey400, fontSize: 14, fontWeight: '600' },
  summaryValue: { color: Colors.navy, fontSize: 15, fontWeight: '600' },
  summaryValueBold: { color: Colors.navy, fontSize: 16, fontWeight: '800' },
  divider: { height: 1, backgroundColor: Colors.grey200, marginVertical: Spacing.md },
  
  outstandingBox: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radii.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  boxOwe: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  boxClear: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  textOwe: { color: '#991B1B' },
  textClear: { color: '#166534' },
  outstandingLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  outstandingAmount: { fontSize: 24, fontWeight: '800' },
  
  sectionTitle: { color: Colors.white, fontSize: 16, fontWeight: '700', marginBottom: Spacing.md, textTransform: 'uppercase', letterSpacing: 1 },
  
  tableCard: {
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey200,
  },
  tableHeaderText: { color: Colors.grey400, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey100,
  },
  colMonth: { flex: 1, fontSize: 14, color: Colors.navy, fontWeight: '600' },
  colAmount: { flex: 1.5, fontSize: 14, fontWeight: '700' },
  colDate: { flex: 1, fontSize: 12, color: Colors.grey400, textAlign: 'right', marginTop: 2 },
  amountGreen: { color: Colors.chartGreen },
  
  emptyState: { padding: Spacing.xl, alignItems: 'center' },
  emptyText: { color: Colors.grey400, fontSize: 14, fontStyle: 'italic' },
});

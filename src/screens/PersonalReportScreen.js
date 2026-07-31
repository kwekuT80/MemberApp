import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from '../db/supabase';
import { fetchPersonalReportData } from '../utils/personalReportService';
import { Colors, Spacing, Typography, Radii, Shadows } from '../styles/theme';

export default function PersonalReportScreen({ navigation, route }) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    loadReport();
  }, []);

  async function loadReport() {
    setLoading(true);
    let memberId = route.params?.memberId;

    if (!memberId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('member_id')
          .eq('id', user.id)
          .single();
        memberId = profile?.member_id;
      }
    }

    if (memberId) {
      const data = await fetchPersonalReportData(memberId);
      setReport(data);
    }
    setLoading(false);
  }

  const generatePDF = async () => {
    if (!report) return;
    setPrinting(true);
    try {
      const { member, standing, standingReason, financial, welfare } = report;
      const isGoodStanding = standing === 'In Good Standing';

      const formatCurrency = (num) => `GH¢ ${Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', sans-serif; color: #0F172A; padding: 30px; line-height: 1.5; }
              .header { text-align: center; border-bottom: 2px solid #C9A84C; padding-bottom: 16px; margin-bottom: 24px; }
              .title { font-size: 24px; font-weight: bold; color: #10233f; text-transform: uppercase; margin-bottom: 4px; }
              .subtitle { font-size: 12px; color: #C9A84C; font-weight: bold; letter-spacing: 1.5px; }
              
              .standing-card {
                background: ${isGoodStanding ? '#047857' : '#B45309'};
                color: white;
                padding: 20px;
                border-radius: 12px;
                margin-bottom: 24px;
              }
              .standing-badge {
                display: inline-block;
                background: ${isGoodStanding ? '#10B981' : '#F59E0B'};
                color: ${isGoodStanding ? '#064E3B' : '#78350F'};
                padding: 6px 16px;
                border-radius: 20px;
                font-weight: bold;
                font-size: 14px;
                float: right;
              }
              
              .section-title { font-size: 16px; font-weight: bold; border-left: 4px solid #C9A84C; padding-left: 8px; margin-bottom: 12px; background: #F8FAFC; padding-top: 4px; padding-bottom: 4px; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
              .card { background: #F8FAFC; padding: 12px; border-radius: 8px; border: 1px solid #E2E8F0; }
              .label { font-size: 10px; font-weight: bold; color: #64748B; text-transform: uppercase; }
              .val { font-size: 16px; font-weight: bold; margin-top: 4px; font-family: monospace; }
              
              .table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
              .table th { text-align: left; background: #F1F5F9; color: #475569; padding: 8px; }
              .table td { padding: 8px; border-bottom: 1px solid #E2E8F0; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">Personal Standing & Financial Report</div>
              <div class="subtitle">KNIGHTS OF ST. JOHN INTERNATIONAL • ST. MARGARET-MARY COMMANDERY #500</div>
            </div>

            <div class="standing-card">
              <div class="standing-badge">${standing}</div>
              <h2 style="margin:0; font-size: 20px;">${member.title ? member.title + ' ' : ''}${member.first_name} ${member.surname}</h2>
              <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Status: ${member.status} • Year: ${financial.currentYear}</div>
              <div style="margin-top: 12px; font-size: 11px; border-top: 1px solid rgba(255,255,255,0.3); padding-top: 8px;">
                ${standingReason}
              </div>
            </div>

            <div class="section-title">Annual Financial Dues (${financial.currentYear})</div>
            <div class="grid">
              <div class="card">
                <div class="label">Account Balance (Last Year B/F)</div>
                <div class="val">${formatCurrency(financial.lastYearArrears)}</div>
              </div>
              <div class="card">
                <div class="label">Current Year Assessment</div>
                <div class="val" style="color: #2563EB;">${formatCurrency(financial.currentAssessment)}</div>
              </div>
              <div class="card">
                <div class="label">Payments Made This Year</div>
                <div class="val" style="color: #10B981;">${formatCurrency(financial.paymentsThisYear)}</div>
              </div>
              <div class="card">
                <div class="label">${financial.creditBalance > 0 ? 'Credit Balance' : 'Outstanding Balance'}</div>
                <div class="val" style="color: ${financial.creditBalance > 0 ? '#2563EB' : (financial.outstandingThisYear > 0 ? '#DC2626' : '#166534')};">
                  ${financial.creditBalance > 0 ? formatCurrency(financial.creditBalance) : formatCurrency(financial.outstandingThisYear)}
                </div>
              </div>
            </div>

            <div class="section-title">Commandery Welfare Scheme</div>
            <div class="grid">
              <div class="card">
                <div class="label">Previous Year Welfare Balance</div>
                <div class="val">${formatCurrency(welfare.lastYearBalance)}</div>
              </div>
              <div class="card">
                <div class="label">Current Year Welfare Assessment</div>
                <div class="val" style="color: #2563EB;">${formatCurrency(welfare.currentAssessment)}</div>
                <div style="font-size: 10px; color: #64748B; margin-top: 2px;">${formatCurrency(welfare.monthlyRate || 25)}/mo × 12 months</div>
              </div>
              <div class="card">
                <div class="label">Welfare Contributions This Year</div>
                <div class="val" style="color: #10B981;">${formatCurrency(welfare.contributionsThisYear)}</div>
              </div>
            </div>

            <div class="section-title">Benefits & Payouts Received</div>
            ${welfare.disbursements.length === 0 ? '<p style="color: #64748B; font-size: 12px;">No benefit payouts received.</p>' : `
              <table class="table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Date</th>
                    <th style="text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${welfare.disbursements.map(d => `
                    <tr>
                      <td>${d.category_name}</td>
                      <td>${new Date(d.disbursement_date).toLocaleDateString('en-GB')}</td>
                      <td style="text-align: right; font-weight: bold; color: #D97706;">${formatCurrency(d.amount)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}

            <div style="margin-top: 40px; text-align: center; font-size: 10px; color: #94A3B8;">
              Official Report • Generated on ${new Date().toLocaleDateString()}
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      if (Platform.OS === 'ios') {
        await Sharing.shareAsync(uri);
      } else {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (e) {
      Alert.alert('Export Failed', e.message);
    } finally {
      setPrinting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingSafe}>
        <ActivityIndicator size="large" color={Colors.gold} />
        <Text style={styles.loadingText}>Compiling Personal Report…</Text>
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>Unable to load personal report record.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { member, standing, standingReason, financial, welfare } = report;
  const isGoodStanding = standing === 'In Good Standing';
  const formatCurrency = (val) => `GH¢ ${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navy} />
      
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnHeader}>
          <Text style={styles.backTextHeader}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personal Report</Text>
        <TouchableOpacity onPress={generatePDF} disabled={printing} style={styles.pdfBtn}>
          {printing ? <ActivityIndicator size="small" color={Colors.gold} /> : <Text style={styles.pdfText}>PDF</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Standing Hero Banner */}
        <View style={[styles.heroCard, { backgroundColor: isGoodStanding ? '#047857' : '#B45309' }]}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>STANDING REPORT</Text>
              <Text style={styles.memberName}>
                {member.title ? `${member.title} ` : ''}{member.first_name} {member.surname}
              </Text>
              <Text style={styles.memberMeta}>Reg Year: {financial.currentYear} • {member.status}</Text>
            </View>
          </View>

          {/* Binary Standing Badge */}
          <View style={[styles.badge, { backgroundColor: isGoodStanding ? '#10B981' : '#F59E0B' }]}>
            <Text style={[styles.badgeText, { color: isGoodStanding ? '#064E3B' : '#78350F' }]}>
              {isGoodStanding ? '✓ ' : '⚠️ '}{standing}
            </Text>
          </View>

          <Text style={styles.reasonText}>{standingReason}</Text>
        </View>

        {/* Section 1: Financial Ledger */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💳 Financial Ledger ({financial.currentYear})</Text>

          <View style={styles.grid}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Account Balance (Last Year)</Text>
              <Text style={styles.cardVal}>{formatCurrency(financial.lastYearArrears)}</Text>
              <Text style={styles.cardSub}>Arrears B/F</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>Current Year Assessment</Text>
              <Text style={[styles.cardVal, { color: '#2563EB' }]}>{formatCurrency(financial.currentAssessment)}</Text>
              <Text style={styles.cardSub}>Annual Dues</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>Payments This Year</Text>
              <Text style={[styles.cardVal, { color: '#10B981' }]}>{formatCurrency(financial.paymentsThisYear)}</Text>
              <Text style={styles.cardSub}>Paid Received</Text>
            </View>

            <View style={[
              styles.card, 
              { backgroundColor: financial.creditBalance > 0 ? '#EFF6FF' : (financial.outstandingThisYear > 0 ? '#FEF2F2' : '#F0FDF4') }
            ]}>
              <Text style={[
                styles.cardLabel, 
                { color: financial.creditBalance > 0 ? '#1E40AF' : (financial.outstandingThisYear > 0 ? '#991B1B' : '#166534') }
              ]}>
                {financial.creditBalance > 0 ? 'Credit Balance' : 'Outstanding Balance'}
              </Text>
              <Text style={[
                styles.cardVal, 
                { color: financial.creditBalance > 0 ? '#2563EB' : (financial.outstandingThisYear > 0 ? '#DC2626' : '#166534') }
              ]}>
                {financial.creditBalance > 0 ? formatCurrency(financial.creditBalance) : formatCurrency(financial.outstandingThisYear)}
              </Text>
              <Text style={[
                styles.cardSub, 
                { color: financial.creditBalance > 0 ? '#1E40AF' : (financial.outstandingThisYear > 0 ? '#991B1B' : '#166534'), fontWeight: '800' }
              ]}>
                {financial.creditBalance > 0 ? '✨ Advance Credit' : `Status: ${financial.yearStatus}`}
              </Text>
            </View>
          </View>
        </View>

        {/* Section 2: Welfare Scheme */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤝 Welfare Scheme</Text>

          <View style={styles.grid}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Previous Year Balance</Text>
              <Text style={styles.cardVal}>{formatCurrency(welfare.lastYearBalance)}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>Current Year Dues</Text>
              <Text style={[styles.cardVal, { color: '#2563EB' }]}>{formatCurrency(welfare.currentAssessment)}</Text>
              <Text style={styles.cardSub}>{formatCurrency(welfare.monthlyRate || 25)}/mo × 12m</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>Contributions Paid</Text>
              <Text style={[styles.cardVal, { color: '#10B981' }]}>{formatCurrency(welfare.contributionsThisYear)}</Text>
            </View>
          </View>

          {/* Benefits Table */}
          <View style={styles.tableCard}>
            <Text style={styles.tableCardTitle}>🎁 Received Benefits & Claims</Text>
            {welfare.disbursements.length === 0 ? (
              <Text style={styles.emptyText}>No welfare benefit payouts received.</Text>
            ) : (
              welfare.disbursements.map(d => (
                <View key={d.id} style={styles.tableRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowCategory}>{d.category_name}</Text>
                    <Text style={styles.rowDate}>
                      {new Date(d.disbursement_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                  <Text style={styles.rowAmount}>{formatCurrency(d.amount)}</Text>
                </View>
              ))
            )}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.offWhite },
  loadingSafe: { flex: 1, backgroundColor: Colors.navy, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: Colors.gold, marginTop: 12, fontWeight: '700', fontSize: 13, letterSpacing: 1 },
  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: Colors.grey700, fontSize: 16, marginBottom: 16 },
  backBtn: { padding: 12, backgroundColor: Colors.navy, borderRadius: 8 },
  backBtnText: { color: Colors.white, fontWeight: '700' },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.navy,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtnHeader: { padding: 4 },
  backTextHeader: { color: Colors.gold, fontSize: 16, fontWeight: '700' },
  headerTitle: { color: Colors.white, fontSize: 18, fontWeight: '800' },
  pdfBtn: { backgroundColor: Colors.navyLight, paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radii.pill, borderWidth: 1, borderColor: Colors.gold },
  pdfText: { color: Colors.gold, fontWeight: '800', fontSize: 13 },

  content: { padding: Spacing.md, paddingBottom: 40 },
  
  heroCard: {
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow: { color: Colors.gold, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  memberName: { color: Colors.white, fontSize: 22, fontWeight: '900', marginTop: 4 },
  memberMeta: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 14,
  },
  badgeText: { fontWeight: '900', fontSize: 14 },

  reasonText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },

  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.navy, marginBottom: Spacing.md },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.grey200,
  },
  cardLabel: { fontSize: 10, fontWeight: '800', color: Colors.grey600, textTransform: 'uppercase' },
  cardVal: { fontSize: 17, fontWeight: '900', color: Colors.navy, marginTop: 4, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  cardSub: { fontSize: 11, color: Colors.grey500, marginTop: 2 },

  tableCard: {
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.grey200,
    marginTop: Spacing.sm,
  },
  tableCardTitle: { fontSize: 14, fontWeight: '800', color: Colors.navy, marginBottom: Spacing.sm },
  emptyText: { color: Colors.grey400, fontSize: 13, fontStyle: 'italic', paddingVertical: 12 },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey100,
  },
  rowCategory: { fontWeight: '700', fontSize: 14, color: Colors.navy },
  rowDate: { fontSize: 12, color: Colors.grey500, marginTop: 2 },
  rowAmount: { fontWeight: '800', fontSize: 14, color: '#D97706', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
});

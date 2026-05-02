import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../db/supabase';
import { fromPgDate } from '../db/memberQueries';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Colors, Spacing, Typography, Radii, Shadows } from '../styles/theme';

export default function ReportsScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState(null); // 'master', 'leadership', 'family', 'final', 'suspended', 'dismissed'
  const [reportData, setReportData] = useState([]);

  async function generateMasterRoll() {
    setLoading(true);
    setReportType('master');
    const { data, error } = await supabase
      .from('members')
      .select('surname, first_name, other_names, title, occupation, phone, residential_address, status')
      .eq('status', 'Active') // Only show active brothers in the Master Roll
      .order('surname', { ascending: true });

    if (error) {
      Alert.alert('Error', 'Could not generate report data.');
    } else {
      setReportData(data || []);
    }
    setLoading(false);
  }

  async function generateFinalRoll() {
    setLoading(true);
    setReportType('final');
    const { data, error } = await supabase
      .from('members')
      .select('surname, first_name, title, date_of_death, burial_date, burial_place')
      .eq('status', 'Deceased')
      .order('date_of_death', { ascending: false });

    if (error) {
      Alert.alert('Error', 'Could not generate Final Roll data.');
    } else {
      const cleaned = (data || []).map(m => ({
        ...m,
        date_of_death: fromPgDate(m.date_of_death),
        burial_date: fromPgDate(m.burial_date),
      }));
      setReportData(cleaned);
    }
    setLoading(false);
  }

  async function generateLeadershipReport() {
    setLoading(true);
    setReportType('leadership');
    const { data, error } = await supabase
      .from('members')
      .select('surname, first_name, title, positions(position_title, date_from, date_to)')
      .order('surname', { ascending: true });

    if (error) {
      Alert.alert('Error', 'Could not generate leadership data.');
    } else {
      const cleaned = (data || []).filter(m => (m.positions || []).length > 0).map(m => ({
        ...m,
        positions: m.positions.map(p => ({
          ...p,
          date_from: fromPgDate(p.date_from),
          date_to: fromPgDate(p.date_to)
        }))
      }));
      setReportData(cleaned);
    }
    setLoading(false);
  }

  async function generateFamilyReport() {
    setLoading(true);
    setReportType('family');
    const { data, error } = await supabase
      .from('members')
      .select('surname, first_name, marital_status, spouse(spouse_name), children(count)')
      .order('surname', { ascending: true });

    if (error) {
      Alert.alert('Error', 'Could not generate family data.');
    } else {
      setReportData(data || []);
    }
    setLoading(false);
  }

  async function generateStatusReport(status) {
    setLoading(true);
    setReportType(status.toLowerCase());
    
    let query = supabase
      .from('members')
      .select('surname, first_name, other_names, title, occupation, phone, residential_address, status');
    
    if (status === 'Dismissed') {
      // Search for both terms during transition
      query = query.eq('status', 'Dismissed');
    } else {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('surname', { ascending: true });

    if (error) {
      Alert.alert('Error', `Could not generate ${status} report.`);
    } else {
      setReportData(data || []);
    }
    setLoading(false);
  }

  const handleShare = async () => {
    let content = `OFFICIAL COMMANDERY REPORT: ${reportType?.toUpperCase()}\n\n`;
    
    if (reportType === 'master') {
      reportData.forEach(m => {
        content += `${m.surname}, ${m.first_name} | ${m.occupation || 'N/A'} | ${m.phone || 'No Phone'}\n`;
      });
    } else if (reportType === 'leadership') {
      reportData.forEach(m => {
        content += `${m.first_name} ${m.surname}:\n`;
        m.positions.forEach(p => content += ` - ${p.position_title} (${p.date_from} to ${p.date_to || 'Present'})\n`);
      });
    } else if (reportType === 'final') {
      reportData.forEach(m => {
        content += `${m.title} ${m.first_name} ${m.surname} | RIP: ${m.date_of_death || '---'} | Burial: ${m.burial_date || '---'} at ${m.burial_place || '---'}\n`;
      });
    } else if (reportType === 'suspended' || reportType === 'dismissed') {
      reportData.forEach(m => {
        content += `${m.surname}, ${m.first_name} | STATUS: ${reportType.toUpperCase()} | Phone: ${m.phone || '---'}\n`;
      });
    }

    try {
      await Share.share({ message: content });
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportPDF = async () => {
    // Resolve the logo so it renders correctly on both Web and Native PDFs
    let logoUri = '';
    try {
      logoUri = Image.resolveAssetSource(require('../../assets/logo.png')).uri;
    } catch (e) {
      console.warn("Logo could not be resolved", e);
    }

    let html = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #0A1628; background: white; }
            .header-banner { background: #0A1628; color: #C9A84C; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 30px; }
            h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; }
            .meta { font-size: 12px; color: #666; margin-top: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { border-bottom: 2px solid #0A1628; color: #0A1628; padding: 12px; text-align: left; font-size: 13px; font-weight: 800; }
            td { padding: 12px; border-bottom: 1px solid #EEE; font-size: 12px; color: #333; }
            .footer { margin-top: 50px; font-size: 10px; color: #AAA; text-align: center; border-top: 1px solid #EEE; padding-top: 20px; }
            
            @media print {
              @page { margin: 20mm; }
              body { padding: 0; margin: 0; }
              table { page-break-inside: auto; width: 100%; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              thead { display: table-header-group; }
              tfoot { display: table-footer-group; }
              .header-banner { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div style="text-align:center; padding-bottom: 20px;">
            <img src="${logoUri}" style="width: 80px; height: 80px;" alt="KSJI Logo" />
          </div>
          <div class="header-banner">
            <h1>OFFICIALLY CERTIFIED REGISTRAR REPORT</h1>
            <div class="meta">COMMANDERY RECORDS | TYPE: ${reportType?.toUpperCase()} | GENERATED: ${new Date().toLocaleDateString('en-GB')}</div>
          </div>
          <table>
            <thead>
    `;

    if (reportType === 'master') {
      html += `<tr><th>NAME</th><th>OCCUPATION</th><th>PHONE</th><th>STATUS</th></tr></thead><tbody>`;
      reportData.forEach(m => {
        html += `<tr><td style="font-weight:700">${m.surname}, ${m.first_name}</td><td>${m.occupation || 'N/A'}</td><td>${m.phone || '---'}</td><td>${m.status || 'Active'}</td></tr>`;
      });
    } else if (reportType === 'final') {
      html += `<tr><th>NAME</th><th>DIED (RIP)</th><th>BURIAL</th><th>PLACE</th></tr></thead><tbody>`;
      reportData.forEach(m => {
        html += `<tr><td style="font-weight:700">${m.title} ${m.first_name} ${m.surname}</td><td>${m.date_of_death || '---'}</td><td>${m.burial_date || '---'}</td><td>${m.burial_place || '---'}</td></tr>`;
      });
    } else if (reportType === 'leadership') {
      html += `<tr><th>OFFICER</th><th>POSITIONS HELD</th></tr></thead><tbody>`;
      reportData.forEach(m => {
        const posts = (m.positions || []).map(p => `<div style="margin-bottom:4px">• ${p.position_title} (${p.date_from} to ${p.date_to || 'Present'})</div>`).join('');
        html += `<tr><td style="font-weight:700">${m.first_name} ${m.surname}</td><td>${posts || 'No active positions'}</td></tr>`;
      });
    } else if (reportType === 'family') {
      html += `<tr><th>MEMBER</th><th>STATUS</th><th>SPOUSE</th><th>CHILDREN</th></tr></thead><tbody>`;
      reportData.forEach(m => {
        const spouseObj = Array.isArray(m.spouse) ? (m.spouse[0] || {}) : (m.spouse || {});
        html += `<tr><td style="font-weight:700">${m.first_name} ${m.surname}</td><td>${m.marital_status || '—'}</td><td>${spouseObj.spouse_name || '—'}</td><td>${m.children?.[0]?.count || 0}</td></tr>`;
      });
    } else {
      html += `<tr><th>NAME</th><th>STATUS</th><th>CONTACT</th></tr></thead><tbody>`;
      reportData.forEach(m => {
        html += `<tr><td style="font-weight:700">${m.surname}, ${m.first_name}</td><td>${reportType?.toUpperCase()}</td><td>${m.phone || '---'}</td></tr>`;
      });
    }

    html += `</tbody></table><div class="footer">KSJI Registrar Suite - Official Digital Record Repository - Generated on behalf of the Registrar</div></body></html>`;

    try {
      if (Platform.OS === 'web') {
        // Direct print engine is more reliable for "True PDF" on web
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri);
      }
    } catch (e) {
      Alert.alert('PDF Error', 'Could not generate the PDF document.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Reporting Hub</Text>
      </View>

      <View style={styles.optionsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionsScroll}>
          <ReportOption 
            title="Master Roll" 
            icon="📋" 
            active={reportType === 'master'} 
            onPress={generateMasterRoll} 
          />
          <ReportOption 
            title="Leadership" 
            icon="🎖️" 
            active={reportType === 'leadership'} 
            onPress={generateLeadershipReport} 
          />
          <ReportOption 
            title="Status: Suspended" 
            icon="⛔" 
            active={reportType === 'suspended'} 
            onPress={() => generateStatusReport('Suspended')} 
          />
          <ReportOption 
            title="Status: Dismissed" 
            icon="🚫" 
            active={reportType === 'dismissed'} 
            onPress={() => generateStatusReport('Dismissed')} 
          />
          <ReportOption 
            title="Family/Welfare" 
            icon="👨‍👩‍👧" 
            active={reportType === 'family'} 
            onPress={generateFamilyReport} 
          />
          <ReportOption 
            title="Final Roll" 
            icon="🕯️" 
            active={reportType === 'final'} 
            onPress={generateFinalRoll} 
          />
        </ScrollView>
      </View>

      <View style={styles.previewContainer}>
        <View style={styles.previewHeader}>
          <Text style={styles.previewTitle}>Report Preview</Text>
          {reportData.length > 0 && (
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity style={[styles.exportBtn, { backgroundColor: Colors.white, marginRight: 8 }]} onPress={handleExportPDF}>
                <Text style={[styles.exportBtnText, { color: Colors.navy }]}>📄 PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportBtn} onPress={handleShare}>
                <Text style={styles.exportBtnText}>Share</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.gold} size="large" style={{ marginTop: 40 }} />
        ) : reportData.length > 0 ? (
          <ScrollView style={styles.previewScroll}>
            {reportType === 'master' && reportData.map((m, i) => (
              <View key={i} style={styles.reportRow}>
                <Text style={styles.memberMain}>{m.surname}, {m.first_name}</Text>
                <Text style={styles.memberSub}>{m.occupation || 'N/A'} • {m.phone || '---'}</Text>
              </View>
            ))}
            {reportType === 'leadership' && reportData.map((m, i) => (
              <View key={i} style={styles.reportRow}>
                <Text style={styles.memberMain}>{m.first_name} {m.surname}</Text>
                {m.positions.map((p, pi) => (
                  <Text key={pi} style={styles.positionItem}>
                    • {p.position_title} ({p.date_from?.split('-')[0]} - {p.date_to?.split('-')[0] || 'Present'})
                  </Text>
                ))}
              </View>
            ))}
            {reportType === 'family' && reportData.map((m, i) => (
              <View key={i} style={styles.reportRow}>
                <Text style={styles.memberMain}>{m.first_name} {m.surname}</Text>
                <Text style={styles.memberSub}>
                  Status: {m.marital_status || 'Unknown'} • Child: {m.children?.[0]?.count || 0}
                </Text>
                {m.spouse && (
                  <Text style={[styles.memberSub, { color: Colors.navy, fontWeight: '600' }]}>
                    Spouse: {Array.isArray(m.spouse) ? (m.spouse[0]?.spouse_name || '—') : (m.spouse?.spouse_name || '—')}
                  </Text>
                )}
              </View>
            ))}
            {reportType === 'final' && reportData.map((m, i) => (
              <View key={i} style={styles.reportRow}>
                <Text style={styles.memberMain}>{m.title} {m.first_name} {m.surname}</Text>
                <Text style={[styles.memberSub, { color: '#111827', fontWeight: '800' }]}>🕯️ Rest in Peace</Text>
                <Text style={styles.memberSub}>Died: {m.date_of_death || '---'} • Burial: {m.burial_date || '---'}</Text>
                <Text style={styles.memberSub}>Place: {m.burial_place || '---'}</Text>
              </View>
            ))}
            {(reportType === 'suspended' || reportType === 'dismissed') && reportData.map((m, i) => (
              <View key={i} style={styles.reportRow}>
                <Text style={styles.memberMain}>{m.surname}, {m.first_name}</Text>
                <Text style={[styles.memberSub, { color: reportType === 'suspended' ? Colors.gold : Colors.danger, fontWeight: '700' }]}>
                  {reportType.toUpperCase()}
                </Text>
                <Text style={styles.memberSub}>{m.occupation || 'N/A'} • {m.phone || '---'}</Text>
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {reportType 
                ? `No records found for ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} members.`
                : "Select a report type above to generate a preview."}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function ReportOption({ title, icon, active, onPress }) {
  return (
    <TouchableOpacity 
      style={[styles.optionCard, active && styles.optionCardActive]} 
      onPress={onPress}
    >
      <Text style={styles.optionIcon}>{icon}</Text>
      <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.navy },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  backBtn: { paddingRight: 15 },
  backIcon: { color: Colors.gold, fontSize: 32, fontWeight: '300' },
  title: { color: Colors.white, fontSize: 22, fontWeight: '800' },
  
  optionsWrap: {
    paddingBottom: Spacing.md,
  },
  optionsScroll: {
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
  },
  optionCard: {
    width: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Radii.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    marginRight: 10,
  },
  optionCardActive: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  optionIcon: { fontSize: 24, marginBottom: 6 },
  optionTitle: { color: Colors.grey300, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' },
  optionTitleActive: { color: Colors.gold },

  previewContainer: {
    flex: 1,
    backgroundColor: '#F4F6F8',
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: Spacing.xl,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  previewTitle: { fontSize: 18, fontWeight: '800', color: Colors.navy },
  exportBtn: {
    backgroundColor: Colors.gold,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.pill,
  },
  exportBtnText: { color: Colors.navy, fontSize: 12, fontWeight: '700' },
  
  previewScroll: { flex: 1 },
  reportRow: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: Radii.sm,
    marginBottom: 8,
    ...Shadows.card,
  },
  memberMain: { fontSize: 15, fontWeight: '700', color: Colors.navy },
  memberSub: { fontSize: 12, color: Colors.grey400, marginTop: 2 },
  positionItem: { fontSize: 12, color: Colors.grey600, marginLeft: 10, marginTop: 2 },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: Colors.grey400, textAlign: 'center', fontSize: 14, paddingHorizontal: 40 },
});

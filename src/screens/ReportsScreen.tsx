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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../db/supabase';
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
      setReportData(data || []);
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
      // Filter to only those with positions
      setReportData(data?.filter(m => (m.positions || []).length > 0) || []);
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
    let html = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #0A1628; }
            h1 { color: #C9A84C; border-bottom: 2px solid #C9A84C; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #0A1628; color: white; padding: 12px; text-align: left; font-size: 12px; }
            td { padding: 10px; border-bottom: 1px solid #E8E4DC; font-size: 11px; }
            .footer { margin-top: 50px; font-size: 10px; color: #A09891; text-align: center; }
          </style>
        </head>
        <body>
          <h1>Official Commandery Report: ${reportType?.toUpperCase()}</h1>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
    `;

    if (reportType === 'master') {
      html += `<tr><th>NAME</th><th>OCCUPATION</th><th>PHONE</th><th>STATUS</th></tr></thead><tbody>`;
      reportData.forEach(m => {
        html += `<tr><td>${m.surname}, ${m.first_name}</td><td>${m.occupation || 'N/A'}</td><td>${m.phone || '---'}</td><td>${m.status}</td></tr>`;
      });
    } else if (reportType === 'final') {
      html += `<tr><th>NAME</th><th>DIED</th><th>BURIAL</th><th>PLACE</th></tr></thead><tbody>`;
      reportData.forEach(m => {
        html += `<tr><td>${m.title} ${m.first_name} ${m.surname}</td><td>${m.date_of_death || '---'}</td><td>${m.burial_date || '---'}</td><td>${m.burial_place || '---'}</td></tr>`;
      });
    } else if (reportType === 'leadership') {
      html += `<tr><th>OFFICER</th><th>POSITIONS</th></tr></thead><tbody>`;
      reportData.forEach(m => {
        const posts = m.positions.map(p => `${p.position_title} (${p.date_from})`).join('<br/>');
        html += `<tr><td>${m.first_name} ${m.surname}</td><td>${posts}</td></tr>`;
      });
    } else {
      html += `<tr><th>NAME</th><th>STATUS</th><th>CONTACT</th></tr></thead><tbody>`;
      reportData.forEach(m => {
        html += `<tr><td>${m.surname}, ${m.first_name}</td><td>${reportType?.toUpperCase()}</td><td>${m.phone || '---'}</td></tr>`;
      });
    }

    html += `</tbody></table><div class="footer">KSJI Registrar Suite - Digital Record Repository</div></body></html>`;

    try {
      if (Platform.OS === 'web') {
        const { uri } = await Print.printToFileAsync({ html });
        window.open(uri, '_blank');
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
                  Status: {m.marital_status || 'Unknown'} • Child Count: {m.children?.[0]?.count || 0}
                </Text>
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

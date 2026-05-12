import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  StyleSheet, ActivityIndicator, Image, Platform, StatusBar,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  getMemberRecord,
  getChildren,
  getPositions,
  getDegrees,
  getMilitary,
  getUniformedRankRecords,
  getSpouse,
  getEmergencyContacts,
} from '../db/memberQueries';
import {
  formatMemberTitle,
  formatDisplayDate,
  buildServiceNarrative,
  buildFormalCitation,
} from '../utils/ksji-logic';
import { Colors, Spacing, Typography, Radii, Shadows } from '../styles/theme';

export default function DossierScreen({ route, navigation }) {
  const { memberId } = route.params;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [printing, setPrinting] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [
        member, children, positions, degrees,
        military, rankRecords, spouse, emergency,
      ] = await Promise.all([
        getMemberRecord(memberId),
        getChildren(memberId),
        getPositions(memberId),
        getDegrees(memberId),
        getMilitary(memberId),
        getUniformedRankRecords(memberId),
        getSpouse(memberId),
        getEmergencyContacts(memberId),
      ]);

      setData({
        member, children, positions, degrees,
        military, rankRecords, spouse, emergency,
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to load dossier data: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const generatePDF = async () => {
    if (!data) return;
    setPrinting(true);
    try {
      const { member, children, positions, degrees, military, spouse } = data;
      const displayTitle = formatMemberTitle(member.title);
      const joinedDate = formatDisplayDate(member.date_joined);
      const transferDate = member.transfer_date ? formatDisplayDate(member.transfer_date) : '';

      const narrative = buildServiceNarrative({
        member, positions, degrees, joinedDate,
        displayTitle, firstName: member.first_name, surname: member.surname,
        transferDate
      });

      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', sans-serif; color: #10233f; padding: 40px; line-height: 1.6; }
              .header { text-align: center; border-bottom: 2px solid #C9A84C; padding-bottom: 20px; margin-bottom: 30px; }
              .title { font-size: 28px; font-weight: bold; color: #10233f; text-transform: uppercase; margin-bottom: 4px; }
              .subtitle { font-size: 14px; color: #C9A84C; font-weight: bold; letter-spacing: 2px; }
              .section { margin-bottom: 24px; break-inside: avoid; }
              .section-title { font-size: 18px; font-weight: bold; border-left: 4px solid #C9A84C; padding-left: 10px; margin-bottom: 12px; background: #f8f9fa; padding-top: 4px; padding-bottom: 4px; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
              .field { margin-bottom: 8px; }
              .label { font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; display: block; }
              .value { font-size: 14px; font-weight: 600; }
              .narrative { font-style: italic; background: #fffcf0; padding: 20px; border-radius: 8px; border: 1px solid #eee; margin-top: 20px; }
              .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              .table th { text-align: left; font-size: 11px; color: #64748b; border-bottom: 1px solid #eee; padding: 8px 4px; }
              .table td { padding: 8px 4px; border-bottom: 1px solid #f8f9fa; font-size: 13px; }
              .portrait { width: 120px; height: 120px; border-radius: 10px; border: 2px solid #C9A84C; float: right; object-fit: cover; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">Record of Service</div>
              <div class="subtitle">Knights of St. John International</div>
            </div>

            ${member.photo_url ? `<img src="${member.photo_url}" class="portrait" />` : ''}

            <div class="section">
              <div class="section-title">Personal Details</div>
              <div class="grid">
                <div class="field"><span class="label">Full Name</span><span class="value">${displayTitle} ${member.first_name} ${member.surname}</span></div>
                <div class="field"><span class="label">Initiation Date</span><span class="value">${joinedDate}</span></div>
                <div class="field"><span class="label">Current Status</span><span class="value">${member.status}</span></div>
                <div class="field"><span class="label">Occupation</span><span class="value">${member.occupation || '—'}</span></div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Service Narrative</div>
              <div class="narrative">${narrative}</div>
            </div>

            <div class="section">
              <div class="section-title">Positions Held</div>
              <table class="table">
                <thead><tr><th>Title</th><th>Level</th><th>From</th><th>To</th></tr></thead>
                <tbody>
                  ${positions.map(p => `<tr><td>${p.position_title}</td><td>${p.level || 'Local'}</td><td>${p.date_from || '—'}</td><td>${p.date_to || 'Present'}</td></tr>`).join('')}
                </tbody>
              </table>
            </div>

            <div class="section">
              <div class="section-title">Degree Records</div>
              <table class="table">
                <thead><tr><th>Degree</th><th>Date</th><th>Place</th></tr></thead>
                <tbody>
                  ${degrees.map(d => `<tr><td>${d.degree_type}</td><td>${d.degree_date || '—'}</td><td>${d.degree_place || '—'}</td></tr>`).join('')}
                </tbody>
              </table>
            </div>

            <div class="section" style="margin-top: 30px;">
              <div class="section-title">Official Testimonial / Citation</div>
              <div class="narrative" style="text-align: center; font-size: 15px; font-weight: 600; font-family: serif;">
                ${buildFormalCitation({ displayTitle, firstName: member.first_name, surname: member.surname, joinedDate, degrees, positions })}
              </div>
            </div>

            <div style="margin-top: 50px; text-align: center; font-size: 10px; color: #94a3b8;">
              Generated via KSJI Registrar Suite • Master Record • ${new Date().toLocaleDateString()}
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
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" color={Colors.navy} />
        <Text style={s.loadingText}>Compiling Dossier…</Text>
      </View>
    );
  }

  const { member, positions, degrees, spouse, children } = data;
  const displayTitle = formatMemberTitle(member.title);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navy} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Master Record</Text>
        <TouchableOpacity onPress={generatePDF} disabled={printing} style={s.printBtn}>
          {printing ? <ActivityIndicator size="small" color={Colors.gold} /> : <Text style={s.printText}>PDF</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.heroCard}>
          <View style={s.portraitWrap}>
            {member.photo_url ? (
              <Image source={{ uri: member.photo_url }} style={s.portrait} />
            ) : (
              <Text style={s.portraitPlaceholder}>👤</Text>
            )}
          </View>
          <Text style={s.name}>{displayTitle} {member.first_name} {member.surname}</Text>
          <Text style={s.statusBadge}>{member.status}</Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Service Narrative</Text>
          <View style={s.narrativeCard}>
            <Text style={s.narrativeText}>
              {buildServiceNarrative({
                member, positions, degrees,
                joinedDate: formatDisplayDate(member.date_joined),
                displayTitle, firstName: member.first_name, surname: member.surname,
                transferDate: member.transfer_date ? formatDisplayDate(member.transfer_date) : ''
              })}
            </Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Official Testimonial</Text>
          <View style={[s.narrativeCard, { backgroundColor: '#fff', borderColor: Colors.gold }]}>
            <Text style={[s.narrativeText, { textAlign: 'center', fontWeight: '600' }]}>
              {buildFormalCitation({
                displayTitle, firstName: member.first_name, surname: member.surname,
                joinedDate: formatDisplayDate(member.date_joined), degrees, positions
              })}
            </Text>
          </View>
        </View>

        <DossierSection title="Positions Held" icon="📋">
          {positions.map(p => (
            <View key={p.id} style={s.listItem}>
              <Text style={s.itemTitle}>{p.position_title}</Text>
              <Text style={s.itemSub}>{p.level || 'Local'}  •  {p.date_from || '—'} to {p.date_to || 'Present'}</Text>
            </View>
          ))}
          {positions.length === 0 && <Text style={s.emptyText}>No positions recorded.</Text>}
        </DossierSection>

        <DossierSection title="Exemplifications" icon="🎓">
          {degrees.map(d => (
            <View key={d.id} style={s.listItem}>
              <Text style={s.itemTitle}>{d.degree_type}</Text>
              <Text style={s.itemSub}>{d.degree_date || '—'} at {d.degree_place || '—'}</Text>
            </View>
          ))}
        </DossierSection>

        <DossierSection title="Family" icon="👨‍👩‍👧">
          {spouse && (
            <View style={s.listItem}>
              <Text style={s.itemTitle}>Spouse: {spouse.spouse_name}</Text>
              <Text style={s.itemSub}>{spouse.spouse_denomination || '—'}</Text>
            </View>
          )}
          {children.map(c => (
            <View key={c.id} style={s.listItem}>
              <Text style={s.itemTitle}>Child: {c.child_name}</Text>
              <Text style={s.itemSub}>Born {c.birth_date || '—'} at {c.birth_place || '—'}</Text>
            </View>
          ))}
        </DossierSection>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

function DossierSection({ title, icon, children }) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionIcon}>{icon}</Text>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      <View style={s.sectionCard}>
        {children}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.navy },
  loadingText: { marginTop: 12, color: Colors.gold, fontWeight: '700' },
  
  header: {
    backgroundColor: Colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 40 : 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: { color: Colors.white, fontSize: 18, fontWeight: '700' },
  backBtn: { padding: 4 },
  backText: { color: Colors.gold, fontWeight: '700' },
  printBtn: { backgroundColor: 'rgba(201, 168, 76, 0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  printText: { color: Colors.gold, fontWeight: '800', fontSize: 12 },

  content: { padding: 16 },
  heroCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    ...Shadows.card,
  },
  portraitWrap: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#f1f5f9', overflow: 'hidden',
    borderWidth: 3, borderColor: Colors.gold,
    marginBottom: 16,
  },
  portrait: { width: '100%', height: '100%' },
  portraitPlaceholder: { fontSize: 50, textAlign: 'center', marginTop: 15 },
  name: { fontSize: 20, fontWeight: '800', color: Colors.navy, textAlign: 'center' },
  statusBadge: {
    marginTop: 8,
    backgroundColor: '#f1f5f9',
    color: Colors.navy,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },

  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginLeft: 4 },
  sectionIcon: { fontSize: 18, marginRight: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.navy, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    ...Shadows.card,
  },

  narrativeCard: {
    backgroundColor: '#fffcf0',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  narrativeText: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.navy,
    fontStyle: 'italic',
    textAlign: 'justify',
  },

  listItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  itemTitle: { fontSize: 14, fontWeight: '700', color: Colors.navy },
  itemSub: { fontSize: 12, color: Colors.grey400, marginTop: 2 },
  emptyText: { fontSize: 13, color: Colors.grey400, fontStyle: 'italic', textAlign: 'center', padding: 10 },
});

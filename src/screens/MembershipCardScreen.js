import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Image, TouchableOpacity, 
  ActivityIndicator, Share, Alert, Platform, ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMemberRecord } from '../db/memberQueries';
import { Colors, Spacing, Typography, Radii, Shadows } from '../styles/theme';

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatMemberTitle } from '../utils/ksji-logic';

export default function MembershipCardScreen({ route, navigation }) {
  const { memberId } = route.params;
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getMemberRecord(memberId);
        setMember(data);
      } catch (e) {
        Alert.alert('Error', 'Failed to load card data.');
      } finally {
        setLoading(false);
      }
    })();
  }, [memberId]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `KSJI Digital Membership Card: ${member.title} ${member.first_name} ${member.surname}\nVerify here: https://ksji-members.vercel.app/verify/${member.id}`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const exportPDF = async () => {
    if (!member) return;
    setPrinting(true);
    try {
      const displayTitle = formatMemberTitle(member.title);
      const verifyUrl = `https://ksji-members.vercel.app/verify/${member.id}`;
      const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(verifyUrl)}&size=200&margin=1`;

      const html = `
        <html>
          <head>
            <style>
              body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: #fff; }
              .card {
                width: 320px; height: 500px;
                background: linear-gradient(135deg, #0A1628 0%, #10233F 100%);
                border-radius: 20px; padding: 30px; color: white; border: 4px solid #C9A84C;
                font-family: 'Helvetica', sans-serif; position: relative; overflow: hidden;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
              }
              .gold-bar { position: absolute; top: 0; left: 0; right: 0; height: 60px; background: rgba(201, 168, 76, 0.1); border-bottom: 1px solid rgba(201, 168, 76, 0.3); }
              .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; position: relative; z-index: 2; }
              .org-name { color: #C9A84C; font-size: 14px; font-weight: 900; letter-spacing: 1.5px; }
              .org-sub { font-size: 9px; color: #94a3b8; font-weight: bold; margin-top: 2px; }
              .photo-frame { width: 150px; height: 170px; background: white; margin: 0 auto 24px; border: 4px solid #C9A84C; border-radius: 12px; overflow: hidden; }
              .photo { width: 100%; height: 100%; object-fit: cover; }
              .name-section { text-align: center; margin-bottom: 30px; }
              .title { color: #C9A84C; font-size: 12px; font-weight: 800; margin-bottom: 4px; }
              .surname { font-size: 24px; font-weight: 900; text-transform: uppercase; margin: 0; }
              .firstname { font-size: 16px; font-weight: 600; color: #cbd5e1; margin: 0; }
              .status-badge { display: inline-block; background: rgba(255,255,255,0.1); padding: 6px 16px; border-radius: 20px; font-size: 11px; font-weight: 800; border: 1px solid rgba(255,255,255,0.2); margin-top: 12px; }
              .footer { display: flex; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; margin-top: auto; }
              .qr-box { width: 80px; height: 80px; background: white; padding: 6px; border-radius: 8px; }
              .meta { margin-left: 20px; display: flex; flex-direction: column; justify-content: center; }
              .meta-label { font-size: 8px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 2px; }
              .meta-value { font-size: 12px; font-weight: bold; font-family: monospace; margin-bottom: 8px; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="gold-bar"></div>
              <div class="header">
                <div>
                  <div class="org-name">K.S.J.I REGISTRAR</div>
                  <div class="org-sub">Official Digital Record</div>
                </div>
              </div>
              <div class="photo-frame">
                ${member.photo_url ? `<img src="${member.photo_url}" class="photo" />` : '<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:10px;font-weight:bold">NO PHOTO</div>'}
              </div>
              <div class="name-section">
                <div class="title">${displayTitle}</div>
                <div class="surname">${member.surname}</div>
                <div class="firstname">${member.first_name} ${member.other_names || ''}</div>
                <div class="status-badge">${member.status?.toUpperCase() || 'ACTIVE'}</div>
              </div>
              <div class="footer">
                <div class="qr-box">
                  <img src="${qrUrl}" style="width:100%;height:100%" />
                </div>
                <div class="meta">
                  <div class="meta-label">ID Number</div>
                  <div class="meta-value">KSJI-${member.id?.slice(0, 8).toUpperCase()}</div>
                  <div class="meta-label">Joined Date</div>
                  <div class="meta-value">${member.date_joined || '---'}</div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (e) {
      Alert.alert('Export Failed', e.message);
    } finally {
      setPrinting(false);
    }
  };

  if (loading) return (
    <View style={s.loadingWrap}>
      <ActivityIndicator size="large" color={Colors.gold} />
    </View>
  );

  if (!member) return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
      </View>
      <View style={[s.container, { padding: 40 }]}>
        <Text style={{ color: Colors.gold, fontSize: 40 }}>⚠️</Text>
        <Text style={{ color: Colors.white, fontSize: 18, fontWeight: '700', marginTop: 20, textAlign: 'center' }}>
          No Member Record Found
        </Text>
        <Text style={{ color: Colors.grey400, textAlign: 'center', marginTop: 10 }}>
          Please ensure you have saved your profile before viewing the ID card.
        </Text>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Digital ID</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={exportPDF} disabled={printing} style={[s.shareBtn, { marginRight: 15 }]}>
            {printing ? <ActivityIndicator size="small" color={Colors.gold} /> : <Text style={s.shareText}>PDF</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={s.shareBtn}>
            <Text style={s.shareText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent}>
        <View style={s.container}>
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View>
                <Text style={s.orgName}>K.S.J.I REGISTRAR</Text>
                <Text style={s.orgSub}>Official Membership Record</Text>
              </View>
              <View style={{ backgroundColor: '#FFF', borderRadius: 30, padding: 2, overflow: 'hidden' }}>
                <Image source={require('../../assets/logo.png')} style={s.logoImg} resizeMode="contain" />
              </View>
            </View>

            <View style={s.cardBody}>
              <View style={s.photoWrap}>
                {member.photo_url ? (
                  <Image source={{ uri: member.photo_url }} style={s.photo} />
                ) : (
                  <View style={s.photoPlaceholder}>
                    <Text style={s.photoPlaceholderText}>NO PHOTO</Text>
                  </View>
                )}
              </View>

              <View style={s.infoWrap}>
                <Text style={s.memberTitle}>{formatMemberTitle(member.title)}</Text>
                <Text style={s.memberName}>{member.surname}</Text>
                <Text style={s.memberFirstName}>{member.first_name} {member.other_names || ''}</Text>
                
                <View style={s.rankRow}>
                  <Text style={s.rankLabel}>STATUS</Text>
                  <Text style={s.rankValue}>{member.status?.toUpperCase() || 'ACTIVE'}</Text>
                </View>
              </View>
            </View>

            <View style={s.cardFooter}>
              <View style={s.qrStub}>
                <View style={s.qrBox}>
                  <Image 
                    source={{ uri: `https://quickchart.io/qr?text=${encodeURIComponent('https://ksji-members.vercel.app/verify/' + member.id)}&size=150&margin=1` }} 
                    style={{ width: '100%', height: '100%' }} 
                    resizeMode="contain"
                  />
                </View>
                <Text style={s.qrText}>SCAN TO VERIFY</Text>
              </View>
              
              <View style={s.meta}>
                <Text style={s.metaLabel}>ID NUMBER</Text>
                <Text style={s.metaValue}>KSJI-{member.id?.slice(0,8).toUpperCase()}</Text>
                <Text style={[s.metaLabel, { marginTop: 8 }]}>JOINED</Text>
                <Text style={s.metaValue}>{member.date_joined || '---'}</Text>
              </View>
            </View>
          
            <View style={s.goldCorner} />
          </View>
        </View>

        <Text style={s.hint}>This card is an official digital record for use within the Commandery.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.navy },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.navy },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' 
  },
  backBtn: { paddingVertical: 4 },
  backText: { color: Colors.gold, fontSize: 16, fontWeight: '700' },
  headerTitle: { color: Colors.white, fontSize: 18, fontWeight: '800' },
  shareText: { color: Colors.gold, fontSize: 14, fontWeight: '600' },

  container: { flex: 1, padding: Spacing.xl, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { flexGrow: 1, paddingBottom: 60 },
  
  card: {
    width: '100%',
    maxWidth: 380, // Prevent it from being too huge on web
    height: 580,   // Fixed height for better control
    backgroundColor: Colors.navyMid,
    borderRadius: Radii.lg,
    padding: Spacing.xl,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: Colors.gold,
    ...Shadows.glass,
    elevation: 8,
  },
  goldCorner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.2)',
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: Spacing.xl + 10,
    zIndex: 10,
  },
  orgName: { color: Colors.gold, fontSize: 16, fontWeight: '900', letterSpacing: 1.5 },
  orgSub: { color: Colors.grey300, fontSize: 10, fontWeight: '700', marginTop: 2 },
  logoImg: { width: 60, height: 60 },

  cardBody: { 
    alignItems: 'center', 
    marginBottom: Spacing.xl,
    zIndex: 10,
  },
  photoWrap: { 
    width: 160, 
    height: 180, 
    backgroundColor: '#FFF', 
    borderRadius: Radii.md, 
    borderWidth: 4, 
    borderColor: Colors.gold,
    justifyContent: 'center', 
    alignItems: 'center', 
    overflow: 'hidden',
    ...Shadows.card,
    marginBottom: Spacing.lg,
  },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { alignItems: 'center' },
  photoPlaceholderText: { color: Colors.grey300, fontSize: 12, fontWeight: '800' },

  infoWrap: { alignItems: 'center', width: '100%' },
  memberTitle: { color: Colors.gold, fontSize: 14, fontWeight: '800', marginBottom: 2 },
  memberName: { color: Colors.white, fontSize: 28, fontWeight: '900', textTransform: 'uppercase', textAlign: 'center' },
  memberFirstName: { color: Colors.grey200, fontSize: 18, fontWeight: '600', marginTop: -2, textAlign: 'center' },
  
  rankRow: { 
    marginTop: Spacing.lg, 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    paddingHorizontal: 20, 
    paddingVertical: 8,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  rankLabel: { color: Colors.grey400, fontSize: 10, fontWeight: '800', textAlign: 'center' },
  rankValue: { color: Colors.white, fontSize: 15, fontWeight: '900', marginTop: 2, textAlign: 'center' },

  cardFooter: { 
    flexDirection: 'row', 
    marginTop: 'auto', 
    paddingTop: Spacing.lg, 
    borderTopWidth: 1, 
    borderTopColor: 'rgba(255,255,255,0.1)',
    zIndex: 10,
  },
  qrStub: { width: 100, alignItems: 'center' },
  qrBox: { 
    width: 85, height: 85, backgroundColor: Colors.white, borderRadius: 8, padding: 8,
    justifyContent: 'center', alignItems: 'center',
    ...Shadows.subtle,
  },
  qrText: { color: Colors.grey400, fontSize: 8, fontWeight: '800', marginTop: 10 },

  meta: { flex: 1, marginLeft: Spacing.lg, justifyContent: 'center' },
  metaLabel: { color: Colors.grey400, fontSize: 9, fontWeight: '800' },
  metaValue: { color: Colors.white, fontSize: 14, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  hint: { color: Colors.grey400, fontSize: 11, textAlign: 'center', marginTop: Spacing.xl, lineHeight: 18, paddingHorizontal: 40 },
});

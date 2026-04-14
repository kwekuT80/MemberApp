import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Image, TouchableOpacity, 
  ActivityIndicator, Share, Alert, Platform, ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMemberRecord } from '../db/memberQueries';
import { Colors, Spacing, Typography, Radii, Shadows } from '../styles/theme';

export default function MembershipCardScreen({ route, navigation }) {
  const { memberId } = route.params;
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);

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
        message: `KSJI Digital Membership Card: ${member.title} ${member.first_name} ${member.surname}`,
        url: Platform.OS === 'web' ? window.location.href : '',
      });
    } catch (e) {
      console.error(e);
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
        <Text style={s.headerTitle}>Digital Membership ID</Text>
        <TouchableOpacity onPress={handleShare} style={s.shareBtn}>
          <Text style={s.shareText}>Share</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent}>
        <View style={s.container}>
        {/* THE CARD */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View>
              <Text style={s.orgName}>K.S.J.I REGISTRAR SUITE</Text>
              <Text style={s.orgSub}>Official Membership Record</Text>
            </View>
            <Image source={require('../../assets/logo.png')} style={s.logoImg} resizeMode="contain" />
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
              <Text style={s.memberTitle}>{member.title || 'Bro.'}</Text>
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
                    source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=KSJI:MEMBER:${member.id}` }} 
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
          
          {/* Gold Overlay Accents */}
          <View style={s.goldCorner} />
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
    width: 80, height: 80, backgroundColor: Colors.white, borderRadius: 8, padding: 8,
    justifyContent: 'center', alignItems: 'center',
    ...Shadows.subtle,
  },
  qrText: { color: Colors.grey400, fontSize: 8, fontWeight: '800', marginTop: 8 },

  meta: { flex: 1, marginLeft: Spacing.lg, justifyContent: 'center' },
  metaLabel: { color: Colors.grey400, fontSize: 9, fontWeight: '800' },
  metaValue: { color: Colors.white, fontSize: 14, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  hint: { color: Colors.grey400, fontSize: 11, textAlign: 'center', marginTop: Spacing.xl, lineHeight: 18, paddingHorizontal: 40 },
});

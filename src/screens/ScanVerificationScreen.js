import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors, Spacing, Radii, Shadows } from '../styles/theme';
import { supabase } from '../db/supabase';
import { formatMemberTitle, formatDisplayDate } from '../utils/ksji-logic';

export default function ScanVerificationScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [member, setMember] = useState(null);

  if (!permission) {
    return <View style={s.center}><ActivityIndicator size="large" color={Colors.navy} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={s.container}>
        <Text style={s.text}>We need your permission to show the camera</Text>
        <TouchableOpacity style={s.btn} onPress={requestPermission}>
          <Text style={s.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned || verifying) return;
    setScanned(true);

    // Expected format: https://ksji-members.vercel.app/verify/[id]
    const idMatch = data.match(/\/verify\/([0-9a-fA-F-]+)/);
    if (!idMatch) {
      Alert.alert('Invalid QR Code', 'This does not appear to be a valid KSJI membership ID.', [
        { text: 'Try Again', onPress: () => setScanned(false) }
      ]);
      return;
    }

    const memberId = idMatch[1];
    setVerifying(true);
    try {
      const { data: memberData, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .single();

      if (error || !memberData) throw new Error('Member not found');
      setMember(memberData);
    } catch (e) {
      Alert.alert('Verification Failed', 'Could not find a member with this ID.', [
        { text: 'Close', onPress: () => setScanned(false) }
      ]);
    } finally {
      setVerifying(false);
    }
  };

  const reset = () => {
    setScanned(false);
    setMember(null);
  };

  return (
    <View style={s.container}>
      {!member ? (
        <>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          />
          <View style={s.overlay}>
            <View style={s.unfocusedContainer}></View>
            <View style={s.focusedContainer}>
              <View style={s.cornerTopLeft} />
              <View style={s.cornerTopRight} />
              <View style={s.cornerBottomLeft} />
              <View style={s.cornerBottomRight} />
            </View>
            <View style={s.unfocusedContainer}>
              <Text style={s.instruction}>Scan a Member's QR Code to verify</Text>
              <TouchableOpacity style={s.closeBtn} onPress={() => navigation.goBack()}>
                <Text style={s.closeText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
          {verifying && (
            <View style={s.loadingOverlay}>
              <ActivityIndicator size="large" color={Colors.gold} />
              <Text style={s.loadingText}>Verifying Authenticity...</Text>
            </View>
          )}
        </>
      ) : (
        <View style={s.resultContainer}>
          <View style={s.resultCard}>
            <View style={s.checkCircle}>
              <Text style={s.checkMark}>✓</Text>
            </View>
            <Text style={s.verifiedTitle}>Member Verified</Text>
            
            <View style={s.memberInfo}>
              <View style={s.portraitWrap}>
                {member.photo_url ? (
                  <Image source={{ uri: member.photo_url }} style={s.portrait} />
                ) : (
                  <Text style={s.portraitPlaceholder}>👤</Text>
                )}
              </View>
              <Text style={s.memberName}>{formatMemberTitle(member.title)} {member.first_name} {member.surname}</Text>
              <Text style={s.memberStatus}>{member.status?.toUpperCase() || 'ACTIVE'}</Text>
              
              <View style={s.detailsList}>
                <DetailRow label="ID Number" value={`KSJI-${member.id.slice(0,8).toUpperCase()}`} />
                <DetailRow label="Initiated" value={formatDisplayDate(member.date_joined)} />
                <DetailRow label="Occupation" value={member.occupation || '—'} />
              </View>
            </View>

            <TouchableOpacity style={s.doneBtn} onPress={reset}>
              <Text style={s.doneBtnText}>Verify Another</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.backToDash} onPress={() => navigation.goBack()}>
              <Text style={s.backToDashText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 20 },
  btn: { backgroundColor: Colors.gold, padding: 15, borderRadius: 10 },
  btnText: { color: Colors.navy, fontWeight: '700' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  unfocusedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  focusedContainer: { width: 250, height: 250, alignSelf: 'center' },
  instruction: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 20 },
  closeBtn: { marginTop: 40, padding: 10 },
  closeText: { color: Colors.gold, fontWeight: '700' },

  cornerTopLeft: { position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTopWidth: 4, borderLeftWidth: 4, borderColor: Colors.gold },
  cornerTopRight: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTopWidth: 4, borderRightWidth: 4, borderColor: Colors.gold },
  cornerBottomLeft: { position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: Colors.gold },
  cornerBottomRight: { position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottomWidth: 4, borderRightWidth: 4, borderColor: Colors.gold },

  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: Colors.gold, marginTop: 15, fontWeight: '700' },

  resultContainer: { flex: 1, backgroundColor: Colors.navy, justifyContent: 'center', padding: 20 },
  resultCard: { backgroundColor: '#fff', borderRadius: 25, padding: 30, alignItems: 'center', ...Shadows.glass },
  checkCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  checkMark: { color: '#fff', fontSize: 30, fontWeight: 'bold' },
  verifiedTitle: { fontSize: 22, fontWeight: '800', color: Colors.navy, marginBottom: 25 },
  
  memberInfo: { width: '100%', alignItems: 'center' },
  portraitWrap: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#f1f5f9', overflow: 'hidden', borderWidth: 3, borderColor: Colors.gold, marginBottom: 16 },
  portrait: { width: '100%', height: '100%' },
  portraitPlaceholder: { fontSize: 50, textAlign: 'center', marginTop: 15 },
  memberName: { fontSize: 18, fontWeight: '700', color: Colors.navy, textAlign: 'center' },
  memberStatus: { fontSize: 12, fontWeight: '800', color: '#22c55e', marginTop: 4, letterSpacing: 1 },
  
  detailsList: { width: '100%', marginTop: 25, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  detailLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  detailValue: { fontSize: 13, color: Colors.navy, fontWeight: '700' },

  doneBtn: { backgroundColor: Colors.navy, width: '100%', padding: 15, borderRadius: 12, marginTop: 30, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontWeight: '700' },
  backToDash: { marginTop: 15 },
  backToDashText: { color: '#64748b', fontWeight: '600' },
});

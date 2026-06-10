// src/screens/FinancialHubStubScreen.js
// Stub screen for financial features not yet available on mobile.
// Directs users to the web app for advanced functionality.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, Radii } from '../styles/theme';

const WEB_APP_URL = 'https://app.ksji500.org/registrar/financials';

const PAGE_NAMES = {
  FinancialHubPayments: 'Record Monthly Payments',
  FinancialHubRates: 'Set Rates & Generate Bills',
  FinancialHubRatesHistory: 'Rate History & Comparison',
  FinancialHubDelinquency: 'Delinquency Aging Report',
  FinancialHubAudit: 'Financial Audit Trail',
};

export default function FinancialHubStubScreen({ navigation, route }) {
  const pageName = PAGE_NAMES[route?.name] || 'Feature';

  const openWebDashboard = async () => {
    try {
      await Linking.openURL(WEB_APP_URL);
    } catch (error) {
      // Fallback if device can't handle the URL scheme
      alert(`Please visit:\n\n${WEB_APP_URL}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navy} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{pageName}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.icon}>🚧</Text>
        <Text style={styles.heading}>Coming Soon on Mobile</Text>
        <Text style={styles.description}>
          This feature is available on the web dashboard. Please access it via your browser:
        </Text>

        <TouchableOpacity
          style={styles.webBtn}
          onPress={openWebDashboard}
        >
          <Text style={styles.webBtnText}>Open Web Dashboard →</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          You can also use the mobile app for viewing member financials and basic payment records.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  backBtn: { marginRight: 8 },
  backBtnText: { color: Colors.gold, fontWeight: '700' },
  title: { color: Colors.white, fontSize: 20, fontWeight: '800', flex: 1, textAlign: 'center' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl },
  icon: { fontSize: 56, marginBottom: Spacing.lg },
  heading: { color: Colors.white, fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: Spacing.md },
  description: { color: Colors.grey300, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl },
  webBtn: { backgroundColor: Colors.gold, paddingHorizontal: 32, paddingVertical: 16, borderRadius: Radii.md, marginBottom: Spacing.lg },
  webBtnText: { color: Colors.navy, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  note: { color: Colors.grey400, fontSize: 12, textAlign: 'center', fontStyle: 'italic' },
});

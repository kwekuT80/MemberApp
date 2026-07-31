// src/screens/WelfareHubScreen.js
// Dedicated Welfare Hub for React Native Mobile — metrics, contributions, benefit payouts, and categories rules.

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../db/supabase';
import { Colors } from '../styles/theme';
import { AuthContext } from '../navigation/AppNavigator';

const WELFARE_ROLES = ['super_admin', 'welfare_treasurer'];

export default function WelfareHubScreen({ navigation }) {
  const { role } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'contributions', 'disbursements', 'categories'
  const [summary, setSummary] = useState({
    netBalance: 0,
    totalContributions: 0,
    totalDisbursements: 0,
    categoriesCount: 0,
  });

  const [contributions, setContributions] = useState([]);
  const [disbursements, setDisbursements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [members, setMembers] = useState([]);

  // Modals for Actions
  const [modalContributionVisible, setModalContributionVisible] = useState(false);
  const [modalDisbursementVisible, setModalDisbursementVisible] = useState(false);

  // Form States
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [paymentMethodInput, setPaymentMethodInput] = useState('cash');

  useEffect(() => {
    if (WELFARE_ROLES.includes(role)) {
      fetchWelfareData();
      fetchMembers();
    }
  }, [role]);

  // Check authorization — non-welfare roles see access blocked message
  if (!WELFARE_ROLES.includes(role)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notAuthorizedContainer}>
          <Text style={styles.notAuthorizedIcon}>🔒</Text>
          <Text style={styles.notAuthorizedTitle}>Welfare Access Required</Text>
          <Text style={styles.notAuthorizedText}>
            This screen is only accessible to Welfare Officers, Welfare Treasurers, and Super Administrators.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Go Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  async function fetchMembers() {
    try {
      const { data } = await supabase
        .from('members')
        .select('id, first_name, surname, title, id_number')
        .order('surname', { ascending: true });
      if (data) setMembers(data);
    } catch (e) {
      console.warn('Failed to load members list for welfare:', e.message);
    }
  }

  async function fetchWelfareData() {
    setLoading(true);
    try {
      // 1. Categories
      const { data: catData } = await supabase
        .from('welfare_categories')
        .select('*')
        .order('name', { ascending: true });
      setCategories(catData || []);

      // 2. Contributions
      const { data: contribData } = await supabase
        .from('welfare_contributions')
        .select('*, members:member_id(first_name, surname, title)')
        .order('payment_date', { ascending: false })
        .limit(20);
      setContributions(contribData || []);

      // 3. Disbursements
      const { data: disbData } = await supabase
        .from('welfare_disbursements')
        .select('*, members:member_id(first_name, surname, title)')
        .order('disbursement_date', { ascending: false })
        .limit(20);
      setDisbursements(disbData || []);

      // Summary Totals
      const totalC = (contribData || []).reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
      const totalD = (disbData || []).reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

      setSummary({
        totalContributions: totalC,
        totalDisbursements: totalD,
        netBalance: totalC - totalD,
        categoriesCount: (catData || []).length,
      });

    } catch (err) {
      console.error('Error fetching welfare data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRecordContribution() {
    if (!selectedMemberId || !amountInput || isNaN(parseFloat(amountInput))) {
      Alert.alert('Validation Error', 'Please select a member and enter a valid amount.');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const currentYear = new Date().getFullYear();

      const { error } = await supabase.from('welfare_contributions').insert({
        member_id: selectedMemberId,
        amount: parseFloat(amountInput),
        payment_date: new Date().toISOString().split('T')[0],
        period_year: currentYear,
        payment_method: paymentMethodInput,
        notes: notesInput || null,
        recorded_by: user?.id || null,
      });

      if (error) throw error;

      Alert.alert('Success', 'Welfare contribution recorded successfully!');
      setModalContributionVisible(false);
      setAmountInput('');
      setNotesInput('');
      fetchWelfareData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to record contribution.');
    }
  }

  async function handleRecordDisbursement() {
    if (!selectedMemberId || !amountInput || isNaN(parseFloat(amountInput)) || !selectedCategoryId) {
      Alert.alert('Validation Error', 'Please select a member, category, and enter a valid payout amount.');
      return;
    }

    const catObj = categories.find(c => c.id === selectedCategoryId);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('welfare_disbursements').insert({
        member_id: selectedMemberId,
        category_id: selectedCategoryId,
        category_name: catObj?.name || 'General Welfare',
        amount: parseFloat(amountInput),
        disbursement_date: new Date().toISOString().split('T')[0],
        payment_method: paymentMethodInput,
        notes: notesInput || null,
        disbursed_by: user?.id || null,
      });

      if (error) throw error;

      Alert.alert('Success', 'Benefit payout recorded successfully!');
      setModalDisbursementVisible(false);
      setAmountInput('');
      setNotesInput('');
      fetchWelfareData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to record disbursement payout.');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A1628" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.headerBackBtnText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTextCol}>
          <Text style={styles.headerTitle}>🤝 Welfare Scheme Hub</Text>
          <Text style={styles.headerSubtitle}>Welfare Fund Oversight & Benefit Disbursals</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Loading Welfare Fund Ledgers...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Main Net Fund Balance Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardLabel}>NET WELFARE FUND BALANCE</Text>
            <Text style={styles.summaryCardValue}>
              GH₵ {summary.netBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <Text style={styles.statColLabel}>Total Dues Received</Text>
                <Text style={[styles.statColValue, { color: '#10B981' }]}>
                  +GH₵ {summary.totalContributions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.statColDivider} />
              <View style={styles.statCol}>
                <Text style={styles.statColLabel}>Total Benefits Paid</Text>
                <Text style={[styles.statColValue, { color: '#EF4444' }]}>
                  -GH₵ {summary.totalDisbursements.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Actions Row */}
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity
              style={styles.actionButtonPrimary}
              onPress={() => {
                if (members.length > 0) setSelectedMemberId(members[0].id);
                setModalContributionVisible(true);
              }}
            >
              <Text style={styles.actionButtonIcon}>💳</Text>
              <Text style={styles.actionButtonText}>Record Dues</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButtonSecondary}
              onPress={() => {
                if (members.length > 0) setSelectedMemberId(members[0].id);
                if (categories.length > 0) {
                  setSelectedCategoryId(categories[0].id);
                  setAmountInput(String(categories[0].default_amount));
                }
                setModalDisbursementVisible(true);
              }}
            >
              <Text style={styles.actionButtonIcon}>🎁</Text>
              <Text style={styles.actionButtonText}>Pay Benefit</Text>
            </TouchableOpacity>
          </View>

          {/* Nav Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'overview' && styles.tabBtnActive]}
              onPress={() => setActiveTab('overview')}
            >
              <Text style={[styles.tabBtnText, activeTab === 'overview' && styles.tabBtnTextActive]}>Overview</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'contributions' && styles.tabBtnActive]}
              onPress={() => setActiveTab('contributions')}
            >
              <Text style={[styles.tabBtnText, activeTab === 'contributions' && styles.tabBtnTextActive]}>Contributions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'disbursements' && styles.tabBtnActive]}
              onPress={() => setActiveTab('disbursements')}
            >
              <Text style={[styles.tabBtnText, activeTab === 'disbursements' && styles.tabBtnTextActive]}>Payouts</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'categories' && styles.tabBtnActive]}
              onPress={() => setActiveTab('categories')}
            >
              <Text style={[styles.tabBtnText, activeTab === 'categories' && styles.tabBtnTextActive]}>Rules</Text>
            </TouchableOpacity>
          </View>

          {/* Tab 1: Overview / Recent Ledgers */}
          {activeTab === 'overview' && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Recent Contributions Ledger</Text>
              {contributions.length === 0 ? (
                <Text style={styles.emptyText}>No welfare contributions recorded yet.</Text>
              ) : (
                contributions.slice(0, 5).map((item) => (
                  <View key={item.id} style={styles.ledgerItem}>
                    <View>
                      <Text style={styles.ledgerItemName}>
                        {item.members ? `${item.members.first_name} ${item.members.surname}` : 'Member'}
                      </Text>
                      <Text style={styles.ledgerItemDate}>
                        {item.payment_date} • {item.payment_method?.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.ledgerItemAmountPlus}>
                      +GH₵ {parseFloat(item.amount).toFixed(2)}
                    </Text>
                  </View>
                ))
              )}

              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Recent Benefit Disbursals</Text>
              {disbursements.length === 0 ? (
                <Text style={styles.emptyText}>No benefit disbursements recorded yet.</Text>
              ) : (
                disbursements.slice(0, 5).map((item) => (
                  <View key={item.id} style={styles.ledgerItem}>
                    <View>
                      <Text style={styles.ledgerItemName}>
                        {item.members ? `${item.members.first_name} ${item.members.surname}` : 'Member'}
                      </Text>
                      <Text style={styles.ledgerItemDate}>
                        {item.category_name} • {item.disbursement_date}
                      </Text>
                    </View>
                    <Text style={styles.ledgerItemAmountMinus}>
                      -GH₵ {parseFloat(item.amount).toFixed(2)}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}

          {/* Tab 2: Full Contributions */}
          {activeTab === 'contributions' && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>All Welfare Dues ({contributions.length})</Text>
              {contributions.map((item) => (
                <View key={item.id} style={styles.ledgerItem}>
                  <View>
                    <Text style={styles.ledgerItemName}>
                      {item.members ? `${item.members.first_name} ${item.members.surname}` : 'Member'}
                    </Text>
                    <Text style={styles.ledgerItemDate}>
                      {item.payment_date} ({item.period_year}) • Method: {item.payment_method}
                    </Text>
                    {item.notes ? <Text style={styles.ledgerItemNotes}>Note: {item.notes}</Text> : null}
                  </View>
                  <Text style={styles.ledgerItemAmountPlus}>
                    +GH₵ {parseFloat(item.amount).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Tab 3: Full Disbursements */}
          {activeTab === 'disbursements' && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>All Benefit Payouts ({disbursements.length})</Text>
              {disbursements.map((item) => (
                <View key={item.id} style={styles.ledgerItem}>
                  <View>
                    <Text style={styles.ledgerItemName}>
                      {item.members ? `${item.members.first_name} ${item.members.surname}` : 'Member'}
                    </Text>
                    <Text style={styles.ledgerItemDate}>
                      {item.category_name} • Disbursed: {item.disbursement_date}
                    </Text>
                    {item.notes ? <Text style={styles.ledgerItemNotes}>Resolution: {item.notes}</Text> : null}
                  </View>
                  <Text style={styles.ledgerItemAmountMinus}>
                    -GH₵ {parseFloat(item.amount).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          )}

              <Text style={styles.sectionTitle}>2020 Welfare Constitution Rules</Text>
              
              <View style={{ backgroundColor: '#1E293B', padding: 12, borderRadius: 8, marginBottom: 14, borderWidth: 1, borderColor: '#334155' }}>
                <Text style={{ color: '#F59E0B', fontWeight: '800', fontSize: 12, marginBottom: 4 }}>📜 CONSTITUTIONAL GUIDELINES (ARTICLE 2)</Text>
                <Text style={{ color: '#94A3B8', fontSize: 11, lineHeight: 16 }}>• Compulsory Monthly Contribution: GH₵ 25.00 / month</Text>
                <Text style={{ color: '#94A3B8', fontSize: 11, lineHeight: 16 }}>• Age Exemption: Members > 80 yrs exempt from compulsory dues</Text>
                <Text style={{ color: '#94A3B8', fontSize: 11, lineHeight: 16 }}>• Waiting Period: 6 months after joining before benefit eligibility</Text>
                <Text style={{ color: '#94A3B8', fontSize: 11, lineHeight: 16 }}>• Good Standing: Minimum 75% contributions paid to enjoy full benefits</Text>
              </View>

              {categories.map((cat) => (
                <View key={cat.id} style={styles.categoryCard}>
                  <View style={styles.categoryHeader}>
                    <Text style={styles.categoryName}>{cat.name}</Text>
                    <Text style={styles.categoryBadge}>
                      Default: GH₵ {parseFloat(cat.default_amount).toFixed(2)}
                    </Text>
                  </View>
                  {cat.description ? (
                    <Text style={styles.categoryDesc}>{cat.description}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Modal: Record Contribution */}
      <Modal
        visible={modalContributionVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalContributionVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💳 Record Welfare Dues</Text>

            <Text style={styles.inputLabel}>Member:</Text>
            <ScrollView horizontal style={styles.pickerScroll}>
              {members.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.memberChip, selectedMemberId === m.id && styles.memberChipActive]}
                  onPress={() => setSelectedMemberId(m.id)}
                >
                  <Text style={[styles.memberChipText, selectedMemberId === m.id && styles.memberChipTextActive]}>
                    {m.first_name} {m.surname}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Contribution Amount (GH₵):</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              placeholder="e.g. 100.00"
              placeholderTextColor="#64748B"
              value={amountInput}
              onChangeText={setAmountInput}
            />

            <Text style={styles.inputLabel}>Notes / Reference:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Dues for Q3 2026"
              placeholderTextColor="#64748B"
              value={notesInput}
              onChangeText={setNotesInput}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalContributionVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleRecordContribution}
              >
                <Text style={styles.submitBtnText}>Save Dues</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Record Disbursement */}
      <Modal
        visible={modalDisbursementVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalDisbursementVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🎁 Pay Welfare Benefit</Text>

            <Text style={styles.inputLabel}>Member Beneficiary:</Text>
            <ScrollView horizontal style={styles.pickerScroll}>
              {members.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.memberChip, selectedMemberId === m.id && styles.memberChipActive]}
                  onPress={() => setSelectedMemberId(m.id)}
                >
                  <Text style={[styles.memberChipText, selectedMemberId === m.id && styles.memberChipTextActive]}>
                    {m.first_name} {m.surname}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Benefit Category:</Text>
            <ScrollView horizontal style={styles.pickerScroll}>
              {categories.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.memberChip, selectedCategoryId === c.id && styles.memberChipActive]}
                  onPress={() => {
                    setSelectedCategoryId(c.id);
                    setAmountInput(String(c.default_amount));
                  }}
                >
                  <Text style={[styles.memberChipText, selectedCategoryId === c.id && styles.memberChipTextActive]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Payout Amount (GH₵):</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              placeholder="Amount"
              placeholderTextColor="#64748B"
              value={amountInput}
              onChangeText={setAmountInput}
            />

            <Text style={styles.inputLabel}>Approval Notes / Committee Resolution:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Executive Resolution #402"
              placeholderTextColor="#64748B"
              value={notesInput}
              onChangeText={setNotesInput}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalDisbursementVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#EF4444' }]}
                onPress={handleRecordDisbursement}
              >
                <Text style={styles.submitBtnText}>Disburse Payout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerBackBtn: {
    paddingRight: 16,
  },
  headerBackBtnText: {
    fontSize: 28,
    color: '#F59E0B',
    fontWeight: 'bold',
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#94A3B8',
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
  },
  summaryCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  summaryCardLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  summaryCardValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#F59E0B',
    marginVertical: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  statCol: {
    flex: 1,
  },
  statColLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  statColValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  statColDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#334155',
    marginHorizontal: 12,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButtonPrimary: {
    flex: 1,
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionButtonSecondary: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionButtonIcon: {
    fontSize: 16,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#334155',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  sectionContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
    fontStyle: 'italic',
  },
  ledgerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  ledgerItemName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  ledgerItemDate: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  ledgerItemNotes: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  ledgerItemAmountPlus: {
    color: '#10B981',
    fontWeight: '800',
    fontSize: 14,
  },
  ledgerItemAmountMinus: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 14,
  },
  categoryCard: {
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  categoryBadge: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryDesc: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 6,
  },
  notAuthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  notAuthorizedIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  notAuthorizedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  notAuthorizedText: {
    color: '#94A3B8',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#F59E0B',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#334155',
    fontSize: 14,
  },
  pickerScroll: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  memberChip: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  memberChipActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  memberChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  memberChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});

// src/screens/MemberFormScreen.js
// Member registration form — reads/writes via Supabase.
// Each logged-in user has exactly one member record linked to their account.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  StyleSheet, ActivityIndicator,
  Platform, StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getMyMemberRecord,
  getMemberRecord,
  saveMember,
  getRegions,
  getDegrees,
  getMilitary,
  saveMilitary,
} from '../db/memberQueries';
import { supabase } from '../db/supabase';
import {
  FormInput, DateInput, FormPicker, FormSwitch,
  SectionHeader, PrimaryButton, SubformLink,
} from '../components/FormComponents';
import { Colors, Spacing, Typography, Radii, Shadows } from '../styles/theme';

// const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

const EMPTY_MILITARY = {
  is_military: false,
  uniform_blessed_date: '',
  first_uniform_use_date: '',
  current_rank: '',
  commission: '',
};

const INITIAL_FORM_STATE = {
  title: '', surname: '', first_name: '', other_names: '',
  date_of_birth: '', birth_town: '', birth_region: '', nationality: '',
  home_town: '', home_region: '', residential_address: '', postal_address: '',
  phone: '', mobile: '', email: '', fathers_name: '', mothers_name: '',
  marital_status: '', emp_status: '', occupation: '', workplace: '',
  job_status: '', work_address: '', uniform_positions: '', date_joined: ''
};

const TABS = [
  { key: 'bio',        label: 'Bio',        icon: '👤' },
  { key: 'contact',    label: 'Contact',    icon: '📞' },
  { key: 'family',     label: 'Family',     icon: '👨‍👩‍👧' },
  { key: 'employment', label: 'Employment', icon: '💼' },
  { key: 'degrees',    label: 'Degrees',    icon: '🎓' },
  { key: 'military',   label: 'Military',   icon: '🪖' },
  { key: 'positions',  label: 'Positions',  icon: '📋' },
  { key: 'other',      label: 'Other',      icon: '📝' },
];

const TITLES     = ['Bro.', 'Sir', 'Rev.', 'Dr.', 'Prof.', 'N/B'];
const MARITAL    = ['Married', 'Single', 'Widowed', 'Religious', 'Separated'];
const EMP_STATUS = ['Employed', 'Self-employed', 'Unemployed', 'Student', 'Other'];

export default function MemberFormScreen({ route, navigation }) {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [regions, setRegions]     = useState([]);
  const [form, setForm]           = useState(INITIAL_FORM_STATE);
  const [military, setMilitary]   = useState(EMPTY_MILITARY);
  const [dirty, setDirty]         = useState(false);

  const loadMilitarySummary = useCallback(async (memberId) => {
    if (!memberId) {
      setMilitary(EMPTY_MILITARY);
      return;
    }
    try {
      const data = await getMilitary(memberId);
      setMilitary({ ...EMPTY_MILITARY, ...(data || {}) });
    } catch (e) {
      setMilitary(EMPTY_MILITARY);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // Read strictly: null means 'create', undefined means 'self', else 'edit target'
        const targetId = route.params?.memberId;
        const rgns = await getRegions();

        let record = null;
        if (targetId === null) {
          // Explicit null from FAB bypassing queries
        } else if (targetId !== undefined) {
          record = await getMemberRecord(targetId);
        } else {
          record = await getMyMemberRecord();
        }

        if (record) {
          // Sanitize: replace all null values with '' to prevent React 'Objects are not valid' errors
          const sanitized = Object.fromEntries(
            Object.entries(record).map(([k, v]) => [k, v === null ? '' : v])
          );
          setForm(sanitized);
          await loadMilitarySummary(record.id);
        } else if (targetId === null) {
          // Explicitly clear all nested fields to empty strings for controlled inputs
          setForm({
            title: '', surname: '', first_name: '', other_names: '',
            date_of_birth: '', birth_town: '', birth_region: '', nationality: '',
            home_town: '', home_region: '', residential_address: '', postal_address: '',
            phone: '', mobile: '', email: '', fathers_name: '', mothers_name: '',
            marital_status: '', emp_status: '', occupation: '', workplace: '',
            job_status: '', work_address: '', uniform_positions: '', date_joined: ''
          });
          setMilitary(EMPTY_MILITARY);
        }
        setRegions(rgns);
      } catch (e) {
        Alert.alert('Error', e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadMilitarySummary]);

  useFocusEffect(
    useCallback(() => {
      // Re-load data if we have an ID
      if (form.id) {
        loadMilitarySummary(form.id);
      }

      // If the 'Plus' button explicitly passed null memberId, reset the entire form to blank once.
      if (route.params?.memberId === null) {
        console.log('Resetting form for new member entry...');
        setForm(INITIAL_FORM_STATE);
        setMilitary(EMPTY_MILITARY);
        setDirty(false);
        // Clear the param so it doesn't trigger again on every sub-screen return
        navigation.setParams({ memberId: undefined });
      }
    }, [form.id, loadMilitarySummary, route.params?.memberId, navigation])
  );

  function set(field) {
    return (value) => {
      setForm(prev => ({ ...prev, [field]: value }));
      setDirty(true);
    };
  }

  function setMilitaryField(field) {
    return (value) => {
      setMilitary(prev => ({ ...prev, [field]: value }));
      setDirty(true);
    };
  }

  async function handleSave() {
    if (!form.surname?.trim()) {
      Alert.alert('Required', 'Please enter your surname before saving.');
      return;
    }
    setSaving(true);
    try {
      const saved = await saveMember(form);

      // Sanitize: replace all null values with '' to prevent React 'Objects are not valid' errors on re-render
      const sanitized = Object.fromEntries(
        Object.entries(saved).map(([k, v]) => [k, v === null ? '' : v])
      );

      await saveMilitary({
        member_id: sanitized.id,
        is_military: !!military.is_military,
        uniform_blessed_date: military.uniform_blessed_date || null,
        first_uniform_use_date: military.first_uniform_use_date || null,
        current_rank: military.current_rank || null,
        commission: military.commission || null,
      });

      setForm(sanitized);
      await loadMilitarySummary(sanitized.id);
      setDirty(false);
      Alert.alert('✓ Saved', 'Your member record has been saved.');
    } catch (e) {
      Alert.alert('Save Failed', e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        await supabase.auth.signOut();
      }},
    ]);
  }

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" color={Colors.navy} />
        <Text style={s.loadingText}>Loading your profile…</Text>
      </View>
    );
  }

  const memberId = form.id;
  const displayName = [form.title, form.first_name, form.surname].filter(Boolean).join(' ');

  return (
    <SafeAreaView style={s.screenWrapper} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navy} />

      <View style={s.header}>
        {navigation.canGoBack() && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
            <Text style={s.backIcon}>‹</Text>
          </TouchableOpacity>
        )}
        <View style={s.headerLeft}>
          <Text style={s.headerEyebrow}>
            {route.params?.memberId !== undefined ? 'Member Profile' : 'My Profile'}
          </Text>
          <Text style={s.headerName} numberOfLines={1}>
            {displayName || 'Complete your profile'}
          </Text>
        </View>
        <View style={s.headerRight}>
          {dirty && (
            <TouchableOpacity style={s.saveChip} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={Colors.navy} />
                : <Text style={s.saveChipText}>Save</Text>
              }
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleSignOut} style={s.signOutBtn}>
            <Text style={s.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabBar}
        contentContainerStyle={s.tabBarContent}
      >
        {TABS.map((tab, i) => {
          const active = i === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.tabItem, active && s.tabItemActive]}
              onPress={() => setActiveTab(i)}
              activeOpacity={0.7}
            >
              <Text style={[s.tabIcon, active && s.tabIconActive]}>{tab.icon}</Text>
              <Text style={[s.tabText, active && s.tabTextActive]}>{tab.label}</Text>
              {active && <View style={s.tabUnderline} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={s.body}
        contentContainerStyle={s.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 0 && <BioTab form={form} set={set} regions={regions} military={military} setMilitaryField={setMilitaryField} />}
        {activeTab === 1 && <ContactTab form={form} set={set} memberId={memberId} navigation={navigation} />}
        {activeTab === 2 && <FamilyTab form={form} set={set} memberId={memberId} navigation={navigation} />}
        {activeTab === 3 && <EmploymentTab form={form} set={set} />}
        {activeTab === 4 && <DegreesTab memberId={memberId} navigation={navigation} />}
        {activeTab === 5 && <MilitaryTab memberId={memberId} navigation={navigation} military={military} />}
        {activeTab === 6 && <PositionsTab memberId={memberId} navigation={navigation} />}
        {activeTab === 7 && <OtherTab form={form} set={set} />}

        <PrimaryButton
          title={saving ? 'Saving…' : (memberId ? 'Update Member Information' : 'Register New Member')}
          onPress={handleSave}
          disabled={saving}
          icon="💾"
          style={s.saveBtn}
        />
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function BioTab({ form, set, regions, military, setMilitaryField }) {
  return (
    <>
      <SectionHeader title="Personal Information" />
      <FormPicker label="Title" value={form.title} onValueChange={set('title')} items={TITLES} />
      <FormInput label="Surname" value={form.surname} onChangeText={set('surname')} required />
      <FormInput label="First Name" value={form.first_name} onChangeText={set('first_name')} required />
      <FormInput label="Other Name(s)" value={form.other_names} onChangeText={set('other_names')} />
      <DateInput label="Date of Birth" value={form.date_of_birth} onChangeText={set('date_of_birth')} />
      <SectionHeader title="Origin" />
      <FormInput label="Place of Birth (Town)" value={form.birth_town} onChangeText={set('birth_town')} />
      <FormPicker label="Place of Birth (Region)" value={form.birth_region} onValueChange={set('birth_region')} items={regions} />
      <FormInput label="Nationality" value={form.nationality} onChangeText={set('nationality')} />
      <FormInput label="Home Town" value={form.home_town} onChangeText={set('home_town')} />
      <FormPicker label="Home Region" value={form.home_region} onValueChange={set('home_region')} items={regions} />
      <SectionHeader title="Membership" />
      <DateInput label="Date Joined" value={form.date_joined} onChangeText={set('date_joined')} hint="Date you joined the Commandery" />
      <SectionHeader title="Uniformed Status" />
      <FormSwitch
        label="In Uniformed Rank?"
        value={!!military.is_military}
        onValueChange={setMilitaryField('is_military')}
        hint="Turn this on only for members who belong to the uniformed rank."
      />
    </>
  );
}

function ContactTab({ form, set, memberId, navigation }) {
  return (
    <>
      <SectionHeader title="Address" />
      <FormInput label="Residential Address" value={form.residential_address} onChangeText={set('residential_address')} multiline />
      <FormInput label="Postal Address" value={form.postal_address} onChangeText={set('postal_address')} />
      <SectionHeader title="Phone & Email" />
      <FormInput label="Phone No" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
      <FormInput label="Mobile No" value={form.mobile} onChangeText={set('mobile')} keyboardType="phone-pad" />
      <FormInput label="Email" value={form.email} onChangeText={set('email')} keyboardType="email-address" />
      {memberId ? (
        <>
          <SectionHeader title="Emergency Contacts" />
          <SubformLink icon="🚨" label="Manage Emergency Contacts" onPress={() => navigation.navigate('EmergencyContacts', { memberId })} />
        </>
      ) : <SaveFirstNote />}
    </>
  );
}

function FamilyTab({ form, set, memberId, navigation }) {
  const [spouse, setSpouse]     = useState(null);
  const [children, setChildren] = useState([]);
  const [loading, setLoading]   = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function loadFamily() {
        if (!memberId) return;
        setLoading(true);
        try {
          const { getSpouse, getChildren } = require('../db/memberQueries');
          const [s, c] = await Promise.all([getSpouse(memberId), getChildren(memberId)]);
          setSpouse(s);
          setChildren(c);
        } catch (e) {
          console.warn('Family load failed', e);
        } finally {
          setLoading(false);
        }
      }
      loadFamily();
    }, [memberId])
  );

  return (
    <>
      <SectionHeader title="Parents" />
      <FormInput label="Father's Name" value={form.fathers_name} onChangeText={set('fathers_name')} />
      <FormInput label="Mother's Name" value={form.mothers_name} onChangeText={set('mothers_name')} />
      
      <SectionHeader title="Marital Status" />
      <FormPicker label="Marital Status" value={form.marital_status} onValueChange={set('marital_status')} items={MARITAL} />

      {memberId ? (
        <>
          <SectionHeader title="Spouse Details" />
          {spouse?.spouse_name ? (
            <View style={s.degreeSummaryCard}>
              <Text style={s.degreeSummaryTitle}>{spouse.spouse_name}</Text>
              <View style={s.degreeSummaryRow}>
                <Text style={s.degreeSummaryLabel}>Religion:</Text>
                <Text style={s.degreeSummaryValue}>{spouse.spouse_denomination || '—'}</Text>
              </View>
              {spouse.auxiliary_number && (
                <View style={s.degreeSummaryRow}>
                  <Text style={s.degreeSummaryLabel}>Auxiliary:</Text>
                  <Text style={s.degreeSummaryValue}>#{spouse.auxiliary_number} ({spouse.auxiliary_name || 'SMM'})</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={s.summaryEmptyCard}>
              <Text style={s.summaryEmptyText}>No spouse details recorded.</Text>
            </View>
          )}
          <SubformLink icon="💍" label="Manage Spouse Details" onPress={() => navigation.navigate('Spouse', { memberId })} />

          <SectionHeader title="Children" />
          {children.length > 0 ? (
            children.map(c => (
              <View key={c.id} style={s.degreeSummaryCard}>
                <Text style={s.degreeSummaryTitle}>{c.child_name}</Text>
                <View style={s.degreeSummaryRow}>
                  <Text style={s.degreeSummaryLabel}>Born:</Text>
                  <Text style={s.degreeSummaryValue}>{c.birth_date || '—'} {c.birth_place ? `at ${c.birth_place}` : ''}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={s.summaryEmptyCard}>
              <Text style={s.summaryEmptyText}>No children recorded.</Text>
            </View>
          )}
          <SubformLink icon="👶" label="Manage Children" onPress={() => navigation.navigate('Children', { memberId })} />
        </>
      ) : <SaveFirstNote />}
    </>
  );
}

function EmploymentTab({ form, set }) {
  return (
    <>
      <SectionHeader title="Employment" />
      <FormPicker label="Employment Status" value={form.emp_status} onValueChange={set('emp_status')} items={EMP_STATUS} />
      <FormInput label="Occupation" value={form.occupation} onChangeText={set('occupation')} />
      <FormInput label="Workplace" value={form.workplace} onChangeText={set('workplace')} />
      <FormInput label="Job Status" value={form.job_status} onChangeText={set('job_status')} hint="Your specific role at your workplace" />
      <FormInput label="Work Address" value={form.work_address} onChangeText={set('work_address')} multiline />
    </>
  );
}

function DegreesTab({ memberId, navigation }) {
  const [degrees, setDegrees] = useState([]);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadDegreeSummary() {
        if (!memberId) return;
        setLoading(true);
        try {
          const data = await getDegrees(memberId);
          if (active) setDegrees(data || []);
        } catch (e) {
          console.warn('Degree fetch failed:', e.message);
          if (e.message?.includes('refresh_token_not_found') || e.message?.includes('Refresh Token: Refresh Token Not Found')) {
            console.log('Session expired, signing out...');
            supabase.auth.signOut();
          }
        } finally {
          if (active) setLoading(false);
        }
      }

      loadDegreeSummary();

      return () => {
        active = false;
      };
    }, [memberId])
  );

  if (!memberId) {
    return (
      <>
        <SectionHeader title="Degree Records" />
        <SaveFirstNote />
      </>
    );
  }

  return (
    <>
      <SectionHeader title="Degree Summary" />

      {loading ? (
        <View style={s.summaryLoadingWrap}>
          <ActivityIndicator size="small" color={Colors.navy} />
          <Text style={s.summaryLoadingText}>Loading degree summary…</Text>
        </View>
      ) : degrees.length === 0 ? (
        <View style={s.summaryEmptyCard}>
          <Text style={s.summaryEmptyTitle}>No degree records yet</Text>
          <Text style={s.summaryEmptyText}>
            Use “Manage Degree Records” below to add the member’s degrees, dates,
            and places of exemplification.
          </Text>
        </View>
      ) : (
        degrees.map((item) => (
          <View key={item.id} style={s.degreeSummaryCard}>
            <Text style={s.degreeSummaryTitle}>{item.degree_type || 'Degree'}</Text>
            <View style={s.degreeSummaryRow}>
              <Text style={s.degreeSummaryLabel}>Place:</Text>
              <Text style={s.degreeSummaryValue}>{item.degree_place || '—'}</Text>
            </View>
            <View style={s.degreeSummaryRow}>
              <Text style={s.degreeSummaryLabel}>Date:</Text>
              <Text style={s.degreeSummaryValue}>{item.degree_date || '—'}</Text>
            </View>
          </View>
        ))
      )}

      <SectionHeader title="Degree Records" />
      <SubformLink
        icon="🎓"
        label="Manage Degree Records"
        onPress={() => navigation.navigate('Degrees', { memberId })}
      />
    </>
  );
}

function MilitaryTab({ memberId, navigation, military }) {
  if (!memberId) {
    return (
      <>
        <SectionHeader title="Uniformed Rank" />
        <SaveFirstNote />
      </>
    );
  }

  const enabled = !!military.is_military;

  return (
    <>
      <SectionHeader title="Uniformed Rank" />

      <View style={s.summaryEmptyCard}>
        <Text style={s.summaryEmptyTitle}>Current Rank</Text>
        <View style={s.degreeSummaryRow}>
          <Text style={s.degreeSummaryLabel}>Rank:</Text>
          <Text style={s.degreeSummaryValue}>{military.current_rank || '—'}</Text>
        </View>
        <View style={s.degreeSummaryRow}>
          <Text style={s.degreeSummaryLabel}>Date:</Text>
          <Text style={s.degreeSummaryValue}>{military.commission || '—'}</Text>
        </View>
      </View>

      <SectionHeader title="Uniformed Rank Records" />
      <TouchableOpacity
        activeOpacity={enabled ? 0.85 : 1}
        disabled={!enabled}
        style={[s.subformCard, !enabled && s.subformCardDisabled]}
        onPress={() => navigation.navigate('Military', { memberId })}
      >
        <Text style={[s.subformCardIcon, !enabled && s.subformCardIconDisabled]}>🪖</Text>
        <View style={s.subformCardTextWrap}>
          <Text style={[s.subformCardTitle, !enabled && s.subformCardTitleDisabled]}>Manage Uniformed Rank Records</Text>
          <Text style={[s.subformCardSub, !enabled && s.subformCardSubDisabled]}>
            {enabled ? 'Add commission history and update the current rank.' : 'Turn on “In Uniformed Rank?” in Bio to enable this section.'}
          </Text>
        </View>
      </TouchableOpacity>
    </>
  );
}

function PositionsTab({ memberId, navigation }) {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function loadPositions() {
        if (!memberId) return;
        setLoading(true);
        try {
          const { getPositions } = require('../db/memberQueries');
          const data = await getPositions(memberId);
          setPositions(data || []);
        } catch (e) {
          console.warn('Positions load failed', e);
        } finally {
          setLoading(false);
        }
      }
      loadPositions();
    }, [memberId])
  );

  if (!memberId) return <><SectionHeader title="Positions Held" /><SaveFirstNote /></>;
  
  return (
    <>
      <SectionHeader title="Leadership Journey" />
      {positions.length > 0 ? (
        positions.map((p, index) => (
          <View key={p.id} style={s.degreeSummaryCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={s.degreeSummaryTitle}>{p.position_title}</Text>
              {index === 0 && <View style={s.positionBadge}><Text style={s.positionBadgeText}>Latest</Text></View>}
            </View>
            <View style={s.degreeSummaryRow}>
              <Text style={s.degreeSummaryLabel}>Period:</Text>
              <Text style={s.degreeSummaryValue}>
                {p.date_from || '—'} to {p.date_to || 'Present'}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <View style={s.summaryEmptyCard}>
          <Text style={s.summaryEmptyText}>No leadership positions recorded.</Text>
        </View>
      )}
      
      <SectionHeader title="Manage Records" />
      <SubformLink icon="📋" label="Manage Positions" onPress={() => navigation.navigate('Positions', { memberId })} />
    </>
  );
}

function OtherTab({ form, set }) {
  return (
    <>
      <SectionHeader title="Other Details" />
      <FormInput label="Uniform, Cadet & Commandery Positions" value={form.uniform_positions} onChangeText={set('uniform_positions')} multiline />
    </>
  );
}

function SaveFirstNote() {
  return (
    <View style={s.saveNote}>
      <Text style={s.saveNoteIcon}>💡</Text>
      <Text style={s.saveNoteText}>Save your record first to unlock this section.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screenWrapper: { flex: 1, backgroundColor: Colors.offWhite },
  loadingWrap:   { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.offWhite },
  loadingText:   { marginTop: Spacing.md, color: Colors.grey400 },

  header: {
    backgroundColor: Colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.navyLight,
  },
  headerLeft:    { flex: 1, marginLeft: Spacing.xs },
  headerEyebrow: { color: Colors.gold, fontSize: Typography.sizes.xs, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' },
  headerName:    { color: Colors.white, fontSize: Typography.sizes.lg, fontWeight: '700', marginTop: 2 },
  headerRight:   { flexDirection: 'row', alignItems: 'center' },

  backBtn:  { paddingRight: Spacing.md, paddingLeft: Spacing.xs, paddingVertical: 4 },
  backIcon: { color: Colors.gold, fontSize: 34, fontWeight: '300', lineHeight: 34 },

  saveChip: {
    backgroundColor: Colors.gold,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    marginRight: Spacing.sm,
    minWidth: 56,
    alignItems: 'center',
  },
  saveChipText: { color: Colors.navy, fontWeight: '700', fontSize: Typography.sizes.sm },

  signOutBtn:  { paddingHorizontal: Spacing.sm, paddingVertical: 6 },
  signOutText: { color: Colors.grey300, fontSize: Typography.sizes.sm, fontWeight: '600' },

  tabBar:        { backgroundColor: Colors.navy, flexGrow: 0, maxHeight: 64 },
  tabBarContent: { paddingHorizontal: Spacing.sm },
  tabItem: {
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    position: 'relative', minWidth: 72,
  },
  tabIcon:      { fontSize: 16, marginBottom: 2, opacity: 0.5 },
  tabIconActive:{ opacity: 1 },
  tabText:      { color: Colors.grey400, fontSize: Typography.sizes.xs, fontWeight: '600', letterSpacing: 0.3 },
  tabTextActive:{ color: Colors.gold },
  tabUnderline: { position: 'absolute', bottom: 0, left: Spacing.sm, right: Spacing.sm, height: 2.5, backgroundColor: Colors.gold, borderRadius: 2 },

  body:        { flex: 1 },
  bodyContent: { padding: Spacing.lg },
  saveBtn:     { marginTop: Spacing.xl },

  summaryLoadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    ...Shadows.card,
  },
  summaryLoadingText: {
    marginLeft: Spacing.sm,
    color: Colors.grey400,
    fontSize: Typography.sizes.sm,
  },

  summaryEmptyCard: {
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
    ...Shadows.card,
  },
  summaryEmptyTitle: {
    color: Colors.navy,
    fontSize: Typography.sizes.md,
    fontWeight: '700',
    marginBottom: 6,
  },
  summaryEmptyText: {
    color: Colors.grey400,
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
  },

  degreeSummaryCard: {
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
    ...Shadows.card,
  },
  degreeSummaryTitle: {
    color: Colors.navy,
    fontSize: Typography.sizes.md,
    fontWeight: '800',
    marginBottom: Spacing.sm,
  },
  degreeSummaryRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  degreeSummaryLabel: {
    width: 52,
    color: Colors.grey400,
    fontSize: Typography.sizes.sm,
    fontWeight: '700',
  },
  degreeSummaryValue: {
    flex: 1,
    color: Colors.grey700,
    fontSize: Typography.sizes.sm,
  },
  positionBadge: {
    backgroundColor: Colors.goldFaint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: Colors.goldPale,
  },
  positionBadgeText: {
    fontSize: 10,
    color: '#856404',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  subformCard: {
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.card,
  },
  subformCardDisabled: {
    backgroundColor: Colors.grey100,
  },
  subformCardIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  subformCardIconDisabled: {
    opacity: 0.45,
  },
  subformCardTextWrap: {
    flex: 1,
  },
  subformCardTitle: {
    color: Colors.navy,
    fontSize: Typography.sizes.md,
    fontWeight: '700',
  },
  subformCardTitleDisabled: {
    color: Colors.grey400,
  },
  subformCardSub: {
    color: Colors.grey400,
    fontSize: Typography.sizes.sm,
    marginTop: 2,
    lineHeight: 20,
  },
  subformCardSubDisabled: {
    color: Colors.grey300,
  },

  saveNote: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.goldFaint,
    borderRadius: Radii.md, padding: Spacing.md,
    marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.goldPale,
  },
  saveNoteIcon: { fontSize: 18, marginRight: Spacing.sm },
  saveNoteText: { flex: 1, color: Colors.grey600, fontSize: Typography.sizes.sm, lineHeight: 20 },
});

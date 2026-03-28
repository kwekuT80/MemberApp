// src/screens/MemberFormScreen.js
// Member registration form — reads/writes via Supabase.
// Each logged-in user has exactly one member record linked to their account.

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  StyleSheet, SafeAreaView, ActivityIndicator,
  Platform, StatusBar,
} from 'react-native';
import { getMyMemberRecord, saveMember, getRegions, getDegrees } from '../db/memberQueries';
import { supabase } from '../db/supabase';
import {
  FormInput, DateInput, FormPicker, FormSwitch,
  SectionHeader, PrimaryButton, SecondaryButton, SubformLink,
} from '../components/FormComponents';
import { Colors, Spacing, Typography, Radii, Shadows } from '../styles/theme';

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

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

const TITLES     = ['Bro.', 'Sir', 'Rev.', 'Dr.', 'Prof.', 'Mr.', 'Mrs.', 'Ms.'];
const MARITAL    = ['Married', 'Single', 'Widowed', 'Religious', 'Separated'];
const EMP_STATUS = ['Employed', 'Self-employed', 'Unemployed', 'Student', 'Other'];

export default function MemberFormScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [regions, setRegions]     = useState([]);
  const [form, setForm]           = useState({});
  const [dirty, setDirty]         = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [record, rgns] = await Promise.all([getMyMemberRecord(), getRegions()]);
        if (record) setForm(record);
        setRegions(rgns);
      } catch (e) {
        Alert.alert('Error', e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function set(field) {
    return (value) => {
      setForm(prev => ({ ...prev, [field]: value }));
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
      setForm(saved);
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
    <View style={s.screenWrapper}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navy} />

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.headerEyebrow}>My Profile</Text>
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

      {/* ── Tab bar ── */}
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

      {/* ── Content ── */}
      <ScrollView
        style={s.body}
        contentContainerStyle={s.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 0 && <BioTab        form={form} set={set} regions={regions} />}
        {activeTab === 1 && <ContactTab    form={form} set={set} memberId={memberId} navigation={navigation} />}
        {activeTab === 2 && <FamilyTab     form={form} set={set} memberId={memberId} navigation={navigation} />}
        {activeTab === 3 && <EmploymentTab form={form} set={set} />}
        {activeTab === 4 && <DegreesTab    memberId={memberId} navigation={navigation} />}
        {activeTab === 5 && <MilitaryTab   memberId={memberId} navigation={navigation} />}
        {activeTab === 6 && <PositionsTab  memberId={memberId} navigation={navigation} />}
        {activeTab === 7 && <OtherTab      form={form} set={set} />}

        <PrimaryButton
          title={saving ? 'Saving…' : 'Save My Record'}
          onPress={handleSave}
          disabled={saving}
          icon="💾"
          style={s.saveBtn}
        />
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

// ── Tabs ───────────────────────────────────────────────────────────────────────

function BioTab({ form, set, regions }) {
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
  return (
    <>
      <SectionHeader title="Parents" />
      <FormInput label="Father's Name" value={form.fathers_name} onChangeText={set('fathers_name')} />
      <FormInput label="Mother's Name" value={form.mothers_name} onChangeText={set('mothers_name')} />
      <SectionHeader title="Marital Status" />
      <FormPicker label="Marital Status" value={form.marital_status} onValueChange={set('marital_status')} items={MARITAL} />
      {memberId ? (
        <>
          <SectionHeader title="Spouse" />
          <SubformLink icon="💍" label="Manage Spouse Details" onPress={() => navigation.navigate('Spouse', { memberId })} />
          <SectionHeader title="Children" />
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

  useEffect(() => {
    let active = true;

    async function loadDegreeSummary() {
      if (!memberId) return;
      setLoading(true);
      try {
        const data = await getDegrees(memberId);
        if (active) setDegrees(data || []);
      } catch (e) {
        Alert.alert('Error', e.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDegreeSummary();

    return () => {
      active = false;
    };
  }, [memberId]);

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
            <Text style={s.degreeSummaryTitle}>
              {item.degree_type || 'Degree'}
            </Text>

            <View style={s.degreeSummaryRow}>
              <Text style={s.degreeSummaryLabel}>Place:</Text>
              <Text style={s.degreeSummaryValue}>
                {item.degree_place || '—'}
              </Text>
            </View>

            <View style={s.degreeSummaryRow}>
              <Text style={s.degreeSummaryLabel}>Date:</Text>
              <Text style={s.degreeSummaryValue}>
                {item.degree_date || '—'}
              </Text>
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

function MilitaryTab({ memberId, navigation }) {
  if (!memberId) return <><SectionHeader title="Military Service" /><SaveFirstNote /></>;
  return (
    <>
      <SectionHeader title="Military Service" />
      <SubformLink icon="🪖" label="Manage Military Details" onPress={() => navigation.navigate('Military', { memberId })} />
    </>
  );
}

function PositionsTab({ memberId, navigation }) {
  if (!memberId) return <><SectionHeader title="Positions Held" /><SaveFirstNote /></>;
  return (
    <>
      <SectionHeader title="Positions Held" />
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
  screenWrapper: { flex: 1, backgroundColor: Colors.offWhite, paddingTop: STATUS_BAR_HEIGHT },
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
  headerLeft:    { flex: 1 },
  headerEyebrow: { color: Colors.gold, fontSize: Typography.sizes.xs, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' },
  headerName:    { color: Colors.white, fontSize: Typography.sizes.lg, fontWeight: '700', marginTop: 2 },
  headerRight:   { flexDirection: 'row', alignItems: 'center' },

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

  saveNote: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.goldFaint,
    borderRadius: Radii.md, padding: Spacing.md,
    marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.goldPale,
  },
  saveNoteIcon: { fontSize: 18, marginRight: Spacing.sm },
  saveNoteText: { flex: 1, color: Colors.grey600, fontSize: Typography.sizes.sm, lineHeight: 20 },
});

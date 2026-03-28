// src/screens/SubformScreens.js
// FIXED: Safe area handling, header visibility, and scroll padding throughout.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  StyleSheet, SafeAreaView, ActivityIndicator, Platform,
  StatusBar, KeyboardAvoidingView,
} from 'react-native';
import {
  getChildren, saveChild, deleteChild,
  getPositions, savePosition, deletePosition,
  getEmergencyContacts, saveEmergencyContact, deleteEmergencyContact,
  getMilitary, saveMilitary,
  getDegrees, saveDegree, deleteDegree, getDegreeTypes,
  getSpouse, saveSpouse,
} from '../db/memberQueries';
import {
  FormInput, DateInput, FormPicker, FormSwitch,
  SectionHeader, PrimaryButton, SecondaryButton,
  EmptyState, ListCard,
} from '../components/FormComponents';
import { Colors, Spacing, Typography, Radii, Shadows } from '../styles/theme';

// Height of Android status bar — used to push headers down on Android
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

// ════════════════════════════════════════════════════════════════════
// CHILDREN
// ════════════════════════════════════════════════════════════════════

export function ChildrenScreen({ route, navigation }) {
  const { memberId } = route.params;
  const [items, setItems]     = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setItems(await getChildren(memberId));
    setLoading(false);
  }, [memberId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    try {
      await saveChild({ ...editing, MemberID: memberId });
      setEditing(null);
      load();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  async function handleDelete() {
    Alert.alert('Delete Child', 'Remove this record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteChild(editing.ID);
        setEditing(null);
        load();
      }},
    ]);
  }

  if (editing !== null) {
    return (
      <SubformEditor
        title={editing.ID ? 'Edit Child' : 'New Child'}
        onBack={() => setEditing(null)}
        onSave={handleSave}
        onDelete={editing.ID ? handleDelete : null}
      >
        <FormInput label="Child Name" value={editing.ChildName} onChangeText={v => setEditing(e => ({ ...e, ChildName: v }))} required />
        <DateInput label="Birth Date" value={editing.BirthDate} onChangeText={v => setEditing(e => ({ ...e, BirthDate: v }))} />
        <FormInput label="Birth Place" value={editing.BirthPlace} onChangeText={v => setEditing(e => ({ ...e, BirthPlace: v }))} />
      </SubformEditor>
    );
  }

  return (
    <SubformList
      title="Children"
      icon="👶"
      onBack={() => navigation.goBack()}
      onAdd={() => setEditing({ ChildName: '', BirthDate: '', BirthPlace: '' })}
      loading={loading}
      emptyIcon="👶"
      emptyTitle="No children recorded"
      emptyMessage="Tap '+ Add' to add a child's details."
    >
      {items.map(item => (
        <ListCard key={item.ID} onPress={() => setEditing({ ...item })}>
          <Text style={s.itemTitle}>{item.ChildName || '(No Name)'}</Text>
          <Text style={s.itemSub}>{[item.BirthDate, item.BirthPlace].filter(Boolean).join('  ·  ')}</Text>
        </ListCard>
      ))}
    </SubformList>
  );
}

// ════════════════════════════════════════════════════════════════════
// POSITIONS
// ════════════════════════════════════════════════════════════════════

export function PositionsScreen({ route, navigation }) {
  const { memberId } = route.params;
  const [items, setItems]     = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setItems(await getPositions(memberId));
    setLoading(false);
  }, [memberId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    try {
      await savePosition({ ...editing, MemberID: memberId });
      setEditing(null);
      load();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  async function handleDelete() {
    Alert.alert('Delete Position', 'Remove this record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deletePosition(editing.ID);
        setEditing(null);
        load();
      }},
    ]);
  }

  if (editing !== null) {
    return (
      <SubformEditor
        title={editing.ID ? 'Edit Position' : 'New Position'}
        onBack={() => setEditing(null)}
        onSave={handleSave}
        onDelete={editing.ID ? handleDelete : null}
      >
        <FormInput label="Position Title" value={editing.PositionTitle} onChangeText={v => setEditing(e => ({ ...e, PositionTitle: v }))} required />
        <DateInput label="From" value={editing.DateFrom} onChangeText={v => setEditing(e => ({ ...e, DateFrom: v }))} />
        <DateInput label="To" value={editing.DateTo} onChangeText={v => setEditing(e => ({ ...e, DateTo: v }))} />
      </SubformEditor>
    );
  }

  return (
    <SubformList
      title="Positions"
      icon="📋"
      onBack={() => navigation.goBack()}
      onAdd={() => setEditing({ PositionTitle: '', DateFrom: '', DateTo: '' })}
      loading={loading}
      emptyIcon="📋"
      emptyTitle="No positions recorded"
      emptyMessage="Tap '+ Add' to record a position held."
    >
      {items.map(item => (
        <ListCard key={item.ID} onPress={() => setEditing({ ...item })}>
          <Text style={s.itemTitle}>{item.PositionTitle || '(No Title)'}</Text>
          <Text style={s.itemSub}>{[item.DateFrom, item.DateTo].filter(Boolean).join(' – ')}</Text>
        </ListCard>
      ))}
    </SubformList>
  );
}

// ════════════════════════════════════════════════════════════════════
// EMERGENCY CONTACTS
// ════════════════════════════════════════════════════════════════════

export function EmergencyContactsScreen({ route, navigation }) {
  const { memberId } = route.params;
  const [items, setItems]     = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setItems(await getEmergencyContacts(memberId));
    setLoading(false);
  }, [memberId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    try {
      await saveEmergencyContact({ ...editing, MemberID: memberId });
      setEditing(null);
      load();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  async function handleDelete() {
    Alert.alert('Delete Contact', 'Remove this emergency contact?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteEmergencyContact(editing.ID);
        setEditing(null);
        load();
      }},
    ]);
  }

  if (editing !== null) {
    return (
      <SubformEditor
        title={editing.ID ? 'Edit Contact' : 'New Contact'}
        onBack={() => setEditing(null)}
        onSave={handleSave}
        onDelete={editing.ID ? handleDelete : null}
      >
        <FormInput label="Name" value={editing.ContactName} onChangeText={v => setEditing(e => ({ ...e, ContactName: v }))} required />
        <FormInput label="Relationship" value={editing.Relationship} onChangeText={v => setEditing(e => ({ ...e, Relationship: v }))} />
        <FormInput label="Phone 1" value={editing.Phone1} onChangeText={v => setEditing(e => ({ ...e, Phone1: v }))} keyboardType="phone-pad" />
        <FormInput label="Phone 2" value={editing.Phone2} onChangeText={v => setEditing(e => ({ ...e, Phone2: v }))} keyboardType="phone-pad" />
      </SubformEditor>
    );
  }

  return (
    <SubformList
      title="Emergency Contacts"
      icon="🚨"
      onBack={() => navigation.goBack()}
      onAdd={() => setEditing({ ContactName: '', Relationship: '', Phone1: '', Phone2: '' })}
      loading={loading}
      emptyIcon="🚨"
      emptyTitle="No emergency contacts"
      emptyMessage="Tap '+ Add' to add an emergency contact."
    >
      {items.map(item => (
        <ListCard key={item.ID} onPress={() => setEditing({ ...item })}>
          <Text style={s.itemTitle}>{item.ContactName || '(No Name)'}</Text>
          <View style={s.itemRow}>
            {item.Relationship ? <Text style={s.itemBadge}>{item.Relationship}</Text> : null}
            {item.Phone1 ? <Text style={s.itemSub}>{item.Phone1}</Text> : null}
          </View>
        </ListCard>
      ))}
    </SubformList>
  );
}

// ════════════════════════════════════════════════════════════════════
// MILITARY
// ════════════════════════════════════════════════════════════════════

export function MilitaryScreen({ route, navigation }) {
  const { memberId } = route.params;
  const [data, setData]       = useState({ MemberID: memberId, IsMilitary: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    (async () => {
      const mil = await getMilitary(memberId);
      setData(mil);
      setLoading(false);
    })();
  }, [memberId]);

  function set(field) { return v => setData(d => ({ ...d, [field]: v })); }

  async function handleSave() {
    setSaving(true);
    try {
      await saveMilitary(data);
      Alert.alert('✓ Saved', 'Military details saved.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingView />;

  return (
    <View style={s.screenWrapper}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navy} />
      <SubformHeader title="Military Details" icon="🪖" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          <SectionHeader title="Service Status" />
          <FormSwitch
            label="In the Military?"
            value={!!data.IsMilitary}
            onValueChange={v => setData(d => ({ ...d, IsMilitary: v ? 1 : 0 }))}
          />
          <SectionHeader title="Uniform & Commission" />
          <DateInput label="Uniform Blessed Date"   value={data.UniformBlessedDate}  onChangeText={set('UniformBlessedDate')} />
          <DateInput label="First Uniform Use Date" value={data.FirstUniformUseDate} onChangeText={set('FirstUniformUseDate')} />
          <FormInput label="Current Rank"           value={data.CurrentRank}         onChangeText={set('CurrentRank')} />
          <FormInput label="Date of Commission"     value={data.Commission}          onChangeText={set('Commission')} />
          <PrimaryButton
            title={saving ? 'Saving…' : 'Save Military Details'}
            icon="💾"
            onPress={handleSave}
            disabled={saving}
            style={s.saveBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════
// DEGREES
// ════════════════════════════════════════════════════════════════════

export function DegreesScreen({ route, navigation }) {
  const { memberId } = route.params;
  const [items, setItems]       = useState([]);
  const [editing, setEditing]   = useState(null);
  const [degreeTypes, setTypes] = useState([]);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [degs, types] = await Promise.all([getDegrees(memberId), getDegreeTypes()]);
    setItems(degs);
    setTypes(types);
    setLoading(false);
  }, [memberId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    try {
      await saveDegree({ ...editing, MemberID: memberId });
      setEditing(null);
      load();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  async function handleDelete() {
    Alert.alert('Delete Degree', 'Remove this degree record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteDegree(editing.ID);
        setEditing(null);
        load();
      }},
    ]);
  }

  if (editing !== null) {
    return (
      <SubformEditor
        title={editing.ID ? 'Edit Degree' : 'New Degree'}
        onBack={() => setEditing(null)}
        onSave={handleSave}
        onDelete={editing.ID ? handleDelete : null}
      >
        <FormPicker label="Degree Type" value={editing.DegreeType} onValueChange={v => setEditing(e => ({ ...e, DegreeType: v }))} items={degreeTypes} required />
        <DateInput  label="Date"  value={editing.DegreeDate}  onChangeText={v => setEditing(e => ({ ...e, DegreeDate: v }))} />
        <FormInput  label="Place" value={editing.DegreePlace} onChangeText={v => setEditing(e => ({ ...e, DegreePlace: v }))} />
      </SubformEditor>
    );
  }

  return (
    <SubformList
      title="Degree Records"
      icon="🎓"
      onBack={() => navigation.goBack()}
      onAdd={() => setEditing({ DegreeType: '', DegreeDate: '', DegreePlace: '' })}
      loading={loading}
      emptyIcon="🎓"
      emptyTitle="No degree records"
      emptyMessage="Tap '+ Add' to record a degree."
    >
      {items.map(item => (
        <ListCard key={item.ID} onPress={() => setEditing({ ...item })}>
          <Text style={s.itemTitle}>{item.DegreeType || '(No Type)'}</Text>
          <Text style={s.itemSub}>{[item.DegreeDate, item.DegreePlace].filter(Boolean).join('  ·  ')}</Text>
        </ListCard>
      ))}
    </SubformList>
  );
}

// ════════════════════════════════════════════════════════════════════
// SPOUSE
// ════════════════════════════════════════════════════════════════════

export function SpouseScreen({ route, navigation }) {
  const { memberId } = route.params;
  const [data, setData]       = useState({ MemberID: memberId });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    (async () => {
      const sp = await getSpouse(memberId);
      setData(sp);
      setLoading(false);
    })();
  }, [memberId]);

  function set(field) { return v => setData(d => ({ ...d, [field]: v })); }

  async function handleSave() {
    setSaving(true);
    try {
      await saveSpouse(data);
      Alert.alert('✓ Saved', 'Spouse details saved.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingView />;

  return (
    <View style={s.screenWrapper}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navy} />
      <SubformHeader title="Spouse Details" icon="💍" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          <SectionHeader title="Personal" />
          <FormInput label="Name"          value={data.SpouseName}         onChangeText={set('SpouseName')} />
          <DateInput label="Date of Birth" value={data.SpouseDOB}          onChangeText={set('SpouseDOB')} />
          <FormInput label="Nationality"   value={data.SpouseNationality}  onChangeText={set('SpouseNationality')} />
          <FormInput label="Denomination"  value={data.SpouseDenomination} onChangeText={set('SpouseDenomination')} />
          <SectionHeader title="Membership" />
          <FormSwitch
            label="Is Sister?"
            value={!!data.SpouseIsSister}
            onValueChange={v => setData(d => ({ ...d, SpouseIsSister: v ? 1 : 0 }))}
            hint="Is the spouse a member of the Auxiliary?"
          />
          <FormInput label="Parish"           value={data.SpouseParish}    onChangeText={set('SpouseParish')} />
          <FormInput label="Auxiliary Name"   value={data.AuxiliaryName}   onChangeText={set('AuxiliaryName')} />
          <FormInput label="Auxiliary Number" value={data.AuxiliaryNumber} onChangeText={set('AuxiliaryNumber')} />
          <SectionHeader title="Notes" />
          <FormInput label="Notes" value={data.SpouseNotes} onChangeText={set('SpouseNotes')} multiline />
          <PrimaryButton
            title={saving ? 'Saving…' : 'Save Spouse Details'}
            icon="💾"
            onPress={handleSave}
            disabled={saving}
            style={s.saveBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════
// SHARED LAYOUT COMPONENTS
// ════════════════════════════════════════════════════════════════════

function SubformList({ title, icon, onBack, onAdd, loading, emptyIcon, emptyTitle, emptyMessage, children }) {
  const count = React.Children.count(children);
  return (
    <View style={s.screenWrapper}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navy} />
      <SubformHeader
        title={title}
        icon={icon}
        onBack={onBack}
        rightAction={{ label: '+ Add', onPress: onAdd }}
      />
      {loading ? (
        <LoadingView />
      ) : (
        <ScrollView
          contentContainerStyle={[s.listContent, count === 0 && s.listContentEmpty]}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          {count === 0
            ? <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} actionLabel="+ Add" onAction={onAdd} />
            : children
          }
          {/* Extra padding at the bottom so last card is never hidden */}
          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      )}

      {/* Floating Add button — always visible at the bottom */}
      {!loading && (
        <TouchableOpacity style={s.fab} onPress={onAdd} activeOpacity={0.85}>
          <Text style={s.fabText}>＋ Add New</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function SubformEditor({ title, onBack, onSave, onDelete, children }) {
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={s.screenWrapper}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navy} />
      <SubformHeader title={title} onBack={onBack} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          {children}
          <View style={s.editActions}>
            <PrimaryButton
              title={saving ? 'Saving…' : 'Save'}
              icon="💾"
              onPress={handleSave}
              disabled={saving}
              style={s.editSaveBtn}
            />
            {onDelete && (
              <SecondaryButton
                title="Delete"
                icon="🗑"
                onPress={onDelete}
                danger
                style={s.editDeleteBtn}
              />
            )}
          </View>
          {/* Bottom padding so buttons are never hidden by keyboard */}
          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Header — FIXED: accounts for Android status bar height ────────────────────

function SubformHeader({ title, icon, onBack, rightAction }) {
  return (
    <View style={s.subHeader}>
      {/* Back button — large hit area */}
      <TouchableOpacity
        onPress={onBack}
        style={s.backBtn}
        hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
      >
        <Text style={s.backText}>‹ Back</Text>
      </TouchableOpacity>

      <View style={s.subHeaderCenter}>
        {icon ? <Text style={s.subHeaderIcon}>{icon}  </Text> : null}
        <Text style={s.subHeaderTitle} numberOfLines={1}>{title}</Text>
      </View>

      {rightAction ? (
        <TouchableOpacity
          onPress={rightAction.onPress}
          style={s.addBtn}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        >
          <Text style={s.addBtnText}>{rightAction.label}</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ minWidth: 70 }} />
      )}
    </View>
  );
}

function LoadingView() {
  return (
    <View style={s.loadingWrap}>
      <ActivityIndicator size="large" color={Colors.navy} />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // screenWrapper replaces SafeAreaView — handles status bar manually
  // so the navy header sits flush under the status bar on all Android devices
  screenWrapper: {
    flex: 1,
    backgroundColor: Colors.offWhite,
    paddingTop: STATUS_BAR_HEIGHT,
  },

  loadingWrap:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content:          { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  listContent:      { padding: Spacing.md },
  listContentEmpty: { flexGrow: 1, justifyContent: 'center' },

  // Header — taller on Android to give more room, especially for the back button
  subHeader: {
    backgroundColor: Colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'android' ? 16 : 13,
    minHeight: Platform.OS === 'android' ? 60 : 54,
    borderBottomWidth: 1,
    borderBottomColor: Colors.navyLight,
  },
  backBtn: {
    minWidth: 70,
    paddingVertical: 8,
    paddingRight: Spacing.sm,
  },
  backText: {
    color: Colors.gold,
    fontSize: Typography.sizes.lg,   // larger than before — easier to see and tap
    fontWeight: '700',
  },
  subHeaderCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subHeaderIcon:  { fontSize: 16 },
  subHeaderTitle: { color: Colors.white, fontSize: Typography.sizes.lg, fontWeight: '700' },
  addBtn: {
    minWidth: 70,
    alignItems: 'flex-end',
    paddingVertical: 8,
    paddingLeft: Spacing.sm,
  },
  addBtnText: { color: Colors.gold, fontWeight: '700', fontSize: Typography.sizes.md },

  saveBtn: { marginTop: Spacing.xl },

  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  editSaveBtn:   { flex: 1 },
  editDeleteBtn: { marginLeft: Spacing.sm },

  // Floating action button — always visible at the bottom of list screens
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.lg,
    left: Spacing.lg,
    backgroundColor: Colors.navy,
    borderRadius: Radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    ...Shadows.lifted,
  },
  fabText: {
    color: Colors.gold,
    fontWeight: '700',
    fontSize: Typography.sizes.md,
    letterSpacing: 0.5,
  },

  itemTitle: { fontSize: Typography.sizes.md, fontWeight: '600', color: Colors.navy },
  itemSub:   { fontSize: Typography.sizes.sm, color: Colors.grey400, marginTop: 3 },
  itemRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  itemBadge: {
    backgroundColor: Colors.goldPale,
    color: Colors.navy,
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
    borderRadius: Radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: Spacing.sm,
    overflow: 'hidden',
  },
});

// src/screens/SubformScreens.js
// FIXED: All field names updated to match Supabase column names (lowercase with underscores)

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  StyleSheet, ActivityIndicator, Platform, StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import {
  getChildren, saveChild, deleteChild,
  getPositions, savePosition, deletePosition,
  getEmergencyContacts, saveEmergencyContact, deleteEmergencyContact,
  getMilitary, saveMilitary,
  getUniformedRankRecords, saveUniformedRankRecord, deleteUniformedRankRecord,
  getDegrees, saveDegree, deleteDegree, getDegreeTypes,
  getSpouse, saveSpouse,
} from '../db/memberQueries';
import {
  FormInput, DateInput, FormPicker, FormSwitch,
  SectionHeader, PrimaryButton, SecondaryButton,
  EmptyState, ListCard,
} from '../components/FormComponents';
import { Colors, Spacing, Typography, Radii, Shadows } from '../styles/theme';

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
      await saveChild({ ...editing, member_id: memberId });
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
        await deleteChild(editing.id);
        setEditing(null);
        load();
      }},
    ]);
  }

  if (editing !== null) {
    return (
      <SubformEditor
        title={editing.id ? 'Edit Child' : 'New Child'}
        onBack={() => setEditing(null)}
        onSave={handleSave}
        onDelete={editing.id ? handleDelete : null}
      >
        <FormInput
          label="Child Name"
          value={editing.child_name}
          onChangeText={v => setEditing(e => ({ ...e, child_name: v }))}
          required
        />
        <DateInput
          label="Birth Date"
          value={editing.birth_date}
          onChangeText={v => setEditing(e => ({ ...e, birth_date: v }))}
        />
        <FormInput
          label="Birth Place"
          value={editing.birth_place}
          onChangeText={v => setEditing(e => ({ ...e, birth_place: v }))}
        />
      </SubformEditor>
    );
  }

  return (
    <SubformList
      title="Children"
      icon="👶"
      onBack={() => navigation.goBack()}
      onAdd={() => setEditing({ child_name: '', birth_date: '', birth_place: '' })}
      loading={loading}
      emptyIcon="👶"
      emptyTitle="No children recorded"
      emptyMessage="Tap '+ Add New' to add a child's details."
    >
      {items.map(item => (
        <ListCard key={item.id} onPress={() => setEditing({ ...item })}>
          <Text style={s.itemTitle}>{item.child_name || '(No Name)'}</Text>
          <Text style={s.itemSub}>
            {[item.birth_date, item.birth_place].filter(Boolean).join('  ·  ')}
          </Text>
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
      await savePosition({ ...editing, member_id: memberId });
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
        await deletePosition(editing.id);
        setEditing(null);
        load();
      }},
    ]);
  }

  if (editing !== null) {
    return (
      <SubformEditor
        title={editing.id ? 'Edit Position' : 'New Position'}
        onBack={() => setEditing(null)}
        onSave={handleSave}
        onDelete={editing.id ? handleDelete : null}
      >
        <FormInput
          label="Position Title"
          value={editing.position_title}
          onChangeText={v => setEditing(e => ({ ...e, position_title: v }))}
          required
        />
        <DateInput
          label="From"
          value={editing.date_from}
          onChangeText={v => setEditing(e => ({ ...e, date_from: v }))}
        />
        <DateInput
          label="To"
          value={editing.date_to}
          onChangeText={v => setEditing(e => ({ ...e, date_to: v }))}
        />
      </SubformEditor>
    );
  }

  return (
    <SubformList
      title="Positions"
      icon="📋"
      onBack={() => navigation.goBack()}
      onAdd={() => setEditing({ position_title: '', date_from: '', date_to: '' })}
      loading={loading}
      emptyIcon="📋"
      emptyTitle="No positions recorded"
      emptyMessage="Tap '+ Add New' to record a position held."
    >
      {items.map(item => (
        <ListCard key={item.id} onPress={() => setEditing({ ...item })}>
          <Text style={s.itemTitle}>{item.position_title || '(No Title)'}</Text>
          <Text style={s.itemSub}>
            {[item.date_from, item.date_to].filter(Boolean).join(' – ')}
          </Text>
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
      await saveEmergencyContact({ ...editing, member_id: memberId });
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
        await deleteEmergencyContact(editing.id);
        setEditing(null);
        load();
      }},
    ]);
  }

  if (editing !== null) {
    return (
      <SubformEditor
        title={editing.id ? 'Edit Contact' : 'New Contact'}
        onBack={() => setEditing(null)}
        onSave={handleSave}
        onDelete={editing.id ? handleDelete : null}
      >
        <FormInput
          label="Name"
          value={editing.contact_name}
          onChangeText={v => setEditing(e => ({ ...e, contact_name: v }))}
          required
        />
        <FormInput
          label="Relationship"
          value={editing.relationship}
          onChangeText={v => setEditing(e => ({ ...e, relationship: v }))}
        />
        <FormInput
          label="Phone 1"
          value={editing.phone1}
          onChangeText={v => setEditing(e => ({ ...e, phone1: v }))}
          keyboardType="phone-pad"
        />
        <FormInput
          label="Phone 2"
          value={editing.phone2}
          onChangeText={v => setEditing(e => ({ ...e, phone2: v }))}
          keyboardType="phone-pad"
        />
      </SubformEditor>
    );
  }

  return (
    <SubformList
      title="Emergency Contacts"
      icon="🚨"
      onBack={() => navigation.goBack()}
      onAdd={() => setEditing({ contact_name: '', relationship: '', phone1: '', phone2: '' })}
      loading={loading}
      emptyIcon="🚨"
      emptyTitle="No emergency contacts"
      emptyMessage="Tap '+ Add New' to add an emergency contact."
    >
      {items.map(item => (
        <ListCard key={item.id} onPress={() => setEditing({ ...item })}>
          <Text style={s.itemTitle}>{item.contact_name || '(No Name)'}</Text>
          <View style={s.itemRow}>
            {item.relationship
              ? <Text style={s.itemBadge}>{item.relationship}</Text>
              : null}
            {item.phone1
              ? <Text style={s.itemSub}>{item.phone1}</Text>
              : null}
          </View>
        </ListCard>
      ))}
    </SubformList>
  );
}

// ════════════════════════════════════════════════════════════════════
// UNIFORMED RANK
// ════════════════════════════════════════════════════════════════════

export function MilitaryScreen({ route, navigation }) {
  const { memberId } = route.params;
  const [summary, setSummary] = useState({
    member_id: memberId,
    is_military: true,
    uniform_blessed_date: '',
    first_uniform_use_date: '',
    current_rank: '',
    commission: '',
  });
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingSummary, setSavingSummary] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mil, ranks] = await Promise.all([
        getMilitary(memberId),
        getUniformedRankRecords(memberId),
      ]);
      setSummary({
        member_id: memberId,
        is_military: !!mil?.is_military,
        uniform_blessed_date: mil?.uniform_blessed_date || '',
        first_uniform_use_date: mil?.first_uniform_use_date || '',
        current_rank: mil?.current_rank || '',
        commission: mil?.commission || '',
      });
      setItems(ranks || []);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => { load(); }, [load]);

  function setSummaryField(field) {
    return v => setSummary(d => ({ ...d, [field]: v }));
  }

  async function handleSaveSummary() {
    setSavingSummary(true);
    try {
      await saveMilitary({
        member_id: memberId,
        is_military: true,
        uniform_blessed_date: summary.uniform_blessed_date || null,
        first_uniform_use_date: summary.first_uniform_use_date || null,
        current_rank: summary.current_rank || null,
        commission: summary.commission || null,
      });
      await load();
      Alert.alert('✓ Saved', 'Uniform details saved.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingSummary(false);
    }
  }

  async function handleSaveRecord() {
    try {
      await saveUniformedRankRecord({ ...editing, member_id: memberId });
      setEditing(null);
      await load();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  async function handleDeleteRecord() {
    Alert.alert('Delete Record', 'Remove this commission record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteUniformedRankRecord(editing.id, memberId);
            setEditing(null);
            await load();
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  }

  if (loading) return <LoadingView />;

  if (editing !== null) {
    return (
      <SubformEditor
        title={editing.id ? 'Edit Uniformed Rank Record' : 'New Uniformed Rank Record'}
        onBack={() => setEditing(null)}
        onSave={handleSaveRecord}
        onDelete={editing.id ? handleDeleteRecord : null}
      >
        <FormInput
          label="Rank Title"
          value={editing.rank_title}
          onChangeText={v => setEditing(e => ({ ...e, rank_title: v }))}
          required
        />
        <DateInput
          label="Commission Date"
          value={editing.commission_date}
          onChangeText={v => setEditing(e => ({ ...e, commission_date: v }))}
        />
        <FormSwitch
          label="Current Rank?"
          value={!!editing.is_current}
          onValueChange={v => setEditing(e => ({ ...e, is_current: v }))}
          hint="Turn this on for the member's present rank."
        />
        <FormInput
          label="Notes"
          value={editing.notes}
          onChangeText={v => setEditing(e => ({ ...e, notes: v }))}
          multiline
        />
      </SubformEditor>
    );
  }

  return (
    <View style={s.screenWrapper}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navy} />
      <SubformHeader
        title="Uniformed Rank"
        icon="🪖"
        onBack={() => navigation.goBack()}
        rightAction={{
          label: '+ Add',
          onPress: () => setEditing({ rank_title: '', commission_date: '', notes: '', is_current: items.length === 0 }),
        }}
      />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <SectionHeader title="Uniform Details" />
        <DateInput
          label="Uniform Blessed Date"
          value={summary.uniform_blessed_date}
          onChangeText={setSummaryField('uniform_blessed_date')}
        />
        <DateInput
          label="First Uniform Use Date"
          value={summary.first_uniform_use_date}
          onChangeText={setSummaryField('first_uniform_use_date')}
        />
        <PrimaryButton
          title={savingSummary ? 'Saving…' : 'Save Uniform Details'}
          icon="💾"
          onPress={handleSaveSummary}
          disabled={savingSummary}
          style={s.saveBtn}
        />

        <SectionHeader title="Commission History" />

        {items.length === 0 ? (
          <EmptyState
            icon="🪖"
            title="No rank records yet"
            message="Tap '+ Add' to record the member's commissions."
            actionLabel="+ Add"
            onAction={() => setEditing({ rank_title: '', commission_date: '', notes: '', is_current: true })}
          />
        ) : (
          items.map(item => (
            <ListCard key={item.id} onPress={() => setEditing({ ...item })}>
              <Text style={s.itemTitle}>{item.rank_title || '(No Rank Title)'}</Text>
              <Text style={s.itemSub}>
                {[item.commission_date, item.is_current ? 'Current' : null].filter(Boolean).join('  ·  ')}
              </Text>
              {item.notes ? <Text style={s.itemSub}>{item.notes}</Text> : null}
            </ListCard>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity
        style={s.fab}
        onPress={() => setEditing({ rank_title: '', commission_date: '', notes: '', is_current: items.length === 0 })}
        activeOpacity={0.85}
      >
        <Text style={s.fabText}>＋ Add New</Text>
      </TouchableOpacity>
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
      await saveDegree({ ...editing, member_id: memberId });
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
        await deleteDegree(editing.id);
        setEditing(null);
        load();
      }},
    ]);
  }

  if (editing !== null) {
    return (
      <SubformEditor
        title={editing.id ? 'Edit Degree' : 'New Degree'}
        onBack={() => setEditing(null)}
        onSave={handleSave}
        onDelete={editing.id ? handleDelete : null}
      >
        <FormPicker
          label="Degree Type"
          value={editing.degree_type}
          onValueChange={v => setEditing(e => ({ ...e, degree_type: v }))}
          items={degreeTypes}
          required
        />
        <DateInput
          label="Date"
          value={editing.degree_date}
          onChangeText={v => setEditing(e => ({ ...e, degree_date: v }))}
        />
        <FormInput
          label="Place"
          value={editing.degree_place}
          onChangeText={v => setEditing(e => ({ ...e, degree_place: v }))}
        />
      </SubformEditor>
    );
  }

  return (
    <SubformList
      title="Degree Records"
      icon="🎓"
      onBack={() => navigation.goBack()}
      onAdd={() => setEditing({ degree_type: '', degree_date: '', degree_place: '' })}
      loading={loading}
      emptyIcon="🎓"
      emptyTitle="No degree records"
      emptyMessage="Tap '+ Add New' to record a degree."
    >
      {items.map(item => (
        <ListCard key={item.id} onPress={() => setEditing({ ...item })}>
          <Text style={s.itemTitle}>{item.degree_type || '(No Type)'}</Text>
          <Text style={s.itemSub}>
            {[item.degree_date, item.degree_place].filter(Boolean).join('  ·  ')}
          </Text>
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
  const [data, setData]       = useState({ member_id: memberId });
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
      await saveSpouse({ ...data, member_id: memberId });
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
        >
          <SectionHeader title="Personal" />
          <FormInput label="Name" value={data.spouse_name} onChangeText={set('spouse_name')} />
          <DateInput label="Date of Birth" value={data.spouse_dob} onChangeText={set('spouse_dob')} />
          <FormInput label="Nationality" value={data.spouse_nationality} onChangeText={set('spouse_nationality')} />
          <FormInput label="Denomination" value={data.spouse_denomination} onChangeText={set('spouse_denomination')} />
          <SectionHeader title="Membership" />
          <FormSwitch
            label="Is Sister?"
            value={!!data.spouse_is_sister}
            onValueChange={v => setData(d => ({ ...d, spouse_is_sister: v }))}
            hint="Is the spouse a member of the Auxiliary?"
          />
          <FormInput label="Parish" value={data.spouse_parish} onChangeText={set('spouse_parish')} />
          <FormInput label="Auxiliary Name" value={data.auxiliary_name} onChangeText={set('auxiliary_name')} />
          <FormInput label="Auxiliary Number" value={data.auxiliary_number} onChangeText={set('auxiliary_number')} />
          <SectionHeader title="Notes" />
          <FormInput label="Notes" value={data.spouse_notes} onChangeText={set('spouse_notes')} multiline />
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
            ? <EmptyState
                icon={emptyIcon}
                title={emptyTitle}
                message={emptyMessage}
                actionLabel="+ Add"
                onAction={onAdd}
              />
            : children
          }
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
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
          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function SubformHeader({ title, icon, onBack, rightAction }) {
  return (
    <View style={s.subHeader}>
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
  screenWrapper: {
    flex: 1,
    backgroundColor: Colors.offWhite,
    paddingTop: STATUS_BAR_HEIGHT,
  },
  loadingWrap:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content:          { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  listContent:      { padding: Spacing.md },
  listContentEmpty: { flexGrow: 1, justifyContent: 'center' },

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
  backBtn: { minWidth: 70, paddingVertical: 8, paddingRight: Spacing.sm },
  backText: { color: Colors.gold, fontSize: Typography.sizes.lg, fontWeight: '700' },
  subHeaderCenter: {
    flex: 1, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
  },
  subHeaderIcon:  { fontSize: 16 },
  subHeaderTitle: { color: Colors.white, fontSize: Typography.sizes.lg, fontWeight: '700' },
  addBtn:         { minWidth: 70, alignItems: 'flex-end', paddingVertical: 8 },
  addBtnText:     { color: Colors.gold, fontWeight: '700', fontSize: Typography.sizes.md },

  saveBtn: { marginTop: Spacing.xl },
  editActions: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xl },
  editSaveBtn:   { flex: 1 },
  editDeleteBtn: { marginLeft: Spacing.sm },

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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 7,
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

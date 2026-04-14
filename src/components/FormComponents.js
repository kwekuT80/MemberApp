// src/components/FormComponents.js
// Polished form components — includes real date picker for all date fields.

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Switch,
  StyleSheet, Platform, Modal,
} from 'react-native';
// @ts-ignore - createElement is only available on web
import { createElement } from 'react-native-web';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Spacing, Radii, Typography, Shadows } from '../styles/theme';

// ── Helpers ────────────────────────────────────────────────────────────────────

// Convert a DD/MM/YYYY string to a JS Date (returns null if invalid or missing)
function parseDate(str) {
  if (!str || typeof str !== 'string' || str.trim() === '') return null;
  const parts = str.split('/');
  if (parts.length === 3) {
    const d = new Date(
      parseInt(parts[2], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[0], 10)
    );
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

// Format a JS Date to DD/MM/YYYY
function formatDate(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

// ── Field wrapper ──────────────────────────────────────────────────────────────

export function FieldRow({ label, required, children, hint, error }) {
  return (
    <View style={styles.fieldRow}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      ) : null}
      {children}
      {error   ? <Text style={styles.errorHint}>{error}</Text>   : null}
      {!error && hint ? <Text style={styles.hint}>{hint}</Text>  : null}
    </View>
  );
}

// ── Text input ─────────────────────────────────────────────────────────────────

export function FormInput({
  label, value, onChangeText, required, placeholder,
  keyboardType, multiline, hint, error, editable = true,
}) {
  const [focused, setFocused] = useState(false);
  return (
    <FieldRow label={label} required={required} hint={hint} error={error}>
      <TextInput
        style={[
          styles.input,
          multiline  && styles.inputMultiline,
          focused    && styles.inputFocused,
          error      && styles.inputError,
          !editable  && styles.inputDisabled,
        ]}
        value={value || ''}
        onChangeText={onChangeText}
        placeholder={placeholder || ''}
        placeholderTextColor={Colors.grey300}
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        editable={editable}
        autoCapitalize="sentences"
      />
    </FieldRow>
  );
}

// ── Date input with real picker ────────────────────────────────────────────────

export function DateInput({ label, value, onChangeText, required, hint, error }) {
  const [show, setShow] = useState(false);

  function handleChange(event, selectedDate) {
    // On Android the picker closes itself; on iOS we close via button
    if (Platform.OS === 'android') {
      setShow(false);
      if (event.type === 'dismissed') return;
    }
    if (selectedDate) {
      onChangeText(formatDate(selectedDate));
    }
  }

  const currentDate = parseDate(value) || new Date();

  return (
    <FieldRow label={label} required={required} hint={hint} error={error}>
      {/* WEB VERSION: A real HTML5 date input styled to match the app */}
      {Platform.OS === 'web' ? (
        <View style={[styles.dateWrapper, error && styles.inputError]}>
          <input
            type="date"
            value={(function() {
              if (!value) return '';
              const parts = value.split('/');
              if (parts.length === 3) {
                const [d, m, y] = parts;
                return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
              }
              return '';
            })()}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                onChangeText('');
                return;
              }
              const [y, m, d] = val.split('-');
              onChangeText(`${d}/${m}/${y}`);
            }}
            style={{
              padding: '0px',
              border: 'none',
              background: 'transparent',
              fontSize: '16px',
              color: value ? '#3D3830' : '#C4BEB4',
              width: '100%',
              outline: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          />
          <Text style={styles._webDateIcon}>📅</Text>
        </View>
      ) : (
        /* MOBILE VERSION: Tappable field that opens the picker */
        <>
          <TouchableOpacity
            style={[styles.dateWrapper, error && styles.inputError]}
            onPress={() => setShow(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.dateText, !value && styles.datePlaceholder]}>
              {value || 'DD/MM/YYYY'}
            </Text>
            <Text style={styles.dateIcon}>📅</Text>
          </TouchableOpacity>

          {/* Android: inline picker */}
          {Platform.OS === 'android' && show && (
            <DateTimePicker
              value={currentDate}
              mode="date"
              display="default"
              onChange={handleChange}
              maximumDate={new Date(2100, 11, 31)}
              minimumDate={new Date(1900, 0, 1)}
            />
          )}

          {/* iOS: modal picker */}
          {Platform.OS === 'ios' && (
            <Modal visible={show} transparent animationType="slide">
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{label || 'Select Date'}</Text>
                    <TouchableOpacity onPress={() => setShow(false)} style={styles.modalDoneBtn}>
                      <Text style={styles.modalDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={currentDate}
                    mode="date"
                    display="spinner"
                    onChange={handleChange}
                    maximumDate={new Date(2100, 11, 31)}
                    minimumDate={new Date(1900, 0, 1)}
                    style={styles.iosPicker}
                  />
                </View>
              </View>
            </Modal>
          )}
        </>
      )}
    </FieldRow>
  );
}

// ── Picker / Dropdown ──────────────────────────────────────────────────────────

export function FormPicker({ label, value, onValueChange, items, required, placeholder, error }) {
  const [focused, setFocused] = useState(false);
  return (
    <FieldRow label={label} required={required} error={error}>
      <View style={[
        styles.pickerWrapper,
        focused && styles.pickerFocused,
        error   && styles.inputError,
      ]}>
        <Picker
          selectedValue={value || ''}
          onValueChange={onValueChange}
          style={styles.picker}
          dropdownIconColor={Colors.gold}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        >
          <Picker.Item
            label={placeholder || `Select ${label || 'option'}…`}
            value=""
            color={Colors.grey400}
          />
          {items.map((item, i) => (
            <Picker.Item
              key={i}
              label={typeof item === 'string' ? item : item.label}
              value={typeof item === 'string' ? item : item.value}
              color={Colors.grey700}
            />
          ))}
        </Picker>
      </View>
    </FieldRow>
  );
}

// ── Toggle / Switch ────────────────────────────────────────────────────────────

export function FormSwitch({ label, value, onValueChange, hint }) {
  return (
    <View style={styles.switchCard}>
      <View style={styles.switchLeft}>
        <Text style={styles.switchLabel}>{label}</Text>
        {hint ? <Text style={styles.switchHint}>{hint}</Text> : null}
      </View>
      <Switch
        value={!!value}
        onValueChange={onValueChange}
        trackColor={{ false: Colors.grey200, true: Colors.gold }}
        thumbColor={value ? Colors.navy : Colors.white}
        ios_backgroundColor={Colors.grey200}
      />
    </View>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────

export function SectionHeader({ title, subtitle }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionAccent} />
      <View style={styles.sectionTextWrap}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

// ── Primary button ─────────────────────────────────────────────────────────────

export function PrimaryButton({ title, onPress, style, disabled, icon }) {
  return (
    <TouchableOpacity
      style={[styles.primaryBtn, disabled && styles.primaryBtnDisabled, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.82}
    >
      {icon ? <Text style={styles.btnIcon}>{icon}</Text> : null}
      <Text style={[styles.primaryBtnText, disabled && styles.primaryBtnTextDisabled]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

// ── Secondary / ghost button ───────────────────────────────────────────────────

export function SecondaryButton({ title, onPress, style, danger, icon }) {
  return (
    <TouchableOpacity
      style={[styles.secondaryBtn, danger && styles.dangerBtn, style]}
      onPress={onPress}
      activeOpacity={0.72}
    >
      {icon ? <Text style={styles.btnIcon}>{icon}</Text> : null}
      <Text style={[styles.secondaryBtnText, danger && styles.dangerBtnText]}>{title}</Text>
    </TouchableOpacity>
  );
}

// ── Member list card ──────────────────────────────────────────────────────────

export function MemberCard({ initials, name, subtitle, onPress }) {
  return (
    <TouchableOpacity style={styles.memberCard} onPress={onPress} activeOpacity={0.88}>
      <View style={styles.memberAvatar}>
        <Text style={styles.memberInitials}>{initials || '?'}</Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName} numberOfLines={1}>{name}</Text>
        {subtitle ? <Text style={styles.memberSub} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <Text style={styles.chevronText}>›</Text>
    </TouchableOpacity>
  );
}

// ── Subform navigation link ────────────────────────────────────────────────────

export function SubformLink({ label, count, icon, onPress }) {
  return (
    <TouchableOpacity style={styles.subformLink} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.subformLinkLeft}>
        {icon ? <Text style={styles.subformLinkIcon}>{icon}</Text> : null}
        <Text style={styles.subformLinkText}>{label}</Text>
      </View>
      <View style={styles.subformLinkRight}>
        {count != null ? (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{count}</Text>
          </View>
        ) : null}
        <Text style={styles.subformChevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── List item card ─────────────────────────────────────────────────────────────

export function ListCard({ onPress, children, style }) {
  return (
    <TouchableOpacity style={[styles.listCard, style]} onPress={onPress} activeOpacity={0.85}>
      {children}
    </TouchableOpacity>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, message, actionLabel, onAction }) {
  return (
    <View style={styles.emptyState}>
      {icon ? <Text style={styles.emptyIcon}>{icon}</Text> : null}
      {title ? <Text style={styles.emptyTitle}>{title}</Text> : null}
      <Text style={styles.emptyMessage}>{message}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.emptyAction} onPress={onAction}>
          <Text style={styles.emptyActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const Colors_navy       = '#0A1628';
const Colors_navyLight  = '#162440';
const Colors_navyMid    = '#1C3058';
const Colors_gold       = '#C9A84C';
const Colors_goldPale   = '#F5EDD2';
const Colors_white      = '#FFFFFF';
const Colors_offWhite   = '#F7F5F0';
const Colors_grey200    = '#DDD9D2';
const Colors_grey300    = '#C4BEB4';
const Colors_grey400    = '#A09891';
const Colors_grey700    = '#3D3830';
const Colors_danger     = '#B83232';
const Colors_dangerLight= '#FDEAEA';
const Colors_dangerBorder='#E88080';
const Colors_inputBorder= '#D4CFC8';
const Colors_inputBorderFocus = '#C9A84C';
const Colors_inputBg    = '#FFFFFF';
const Colors_inputBgFocus = '#FFFDF7';
const Colors_divider    = '#E8E4DC';
const Colors_surface    = '#FFFFFF';
const Colors_overlay    = 'rgba(10,22,40,0.6)';

const styles = StyleSheet.create({
  fieldRow: { marginBottom: Spacing.md + 2 },
  label: {
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
    color: Colors.navyMid,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  required:  { color: Colors.danger },
  hint:      { fontSize: Typography.sizes.xs, color: Colors.grey400, marginTop: 4, lineHeight: 16 },
  errorHint: { fontSize: Typography.sizes.xs, color: Colors.danger, marginTop: 4 },

  // Text input
  input: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    fontSize: Typography.sizes.md,
    color: Colors.grey700,
    ...Shadows.subtle,
  },
  inputMultiline: { minHeight: 110, paddingTop: 12, lineHeight: 22 },
  inputFocused: {
    borderColor: Colors.inputBorderFocus,
    backgroundColor: Colors.inputBgFocus,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  inputError:    { borderColor: Colors.dangerBorder, backgroundColor: Colors.dangerLight },
  inputDisabled: { backgroundColor: Colors.grey100, color: Colors.grey400 },

  // Date picker trigger
  dateWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.inputBg,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 13 : 12,
    ...Shadows.subtle,
  },
  dateText:        { fontSize: Typography.sizes.md, color: Colors.grey700, flex: 1 },
  datePlaceholder: { color: Colors.grey300 },
  dateIcon:        { fontSize: 18, marginLeft: Spacing.sm },
  _webDateIcon:    { fontSize: 18, marginLeft: -30, pointerEvents: 'none', zIndex: -1 },

  // iOS modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.overlay,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    paddingBottom: Spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  modalTitle:   { fontSize: Typography.sizes.lg, fontWeight: '700', color: Colors.navy },
  modalDoneBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  modalDoneText:{ fontSize: Typography.sizes.md, fontWeight: '700', color: Colors.gold },
  iosPicker:    { height: 220 },

  // Picker
  pickerWrapper: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    borderRadius: Radii.md,
    overflow: 'hidden',
    ...Shadows.subtle,
  },
  pickerFocused: { borderColor: Colors.inputBorderFocus },
  picker: { color: Colors.grey700, height: Platform.OS === 'ios' ? 180 : 52 },

  // Switch
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    ...Shadows.subtle,
  },
  switchLeft:  { flex: 1, paddingRight: Spacing.md },
  switchLabel: { fontSize: Typography.sizes.md, fontWeight: '600', color: Colors.grey700 },
  switchHint:  { fontSize: Typography.sizes.xs, color: Colors.grey400, marginTop: 2 },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionAccent: {
    width: 3,
    minHeight: 20,
    backgroundColor: Colors.gold,
    borderRadius: 2,
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  sectionTextWrap: { flex: 1 },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: 0.3,
  },
  sectionSubtitle: { fontSize: Typography.sizes.xs, color: Colors.grey400, marginTop: 2 },

  // Buttons
  primaryBtn: {
    backgroundColor: Colors.navy,
    borderRadius: Radii.md,
    paddingVertical: 15,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    ...Shadows.card,
  },
  primaryBtnDisabled:     { backgroundColor: Colors.grey200, shadowOpacity: 0, elevation: 0 },
  primaryBtnText:         { color: Colors.gold, fontSize: Typography.sizes.md, fontWeight: '700', letterSpacing: 0.9, textTransform: 'uppercase' },
  primaryBtnTextDisabled: { color: Colors.grey400 },
  secondaryBtn:           { borderWidth: 1.5, borderColor: Colors.navyMid, borderRadius: Radii.md, paddingVertical: 12, paddingHorizontal: Spacing.lg, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  dangerBtn:              { borderColor: Colors.dangerBorder, backgroundColor: Colors.dangerLight },
  secondaryBtnText:       { color: Colors.navyMid, fontSize: Typography.sizes.sm, fontWeight: '600' },
  dangerBtnText:          { color: Colors.danger },
  btnIcon:                { fontSize: 15, marginRight: 6 },

  // Member card
  memberCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.card,
  },
  memberAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: Colors.navyMid,
    alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing.md,
    borderWidth: 2, borderColor: Colors.gold,
  },
  memberInitials: { color: Colors.gold, fontWeight: '700', fontSize: Typography.sizes.md },
  memberInfo:     { flex: 1 },
  memberName:     { fontSize: Typography.sizes.md, fontWeight: '600', color: Colors.navy },
  memberSub:      { fontSize: Typography.sizes.sm, color: Colors.grey400, marginTop: 2 },
  chevronText:    { fontSize: 24, color: Colors.gold, fontWeight: '300', lineHeight: 28 },

  // Subform link
  subformLink: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    ...Shadows.subtle,
  },
  subformLinkLeft:  { flexDirection: 'row', alignItems: 'center', flex: 1 },
  subformLinkIcon:  { fontSize: 18, marginRight: Spacing.sm },
  subformLinkText:  { color: Colors.navyMid, fontWeight: '600', fontSize: Typography.sizes.md },
  subformLinkRight: { flexDirection: 'row', alignItems: 'center' },
  subformChevron:   { fontSize: 22, color: Colors.gold, marginLeft: Spacing.sm },
  countBadge: {
    backgroundColor: Colors.goldPale,
    borderRadius: Radii.pill,
    paddingHorizontal: 8, paddingVertical: 2,
    minWidth: 24, alignItems: 'center',
  },
  countBadgeText: { fontSize: Typography.sizes.xs, fontWeight: '700', color: Colors.navy },

  // List card
  listCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.gold,
    ...Shadows.card,
  },

  // Empty state
  emptyState:   { alignItems: 'center', paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.xl },
  emptyIcon:    { fontSize: 44, marginBottom: Spacing.md },
  emptyTitle:   { fontSize: Typography.sizes.lg, fontWeight: '700', color: Colors.navy, marginBottom: Spacing.sm },
  emptyMessage: { color: Colors.grey400, fontSize: Typography.sizes.md, textAlign: 'center', lineHeight: 22 },
  emptyAction: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.navy,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
  },
  emptyActionText: { color: Colors.gold, fontWeight: '700', fontSize: Typography.sizes.sm },
});

// src/screens/AuthScreen.js
// Login and sign-up screen. Users register with email + password.
// After login the app loads their own member record.

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { supabase } from '../db/supabase';
import { linkMemberRecord, isUserAuthorized } from '../db/memberQueries';
import { Colors, Spacing, Typography, Radii, Shadows } from '../styles/theme';

export default function AuthScreen() {
  const [mode, setMode]         = useState('login'); // 'login' | 'register' | 'forgot'
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname]   = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [message, setMessage]   = useState('');

  function clearState() {
    setError('');
    setMessage('');
  }

  async function handleLogin() {
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true); clearState();
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError(error.message);
    } else if (data?.user) {
      // Re-scan for records (in case new data was added since last login)
      await linkMemberRecord(data.user.email, data.user.id, phone);
    }
    setLoading(false);
  }

  async function handleRegister() {
    if (mode === 'register' && (!email || !password || !confirm || !firstName || !surname)) { 
      setError('Please fill in all fields, including your name.'); return; 
    }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6)  { setError('Password must be at least 6 characters.'); return; }
    
    setLoading(true); clearState();

    // STEP 1: Check if the user is on the Masterlist (members table)
    // We check email, phone, OR the name they just typed!
    const { supabase } = require('../db/supabase');
    const { data: nameCheck } = await supabase
      .from('members')
      .select('id')
      .is('user_id', null)
      .eq('first_name', firstName.trim())
      .eq('surname', surname.trim());

    const authorized = (nameCheck && nameCheck.length > 0) || await isUserAuthorized(email.trim(), phone.trim());
    
    if (!authorized) {
      setError('Your name, email, or phone was not found on the authorized registrar list. Please contact your Registrar.');
      setLoading(false);
      return;
    }

    // STEP 2: Proceed with Supabase Auth registration
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) {
      setError(error.message);
    } else {
      if (data?.user) {
        // STEP 3: Transfer ownership of the record using all identifiers
        await linkMemberRecord(data.user.email, data.user.id, phone.trim(), firstName.trim(), surname.trim());
      }
      setMessage('Account created! Your member profile has been linked and you can now log in.');
      setMode('login');
    }
    setLoading(false);
  }

  async function handleForgot() {
    if (!email) { setError('Please enter your email address.'); return; }
    setLoading(true); clearState();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) {
      setError(error.message);
    } else {
      setMessage('Password reset email sent. Check your inbox.');
    }
    setLoading(false);
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.navy} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* ── Logo / Title ── */}
          <View style={s.hero}>
            <View style={s.logoCircle}>
              <Text style={s.logoText}>MR</Text>
            </View>
            <Text style={s.appName}>Member Registration</Text>
            <Text style={s.appSub}>Membership Management System</Text>
          </View>

          {/* ── Card ── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>
              {mode === 'login'    ? 'Sign In'          :
               mode === 'register' ? 'Create Account'   :
                                    'Reset Password'}
            </Text>
            <Text style={s.cardSub}>
              {mode === 'login'    ? 'Enter your credentials to continue'  :
               mode === 'register' ? 'Register to access your member profile' :
                                    'We will send you a reset link'}
            </Text>

            {/* Error / Success messages */}
            {error   ? <View style={s.errorBox}  ><Text style={s.errorText}  >{error}  </Text></View> : null}
            {message ? <View style={s.successBox}><Text style={s.successText}>{message}</Text></View> : null}

            {/* Email */}
            <Text style={s.label}>Email Address</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={Colors.grey300}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Name Fields (Registration Only) */}
            {mode === 'register' && (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>First Name</Text>
                  <TextInput
                    style={s.input}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="John"
                    autoCapitalize="words"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Surname</Text>
                  <TextInput
                    style={s.input}
                    value={surname}
                    onChangeText={setSurname}
                    placeholder="Doe"
                    autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            {/* Phone (Only for Registration) */}
            {mode === 'register' && (
              <>
                <Text style={s.label}>Mobile / Phone Number</Text>
                <TextInput
                  style={s.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="024 123 4567"
                  placeholderTextColor={Colors.grey300}
                  keyboardType="phone-pad"
                />
              </>
            )}

            {/* Password */}
            {mode !== 'forgot' && (
              <>
                <Text style={s.label}>Password</Text>
                <TextInput
                  style={s.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.grey300}
                  secureTextEntry
                />
              </>
            )}

            {/* Confirm password */}
            {mode === 'register' && (
              <>
                <Text style={s.label}>Confirm Password</Text>
                <TextInput
                  style={s.input}
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.grey300}
                  secureTextEntry
                />
              </>
            )}

            {/* Primary action */}
            <TouchableOpacity
              style={[s.primaryBtn, loading && s.primaryBtnDisabled]}
              onPress={mode === 'login' ? handleLogin : mode === 'register' ? handleRegister : handleForgot}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color={Colors.gold} />
                : <Text style={s.primaryBtnText}>
                    {mode === 'login'    ? 'Sign In'       :
                     mode === 'register' ? 'Create Account' :
                                          'Send Reset Link'}
                  </Text>
              }
            </TouchableOpacity>

            {/* Forgot password link */}
            {mode === 'login' && (
              <TouchableOpacity onPress={() => { setMode('forgot'); clearState(); }} style={s.linkBtn}>
                <Text style={s.linkText}>Forgot your password?</Text>
              </TouchableOpacity>
            )}

            {/* Switch between login / register */}
            <View style={s.switchRow}>
              <Text style={s.switchText}>
                {mode === 'login'    ? "Don't have an account? " :
                 mode === 'register' ? 'Already have an account? ' :
                                      'Remember your password? '}
              </Text>
              <TouchableOpacity onPress={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                clearState();
              }}>
                <Text style={s.switchLink}>
                  {mode === 'login' ? 'Register' : 'Sign In'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.navy },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },

  hero: { alignItems: 'center', marginBottom: Spacing.xl },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.gold,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.lifted,
  },
  logoText:  { fontSize: Typography.sizes.xl, fontWeight: '800', color: Colors.navy },
  appName:   { fontSize: Typography.sizes.xxl, fontWeight: '800', color: Colors.white, letterSpacing: -0.5 },
  appSub:    { fontSize: Typography.sizes.sm, color: Colors.gold, marginTop: 4, letterSpacing: 0.5 },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    ...Shadows.lifted,
  },
  cardTitle: { fontSize: Typography.sizes.xl, fontWeight: '800', color: Colors.navy, marginBottom: 4 },
  cardSub:   { fontSize: Typography.sizes.sm, color: Colors.grey400, marginBottom: Spacing.lg },

  errorBox:   { backgroundColor: Colors.dangerLight, borderRadius: Radii.sm, padding: Spacing.md, marginBottom: Spacing.md, borderLeftWidth: 3, borderLeftColor: Colors.danger },
  errorText:  { color: Colors.danger, fontSize: Typography.sizes.sm },
  successBox: { backgroundColor: Colors.successLight, borderRadius: Radii.sm, padding: Spacing.md, marginBottom: Spacing.md, borderLeftWidth: 3, borderLeftColor: Colors.success },
  successText:{ color: Colors.success, fontSize: Typography.sizes.sm },

  label: { fontSize: Typography.sizes.xs, fontWeight: '700', color: Colors.navyMid, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.9 },
  input: {
    backgroundColor: Colors.offWhite,
    borderWidth: 1.5, borderColor: Colors.inputBorder,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    fontSize: Typography.sizes.md, color: Colors.grey700,
    marginBottom: Spacing.md,
  },

  primaryBtn: {
    backgroundColor: Colors.navy, borderRadius: Radii.md,
    paddingVertical: 15, alignItems: 'center', marginTop: Spacing.sm,
    ...Shadows.card,
  },
  primaryBtnDisabled: { backgroundColor: Colors.grey200 },
  primaryBtnText: { color: Colors.gold, fontSize: Typography.sizes.md, fontWeight: '700', letterSpacing: 0.9, textTransform: 'uppercase' },

  linkBtn:   { alignItems: 'center', marginTop: Spacing.md },
  linkText:  { color: Colors.grey400, fontSize: Typography.sizes.sm },

  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg },
  switchText:{ color: Colors.grey400, fontSize: Typography.sizes.sm },
  switchLink:{ color: Colors.navy, fontWeight: '700', fontSize: Typography.sizes.sm },
});

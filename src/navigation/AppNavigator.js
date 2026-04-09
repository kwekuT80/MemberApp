// src/navigation/AppNavigator.js
// Navigation — shows AuthScreen when logged out, member form + subforms when logged in.
// Listens to Supabase auth state so switching happens automatically on login/logout.

import React, { useState, useEffect, createContext } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from '../db/supabase';

import AuthScreen          from '../screens/AuthScreen';
import RegistrarDashboard from '../screens/RegistrarDashboard';
import MemberFormScreen    from '../screens/MemberFormScreen';
import {
  ChildrenScreen,
  PositionsScreen,
  EmergencyContactsScreen,
  MilitaryScreen,
  DegreesScreen,
  SpouseScreen,
} from '../screens/SubformScreens';
import ReportsScreen        from '../screens/ReportsScreen';
import { Colors } from '../styles/theme';

const Stack = createNativeStackNavigator();

// Export the Context so other components/screens can read session and role
export const AuthContext = createContext({ session: null, role: null });

export default function AppNavigator() {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRoleAndSetSession(currentSession) {
      if (!currentSession) {
        setRole('member');
        setSession(null);
        setLoading(false);
        return;
      }
      setLoading(true);

      try {
        // Use .single() so Supabase returns an object, not an array
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', currentSession.user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        const resolvedRole = (data && typeof data.role === 'string') ? data.role : 'member';

        // Safety check — log if role is unexpectedly an object
        if (typeof resolvedRole === 'object') {
          console.warn('ERROR: role is an object, not a string:', resolvedRole);
        }

        setRole(resolvedRole);
      } catch (e) {
        console.warn('Profile fetch failed:', e.message);

        // If the session is invalid (e.g. stale refresh token), force sign out to prevent crash loops
        if (e.message?.includes('refresh_token_not_found') || e.message?.includes('Refresh Token: Refresh Token Not Found')) {
          console.log('Session expired, force-signing out...');
          supabase.auth.signOut();
        } else {
          setRole('member');
        }
      } finally {
        setSession(currentSession);
        setLoading(false);
      }
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      fetchRoleAndSetSession(initialSession);
    });

    // Listen for login / logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      // Avoid excessive refetches by checking event type or handling null session early
      if (_event === 'SIGNED_IN' || _event === 'USER_UPDATED') {
        fetchRoleAndSetSession(currentSession);
      } else if (_event === 'SIGNED_OUT' || !currentSession) {
        setRole(null);
        setSession(null);
        setLoading(false);
      } else {
        // For other events (like TOKEN_REFRESHED) just update the session without refetching role
        setSession(currentSession);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading || session === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A1628', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#C9A84C', fontSize: 18, fontWeight: '700' }}>App is Loading...</Text>
      </View>
    );
  }

  // Safety diagnostics - specifically ignore null which is an 'object' in JS
  if (role !== null && typeof role === 'object') {
    console.warn('ERROR: role is an object, not a string:', JSON.stringify(role));
  }

  return (
    <AuthContext.Provider value={{ session, role }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!session ? (
            // Not logged in — show auth screen only
            <Stack.Screen name="Auth" component={AuthScreen} />
          ) : (
            // Logged in — show member form and all subscreens
            <>
              {role === 'registrar' && (
                <>
                  <Stack.Screen name="RegistrarDashboard" component={RegistrarDashboard} />
                  <Stack.Screen name="Reports"            component={ReportsScreen} />
                </>
              )}
              <Stack.Screen name="MemberForm"        component={MemberFormScreen} />
              <Stack.Screen name="Children"          component={ChildrenScreen} />
              <Stack.Screen name="Positions"         component={PositionsScreen} />
              <Stack.Screen name="EmergencyContacts" component={EmergencyContactsScreen} />
              <Stack.Screen name="Military"          component={MilitaryScreen} />
              <Stack.Screen name="Degrees"           component={DegreesScreen} />
              <Stack.Screen name="Spouse"            component={SpouseScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}

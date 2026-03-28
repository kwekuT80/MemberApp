// src/navigation/AppNavigator.js
// Navigation — shows AuthScreen when logged out, member form + subforms when logged in.
// Listens to Supabase auth state so switching happens automatically on login/logout.

import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from '../db/supabase';

import AuthScreen          from '../screens/AuthScreen';
import MemberFormScreen    from '../screens/MemberFormScreen';
import {
  ChildrenScreen,
  PositionsScreen,
  EmergencyContactsScreen,
  MilitaryScreen,
  DegreesScreen,
  SpouseScreen,
} from '../screens/SubformScreens';
import { Colors } from '../styles/theme';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [session, setSession] = useState(undefined); // undefined = loading

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for login / logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Still checking session
  if (session === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.navy }}>
        <ActivityIndicator size="large" color={Colors.gold} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          // Not logged in — show auth screen only
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          // Logged in — show member form and all subscreens
          <>
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
  );
}

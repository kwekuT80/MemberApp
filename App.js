import 'react-native-url-polyfill/auto';
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';

console.log('App.js: Script execution started');

export default function App() {
  useEffect(() => {
    console.log('App.js: Component mounted');
  }, []);

  return (
    <SafeAreaProvider>
      <View style={{ position: 'absolute', top: 50, left: 0, right: 0, zIndex: 9999, backgroundColor: 'red', padding: 10 }}>
        <Text style={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
          DEBUG: App.js is Rendering
        </Text>
      </View>
      <StatusBar style="light" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

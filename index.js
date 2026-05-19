// index.js
// Must import URL polyfill before anything else — required by Supabase on React Native.
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';
global.Buffer = Buffer;
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);

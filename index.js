// index.js
// Must import URL polyfill before anything else — required by Supabase on React Native.
import 'react-native-url-polyfill/auto';
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);

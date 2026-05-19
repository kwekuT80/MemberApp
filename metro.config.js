const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const emptyModule = path.resolve(__dirname, 'shims', 'empty.js');

config.resolver.extraNodeModules = {
  stream:           require.resolve('readable-stream'),
  zlib:             require.resolve('browserify-zlib'),
  buffer:           require.resolve('buffer/'),
  crypto:           emptyModule,
  net:              emptyModule,
  tls:              emptyModule,
  ws:               emptyModule,
  http:             emptyModule,
  https:            emptyModule,
  events:           require.resolve('events/'),
  'websocket-server': emptyModule,
};

// Exclude the android and .gradle directories from being watched to prevent ENOENT errors
config.resolver.blockList = [
  /android\/.*/,
  /node_modules\/.*\/node_modules\/react-native\/.*/,
];

module.exports = config;
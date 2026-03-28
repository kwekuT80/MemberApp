const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const emptyModule = path.resolve(__dirname, 'shims', 'empty.js');

config.resolver.extraNodeModules = {
  stream:           emptyModule,
  zlib:             emptyModule,
  crypto:           emptyModule,
  net:              emptyModule,
  tls:              emptyModule,
  ws:               emptyModule,
  http:             emptyModule,
  https:            emptyModule,
  events:           emptyModule,
  'websocket-server': emptyModule,
};

// Block the entire ws package folder
const { BlockList } = require('net');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === 'ws' ||
    moduleName.startsWith('ws/') ||
    moduleName.includes('/ws/lib/')
  ) {
    return { type: 'sourceFile', filePath: emptyModule };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
// Teste de ponta a ponta: telas reais do app (expo-router) + backend real em modo demonstração
// (banco em memória, IA simulada pela regra do gabarito). Nunca usa o Supabase de produção.
const base = require('../package.json').jest;

module.exports = {
  ...base,
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/**/*.e2e.tsx'],
  testPathIgnorePatterns: ['/node_modules/'],
  setupFiles: ['<rootDir>/e2e/setup.ts'],
  globalSetup: '<rootDir>/e2e/subirBackend.js',
  globalTeardown: '<rootDir>/e2e/derrubarBackend.js',
  testTimeout: 60_000,
};

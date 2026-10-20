// Config plugin: dá o nome "Calc" à entrada do ícone de calculadora no Android.
// O expo-alternate-app-icons cria a entrada (activity-alias .MainActivityCalc) com o nome do app;
// aqui só trocamos o rótulo dela. No iPhone o nome embaixo do ícone não pode mudar.
const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

const ALIAS = '.MainActivityCalc';
const NOME = 'Calc';

module.exports = function withNomeIconeDisfarce(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    const alias = (app['activity-alias'] ?? []).find((a) => a.$['android:name'] === ALIAS);
    if (!alias) {
      throw new Error(`[nome-icone-disfarce] ${ALIAS} não encontrado: confira a ordem dos plugins no app.json.`);
    }
    alias.$['android:label'] = NOME;
    return cfg;
  });
};

// Encerra o backend de demonstração (e os processos filhos, no Windows).
const { execSync } = require('child_process');

module.exports = async () => {
  const processo = globalThis.__BACKEND_E2E__;
  if (!processo || processo.exitCode !== null) return;
  if (process.platform === 'win32') {
    try {
      execSync(`taskkill /pid ${processo.pid} /T /F`, { stdio: 'ignore' });
    } catch {
      // já tinha terminado
    }
  } else {
    processo.kill('SIGTERM');
  }
};

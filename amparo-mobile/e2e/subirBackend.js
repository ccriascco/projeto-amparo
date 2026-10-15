// Sobe o backend de demonstração (amparo-backend, npm run demo) numa porta própria e espera ficar pronto.
const { spawn } = require('child_process');
const path = require('path');

const PORTA = process.env.E2E_PORTA || '3100';

module.exports = async () => {
  process.env.E2E_API_URL = `http://127.0.0.1:${PORTA}`;
  const backend = path.join(__dirname, '..', '..', 'amparo-backend');
  const processo = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'demo'], {
    cwd: backend,
    env: { ...process.env, PORT: PORTA },
    shell: process.platform === 'win32',
  });
  globalThis.__BACKEND_E2E__ = processo;

  let saida = '';
  await new Promise((resolve, reject) => {
    const limite = setTimeout(() => reject(new Error(`Backend de demonstração não subiu em 60 s:\n${saida.slice(-2000)}`)), 60_000);
    const ler = (dados) => {
      saida += dados.toString();
      if (saida.includes('Servidor de demonstração')) {
        clearTimeout(limite);
        resolve();
      }
    };
    processo.stdout.on('data', ler);
    processo.stderr.on('data', ler);
    processo.on('exit', (codigo) => {
      clearTimeout(limite);
      reject(new Error(`Backend de demonstração saiu com código ${codigo}:\n${saida.slice(-2000)}`));
    });
  });
};

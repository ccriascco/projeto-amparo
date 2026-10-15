/**
 * Servidor de DEMONSTRAÇÃO para desenvolver e testar o app: a aplicação real (rotas, guards,
 * validação e services) sobre o banco EM MEMÓRIA dos testes. Nunca acessa o Supabase:
 * o cliente do Supabase é trocado pelo banco em memória e toda a rede é bloqueada,
 * exceto o serviço de IA (simulado pela mesma regra do gabarito, ou o real com IA_REAL=1).
 * Os dados somem quando o processo termina.
 *
 *   npm run demo            (porta 3000; PORT=3001 para mudar)
 *
 * Conta fictícia criada ao iniciar: ver CONTA_DEMO abaixo.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import Module from 'module';

process.env.SUPABASE_URL = 'http://supabase.invalido';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sem-chave-no-modo-demo';
process.env.JWT_SECRET = process.env.JWT_SECRET_DEMO || 'segredo-somente-para-o-servidor-de-demonstracao';
process.env.IA_SHARED_SECRET = process.env.IA_SHARED_SECRET || 'segredo-ia-demo';
process.env.MOSTRAR_LINKS_SIMULADOS = '1';
process.env.GOOGLE_CLIENT_IDS = process.env.GOOGLE_CLIENT_IDS || '';

const { bancoTeste } = require('./support/supabase-memoria');

// Toda importação do @supabase/supabase-js passa a devolver o banco em memória
const carregarOriginal = (Module as any)._load;
(Module as any)._load = function (pedido: string, ...resto: unknown[]) {
  if (pedido === '@supabase/supabase-js') return { createClient: () => bancoTeste.cliente() };
  return carregarOriginal.call(this, pedido, ...resto);
};

export const CONTA_DEMO = {
  cpf: '52998224725',
  email: 'demo@amparo.test',
  telefone: '11984721130',
  nome_completo: 'Marina Alves de Souza',
  data_nascimento: '1991-03-14',
  senha: 'Demo#Amparo2026',
  modo_disfarcado: false,
  codigo_disfarce: '1207',
  guardioes: [
    { nome_completo: 'Ana Beatriz', telefone: '11987650001', parentesco_relacao: 'Família' },
    { nome_completo: 'Lúcia', telefone: '11987650002', parentesco_relacao: 'Amigos' },
    { nome_completo: 'Rafaela', telefone: '11987650003', parentesco_relacao: 'Amigos' },
  ],
};

async function iniciar() {
  // Rede: só o serviço de IA (simulado). Qualquer outro destino falha.
  const { instalarRede } = require('./support/app-teste');
  instalarRede();

  const { NestFactory } = require('@nestjs/core');
  const { AppModule } = require('../src/app.module');
  const { configurarApp } = require('../src/config/configurar-app');
  const app = await NestFactory.create(AppModule);
  configurarApp(app);
  // Só para a versão web do app em desenvolvimento (Expo web)
  app.enableCors({ origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/] });
  const porta = Number(process.env.PORT ?? 3000);
  await app.listen(porta, '0.0.0.0');

  const base = `http://127.0.0.1:${porta}`;
  const cad = await fetchLocal(`${base}/usuarias`, CONTA_DEMO);
  const token = cad.access_token as string;
  const auth = { Authorization: `Bearer ${token}` };
  const dias = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
  await fetchLocal(`${base}/ocorrencias`, { tipos_violencia: ['Psicológica'], mensagem: 'Relato de exemplo (dados fictícios).', data_ocorrencia: dias(1) }, auth);
  await fetchLocal(`${base}/ocorrencias`, { tipos_violencia: ['Patrimonial'], mensagem: 'Outro relato de exemplo.', data_ocorrencia: dias(5) }, auth);
  // Primeira guardiã confirma o convite (como se tivesse aberto o link)
  const g = bancoTeste.tabelas.guardioes[0];
  g.status_convite = 'CONFIRMADO';
  g.confirmado_em = new Date(Date.now() - 2 * 86_400_000).toISOString();

  console.log(`\nServidor de demonstração (banco em memória) em ${base}`);
  console.log(`Conta fictícia: ${CONTA_DEMO.email} — senha e código em test/servidor-memoria.ts (CONTA_DEMO).\n`);
}

// O fetch global está restrito à IA; para semear os dados usamos http direto
async function fetchLocal(url: string, corpo: unknown, cabecalhos: Record<string, string> = {}) {
  const http = require('http');
  const dados = JSON.stringify(corpo);
  return new Promise<any>((resolve, reject) => {
    const req = http.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(dados), ...cabecalhos } }, (res: any) => {
      let texto = '';
      res.on('data', (c: string) => (texto += c));
      res.on('end', () => (res.statusCode < 300 ? resolve(JSON.parse(texto || '{}')) : reject(new Error(`${res.statusCode} ${texto}`))));
    });
    req.on('error', reject);
    req.end(dados);
  });
}

iniciar().catch((erro) => {
  console.error('Falha ao iniciar o servidor de demonstração:', erro);
  process.exit(1);
});

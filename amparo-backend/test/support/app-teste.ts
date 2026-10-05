/**
 * Monta a aplicação real (AppModule + configuração de produção) sobre o banco em memória.
 *
 * Rede: todo `fetch` é interceptado. Só o serviço de IA é atendido (simulado, ou o real
 * quando IA_REAL=1). Qualquer outro destino falha o teste, para garantir que nada chegue
 * ao Supabase de produção.
 */
import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configurarApp } from '../../src/configurar-app';
import { bancoTeste } from './supabase-memoria';

export type ModoIA = 'normal' | 'erro500' | 'erroRede' | 'lenta';

export const ia = {
  modo: 'normal' as ModoIA,
  chamadas: [] as Array<{ payload: any; segredo: string | null }>,
  usarReal: process.env.IA_REAL === '1',
};

const DIAS_RECENTE = 15;
const NIVEIS = ['Baixo', 'Medio', 'Alto'];

/** Mesma regra do gabarito em amparo-ia/pipeline_v2/regras.py, aplicada sobre as features. */
export function riscoPelaRegra(f: any): string {
  if (f.qtd_ocorrencias_totais === 0 && f.qtd_panico_acionado === 0) return f.possui_historico_anterior ? 'Baixo' : 'Medio';
  let nivel = f.teve_viol_fisica || f.teve_viol_sexual ? 2 : f.teve_ameaca ? 1 : 0;
  if (f.frequencia_aumentou && nivel < 2) nivel += 1;
  if (f.qtd_panico_acionado > 0) {
    nivel = Math.max(nivel, 1);
    if (nivel === 2 || f.dias_desde_ultima_ocorrencia <= DIAS_RECENTE) nivel = 2;
  }
  return NIVEIS[nivel];
}

const fetchOriginal = globalThis.fetch;

export function instalarRede(): void {
  globalThis.fetch = (async (url: any, opcoes: any = {}) => {
    const destino = String(url);
    const urlIA = process.env.IA_SERVICE_URL || 'http://127.0.0.1:8000';
    if (!destino.startsWith(urlIA)) {
      throw new Error(`[rede bloqueada no teste] tentativa de acesso a ${destino}`);
    }
    const payload = JSON.parse(opcoes.body ?? '{}');
    const segredo = opcoes.headers?.['X-Internal-Secret'] ?? null;
    ia.chamadas.push({ payload, segredo });

    if (ia.usarReal && ia.modo === 'normal') return fetchOriginal(url, opcoes);
    if (ia.modo === 'erroRede') throw new TypeError('fetch failed');
    if (ia.modo === 'erro500') return new Response('{"detail":"erro interno"}', { status: 500 });
    if (ia.modo === 'lenta') {
      await new Promise((resolve, reject) => {
        const t = setTimeout(resolve, 8000);
        opcoes.signal?.addEventListener('abort', () => {
          clearTimeout(t);
          reject(Object.assign(new Error('This operation was aborted'), { name: 'AbortError' }));
        });
      });
    }
    return new Response(JSON.stringify({ risco: riscoPelaRegra(payload), codigo: 0, justificativa: 'simulada' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
}

export function restaurarRede(): void {
  globalThis.fetch = fetchOriginal;
}

export const logs: string[] = [];

export function capturarLogs(): void {
  for (const nivel of ['log', 'warn', 'error', 'debug', 'verbose'] as const) {
    jest.spyOn(Logger.prototype, nivel).mockImplementation(function (this: any, ...args: any[]) {
      logs.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
    } as any);
  }
  for (const nivel of ['log', 'warn', 'error', 'info'] as const) {
    jest.spyOn(console, nivel).mockImplementation((...args: any[]) => {
      logs.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
    });
  }
}

export async function criarApp(): Promise<INestApplication> {
  const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = modulo.createNestApplication({ logger: false });
  configurarApp(app);
  await app.init();
  return app;
}

export function zerarLimites(app: INestApplication): void {
  const armazenamento = app.get(ThrottlerStorage, { strict: false }) as any;
  armazenamento.storage.clear();
  armazenamento.hitExpirations?.clear();
}

let sequencia = 0;

export function cpfValido(): string {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  if (n.every((d) => d === n[0])) n[8] = (n[0] + 1) % 10;
  const dv = (arr: number[], p: number) => {
    const r = (arr.reduce((s, d, i) => s + d * (p - i), 0) * 10) % 11;
    return r === 10 ? 0 : r;
  };
  n.push(dv(n, 10));
  n.push(dv(n, 11));
  return n.join('');
}

export function dadosUsuaria(extra: Record<string, any> = {}) {
  sequencia += 1;
  return {
    cpf: cpfValido(),
    email: `teste${sequencia}.${Date.now()}@amparo-teste.local`,
    telefone: '11988887777',
    nome_completo: `Usuária Teste ${sequencia}`,
    data_nascimento: '1990-03-15',
    senha: 'SenhaForte123',
    senha_app: 'calc98765',
    guardioes: [{ nome_completo: 'Guardiã Principal', telefone: `1199999${String(1000 + sequencia).slice(-4)}` }],
    ...extra,
  };
}

export async function criarUsuaria(app: INestApplication, extra: Record<string, any> = {}) {
  zerarLimites(app);
  const dados = dadosUsuaria(extra);
  const cad = await request(app.getHttpServer()).post('/usuarias').send(dados);
  if (cad.status !== 201) throw new Error(`cadastro falhou: ${cad.status} ${JSON.stringify(cad.body)}`);
  const login = await request(app.getHttpServer()).post('/usuarias/login').send({ email: dados.email, senha: dados.senha });
  return { id: cad.body.usuaria_id as string, token: login.body.access_token as string, dados };
}

export async function esperar(condicao: () => boolean, limiteMs = 3000): Promise<boolean> {
  const inicio = Date.now();
  while (Date.now() - inicio < limiteMs) {
    if (condicao()) return true;
    await new Promise((r) => setTimeout(r, 20));
  }
  return condicao();
}

export function nivelRisco(usuariaId: string): string | null {
  return bancoTeste.tabelas.usuarias.find((u) => u.id === usuariaId)?.nivel_risco ?? null;
}

let contadorMensagem = 0;
export function mensagemUnica(base = 'relato'): string {
  contadorMensagem += 1;
  return `${base} ${contadorMensagem}`;
}

export const ARQUIVOS = {
  jpeg: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9]),
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]),
  mp3: Buffer.concat([Buffer.from('ID3'), Buffer.from([0x04, 0x00, 0x00, 0x00, 0x00, 0x00])]),
  mp4: Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypmp42'), Buffer.alloc(8)]),
  pdf: Buffer.from('%PDF-1.4\n%fake\n'),
  exe: Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00', 'binary'),
};

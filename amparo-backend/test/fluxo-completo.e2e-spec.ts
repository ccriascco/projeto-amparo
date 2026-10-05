/**
 * Teste de fluxo completo do backend: a aplicação real (rotas, guards, validação e
 * services) sobre um banco em memória. Nunca acessa o Supabase de produção.
 *
 */
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => require('./support/supabase-memoria').bancoTeste.cliente(),
}));

import { createHash } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bancoTeste } from './support/supabase-memoria';
import {
  ARQUIVOS, capturarLogs, criarApp, criarUsuaria, dadosUsuaria, esperar, ia, instalarRede,
  logs, mensagemUnica, nivelRisco, restaurarRede, zerarLimites,
} from './support/app-teste';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwt = require('jsonwebtoken');

jest.setTimeout(30_000);

let app: INestApplication;
const http = () => request(app.getHttpServer());
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const temposEmergencia: number[] = [];
const diasAtras = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

beforeAll(async () => {
  capturarLogs();
  instalarRede();
  app = await criarApp();
});

afterAll(async () => {
  await app.close();
  restaurarRede();
  const pasta = join(__dirname, '..', 'test-results');
  mkdirSync(pasta, { recursive: true });
  writeFileSync(join(pasta, 'tempos-emergencia.json'), JSON.stringify(temposEmergencia));
});

beforeEach(() => {
  zerarLimites(app);
  ia.modo = 'normal';
});

async function novaOcorrencia(token: string, tipos: string[], extra: Record<string, any> = {}) {
  return http().post('/ocorrencias').set(auth(token)).send({ tipos_violencia: tipos, mensagem: mensagemUnica(), ...extra });
}

async function anexar(token: string, ocorrenciaId: string, conteudo: Buffer, nome: string, tipo: string) {
  return http().post(`/ocorrencias/${ocorrenciaId}/evidencias`).set(auth(token))
    .attach('arquivo', conteudo, { filename: nome, contentType: tipo });
}

const linhasNotificacao = () => logs.filter((l) => l.includes('Enviando'));
const notificouTelefone = (telefone: string) => linhasNotificacao().some((l) => l.includes(telefone.slice(-4)));

/* ===================================================================== */
describe('1. Cadastro e login', () => {
  it('[C-01] cadastro com dados válidos cria a usuária e a guardiã', async () => {
    const dados = dadosUsuaria();
    const r = await http().post('/usuarias').send(dados);
    expect(r.status).toBe(201);
    const u = bancoTeste.tabelas.usuarias.find((x) => x.id === r.body.usuaria_id);
    expect(u?.email).toBe(dados.email);
    expect(bancoTeste.tabelas.guardioes.filter((g) => g.usuaria_id === u?.id)).toHaveLength(1);
  });

  it('[C-02] senha e senha de disfarce são salvas com bcrypt, nunca em texto puro', async () => {
    const dados = dadosUsuaria();
    const r = await http().post('/usuarias').send(dados);
    const u = bancoTeste.tabelas.usuarias.find((x) => x.id === r.body.usuaria_id)!;
    expect(u.senha_hash).toMatch(/^\$2[aby]\$10\$/);
    expect(u.senha_app).toMatch(/^\$2[aby]\$10\$/);
    expect(JSON.stringify(u)).not.toContain(dados.senha);
    expect(JSON.stringify(u)).not.toContain(dados.senha_app);
  });

  it('[C-03] cadastro com corpo vazio é recusado (400)', async () => {
    expect((await http().post('/usuarias').send({})).status).toBe(400);
  });

  it('[C-04] cadastro com campos obrigatórios em branco é recusado (400)', async () => {
    const r = await http().post('/usuarias').send(dadosUsuaria({ nome_completo: '', email: '', cpf: '' }));
    expect(r.status).toBe(400);
  });

  it('[C-05] e-mail inválido é recusado (400)', async () => {
    expect((await http().post('/usuarias').send(dadosUsuaria({ email: 'nao-e-email' }))).status).toBe(400);
  });

  it('[C-06] senha com menos de 8 caracteres é recusada (400)', async () => {
    expect((await http().post('/usuarias').send(dadosUsuaria({ senha: '1234567' }))).status).toBe(400);
  });

  it.each(['aaaaaaaa', '12345678', 'abcdefgh', 'senhaforte', '98765432', 'senha123', '11111111'])(
    '[C-07] senha fraca %p é recusada (400)', async (senha) => {
      const r = await http().post('/usuarias').send(dadosUsuaria({ senha }));
      expect(r.status).toBe(400);
      expect(JSON.stringify(r.body)).toMatch(/Senha fraca/);
    },
  );

  it('[C-07b] senha com letras e números, sem sequência, é aceita', async () => {
    expect((await http().post('/usuarias').send(dadosUsuaria({ senha: 'Amparo2026Seguro' }))).status).toBe(201);
  });

  it('[C-08] e-mail já cadastrado é recusado com 409 e mensagem genérica', async () => {
    const dados = dadosUsuaria();
    await http().post('/usuarias').send(dados);
    const r = await http().post('/usuarias').send(dadosUsuaria({ email: dados.email }));
    expect(r.status).toBe(409);
    expect(JSON.stringify(r.body)).not.toMatch(/usuarias_|constraint|duplicate/i);
  });

  it('[C-09] CPF já cadastrado (mesmo com máscara diferente) é recusado com 409', async () => {
    const dados = dadosUsuaria();
    await http().post('/usuarias').send(dados);
    const comMascara = dados.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    const r = await http().post('/usuarias').send(dadosUsuaria({ cpf: comMascara }));
    expect(r.status).toBe(409);
  });

  it('[C-10] campo não permitido no cadastro (ex.: nivel_risco) é recusado (400)', async () => {
    expect((await http().post('/usuarias').send(dadosUsuaria({ nivel_risco: 'Baixo' }))).status).toBe(400);
  });

  it('[L-01] login com dados corretos gera token com jti e validade de 2h', async () => {
    const { token } = await criarUsuaria(app);
    const p = jwt.decode(token);
    expect(p.jti).toEqual(expect.any(String));
    expect(p.exp - p.iat).toBe(2 * 60 * 60);
  });

  it('[L-02] login com senha errada responde 401 com mensagem genérica', async () => {
    const { dados } = await criarUsuaria(app);
    const r = await http().post('/usuarias/login').send({ email: dados.email, senha: 'SenhaErrada99' });
    expect(r.status).toBe(401);
    expect(r.body.erro).toBe('E-mail ou senha inválidos');
  });

  it('[L-03] login de usuária inexistente responde igual à senha errada (não revela cadastro)', async () => {
    const r = await http().post('/usuarias/login').send({ email: 'ninguem@amparo-teste.local', senha: 'SenhaForte123' });
    expect(r.status).toBe(401);
    expect(r.body.erro).toBe('E-mail ou senha inválidos');
  });

  it('[L-04] rota protegida sem token responde 401', async () => {
    expect((await http().get('/ocorrencias')).status).toBe(401);
  });

  it('[L-05] rota protegida com token malformado responde 401', async () => {
    expect((await http().get('/ocorrencias').set(auth('nao.e.token'))).status).toBe(401);
  });

  it('[L-06] token expirado é recusado (401)', async () => {
    const { id } = await criarUsuaria(app);
    const expirado = jwt.sign({ sub: id, jti: '00000000-0000-4000-8000-000000000000', exp: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_SECRET);
    expect((await http().get('/guardioes').set(auth(expirado))).status).toBe(401);
  });

  it('[L-07] token assinado com outro segredo é recusado (401)', async () => {
    const { id } = await criarUsuaria(app);
    const forjado = jwt.sign({ sub: id, jti: '00000000-0000-4000-8000-000000000001' }, 'segredo-de-atacante', { expiresIn: '1h' });
    expect((await http().get('/guardioes').set(auth(forjado))).status).toBe(401);
  });

  it('[L-08] token sem jti (formato antigo) é recusado (401)', async () => {
    const { id } = await criarUsuaria(app);
    const semJti = jwt.sign({ sub: id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    expect((await http().get('/guardioes').set(auth(semJti))).status).toBe(401);
  });

  it('[L-09] login disfarçado aceita a senha de disfarce e recusa a senha real', async () => {
    const { dados } = await criarUsuaria(app);
    const ok = await http().post('/usuarias/login-disfarcado').send({ email: dados.email, senha: dados.senha_app });
    const errada = await http().post('/usuarias/login-disfarcado').send({ email: dados.email, senha: dados.senha });
    expect([ok.status, errada.status]).toEqual([201, 401]);
  });

  it('[L-10] 11ª tentativa de login em 1 minuto é bloqueada (429)', async () => {
    const { dados } = await criarUsuaria(app);
    zerarLimites(app);
    const status: number[] = [];
    for (let i = 0; i < 11; i++) {
      status.push((await http().post('/usuarias/login').send({ email: dados.email, senha: 'errada123' })).status);
    }
    expect(status.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(status[10]).toBe(429);
  });
});

/* ===================================================================== */
describe('2. Ocorrências', () => {
  it('[O-01] cria ocorrência com todos os campos válidos e persiste', async () => {
    const { id, token } = await criarUsuaria(app);
    const r = await novaOcorrencia(token, ['Física'], { latitude: -23.55, longitude: -46.63 });
    expect(r.status).toBe(201);
    const o = bancoTeste.tabelas.ocorrencias.find((x) => x.id === r.body.ocorrencia.id)!;
    expect(o).toMatchObject({ usuaria_id: id, tipos_violencia: ['Física'], latitude: -23.55, longitude: -46.63 });
    expect(o.criado_em).toEqual(expect.any(String));
  });

  it.each(['Física', 'Psicológica', 'Sexual', 'Patrimonial', 'Moral', 'Ameaça'])(
    '[O-02] tipo de violência "%s" é salvo corretamente', async (tipo) => {
      const { token } = await criarUsuaria(app);
      const r = await novaOcorrencia(token, [tipo]);
      expect(r.status).toBe(201);
      expect(bancoTeste.tabelas.ocorrencias.find((x) => x.id === r.body.ocorrencia.id)?.tipos_violencia).toEqual([tipo]);
    },
  );

  it('[O-03] tipo de violência inexistente é recusado (400)', async () => {
    const { token } = await criarUsuaria(app);
    expect((await novaOcorrencia(token, ['Inventado'])).status).toBe(400);
  });

  it('[O-04] ocorrência sem tipo de violência (vazio ou ausente) é recusada (400)', async () => {
    const { token } = await criarUsuaria(app);
    const vazio = await novaOcorrencia(token, []);
    const ausente = await http().post('/ocorrencias').set(auth(token)).send({ mensagem: 'sem tipo' });
    expect([vazio.status, ausente.status]).toEqual([400, 400]);
  });

  it('[O-05] coordenadas inválidas e mensagem acima de 2.000 caracteres são recusadas (400)', async () => {
    const { token } = await criarUsuaria(app);
    const lat = await novaOcorrencia(token, ['Moral'], { latitude: 999 });
    const msg = await http().post('/ocorrencias').set(auth(token)).send({ tipos_violencia: ['Moral'], mensagem: 'x'.repeat(2001) });
    expect([lat.status, msg.status]).toEqual([400, 400]);
  });

  it.each([
    ['inexistente', '2026-99-99'],
    ['em formato livre', 'ontem'],
    ['futura', 'FUTURA'],
  ])('[O-06] data da ocorrência %s é recusada (400)', async (_d, valor) => {
    const { token } = await criarUsuaria(app);
    const data = valor === 'FUTURA' ? new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10) : valor;
    expect((await novaOcorrencia(token, ['Moral'], { data_ocorrencia: data })).status).toBe(400);
  });

  it('[O-07] registra a data em que a violência aconteceu', async () => {
    const { token } = await criarUsuaria(app);
    const data = diasAtras(12);
    const r = await novaOcorrencia(token, ['Moral'], { data_ocorrencia: data });
    expect(r.status).toBe(201);
    expect(bancoTeste.tabelas.ocorrencias.find((o) => o.id === r.body.ocorrencia.id)?.data_ocorrencia).toBe(data);
  });

  it('[O-08] listagem traz só as ocorrências da usuária, paginadas, com total', async () => {
    const a = await criarUsuaria(app);
    const b = await criarUsuaria(app);
    for (const t of ['Moral', 'Psicológica', 'Patrimonial']) await novaOcorrencia(a.token, [t]);
    await novaOcorrencia(b.token, ['Moral']);
    const r = await http().get('/ocorrencias?limit=2&offset=0').set(auth(a.token));
    expect(r.status).toBe(200);
    expect(r.body.total).toBe(3);
    expect(r.body.ocorrencias).toHaveLength(2);
    expect(r.body.ocorrencias.every((o: any) => o.usuaria_id === a.id)).toBe(true);
  });

  it('[O-09] visualiza a própria ocorrência com os anexos; outra usuária recebe 403 e inexistente 404', async () => {
    const a = await criarUsuaria(app);
    const b = await criarUsuaria(app);
    const o = await novaOcorrencia(a.token, ['Moral']);
    await anexar(a.token, o.body.ocorrencia.id, ARQUIVOS.jpeg, 'f.jpg', 'image/jpeg');
    const minha = await http().get(`/ocorrencias/${o.body.ocorrencia.id}`).set(auth(a.token));
    const alheia = await http().get(`/ocorrencias/${o.body.ocorrencia.id}`).set(auth(b.token));
    const inexistente = await http().get('/ocorrencias/00000000-0000-4000-8000-000000000000').set(auth(a.token));
    expect(minha.status).toBe(200);
    expect(minha.body.ocorrencia.evidencias).toHaveLength(1);
    expect([alheia.status, inexistente.status]).toEqual([403, 404]);
  });

  it('[O-10] edita a ocorrência, registra a data da edição e recalcula o risco', async () => {
    const { id, token } = await criarUsuaria(app);
    const o = await novaOcorrencia(token, ['Moral']);
    await esperar(() => nivelRisco(id) === 'Baixo');
    const r = await http().put(`/ocorrencias/${o.body.ocorrencia.id}`).set(auth(token)).send({ tipos_violencia: ['Física'], mensagem: 'corrigido' });
    expect(r.status).toBe(200);
    const salva = bancoTeste.tabelas.ocorrencias.find((x) => x.id === o.body.ocorrencia.id)!;
    expect(salva).toMatchObject({ tipos_violencia: ['Física'], mensagem: 'corrigido' });
    expect(salva.atualizado_em).toEqual(expect.any(String));
    expect(await esperar(() => nivelRisco(id) === 'Alto')).toBe(true);
    expect(await esperar(() => salva.nivel_risco === 'Alto')).toBe(true);
  });

  it('[O-10b] edição vazia, com campo inválido ou de outra usuária é recusada', async () => {
    const a = await criarUsuaria(app);
    const b = await criarUsuaria(app);
    const o = await novaOcorrencia(a.token, ['Moral']);
    const url = `/ocorrencias/${o.body.ocorrencia.id}`;
    const vazia = await http().put(url).set(auth(a.token)).send({});
    const invalida = await http().put(url).set(auth(a.token)).send({ tipos_violencia: ['Inventado'] });
    const proibida = await http().put(url).set(auth(a.token)).send({ usuaria_id: b.id });
    const alheia = await http().put(url).set(auth(b.token)).send({ mensagem: 'invasão' });
    expect([vazia.status, invalida.status, proibida.status, alheia.status]).toEqual([400, 400, 400, 403]);
    expect(bancoTeste.tabelas.ocorrencias.find((x) => x.id === o.body.ocorrencia.id)?.usuaria_id).toBe(a.id);
  });

  it('[O-11] exclui a própria ocorrência', async () => {
    const { token } = await criarUsuaria(app);
    const o = await novaOcorrencia(token, ['Moral']);
    expect((await http().delete(`/ocorrencias/${o.body.ocorrencia.id}`).set(auth(token))).status).toBe(200);
    expect(bancoTeste.tabelas.ocorrencias.some((x) => x.id === o.body.ocorrencia.id)).toBe(false);
  });

  it('[O-12] usuária B não vê nem exclui ocorrência da usuária A', async () => {
    const a = await criarUsuaria(app);
    const b = await criarUsuaria(app);
    const o = await novaOcorrencia(a.token, ['Física']);
    const lista = await http().get('/ocorrencias').set(auth(b.token));
    const del = await http().delete(`/ocorrencias/${o.body.ocorrencia.id}`).set(auth(b.token));
    expect(lista.body.ocorrencias.some((x: any) => x.id === o.body.ocorrencia.id)).toBe(false);
    expect(del.status).toBe(403);
    expect(bancoTeste.tabelas.ocorrencias.some((x) => x.id === o.body.ocorrencia.id)).toBe(true);
  });

  it('[O-13] usuaria_id de outra usuária enviado no corpo é recusado (400) e nada é gravado na conta dela', async () => {
    const a = await criarUsuaria(app);
    const b = await criarUsuaria(app);
    const r = await http().post('/ocorrencias').set(auth(b.token)).send({ tipos_violencia: ['Moral'], usuaria_id: a.id });
    expect(r.status).toBe(400);
    expect(bancoTeste.tabelas.ocorrencias.filter((x) => x.usuaria_id === a.id)).toHaveLength(0);
  });

  it('[O-14] ocorrência idêntica reenviada em seguida é recusada (409)', async () => {
    const { token } = await criarUsuaria(app);
    const corpo = { tipos_violencia: ['Moral'], mensagem: 'mesmo texto' };
    const r1 = await http().post('/ocorrencias').set(auth(token)).send(corpo);
    const r2 = await http().post('/ocorrencias').set(auth(token)).send(corpo);
    expect([r1.status, r2.status]).toEqual([201, 409]);
  });
});

/* ===================================================================== */
describe('3. Anexos', () => {
  it.each([
    ['imagem JPEG', ARQUIVOS.jpeg, 'foto.jpg', 'image/jpeg', 'IMAGE', 'jpg'],
    ['imagem PNG', ARQUIVOS.png, 'foto.png', 'image/png', 'IMAGE', 'png'],
    ['áudio MP3', ARQUIVOS.mp3, 'audio.mp3', 'audio/mpeg', 'AUDIO', 'mp3'],
    ['vídeo MP4', ARQUIVOS.mp4, 'video.mp4', 'video/mp4', 'VIDEO', 'mp4'],
  ])('[A-01] anexa %s, vincula à ocorrência certa e guarda com hash', async (_n, conteudo, nome, mime, tipo, ext) => {
    const { id, token } = await criarUsuaria(app);
    const o = await novaOcorrencia(token, ['Moral']);
    const r = await anexar(token, o.body.ocorrencia.id, conteudo, nome, mime);
    expect(r.status).toBe(201);
    const ev = r.body.evidencia;
    expect(ev).toMatchObject({ ocorrencia_id: o.body.ocorrencia.id, tipo });
    expect(ev.caminho_storage).toMatch(new RegExp(`^${id}/${o.body.ocorrencia.id}/[0-9a-f-]{36}\\.${ext}$`));
    expect(ev.hash_integridade).toBe(createHash('sha256').update(conteudo).digest('hex'));
    expect(bancoTeste.storage.evidencias_amparo.get(ev.caminho_storage)?.conteudo.equals(conteudo)).toBe(true);
  });

  it('[A-02] PDF falso (executável renomeado para .pdf) é recusado (415)', async () => {
    const { token } = await criarUsuaria(app);
    const o = await novaOcorrencia(token, ['Moral']);
    expect((await anexar(token, o.body.ocorrencia.id, ARQUIVOS.exe, 'bo.pdf', 'application/pdf')).status).toBe(415);
  });

  it('[A-03] aceita documento PDF (ex.: boletim ou laudo) como DOCUMENTO', async () => {
    const { id, token } = await criarUsuaria(app);
    const o = await novaOcorrencia(token, ['Moral']);
    const r = await anexar(token, o.body.ocorrencia.id, ARQUIVOS.pdf, 'bo.pdf', 'application/pdf');
    expect(r.status).toBe(201);
    expect(r.body.evidencia.tipo).toBe('DOCUMENTO');
    expect(r.body.evidencia.caminho_storage).toMatch(new RegExp(`^${id}/.+\\.pdf$`));
  });

  it('[A-03b] PDF acima de 10 MB é recusado (413)', async () => {
    const { token } = await criarUsuaria(app);
    const o = await novaOcorrencia(token, ['Moral']);
    const grande = Buffer.concat([ARQUIVOS.pdf, Buffer.alloc(11 * 1024 * 1024)]);
    expect((await anexar(token, o.body.ocorrencia.id, grande, 'grande.pdf', 'application/pdf')).status).toBe(413);
  });

  it('[A-04] executável é recusado (415)', async () => {
    const { token } = await criarUsuaria(app);
    const o = await novaOcorrencia(token, ['Moral']);
    expect((await anexar(token, o.body.ocorrencia.id, ARQUIVOS.exe, 'virus.exe', 'application/x-msdownload')).status).toBe(415);
  });

  it('[A-05] foto acima de 5 MB é recusada (413)', async () => {
    const { token } = await criarUsuaria(app);
    const o = await novaOcorrencia(token, ['Moral']);
    const grande = Buffer.concat([ARQUIVOS.jpeg, Buffer.alloc(6 * 1024 * 1024)]);
    expect((await anexar(token, o.body.ocorrencia.id, grande, 'grande.jpg', 'image/jpeg')).status).toBe(413);
  });

  it('[A-06] arquivo acima do limite geral de 20 MB é recusado (413)', async () => {
    const { token } = await criarUsuaria(app);
    const o = await novaOcorrencia(token, ['Moral']);
    const enorme = Buffer.concat([ARQUIVOS.mp4, Buffer.alloc(21 * 1024 * 1024)]);
    expect((await anexar(token, o.body.ocorrencia.id, enorme, 'longo.mp4', 'video/mp4')).status).toBe(413);
  });

  it('[A-07] arquivo vazio é recusado e nada é gravado', async () => {
    const { token } = await criarUsuaria(app);
    const o = await novaOcorrencia(token, ['Moral']);
    const r = await anexar(token, o.body.ocorrencia.id, Buffer.alloc(0), 'vazio.jpg', 'image/jpeg');
    expect([400, 415]).toContain(r.status);
    expect(bancoTeste.tabelas.evidencias.filter((e) => e.ocorrencia_id === o.body.ocorrencia.id)).toHaveLength(0);
  });

  it('[A-08] executável renomeado para .jpg é recusado (415)', async () => {
    const { token } = await criarUsuaria(app);
    const o = await novaOcorrencia(token, ['Moral']);
    expect((await anexar(token, o.body.ocorrencia.id, ARQUIVOS.exe, 'foto.jpg', 'image/jpeg')).status).toBe(415);
  });

  it('[A-09] nome original é descartado (sem path traversal no armazenamento)', async () => {
    const { token } = await criarUsuaria(app);
    const o = await novaOcorrencia(token, ['Moral']);
    const r = await anexar(token, o.body.ocorrencia.id, ARQUIVOS.jpeg, '../../etc/passwd.jpg', 'image/jpeg');
    expect(r.status).toBe(201);
    expect(r.body.evidencia.caminho_storage).not.toMatch(/\.\.|passwd/);
  });

  it('[A-10] usuária B não anexa arquivo em ocorrência da A (403) e nada é gravado', async () => {
    const a = await criarUsuaria(app);
    const b = await criarUsuaria(app);
    const o = await novaOcorrencia(a.token, ['Moral']);
    const antes = bancoTeste.storage.evidencias_amparo.size;
    expect((await anexar(b.token, o.body.ocorrencia.id, ARQUIVOS.jpeg, 'f.jpg', 'image/jpeg')).status).toBe(403);
    expect(bancoTeste.storage.evidencias_amparo.size).toBe(antes);
  });

  it('[A-11] metadados dos anexos só aparecem para a dona', async () => {
    const a = await criarUsuaria(app);
    const b = await criarUsuaria(app);
    const o = await novaOcorrencia(a.token, ['Moral']);
    await anexar(a.token, o.body.ocorrencia.id, ARQUIVOS.jpeg, 'f.jpg', 'image/jpeg');
    const listaA = await http().get('/ocorrencias').set(auth(a.token));
    const listaB = await http().get('/ocorrencias').set(auth(b.token));
    expect(listaA.body.ocorrencias[0].evidencias).toHaveLength(1);
    expect(JSON.stringify(listaB.body)).not.toContain(o.body.ocorrencia.id);
  });

  it('[A-12] a dona recebe um link temporário (5 min) para baixar a evidência', async () => {
    const { token } = await criarUsuaria(app);
    const o = await novaOcorrencia(token, ['Moral']);
    const ev = (await anexar(token, o.body.ocorrencia.id, ARQUIVOS.jpeg, 'f.jpg', 'image/jpeg')).body.evidencia;
    const r = await http().get(`/ocorrencias/${o.body.ocorrencia.id}/evidencias/${ev.id}`).set(auth(token));
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ expira_em_segundos: 300, tipo: 'IMAGE', hash_integridade: ev.hash_integridade });
    expect(r.body.url).toContain(ev.caminho_storage);
  });

  it('[A-12b] outra usuária não obtém o link (403), nem por uma ocorrência própria (404)', async () => {
    const a = await criarUsuaria(app);
    const b = await criarUsuaria(app);
    const oA = await novaOcorrencia(a.token, ['Moral']);
    const oB = await novaOcorrencia(b.token, ['Moral']);
    const ev = (await anexar(a.token, oA.body.ocorrencia.id, ARQUIVOS.jpeg, 'f.jpg', 'image/jpeg')).body.evidencia;
    const direto = await http().get(`/ocorrencias/${oA.body.ocorrencia.id}/evidencias/${ev.id}`).set(auth(b.token));
    const cruzado = await http().get(`/ocorrencias/${oB.body.ocorrencia.id}/evidencias/${ev.id}`).set(auth(b.token));
    expect([direto.status, cruzado.status]).toEqual([403, 404]);
    expect(JSON.stringify(cruzado.body)).not.toContain(ev.caminho_storage);
  });

  it('[A-13] excluir a ocorrência remove os anexos do banco e do armazenamento', async () => {
    const { token } = await criarUsuaria(app);
    const o = await novaOcorrencia(token, ['Moral']);
    const e1 = (await anexar(token, o.body.ocorrencia.id, ARQUIVOS.jpeg, 'f.jpg', 'image/jpeg')).body.evidencia;
    const e2 = (await anexar(token, o.body.ocorrencia.id, ARQUIVOS.mp3, 'a.mp3', 'audio/mpeg')).body.evidencia;
    await http().delete(`/ocorrencias/${o.body.ocorrencia.id}`).set(auth(token));
    expect(bancoTeste.tabelas.evidencias.filter((e) => e.ocorrencia_id === o.body.ocorrencia.id)).toHaveLength(0);
    expect(bancoTeste.storage.evidencias_amparo.has(e1.caminho_storage)).toBe(false);
    expect(bancoTeste.storage.evidencias_amparo.has(e2.caminho_storage)).toBe(false);
  });
});

/* ===================================================================== */
describe('4. Botão de emergência', () => {
  it('[E-01] acionamento cria registro ATIVO com data/hora e localização', async () => {
    const { id, token } = await criarUsuaria(app);
    const r = await http().post('/emergencias/acionar').set(auth(token)).send({ latitude: -23.5505, longitude: -46.6333 });
    expect(r.status).toBe(201);
    const e = bancoTeste.tabelas.emergencias.find((x) => x.id === r.body.emergencia_id)!;
    expect(e).toMatchObject({ usuaria_id: id, status: 'ATIVA', encerrado_em: null });
    expect(Number.isNaN(Date.parse(e.criado_em))).toBe(false);
    const gps = bancoTeste.tabelas.rastreamento_gps.filter((g) => g.emergencia_id === e.id);
    expect(gps).toHaveLength(1);
    expect(gps[0]).toMatchObject({ latitude: -23.5505, longitude: -46.6333 });
    expect(gps[0].registrado_em).toEqual(expect.any(String));
  });

  it('[E-02] todas as guardiãs cadastradas são notificadas', async () => {
    const extras = [{ nome_completo: 'Guardiã Dois', telefone: '11977770002' }, { nome_completo: 'Guardiã Três', telefone: '11977770003' }];
    const u = await criarUsuaria(app);
    for (const g of extras) await http().post('/guardioes').set(auth(u.token)).send(g);
    logs.length = 0;
    const r = await http().post('/emergencias/acionar').set(auth(u.token)).send({});
    expect(r.body.guardioes_notificados).toBe(3);
    expect(r.body.status_notificacao).toBe('SUCESSO');
    expect(linhasNotificacao()).toHaveLength(3);
    for (const g of [u.dados.guardioes[0], ...extras]) expect(notificouTelefone(g.telefone)).toBe(true);
  });

  it('[E-03] acionamento sem localização é aceito e não cria ponto de GPS', async () => {
    const { token } = await criarUsuaria(app);
    const r = await http().post('/emergencias/acionar').set(auth(token)).send({});
    expect(r.status).toBe(201);
    expect(bancoTeste.tabelas.rastreamento_gps.filter((g) => g.emergencia_id === r.body.emergencia_id)).toHaveLength(0);
  });

  it('[E-04] usuária sem guardiãs (dado legado) aciona e recebe status de alerta sem destinatário', async () => {
    const { id, token } = await criarUsuaria(app);
    bancoTeste.tabelas.guardioes = bancoTeste.tabelas.guardioes.filter((g) => g.usuaria_id !== id);
    const r = await http().post('/emergencias/acionar').set(auth(token)).send({});
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ guardioes_notificados: 0, status_notificacao: 'ALERTA_FALHA_SEM_GUARDIOES' });
  });

  it('[E-05] cinco acionamentos simultâneos geram 1 emergência e 4 recusas (409)', async () => {
    const { id, token } = await criarUsuaria(app);
    const status = await Promise.all(Array.from({ length: 5 }, () =>
      http().post('/emergencias/acionar').set(auth(token)).send({}).then((r) => r.status)));
    expect(status.filter((s) => s === 201)).toHaveLength(1);
    expect(status.filter((s) => s === 409)).toHaveLength(4);
    expect(bancoTeste.tabelas.emergencias.filter((e) => e.usuaria_id === id && e.status === 'ATIVA')).toHaveLength(1);
  });

  it('[E-06] acionamentos seguidos: o segundo é recusado; após encerrar, um novo é aceito', async () => {
    const { token } = await criarUsuaria(app);
    const r1 = await http().post('/emergencias/acionar').set(auth(token)).send({});
    const r2 = await http().post('/emergencias/acionar').set(auth(token)).send({});
    await http().post(`/emergencias/${r1.body.emergencia_id}/encerrar`).set(auth(token));
    const r3 = await http().post('/emergencias/acionar').set(auth(token)).send({});
    expect([r1.status, r2.status, r3.status]).toEqual([201, 409, 201]);
  });

  it('[E-07] rastreamento: atualiza localização e lista a rota em ordem', async () => {
    const { token } = await criarUsuaria(app);
    const e = await http().post('/emergencias/acionar').set(auth(token)).send({ latitude: -23.5, longitude: -46.6 });
    await http().post(`/emergencias/${e.body.emergencia_id}/localizacao`).set(auth(token)).send({ latitude: -23.51, longitude: -46.61 });
    const rota = await http().get(`/emergencias/${e.body.emergencia_id}/rota`).set(auth(token));
    expect(rota.body.rastro_gps.map((p: any) => p.latitude)).toEqual([-23.5, -23.51]);
  });

  it('[E-08] usuária B não aciona em nome da A, nem lê ou altera a emergência da A', async () => {
    const a = await criarUsuaria(app);
    const b = await criarUsuaria(app);
    const e = await http().post('/emergencias/acionar').set(auth(a.token)).send({});
    const emNome = await http().post('/emergencias/acionar').set(auth(b.token)).send({ usuaria_id: a.id });
    const rota = await http().get(`/emergencias/${e.body.emergencia_id}/rota`).set(auth(b.token));
    const loc = await http().post(`/emergencias/${e.body.emergencia_id}/localizacao`).set(auth(b.token)).send({ latitude: 0, longitude: 0 });
    const enc = await http().post(`/emergencias/${e.body.emergencia_id}/encerrar`).set(auth(b.token));
    expect([emNome.status, rota.status, loc.status, enc.status]).toEqual([403, 403, 403, 403]);
  });

  it('[E-09] tempo de resposta do acionamento (30 medições, backend + banco em memória)', async () => {
    const { token } = await criarUsuaria(app);
    for (let i = 0; i < 30; i++) {
      const t0 = process.hrtime.bigint();
      const r = await http().post('/emergencias/acionar').set(auth(token)).send({ latitude: -23.5, longitude: -46.6 });
      temposEmergencia.push(Number(process.hrtime.bigint() - t0) / 1e6);
      await http().post(`/emergencias/${r.body.emergencia_id}/encerrar`).set(auth(token));
    }
    const ordenados = [...temposEmergencia].sort((x, y) => x - y);
    expect(ordenados[Math.floor(ordenados.length * 0.95) - 1]).toBeLessThan(500);
  });
});

/* ===================================================================== */
describe('5. Classificação de risco pela IA', () => {
  const ultimoPayload = () => ia.chamadas[ia.chamadas.length - 1]?.payload;
  const falhaDaIA = (l: string) => /an[aá]lise de risco/i.test(l) && /indispon|falh|erro|timeout|abort/i.test(l);

  async function classificarApos(acao: () => Promise<unknown>, usuariaId: string) {
    const antes = ia.chamadas.length;
    await acao();
    await esperar(() => ia.chamadas.length > antes);
    await new Promise((r) => setTimeout(r, ia.usarReal ? 1500 : 60));
    return nivelRisco(usuariaId);
  }

  it('[I-01] cada ocorrência dispara a classificação, com o segredo e as variáveis corretas', async () => {
    const { id, token } = await criarUsuaria(app);
    const risco = await classificarApos(() => novaOcorrencia(token, ['Física', 'Psicológica']), id);
    const ultima = ia.chamadas[ia.chamadas.length - 1];
    expect(ultima.segredo).toBe(process.env.IA_SHARED_SECRET);
    expect(ultima.payload).toMatchObject({
      qtd_ocorrencias_totais: 1, dias_desde_ultima_ocorrencia: 0, frequencia_aumentou: 0,
      teve_viol_fisica: 1, teve_viol_psicologica: 1, teve_viol_sexual: 0, teve_ameaca: 0,
      teve_viol_moral: 0, teve_viol_patrimonial: 0, qtd_panico_acionado: 0,
    });
    expect(risco).toBe('Alto');
  });

  it.each([
    ['uma ofensa moral', 'Baixo', ['Moral']],
    ['uma ameaça', 'Medio', ['Ameaça']],
    ['uma agressão física', 'Alto', ['Física']],
    ['uma violência sexual', 'Alto', ['Sexual']],
  ])('[I-02] %s resulta em risco %s', async (_d, esperado, tipos) => {
    const { id, token } = await criarUsuaria(app);
    expect(await classificarApos(() => novaOcorrencia(token, tipos), id)).toBe(esperado);
  });

  it('[I-03] o risco sobe com a recorrência (leve → leve recorrente)', async () => {
    const { id, token } = await criarUsuaria(app);
    const r1 = await classificarApos(() => novaOcorrencia(token, ['Moral']), id);
    const r2 = await classificarApos(() => novaOcorrencia(token, ['Psicológica']), id);
    expect([r1, r2, ultimoPayload().frequencia_aumentou]).toEqual(['Baixo', 'Medio', 1]);
  });

  it('[I-04] acionamento válido do botão eleva o risco de uma ocorrência leve recente para Alto', async () => {
    const { id, token } = await criarUsuaria(app);
    await http().post('/emergencias/acionar').set(auth(token)).send({});
    const risco = await classificarApos(() => novaOcorrencia(token, ['Moral']), id);
    expect([ultimoPayload().qtd_panico_acionado, risco]).toEqual([1, 'Alto']);
  });

  it('[I-05] acionamento por engano (encerrado em até 30 s) não eleva o risco', async () => {
    const { id, token } = await criarUsuaria(app);
    const e = await http().post('/emergencias/acionar').set(auth(token)).send({});
    await http().post(`/emergencias/${e.body.emergencia_id}/encerrar`).set(auth(token));
    const risco = await classificarApos(() => novaOcorrencia(token, ['Moral']), id);
    expect([ultimoPayload().qtd_panico_acionado, risco]).toEqual([0, 'Baixo']);
  });

  it('[I-06] ocorrência fora da janela de 30 dias não é enviada à IA', async () => {
    const { id, token } = await criarUsuaria(app);
    await classificarApos(() => novaOcorrencia(token, ['Física']), id);
    const antiga = new Date(Date.now() - 200 * 86_400_000).toISOString();
    bancoTeste.tabelas.ocorrencias.filter((o) => o.usuaria_id === id).forEach((o) => { o.criado_em = antiga; });
    await classificarApos(() => novaOcorrencia(token, ['Patrimonial']), id);
    expect(ultimoPayload()).toMatchObject({
      qtd_ocorrencias_totais: 1, teve_viol_fisica: 0, teve_viol_patrimonial: 1, possui_historico_anterior: 1,
    });
  });

  it('[I-11] ocorrência de 200 dias atrás não conta como recorrência (regra: 2+ ocorrências em 30 dias)', async () => {
    const { id, token } = await criarUsuaria(app);
    await classificarApos(() => novaOcorrencia(token, ['Moral']), id);
    const antiga = new Date(Date.now() - 200 * 86_400_000).toISOString();
    bancoTeste.tabelas.ocorrencias.filter((o) => o.usuaria_id === id).forEach((o) => { o.criado_em = antiga; });
    const risco = await classificarApos(() => novaOcorrencia(token, ['Patrimonial']), id);
    expect([ultimoPayload().frequencia_aumentou, risco]).toEqual([0, 'Baixo']);
  });

  it.each([
    ['agressão física com data de 40 dias atrás', 40, 'Baixo'],
    ['agressão física com data de 10 dias atrás', 10, 'Alto'],
  ])('[I-12] %s resulta em risco %s (data informada define a janela)', async (_d, dias, esperado) => {
    const { id, token } = await criarUsuaria(app);
    const risco = await classificarApos(() => novaOcorrencia(token, ['Física'], { data_ocorrencia: diasAtras(dias as number) }), id);
    expect(risco).toBe(esperado);
  });

  it('[I-13] acionamento válido do botão há 60 dias não conta para o risco', async () => {
    const { id, token } = await criarUsuaria(app);
    const e = await http().post('/emergencias/acionar').set(auth(token)).send({});
    const emergencia = bancoTeste.tabelas.emergencias.find((x) => x.id === e.body.emergencia_id)!;
    emergencia.criado_em = new Date(Date.now() - 60 * 86_400_000).toISOString();
    emergencia.status = 'ENCERRADA';
    emergencia.encerrado_em = new Date(Date.now() - 60 * 86_400_000 + 600_000).toISOString();
    const risco = await classificarApos(() => novaOcorrencia(token, ['Moral']), id);
    expect([ultimoPayload().qtd_panico_acionado, ultimoPayload().possui_historico_anterior, risco]).toEqual([0, 1, 'Baixo']);
  });

  it('[I-07] ao chegar em risco Alto, registra alerta para as guardiãs com horário', async () => {
    const { id, token } = await criarUsuaria(app);
    await classificarApos(() => novaOcorrencia(token, ['Física'], { latitude: -23.5, longitude: -46.6 }), id);
    await esperar(() => bancoTeste.tabelas.alertas_risco.some((a) => a.usuaria_id === id));
    const alerta = bancoTeste.tabelas.alertas_risco.find((a) => a.usuaria_id === id)!;
    expect(alerta).toMatchObject({ nivel_risco: 'Alto', guardioes_notificados: 1 });
    expect(alerta.mensagem).toMatch(/Horário/);
  });

  it.each([
    ['responde erro 500', 'erro500'],
    ['está fora do ar (erro de rede)', 'erroRede'],
  ] as const)('[I-08] se a IA %s, a ocorrência é salva e o erro é registrado no log', async (_d, modo) => {
    const { id, token } = await criarUsuaria(app);
    ia.modo = modo;
    logs.length = 0;
    const r = await novaOcorrencia(token, ['Física']);
    expect(r.status).toBe(201);
    expect(bancoTeste.tabelas.ocorrencias.some((o) => o.id === r.body.ocorrencia.id)).toBe(true);
    expect(await esperar(() => logs.some(falhaDaIA), 2000)).toBe(true);
    expect(nivelRisco(id)).toBeNull();
  });

  it('[I-09] se a IA demorar, a resposta não espera e o timeout (5 s) é registrado', async () => {
    const { token } = await criarUsuaria(app);
    ia.modo = 'lenta';
    logs.length = 0;
    const t0 = Date.now();
    const r = await novaOcorrencia(token, ['Física']);
    expect(r.status).toBe(201);
    expect(Date.now() - t0).toBeLessThan(1000);
    expect(await esperar(() => logs.some(falhaDaIA), 7000)).toBe(true);
  });

  it('[I-10] cada ocorrência guarda a classificação calculada quando ela foi registrada', async () => {
    const { id, token } = await criarUsuaria(app);
    let r1: any;
    await classificarApos(async () => { r1 = await novaOcorrencia(token, ['Moral']); }, id);
    let r2: any;
    await classificarApos(async () => { r2 = await novaOcorrencia(token, ['Física']); }, id);
    const risco = (o: any) => bancoTeste.tabelas.ocorrencias.find((x) => x.id === o.body.ocorrencia.id)?.nivel_risco;
    expect([risco(r1), risco(r2), nivelRisco(id)]).toEqual(['Baixo', 'Alto', 'Alto']);
  });
});

/* ===================================================================== */
describe('6. Guardiãs', () => {
  it('[G-01] adiciona guardiã válida vinculada à usuária', async () => {
    const { id, token } = await criarUsuaria(app);
    const r = await http().post('/guardioes').set(auth(token)).send({ nome_completo: 'Nova Guardiã', telefone: '11966660001', email: 'g@exemplo.com' });
    expect(r.status).toBe(201);
    expect(bancoTeste.tabelas.guardioes.filter((g) => g.usuaria_id === id)).toHaveLength(2);
  });

  it.each([
    ['telefone curto', { nome_completo: 'Guardiã', telefone: '123' }],
    ['nome com 1 letra', { nome_completo: 'G', telefone: '11966660001' }],
    ['e-mail inválido', { nome_completo: 'Guardiã', telefone: '11966660001', email: 'x' }],
    ['sem telefone', { nome_completo: 'Guardiã' }],
    ['campo extra', { nome_completo: 'Guardiã', telefone: '11966660001', usuaria_id: 'x' }],
  ])('[G-02] dados inválidos (%s) são recusados (400)', async (_d, corpo) => {
    const { token } = await criarUsuaria(app);
    expect((await http().post('/guardioes').set(auth(token)).send(corpo)).status).toBe(400);
  });

  it('[G-03] guardiã duplicada (mesmo telefone, com ou sem máscara) é recusada (409)', async () => {
    const { id, token, dados } = await criarUsuaria(app);
    const tel = dados.guardioes[0].telefone;
    const mascarado = `(${tel.slice(0, 2)}) ${tel.slice(2, 7)}-${tel.slice(7)}`;
    const r1 = await http().post('/guardioes').set(auth(token)).send({ nome_completo: 'Repetida', telefone: tel });
    const r2 = await http().post('/guardioes').set(auth(token)).send({ nome_completo: 'Repetida', telefone: mascarado });
    expect([r1.status, r2.status]).toEqual([409, 409]);
    expect(bancoTeste.tabelas.guardioes.filter((g) => g.usuaria_id === id)).toHaveLength(1);
  });

  it('[G-03b] editar guardiã para o telefone de outra já cadastrada é recusado (409)', async () => {
    const { id, token, dados } = await criarUsuaria(app);
    await http().post('/guardioes').set(auth(token)).send({ nome_completo: 'Segunda', telefone: '11955554321' });
    const segunda = bancoTeste.tabelas.guardioes.find((g) => g.usuaria_id === id && g.telefone === '11955554321')!;
    const r = await http().put(`/guardioes/${segunda.id}`).set(auth(token)).send({ telefone: dados.guardioes[0].telefone });
    expect(r.status).toBe(409);
  });

  it('[G-03c] a mesma guardiã duas vezes no cadastro é recusada (400)', async () => {
    const g = { nome_completo: 'Mesma Pessoa', telefone: '11944445555' };
    expect((await http().post('/usuarias').send(dadosUsuaria({ guardioes: [g, { ...g }] }))).status).toBe(400);
  });

  it('[G-03d] a mesma guardiã pode ser cadastrada por usuárias diferentes', async () => {
    const tel = '11977771234';
    const a = await criarUsuaria(app);
    const b = await criarUsuaria(app);
    const ra = await http().post('/guardioes').set(auth(a.token)).send({ nome_completo: 'Comum', telefone: tel });
    const rb = await http().post('/guardioes').set(auth(b.token)).send({ nome_completo: 'Comum', telefone: tel });
    expect([ra.status, rb.status]).toEqual([201, 201]);
  });

  it('[G-04] a 6ª guardiã é recusada (limite de 5)', async () => {
    const { token } = await criarUsuaria(app);
    const status: number[] = [];
    for (let i = 2; i <= 6; i++) {
      status.push((await http().post('/guardioes').set(auth(token)).send({ nome_completo: `Guardiã ${i}`, telefone: `1195555000${i}` })).status);
    }
    expect(status).toEqual([201, 201, 201, 201, 400]);
  });

  it('[G-05] guardiã excluída deixa de receber alertas; a nova passa a receber', async () => {
    const u = await criarUsuaria(app);
    const antiga = u.dados.guardioes[0].telefone;
    await http().post('/guardioes').set(auth(u.token)).send({ nome_completo: 'Temporária', telefone: '11944440001' });
    const idAntiga = bancoTeste.tabelas.guardioes.find((g) => g.usuaria_id === u.id && g.telefone === antiga)!.id;
    expect((await http().delete(`/guardioes/${idAntiga}`).set(auth(u.token))).status).toBe(200);

    logs.length = 0;
    const e1 = await http().post('/emergencias/acionar').set(auth(u.token)).send({});
    expect(notificouTelefone(antiga)).toBe(false);
    expect(notificouTelefone('11944440001')).toBe(true);
    await http().post(`/emergencias/${e1.body.emergencia_id}/encerrar`).set(auth(u.token));

    await http().post('/guardioes').set(auth(u.token)).send({ nome_completo: 'Nova', telefone: '11933330777' });
    logs.length = 0;
    await http().post('/emergencias/acionar').set(auth(u.token)).send({});
    expect(notificouTelefone('11933330777')).toBe(true);
  });

  it('[G-06] não é possível excluir a última guardiã (403)', async () => {
    const { id, token } = await criarUsuaria(app);
    const g = bancoTeste.tabelas.guardioes.find((x) => x.usuaria_id === id)!;
    expect((await http().delete(`/guardioes/${g.id}`).set(auth(token))).status).toBe(403);
  });

  it('[G-07] usuária B não lista, edita nem exclui guardiã da A', async () => {
    const a = await criarUsuaria(app);
    const b = await criarUsuaria(app);
    await http().post('/guardioes').set(auth(a.token)).send({ nome_completo: 'Segunda', telefone: '11922220001' });
    const g = bancoTeste.tabelas.guardioes.find((x) => x.usuaria_id === a.id)!;
    const lista = await http().get('/guardioes').set(auth(b.token));
    const edit = await http().put(`/guardioes/${g.id}`).set(auth(b.token)).send({ telefone: '11900000000' });
    const del = await http().delete(`/guardioes/${g.id}`).set(auth(b.token));
    expect(lista.body.guardioes.some((x: any) => x.id === g.id)).toBe(false);
    expect([edit.status, del.status]).toEqual([403, 403]);
    expect(bancoTeste.tabelas.guardioes.find((x) => x.id === g.id)?.telefone).toBe(g.telefone);
  });
});

/* ===================================================================== */
describe('7. Logout', () => {
  it('[LO-01] após o logout o token não pode mais ser usado', async () => {
    const { token } = await criarUsuaria(app);
    expect((await http().post('/usuarias/logout').set(auth(token))).status).toBe(201);
    expect((await http().get('/guardioes').set(auth(token))).status).toBe(401);
    expect((await http().post('/usuarias/logout').set(auth(token))).status).toBe(401);
  });

  it('[LO-02] logout encerra só a sessão atual: outro login da mesma usuária continua válido', async () => {
    const { token, dados } = await criarUsuaria(app);
    const outro = (await http().post('/usuarias/login').send({ email: dados.email, senha: dados.senha })).body.access_token;
    await http().post('/usuarias/logout').set(auth(token));
    expect((await http().get('/guardioes').set(auth(outro))).status).toBe(200);
  });
});

describe('7. Logout (limpeza)', () => {
  it('[LO-03] tokens revogados já expirados são apagados no próximo logout', async () => {
    const { token } = await criarUsuaria(app);
    bancoTeste.tabelas.tokens_revogados.push({
      jti: '00000000-0000-4000-8000-0000000000aa', usuaria_id: 'antiga',
      expira_em: new Date(Date.now() - 3_600_000).toISOString(), revogado_em: new Date().toISOString(),
    });
    await http().post('/usuarias/logout').set(auth(token));
    expect(bancoTeste.tabelas.tokens_revogados.some((t) => t.usuaria_id === 'antiga')).toBe(false);
  });
});

/* ===================================================================== */
describe('8. Exclusão de conta', () => {
  async function contaCompleta() {
    const u = await criarUsuaria(app);
    await http().post('/guardioes').set(auth(u.token)).send({ nome_completo: 'Segunda', telefone: '11911110001' });
    const o = await novaOcorrencia(u.token, ['Física'], { latitude: -23.5, longitude: -46.6 });
    await anexar(u.token, o.body.ocorrencia.id, ARQUIVOS.jpeg, 'f.jpg', 'image/jpeg');
    await http().post('/emergencias/acionar').set(auth(u.token)).send({ latitude: -23.5, longitude: -46.6 });
    await esperar(() => bancoTeste.tabelas.alertas_risco.some((a) => a.usuaria_id === u.id));
    return u;
  }

  const dadosDe = (id: string) => {
    const ocs = bancoTeste.tabelas.ocorrencias.filter((o) => o.usuaria_id === id).map((o) => o.id);
    const ems = bancoTeste.tabelas.emergencias.filter((e) => e.usuaria_id === id).map((e) => e.id);
    return {
      usuarias: bancoTeste.tabelas.usuarias.filter((u) => u.id === id).length,
      guardioes: bancoTeste.tabelas.guardioes.filter((g) => g.usuaria_id === id).length,
      ocorrencias: ocs.length,
      evidencias: bancoTeste.tabelas.evidencias.filter((e) => ocs.includes(e.ocorrencia_id)).length,
      emergencias: ems.length,
      rastreamento: bancoTeste.tabelas.rastreamento_gps.filter((g) => ems.includes(g.emergencia_id)).length,
      alertas: bancoTeste.tabelas.alertas_risco.filter((a) => a.usuaria_id === id).length,
      arquivos: [...bancoTeste.storage.evidencias_amparo.keys()].filter((k) => k.startsWith(`${id}/`)).length,
    };
  };

  it('[X-01] senha errada não exclui nada (401)', async () => {
    const u = await contaCompleta();
    const antes = dadosDe(u.id);
    expect((await http().delete('/usuarias/me').set(auth(u.token)).send({ senha: 'errada123' })).status).toBe(401);
    expect(dadosDe(u.id)).toEqual(antes);
  });

  it('[X-02] exclusão remove usuária, guardiãs, ocorrências, anexos, emergências, rastreamento e alertas', async () => {
    const u = await contaCompleta();
    const antes = dadosDe(u.id);
    expect(Object.values(antes).every((n) => n > 0)).toBe(true);
    expect((await http().delete('/usuarias/me').set(auth(u.token)).send({ senha: u.dados.senha })).status).toBe(200);
    expect(Object.values(dadosDe(u.id)).every((n) => n === 0)).toBe(true);
  });

  it('[X-03] após excluir, o token e o login da conta deixam de funcionar', async () => {
    const u = await contaCompleta();
    await http().delete('/usuarias/me').set(auth(u.token)).send({ senha: u.dados.senha });
    expect((await http().get('/guardioes').set(auth(u.token))).status).toBe(401);
    expect((await http().post('/usuarias/login').send({ email: u.dados.email, senha: u.dados.senha })).status).toBe(401);
  });

  it('[X-04] excluir uma conta não afeta os dados de outra usuária', async () => {
    const outra = await contaCompleta();
    const antes = dadosDe(outra.id);
    const u = await contaCompleta();
    await http().delete('/usuarias/me').set(auth(u.token)).send({ senha: u.dados.senha });
    expect(dadosDe(outra.id)).toEqual(antes);
    expect((await http().get('/ocorrencias').set(auth(outra.token))).status).toBe(200);
  });

  it('[X-05] exclusão não mantém o identificador da usuária em tokens revogados', async () => {
    const u = await contaCompleta();
    const segunda = (await http().post('/usuarias/login').send({ email: u.dados.email, senha: u.dados.senha })).body.access_token;
    await http().post('/usuarias/logout').set(auth(segunda));
    await http().delete('/usuarias/me').set(auth(u.token)).send({ senha: u.dados.senha });
    expect(bancoTeste.tabelas.tokens_revogados.filter((t) => t.usuaria_id === u.id)).toHaveLength(0);
  });
});

/* ===================================================================== */
describe('9. Segurança', () => {
  const ATAQUES = [
    "'; DROP TABLE usuarias; --",
    "' OR '1'='1",
    '<script>alert(document.cookie)</script>',
    '"><img src=x onerror=alert(1)>',
  ];

  it.each(ATAQUES)('[S-01] texto malicioso %p é tratado como texto literal', async (ataque) => {
    const { id, token } = await criarUsuaria(app);
    const totalUsuarias = bancoTeste.tabelas.usuarias.length;
    const r = await http().post('/ocorrencias').set(auth(token)).send({ tipos_violencia: ['Moral'], mensagem: ataque });
    expect(r.status).toBe(201);
    expect(r.headers['content-type']).toMatch(/application\/json/);
    expect(bancoTeste.tabelas.ocorrencias.find((o) => o.id === r.body.ocorrencia.id)?.mensagem).toBe(ataque);
    expect(bancoTeste.tabelas.usuarias).toHaveLength(totalUsuarias);
    expect(bancoTeste.tabelas.ocorrencias.filter((o) => o.usuaria_id === id)).toHaveLength(1);
  });

  it('[S-02] injeção no login não autentica', async () => {
    await criarUsuaria(app);
    const r1 = await http().post('/usuarias/login').send({ email: "' OR '1'='1", senha: "' OR '1'='1" });
    const r2 = await http().post('/usuarias/login').send({ email: 'a@a.com', senha: { $ne: null } });
    expect([400, 401]).toContain(r1.status);
    expect(r2.status).toBe(400);
    expect(r1.body.access_token).toBeUndefined();
  });

  it('[S-03] respostas trazem headers de segurança (Helmet)', async () => {
    const r = await http().get('/');
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['content-security-policy']).toBeDefined();
    expect(r.headers['x-powered-by']).toBeUndefined();
  });

  it('[S-04] falha interna do banco não expõe detalhes na resposta', async () => {
    const { token } = await criarUsuaria(app);
    bancoTeste.falhaForcada = { tabela: 'guardioes', operacao: 'select', erro: { code: 'XX000', message: 'relation "public.guardioes" internal failure at node pg-17' } };
    const r = await http().get('/guardioes').set(auth(token));
    bancoTeste.falhaForcada = null;
    expect(r.status).toBe(500);
    expect(JSON.stringify(r.body)).not.toMatch(/relation|public\.|pg-17|stack|at \w+ \(/);
  });

  it('[S-05] JSON malformado e rota inexistente não expõem stack trace', async () => {
    const malformado = await http().post('/usuarias').set('Content-Type', 'application/json').send('{"cpf":');
    const inexistente = await http().get('/admin').set(auth('x'));
    for (const r of [malformado, inexistente]) {
      expect(JSON.stringify(r.body)).not.toMatch(/node_modules|\.ts:\d+|at Object\./);
    }
  });

  it('[S-06] logs do fluxo completo não contêm dados pessoais', async () => {
    logs.length = 0;
    const dados = dadosUsuaria({ guardioes: [{ nome_completo: 'Guardiã Sigilosa', telefone: '11987650001' }] });
    await http().post('/usuarias').send(dados);
    const login = await http().post('/usuarias/login').send({ email: dados.email, senha: dados.senha });
    const token = login.body.access_token;
    await http().post('/usuarias/login').send({ email: dados.email, senha: 'Errada999' });
    await novaOcorrencia(token, ['Física'], { latitude: -23.5617, longitude: -46.6559 });
    await http().post('/emergencias/acionar').set(auth(token)).send({ latitude: -23.5617, longitude: -46.6559 });
    await esperar(() => logs.some((l) => /risco alto/i.test(l)), 2000);

    const tudo = logs.join('\n');
    const proibidos = [dados.cpf, dados.senha, dados.senha_app, dados.email, 'Guardiã Sigilosa', '11987650001', '-23.5617', token];
    expect(proibidos.filter((p) => tudo.includes(p))).toEqual([]);
  });
});

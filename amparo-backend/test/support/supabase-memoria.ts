/**
 * Supabase em memória para os testes de fluxo completo.
 *
 * Reproduz as tabelas, as restrições e as funções SQL das quais o backend depende
 * (ver amparo-backend/supabase/*.sql):
 *  - usuarias: cpf e email únicos (23505)
 *  - guardioes: trigger "Regra de Ouro" (P0001) ao apagar a última guardiã
 *  - emergencias: índice único de emergência ATIVA por usuária (23505)
 *  - ocorrencias -> evidencias: exclusão em cascata
 *  - rpc cadastrar_usuaria_com_guardioes (transacional) e apagar_conta_usuaria
 *  - Storage com buckets e caminhos
 * Qualquer tabela, método ou filtro desconhecido lança erro, para o teste não
 * passar por acaso.
 */
import { randomUUID } from 'crypto';

type Linha = Record<string, any>;
type Erro = { message: string; code?: string };
type Resposta = { data: any; error: Erro | null; count?: number | null };

const TABELAS = [
  'usuarias', 'guardioes', 'ocorrencias', 'evidencias', 'emergencias',
  'rastreamento_gps', 'alertas_risco', 'tokens_revogados',
] as const;

export class BancoMemoria {
  tabelas: Record<string, Linha[]> = {};
  storage: Record<string, Map<string, { conteudo: Buffer; contentType?: string }>> = {};
  falhaForcada: { tabela: string; operacao: string; erro: Erro } | null = null;

  constructor() {
    this.limpar();
  }

  limpar(): void {
    for (const t of TABELAS) this.tabelas[t] = [];
    this.storage = { evidencias_amparo: new Map() };
    this.falhaForcada = null;
  }

  tabela(nome: string): Linha[] {
    const t = this.tabelas[nome];
    if (!t) throw new Error(`[banco-memoria] tabela desconhecida: ${nome}`);
    return t;
  }

  /* ---------------- regras do banco ---------------- */

  private agora(): string {
    return new Date().toISOString();
  }

  private comPadroes(nome: string, linha: Linha): Linha {
    const base: Linha = { id: randomUUID(), ...linha };
    if (['usuarias', 'ocorrencias', 'evidencias', 'emergencias', 'alertas_risco'].includes(nome)) {
      base.criado_em = base.criado_em ?? this.agora();
    }
    if (nome === 'usuarias') {
      base.nivel_risco = base.nivel_risco ?? null;
      base.modo_disfarcado = base.modo_disfarcado ?? false;
    }
    if (nome === 'emergencias') base.encerrado_em = base.encerrado_em ?? null;
    if (nome === 'rastreamento_gps') base.registrado_em = base.registrado_em ?? this.agora();
    if (nome === 'tokens_revogados') {
      delete base.id;
      base.revogado_em = base.revogado_em ?? this.agora();
    }
    return base;
  }

  private violacaoUnica(nome: string, linha: Linha, ignorar?: Linha): Erro | null {
    const outras = this.tabela(nome).filter((l) => l !== ignorar);
    if (nome === 'usuarias') {
      if (outras.some((l) => l.cpf === linha.cpf)) {
        return { code: '23505', message: 'duplicate key value violates unique constraint "usuarias_cpf_key"' };
      }
      if (outras.some((l) => l.email === linha.email)) {
        return { code: '23505', message: 'duplicate key value violates unique constraint "usuarias_email_key"' };
      }
    }
    if (nome === 'emergencias' && linha.status === 'ATIVA') {
      if (outras.some((l) => l.usuaria_id === linha.usuaria_id && l.status === 'ATIVA')) {
        return { code: '23505', message: 'duplicate key value violates unique constraint "emergencias_uma_ativa_por_usuaria"' };
      }
    }
    if (nome === 'tokens_revogados' && outras.some((l) => l.jti === linha.jti)) {
      return { code: '23505', message: 'duplicate key value violates unique constraint "tokens_revogados_pkey"' };
    }
    return null;
  }

  inserir(nome: string, linhas: Linha[]): Resposta {
    const novas: Linha[] = [];
    for (const l of linhas) {
      const linha = this.comPadroes(nome, l);
      const erro = this.violacaoUnica(nome, linha);
      if (erro) return { data: null, error: erro };
      novas.push(linha);
    }
    this.tabela(nome).push(...novas);
    return { data: novas, error: null };
  }

  apagar(nome: string, alvo: Linha[], comTriggers = true): Erro | null {
    if (nome === 'guardioes' && comTriggers) {
      const usuarias = new Set(alvo.map((g) => g.usuaria_id));
      for (const u of usuarias) {
        const restantes = this.tabela('guardioes').filter((g) => g.usuaria_id === u && !alvo.includes(g));
        const usuariaExiste = this.tabela('usuarias').some((x) => x.id === u);
        if (usuariaExiste && restantes.length === 0) {
          return { code: 'P0001', message: 'Regra de Ouro: a usuária precisa possuir pelo menos uma guardiã.' };
        }
      }
    }
    if (nome === 'ocorrencias') {
      const ids = new Set(alvo.map((o) => o.id));
      this.tabelas.evidencias = this.tabela('evidencias').filter((e) => !ids.has(e.ocorrencia_id));
    }
    this.tabelas[nome] = this.tabela(nome).filter((l) => !alvo.includes(l));
    return null;
  }

  rpc(funcao: string, p: Record<string, any>): Resposta {
    if (funcao === 'cadastrar_usuaria_com_guardioes') {
      const usuaria = {
        cpf: p.p_cpf, email: p.p_email, telefone: p.p_telefone, nome_completo: p.p_nome_completo,
        data_nascimento: p.p_data_nascimento, senha_hash: p.p_senha_hash, senha_app: p.p_senha_app,
        modo_disfarcado: p.p_modo_disfarcado,
      };
      const r = this.inserir('usuarias', [usuaria]);
      if (r.error) return r;
      const id = r.data[0].id;
      this.inserir('guardioes', (p.p_guardioes ?? []).map((g: Linha) => ({ usuaria_id: id, ...g })));
      return { data: id, error: null };
    }
    if (funcao === 'apagar_conta_usuaria') {
      const u = p.p_usuaria_id;
      const emergencias = this.tabela('emergencias').filter((e) => e.usuaria_id === u).map((e) => e.id);
      const ocorrencias = this.tabela('ocorrencias').filter((o) => o.usuaria_id === u).map((o) => o.id);
      this.tabelas.rastreamento_gps = this.tabela('rastreamento_gps').filter((g) => !emergencias.includes(g.emergencia_id));
      this.tabelas.evidencias = this.tabela('evidencias').filter((e) => !ocorrencias.includes(e.ocorrencia_id));
      for (const t of ['alertas_risco', 'emergencias', 'ocorrencias', 'guardioes', 'tokens_revogados']) {
        this.tabelas[t] = this.tabela(t).filter((l) => l.usuaria_id !== u);
      }
      this.tabelas.usuarias = this.tabela('usuarias').filter((l) => l.id !== u);
      return { data: null, error: null };
    }
    throw new Error(`[banco-memoria] função desconhecida: ${funcao}`);
  }

  cliente(): any {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const banco = this;
    return {
      from: (tabela: string) => new Consulta(banco, tabela),
      rpc: (funcao: string, params: Record<string, any>) => Promise.resolve(banco.rpc(funcao, params)),
      storage: {
        from: (bucket: string) => {
          const b = banco.storage[bucket];
          if (!b) throw new Error(`[banco-memoria] bucket desconhecido: ${bucket}`);
          return {
            upload: async (caminho: string, conteudo: Buffer, opcoes?: { contentType?: string; upsert?: boolean }) => {
              if (b.has(caminho) && !opcoes?.upsert) return { data: null, error: { message: 'The resource already exists' } };
              b.set(caminho, { conteudo, contentType: opcoes?.contentType });
              return { data: { path: caminho }, error: null };
            },
            createSignedUrl: async (caminho: string, segundos: number) => {
              if (!b.has(caminho)) return { data: null, error: { message: 'Object not found' } };
              return { data: { signedUrl: `https://storage.teste/assinado/${caminho}?expira=${segundos}` }, error: null };
            },
            remove: async (caminhos: string[]) => {
              const removidos = caminhos.filter((c) => b.delete(c));
              return { data: removidos.map((name) => ({ name })), error: null };
            },
          };
        },
      },
    };
  }
}

class Consulta {
  private operacao: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private colunas = '*';
  private retornar = false;
  private contar = false;
  private soCabecalho = false;
  private payload: any;
  private filtros: Array<(l: Linha) => boolean> = [];
  private ordem: { coluna: string; asc: boolean } | null = null;
  private intervalo: [number, number] | null = null;
  private limite: number | null = null;
  private unico: 'single' | 'maybe' | null = null;

  constructor(private banco: BancoMemoria, private nomeTabela: string) {
    banco.tabela(nomeTabela);
  }

  select(colunas = '*', opcoes?: { count?: string; head?: boolean }) {
    if (this.operacao === 'select') {
      this.colunas = colunas;
      this.contar = opcoes?.count === 'exact';
      this.soCabecalho = !!opcoes?.head;
    } else {
      this.retornar = true;
      this.colunas = colunas;
    }
    return this;
  }
  insert(linhas: Linha | Linha[]) { this.operacao = 'insert'; this.payload = Array.isArray(linhas) ? linhas : [linhas]; return this; }
  update(valores: Linha) { this.operacao = 'update'; this.payload = valores; return this; }
  delete() { this.operacao = 'delete'; return this; }
  eq(coluna: string, valor: any) { this.filtros.push((l) => l[coluna] === valor); return this; }
  in(coluna: string, valores: any[]) { this.filtros.push((l) => valores.includes(l[coluna])); return this; }
  gte(coluna: string, valor: any) { this.filtros.push((l) => l[coluna] >= valor); return this; }
  lt(coluna: string, valor: any) { this.filtros.push((l) => l[coluna] < valor); return this; }
  order(coluna: string, opcoes?: { ascending?: boolean }) { this.ordem = { coluna, asc: opcoes?.ascending !== false }; return this; }
  range(de: number, ate: number) { this.intervalo = [de, ate]; return this; }
  limit(n: number) { this.limite = n; return this; }
  single() { this.unico = 'single'; return this; }
  maybeSingle() { this.unico = 'maybe'; return this; }

  // eslint-disable-next-line unicorn/no-thenable
  then(resolve: (r: Resposta) => void, reject?: (e: unknown) => void) {
    try {
      resolve(this.executar());
    } catch (e) {
      if (reject) reject(e);
      else throw e;
    }
  }

  private projetar(linhas: Linha[]): Linha[] {
    if (this.colunas.trim() === '*') return linhas.map((l) => ({ ...l }));
    const partes = this.colunas.split(',').map((c) => c.trim());
    return linhas.map((l) => {
      const saida: Linha = {};
      for (const c of partes) {
        if (c === '*') Object.assign(saida, l);
        else if (c === 'evidencias(*)') {
          saida.evidencias = this.banco.tabela('evidencias').filter((e) => e.ocorrencia_id === l.id).map((e) => ({ ...e }));
        } else if (/^\w+$/.test(c)) saida[c] = l[c];
        else throw new Error(`[banco-memoria] seleção não suportada: ${c}`);
      }
      return saida;
    });
  }

  private executar(): Resposta {
    const f = this.banco.falhaForcada;
    if (f && f.tabela === this.nomeTabela && f.operacao === this.operacao) {
      return { data: null, error: f.erro, count: null };
    }

    if (this.operacao === 'insert') {
      const r = this.banco.inserir(this.nomeTabela, this.payload);
      if (r.error) return r;
      return this.finalizar(this.retornar ? this.projetar(r.data) : null);
    }

    let alvo = this.banco.tabela(this.nomeTabela).filter((l) => this.filtros.every((fn) => fn(l)));

    if (this.operacao === 'update') {
      for (const linha of alvo) {
        const candidata = { ...linha, ...this.payload };
        const erro = (this.banco as any).violacaoUnica(this.nomeTabela, candidata, linha);
        if (erro) return { data: null, error: erro };
      }
      for (const linha of alvo) Object.assign(linha, this.payload);
      return this.finalizar(this.retornar ? this.projetar(alvo) : null);
    }

    if (this.operacao === 'delete') {
      const copia = alvo.map((l) => ({ ...l }));
      const erro = this.banco.apagar(this.nomeTabela, alvo);
      if (erro) return { data: null, error: erro };
      return this.finalizar(this.retornar ? this.projetar(copia) : null);
    }

    const total = alvo.length;
    if (this.ordem) {
      const { coluna, asc } = this.ordem;
      alvo = [...alvo].sort((a, b) => (a[coluna] < b[coluna] ? -1 : a[coluna] > b[coluna] ? 1 : 0) * (asc ? 1 : -1));
    }
    if (this.intervalo) alvo = alvo.slice(this.intervalo[0], this.intervalo[1] + 1);
    if (this.limite !== null) alvo = alvo.slice(0, this.limite);
    if (this.soCabecalho) return { data: null, error: null, count: total };
    const r = this.finalizar(this.projetar(alvo));
    return this.contar ? { ...r, count: total } : r;
  }

  private finalizar(linhas: Linha[] | null): Resposta {
    if (this.unico === null || linhas === null) return { data: linhas, error: null };
    if (linhas.length === 1) return { data: linhas[0], error: null };
    if (linhas.length === 0 && this.unico === 'maybe') return { data: null, error: null };
    return { data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } };
  }
}

export const bancoTeste = new BancoMemoria();

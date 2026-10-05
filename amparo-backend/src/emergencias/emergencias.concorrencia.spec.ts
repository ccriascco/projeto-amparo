import { EmergenciasService } from './emergencias.service';

/** Banco em memória: a checagem de "ATIVA" e o insert passam por awaits reais, como no Supabase. */
function bancoEmMemoria() {
  const ativas: any[] = [];
  let sequencia = 0;
  let tabela = '';
  let operacao: 'select' | 'insert' = 'select';
  let payload: any;

  const builder: any = {
    from: (t: string) => {
      tabela = t;
      operacao = 'select';
      return builder;
    },
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    single: () => builder,
    insert: (p: any) => {
      operacao = 'insert';
      payload = p;
      return builder;
    },
    // oxlint-disable-next-line unicorn/no-thenable
    then: (resolve: (v: any) => void) => {
      setTimeout(() => {
        if (operacao === 'insert' && tabela === 'emergencias') {
          const linha = { id: `e${++sequencia}`, ...payload[0] };
          ativas.push(linha);
          return resolve({ data: linha, error: null });
        }
        if (operacao === 'insert') return resolve({ data: null, error: null });
        if (tabela === 'emergencias') {
          return resolve({ data: ativas.filter((a) => a.status === 'ATIVA'), error: null });
        }
        return resolve({ data: [], error: null });
      }, 5);
    },
  };
  return { builder, ativas };
}

describe('EmergenciasService.acionar sob concorrência (duplo clique)', () => {
  it('cria no máximo 1 emergência ATIVA quando a mesma usuária aciona várias vezes ao mesmo tempo', async () => {
    const service = new EmergenciasService();
    const { builder, ativas } = bancoEmMemoria();
    (service as any).supabase = builder;

    const tentativas = await Promise.allSettled(
      Array.from({ length: 5 }, () => service.acionar({ usuaria_id: 'u1' }, 'u1')),
    );

    const sucessos = tentativas.filter((t) => t.status === 'fulfilled');
    expect(sucessos).toHaveLength(1);
    expect(ativas.filter((a) => a.status === 'ATIVA')).toHaveLength(1);
  });

  it('não bloqueia usuárias diferentes entre si', async () => {
    const service = new EmergenciasService();
    const { builder, ativas } = bancoEmMemoria();
    (service as any).supabase = builder;

    await Promise.all([
      service.acionar({ usuaria_id: 'u1' }, 'u1'),
      service.acionar({ usuaria_id: 'u2' }, 'u2'),
    ]);

    expect(ativas).toHaveLength(2);
  });
});

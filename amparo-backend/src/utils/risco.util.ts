/**
 * Monta a entrada da IA de risco. Espelha amparo-ia/pipeline_v2/regras.py.
 *
 * Só contam ocorrências e acionamentos válidos do botão dos últimos JANELA_DIAS dias.
 * A data de referência da ocorrência é a data em que a violência aconteceu
 * (data_ocorrencia) ou, se não foi informada, a data do registro.
 */
export const JANELA_DIAS = 30;
export const LIMITE_ENGANO_MS = 30_000;
const DIA_MS = 86_400_000;

type Ocorrencia = { tipos_violencia?: string[] | null; data_ocorrencia?: string | null; criado_em: string };
type Emergencia = { criado_em: string; encerrado_em?: string | null };

export function dataReferencia(o: Ocorrencia): Date {
  return new Date(o.data_ocorrencia ?? o.criado_em);
}

function diasAtras(data: Date, agora: Date): number {
  return Math.max(0, Math.floor((agora.getTime() - data.getTime()) / DIA_MS));
}

export function acionamentoValido(e: Emergencia): boolean {
  return !e.encerrado_em || new Date(e.encerrado_em).getTime() - new Date(e.criado_em).getTime() > LIMITE_ENGANO_MS;
}

export function calcularIdade(dataNascimento: string | null | undefined, agora: Date): number {
  if (!dataNascimento) return 35;
  return Math.min(Math.max(agora.getFullYear() - new Date(dataNascimento).getFullYear(), 0), 120);
}

export function montarEntradaRisco(
  ocorrencias: Ocorrencia[],
  emergencias: Emergencia[],
  dataNascimento: string | null | undefined,
  agora = new Date(),
) {
  const recentes = ocorrencias.filter((o) => diasAtras(dataReferencia(o), agora) <= JANELA_DIAS);
  const validas = emergencias.filter(acionamentoValido);
  const validasRecentes = validas.filter((e) => diasAtras(new Date(e.criado_em), agora) <= JANELA_DIAS);
  const tipos = new Set(recentes.flatMap((o) => o.tipos_violencia ?? []));
  const dias = recentes.length ? Math.min(...recentes.map((o) => diasAtras(dataReferencia(o), agora))) : 999;

  return {
    idade: calcularIdade(dataNascimento, agora),
    qtd_ocorrencias_totais: recentes.length,
    dias_desde_ultima_ocorrencia: dias,
    frequencia_aumentou: recentes.length >= 2 ? 1 : 0,
    teve_viol_fisica: tipos.has('Física') ? 1 : 0,
    teve_viol_sexual: tipos.has('Sexual') ? 1 : 0,
    teve_ameaca: tipos.has('Ameaça') ? 1 : 0,
    teve_viol_psicologica: tipos.has('Psicológica') ? 1 : 0,
    teve_viol_moral: tipos.has('Moral') ? 1 : 0,
    teve_viol_patrimonial: tipos.has('Patrimonial') ? 1 : 0,
    qtd_panico_acionado: validasRecentes.length,
    possui_historico_anterior: ocorrencias.length > recentes.length || validas.length > validasRecentes.length ? 1 : 0,
  };
}

// Datas exibidas no formato do design: "14/03" e "21:47".

const doisDigitos = (n: number) => String(n).padStart(2, '0');

export function diaMes(iso: string): string {
  const d = new Date(iso);
  return `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}`;
}

/** Data AAAA-MM-DD (sem hora) → "14/03", sem deslocar por fuso */
export function diaMesDeData(data: string): string {
  const [, mes, dia] = data.slice(0, 10).split('-');
  return `${dia}/${mes}`;
}

export function hora(iso: string): string {
  const d = new Date(iso);
  return `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;
}

export function diaMesHora(iso: string): string {
  return `${diaMes(iso)}, ${hora(iso)}`;
}

export function hojeIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;
}

/** Dia (AAAA-MM-DD, horário local) em que a ocorrência aconteceu: a data informada ou a do registro */
export function diaDaOcorrencia(o: { data_ocorrencia: string | null; criado_em: string }): string {
  if (o.data_ocorrencia) return o.data_ocorrencia.slice(0, 10);
  const d = new Date(o.criado_em);
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;
}

export function diasDesde(diaIso: string, agora = new Date()): number {
  const [a, m, d] = diaIso.split('-').map(Number);
  const inicio = new Date(a, m - 1, d).getTime();
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();
  return Math.max(0, Math.round((hoje - inicio) / 86_400_000));
}

/** Semana atual, de segunda a domingo (letras do design: S T Q Q S S D) */
export function semanaAtual(agora = new Date()): { dia: string; letra: string }[] {
  const diaSemana = (agora.getDay() + 6) % 7; // segunda = 0
  const segunda = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - diaSemana);
  return ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((letra, i) => {
    const d = new Date(segunda.getFullYear(), segunda.getMonth(), segunda.getDate() + i);
    return { dia: `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`, letra };
  });
}

/** Filtro "Esta semana / Este mês / Mais antigas" da lista de registros */
export function periodoDe(diaIso: string, agora = new Date()): 'Esta semana' | 'Este mês' | 'Mais antigas' {
  const semana = semanaAtual(agora).map((s) => s.dia);
  if (semana.includes(diaIso)) return 'Esta semana';
  const [a, m] = diaIso.split('-').map(Number);
  if (a === agora.getFullYear() && m === agora.getMonth() + 1) return 'Este mês';
  return 'Mais antigas';
}

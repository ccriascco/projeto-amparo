"""Regras de negócio que definem o risco "correto" (gabarito) e as features da IA.

Espelham a montagem do payload do backend (amparo-backend/src/ocorrencias/risco.util.ts):
  - só contam ocorrências e acionamentos válidos do botão dos últimos JANELA_DIAS dias;
  - acionamento encerrado em até LIMITE_ENGANO_SEGUNDOS é engano e não conta.
"""

NIVEL_POR_TIPO = {
    'Física': 2,
    'Sexual': 2,
    'Ameaça': 1,
    'Psicológica': 0,
    'Moral': 0,
    'Patrimonial': 0,
}

TIPOS = list(NIVEL_POR_TIPO.keys())
LIMITE_ENGANO_SEGUNDOS = 30
JANELA_DIAS = 30
DIAS_RECENTE = 15

FEATURES = [
    'idade',
    'qtd_ocorrencias_totais',
    'dias_desde_ultima_ocorrencia',
    'frequencia_aumentou',
    'teve_viol_fisica',
    'teve_viol_sexual',
    'teve_ameaca',
    'teve_viol_psicologica',
    'teve_viol_moral',
    'teve_viol_patrimonial',
    'qtd_panico_acionado',
]

NIVEIS = {0: 'Baixo', 1: 'Medio', 2: 'Alto'}


def acionamento_valido(botao):
    """Acionamento ativo (sem encerramento) ou encerrado após o limite de engano."""
    duracao = botao.get('duracao_segundos')
    return duracao is None or duracao > LIMITE_ENGANO_SEGUNDOS


def features(caso):
    recentes = [o for o in caso['ocorrencias'] if o['dias_atras'] <= JANELA_DIAS]
    validos = [b for b in caso['botao'] if acionamento_valido(b)]
    validos_recentes = [b for b in validos if b.get('dias_atras', 0) <= JANELA_DIAS]
    tipos = {o['tipo'] for o in recentes}
    return {
        'idade': caso['idade'],
        'qtd_ocorrencias_totais': len(recentes),
        'dias_desde_ultima_ocorrencia': min((o['dias_atras'] for o in recentes), default=999),
        'frequencia_aumentou': int(len(recentes) >= 2),
        'teve_viol_fisica': int('Física' in tipos),
        'teve_viol_sexual': int('Sexual' in tipos),
        'teve_ameaca': int('Ameaça' in tipos),
        'teve_viol_psicologica': int('Psicológica' in tipos),
        'teve_viol_moral': int('Moral' in tipos),
        'teve_viol_patrimonial': int('Patrimonial' in tipos),
        'qtd_panico_acionado': len(validos_recentes),
        # Colunas auxiliares (não são features do modelo).
        'qtd_panico_todos': len([b for b in caso['botao'] if b.get('dias_atras', 0) <= JANELA_DIAS]),
        'possui_historico_anterior': int(len(caso['ocorrencias']) > len(recentes) or len(validos) > len(validos_recentes)),
    }


def gabarito(caso):
    """Nível de risco correto segundo as regras aprovadas.

    Retorna None quando não há nada na janela de 30 dias: nesse caso a decisão é da
    API, antes do modelo (Baixo se houver histórico antigo; Médio se nunca houve nada).
    """
    f = features(caso)
    if f['qtd_ocorrencias_totais'] == 0 and f['qtd_panico_acionado'] == 0:
        return None

    recentes = [o for o in caso['ocorrencias'] if o['dias_atras'] <= JANELA_DIAS]
    nivel = max((NIVEL_POR_TIPO[o['tipo']] for o in recentes), default=0)
    if f['frequencia_aumentou'] and nivel < 2:
        nivel += 1
    if f['qtd_panico_acionado'] > 0:
        nivel = max(nivel, 1)
        if nivel == 2 or f['dias_desde_ultima_ocorrencia'] <= DIAS_RECENTE:
            nivel = 2
    return nivel


def decisao_api_sem_dados(caso):
    """O que a API responde quando o gabarito é None (regra aplicada antes do modelo)."""
    return 'Baixo' if features(caso)['possui_historico_anterior'] else 'Medio'

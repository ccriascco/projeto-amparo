"""Regras de negócio que definem o risco "correto" (gabarito) e as features da IA.

Espelham exatamente a montagem do payload do backend (ocorrencias.service.ts),
com as mudanças aprovadas: três tipos novos e acionamento por engano (<= 30s).
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
DIAS_RECENTE = 15
DIAS_FREQUENCIA = 30

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
    ocorrencias = caso['ocorrencias']
    botoes = caso['botao']
    qtd = len(ocorrencias)
    dias = min((o['dias_atras'] for o in ocorrencias), default=999)
    tipos = {o['tipo'] for o in ocorrencias}
    return {
        'idade': caso['idade'],
        'qtd_ocorrencias_totais': qtd,
        'dias_desde_ultima_ocorrencia': dias,
        'frequencia_aumentou': int(qtd >= 2 and dias <= DIAS_FREQUENCIA),
        'teve_viol_fisica': int('Física' in tipos),
        'teve_viol_sexual': int('Sexual' in tipos),
        'teve_ameaca': int('Ameaça' in tipos),
        'teve_viol_psicologica': int('Psicológica' in tipos),
        'teve_viol_moral': int('Moral' in tipos),
        'teve_viol_patrimonial': int('Patrimonial' in tipos),
        'qtd_panico_acionado': sum(1 for b in botoes if acionamento_valido(b)),
        'qtd_panico_todos': len(botoes),
    }


def gabarito(caso):
    """Nível de risco correto segundo as regras aprovadas.

    Retorna None quando não há histórico nem acionamento válido: nesse caso a
    decisão é da regra RN07 do backend ("histórico insuficiente" -> Médio) e
    não do modelo, então o caso não entra na avaliação do modelo.
    """
    f = features(caso)
    if f['qtd_ocorrencias_totais'] == 0 and f['qtd_panico_acionado'] == 0:
        return None

    nivel = max((NIVEL_POR_TIPO[o['tipo']] for o in caso['ocorrencias']), default=0)
    if f['frequencia_aumentou'] and nivel < 2:
        nivel += 1
    if f['qtd_panico_acionado'] > 0:
        nivel = max(nivel, 1)
        if nivel == 2 or f['dias_desde_ultima_ocorrencia'] <= DIAS_RECENTE:
            nivel = 2
    return nivel

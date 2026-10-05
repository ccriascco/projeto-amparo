"""Simula usuárias fictícias e envia cada uma para a IA em produção.

Usa exatamente a montagem de features do regras.py (espelho do backend) e o
segredo do backend. Não grava nada em banco nenhum.
"""
import csv
import json
import os
import urllib.request
from pathlib import Path

from regras import features, gabarito, NIVEIS

RAIZ = Path(__file__).resolve().parent
SAIDA = RAIZ / 'resultados' / 'simulacao.csv'
URL = 'http://127.0.0.1:8000/classificar'


def segredo():
    for linha in (RAIZ.parent.parent / 'amparo-backend' / '.env').read_text(encoding='utf-8').splitlines():
        if linha.startswith('IA_SHARED_SECRET='):
            return linha.split('=', 1)[1].strip()
    raise RuntimeError('IA_SHARED_SECRET não encontrado')


USUARIAS = [
    {
        'nome': 'Ana', 'idade': 34,
        'historia': 'Quatro episódios de humilhação e controle nas últimas três semanas, sem botão acionado.',
        'ocorrencias': [{'tipo': 'Psicológica', 'dias_atras': d} for d in (2, 6, 11, 19)],
        'botao': [],
    },
    {
        'nome': 'Bia', 'idade': 29,
        'historia': 'Agressão física há três dias e dois acionamentos válidos do botão recentes.',
        'ocorrencias': [{'tipo': 'Física', 'dias_atras': 3}],
        'botao': [{'duracao_segundos': 180}, {'duracao_segundos': 95}],
    },
    {
        'nome': 'Carla', 'idade': 41,
        'historia': 'Um episódio patrimonial há quase um ano, sem novas ocorrências.',
        'ocorrencias': [{'tipo': 'Patrimonial', 'dias_atras': 300}],
        'botao': [],
    },
    {
        'nome': 'Daniela', 'idade': 25,
        'historia': 'Nenhuma ocorrência. Acionou o botão por engano e encerrou em 10 segundos.',
        'ocorrencias': [],
        'botao': [{'duracao_segundos': 10}],
    },
    {
        'nome': 'Elaine', 'idade': 38,
        'historia': 'Violência sexual há 200 dias e uma ameaça há 40 dias.',
        'ocorrencias': [{'tipo': 'Sexual', 'dias_atras': 200}, {'tipo': 'Ameaça', 'dias_atras': 40}],
        'botao': [],
    },
    {
        'nome': 'Fernanda', 'idade': 31,
        'historia': 'Três ameaças nas últimas três semanas, sem botão.',
        'ocorrencias': [{'tipo': 'Ameaça', 'dias_atras': d} for d in (4, 12, 20)],
        'botao': [],
    },
    {
        'nome': 'Gabi', 'idade': 27,
        'historia': 'Uma ofensa moral hoje e um acionamento válido do botão há cinco dias.',
        'ocorrencias': [{'tipo': 'Moral', 'dias_atras': 0}],
        'botao': [{'duracao_segundos': 240}],
    },
    {
        'nome': 'Irene', 'idade': 45,
        'historia': 'Ameaça há 14 dias e um acionamento válido do botão no mesmo período (caso de fronteira).',
        'ocorrencias': [{'tipo': 'Ameaça', 'dias_atras': 14}],
        'botao': [{'duracao_segundos': 300}],
    },
]


def classificar(entrada, chave):
    corpo = json.dumps(entrada).encode('utf-8')
    req = urllib.request.Request(URL, data=corpo, headers={
        'Content-Type': 'application/json', 'X-Internal-Secret': chave})
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read().decode('utf-8'))


def main():
    chave = segredo()
    linhas = []
    for u in USUARIAS:
        caso = {'idade': u['idade'], 'ocorrencias': u['ocorrencias'], 'botao': u['botao']}
        f = features(caso)
        entrada = {k: v for k, v in f.items() if k != 'qtd_panico_todos'}
        esperado = gabarito(caso)
        resposta = classificar(entrada, chave)
        esperado_txt = NIVEIS[esperado] if esperado is not None else 'Médio (RN07: sem histórico)'
        linhas.append({
            'usuaria': u['nome'],
            'historia': u['historia'],
            'esperado_regra': esperado_txt,
            'previsto_ia': resposta['risco'],
            'acertou': (esperado is None and resposta['risco'] == 'Medio') or (esperado is not None and resposta['risco'] == NIVEIS[esperado]),
            'justificativa': resposta['justificativa'],
            'entrada_ia': json.dumps(entrada, ensure_ascii=False),
        })
    with open(SAIDA, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(linhas[0].keys()))
        w.writeheader()
        w.writerows(linhas)
    for l in linhas:
        print(f"{l['usuaria']:<9} | esperado: {l['esperado_regra']:<28} | IA: {l['previsto_ia']:<6} | {'OK' if l['acertou'] else 'DIVERGE'}")


if __name__ == '__main__':
    main()

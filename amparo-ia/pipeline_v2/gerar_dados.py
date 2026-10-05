"""Gera dados sintéticos rotulados pelas regras aprovadas e separa treino/validação/teste.

Saídas em amparo-ia/pipeline_v2/dados/:
  treino.csv, validacao.csv, teste.csv   (70/15/15, sem exemplos repetidos entre eles)
  borda.csv                              (casos de borda escritos à mão, só para teste)
  borda_casos.json                       (entrada completa de cada caso de borda)
"""
import json
import random
from pathlib import Path

import pandas as pd
from sklearn.model_selection import train_test_split

from regras import FEATURES, NIVEIS, TIPOS, features, gabarito

RAIZ = Path(__file__).resolve().parent
SAIDA = RAIZ / 'dados'
SAIDA.mkdir(exist_ok=True)

SEMENTE = 11
RUIDO_ROTULO = 0.10  # fração de rótulos errados só em treino e validação (teste fica limpo)
POR_CLASSE = 3000
rng = random.Random(SEMENTE)


def caso_aleatorio():
    n_oc = rng.choices([0, 1, 2, 3, 4, 5, 6], weights=[8, 22, 22, 18, 12, 10, 8])[0]
    ocorrencias = []
    for _ in range(n_oc):
        ocorrencias.append({
            'tipo': rng.choices(TIPOS, weights=[12, 12, 14, 18, 18, 14])[0],
            'dias_atras': rng.choice([rng.randint(0, 15), rng.randint(16, 60), rng.randint(61, 400)]),
        })
    botoes = []
    for _ in range(rng.choices([0, 1, 2, 3, 4], weights=[60, 22, 10, 5, 3])[0]):
        if rng.random() < 0.7:
            botoes.append({'duracao_segundos': rng.randint(31, 900)})  # acionamento válido
        else:
            botoes.append({'duracao_segundos': rng.randint(1, 30)})    # engano
    return {'idade': rng.randint(18, 70), 'ocorrencias': ocorrencias, 'botao': botoes}


def gerar_equilibrado():
    cont = {n: 0 for n in NIVEIS}
    vistos = set()
    linhas = []
    while min(cont.values()) < POR_CLASSE:
        caso = caso_aleatorio()
        y = gabarito(caso)
        if y is None or cont[y] >= POR_CLASSE:
            continue
        f = features(caso)
        chave = tuple(f[c] for c in FEATURES) + (y,)
        if chave in vistos:
            continue
        vistos.add(chave)
        cont[y] += 1
        linhas.append({**f, 'nivel_risco': y, 'origem': 'aleatorio'})
    return pd.DataFrame(linhas)


CASOS_BORDA = [
    ('B01', 'Nenhuma ocorrência e nenhum acionamento', 'sem histórico (RN07)', {'idade': 30, 'ocorrencias': [], 'botao': []}),
    ('B02', 'Uma ocorrência verbal (Moral) de 200 dias atrás', 'Baixo', {'idade': 30, 'ocorrencias': [{'tipo': 'Moral', 'dias_atras': 200}], 'botao': []}),
    ('B03', 'Uma ocorrência verbal (Moral) hoje', 'Baixo', {'idade': 30, 'ocorrencias': [{'tipo': 'Moral', 'dias_atras': 0}], 'botao': []}),
    ('B04', 'Cinco ocorrências verbais recorrentes em 30 dias', 'Médio', {'idade': 30, 'ocorrencias': [{'tipo': 'Moral', 'dias_atras': d} for d in (1, 3, 6, 10, 20)], 'botao': []}),
    ('B05', 'Uma agressão física antiga (400 dias)', 'Alto', {'idade': 30, 'ocorrencias': [{'tipo': 'Física', 'dias_atras': 400}], 'botao': []}),
    ('B06', 'Uma ameaça isolada', 'Médio', {'idade': 30, 'ocorrencias': [{'tipo': 'Ameaça', 'dias_atras': 40}], 'botao': []}),
    ('B07', 'Três ameaças em 20 dias (recorrência)', 'Alto', {'idade': 30, 'ocorrencias': [{'tipo': 'Ameaça', 'dias_atras': d} for d in (2, 9, 18)], 'botao': []}),
    ('B08', 'Só um acionamento válido, sem ocorrências', 'Médio', {'idade': 30, 'ocorrencias': [], 'botao': [{'duracao_segundos': 300}]}),
    ('B09', 'Só um acionamento por engano (10s), sem ocorrências', 'sem histórico (RN07)', {'idade': 30, 'ocorrencias': [], 'botao': [{'duracao_segundos': 10}]}),
    ('B10', 'Ocorrência verbal recente (hoje) + acionamento válido', 'Alto', {'idade': 30, 'ocorrencias': [{'tipo': 'Moral', 'dias_atras': 0}], 'botao': [{'duracao_segundos': 200}]}),
    ('B11', 'Agressão física (hoje) sem acionamento', 'Alto', {'idade': 30, 'ocorrencias': [{'tipo': 'Física', 'dias_atras': 0}], 'botao': []}),
    ('B12', 'Cinco acionamentos válidos, sem ocorrências', 'Médio', {'idade': 30, 'ocorrencias': [], 'botao': [{'duracao_segundos': 120}] * 5}),
    ('B13', 'Três acionamentos válidos + agressão física', 'Alto', {'idade': 30, 'ocorrencias': [{'tipo': 'Física', 'dias_atras': 30}], 'botao': [{'duracao_segundos': 120}] * 3}),
    ('B14', 'Acionamentos só por engano (3x 10s) + verbal antiga', 'Baixo', {'idade': 30, 'ocorrencias': [{'tipo': 'Moral', 'dias_atras': 200}], 'botao': [{'duracao_segundos': 10}] * 3}),
    ('B15', 'Psicológica recente + acionamento por engano', 'Baixo', {'idade': 30, 'ocorrencias': [{'tipo': 'Psicológica', 'dias_atras': 5}], 'botao': [{'duracao_segundos': 10}]}),
    ('B16', 'Patrimonial + psicológica (duas leves, hoje)', 'Médio', {'idade': 30, 'ocorrencias': [{'tipo': 'Patrimonial', 'dias_atras': 0}, {'tipo': 'Psicológica', 'dias_atras': 0}], 'botao': []}),
    ('B17', 'Ameaça + física antiga (400 dias)', 'Alto', {'idade': 30, 'ocorrencias': [{'tipo': 'Ameaça', 'dias_atras': 3}, {'tipo': 'Física', 'dias_atras': 400}], 'botao': []}),
    ('B18', 'Física antiga (400 dias) + acionamento válido', 'Alto', {'idade': 30, 'ocorrencias': [{'tipo': 'Física', 'dias_atras': 400}], 'botao': [{'duracao_segundos': 90}]}),
    ('B19', 'Ocorrência sexual antiga sem acionamento', 'Alto', {'idade': 30, 'ocorrencias': [{'tipo': 'Sexual', 'dias_atras': 250}], 'botao': []}),
    ('B20', 'Idade fora da faixa (-5) com uma ameaça', 'entrada inválida: deveria ser recusada', {'idade': -5, 'ocorrencias': [{'tipo': 'Ameaça', 'dias_atras': 10}], 'botao': []}),
]


def main():
    treino_pool = gerar_equilibrado()
    treino, resto = train_test_split(treino_pool, test_size=0.30, stratify=treino_pool['nivel_risco'], random_state=SEMENTE)
    validacao, teste = train_test_split(resto, test_size=0.50, stratify=resto['nivel_risco'], random_state=SEMENTE)

    rng_ruido = random.Random(SEMENTE + 1)

    def com_ruido(df):
        df = df.copy()
        df['nivel_gabarito'] = df['nivel_risco']
        def trocar(y):
            if rng_ruido.random() < RUIDO_ROTULO:
                return rng_ruido.choice([n for n in NIVEIS if n != y])
            return y
        df['nivel_risco'] = df['nivel_gabarito'].map(trocar)
        return df

    treino = com_ruido(treino)
    validacao = com_ruido(validacao)
    teste = teste.assign(nivel_gabarito=teste['nivel_risco'])

    for nome, df in [('treino', treino), ('validacao', validacao), ('teste', teste)]:
        df.to_csv(SAIDA / f'{nome}.csv', index=False)

    linhas_borda = []
    casos = []
    for cid, descricao, esperado, caso in CASOS_BORDA:
        f = features(caso)
        y = gabarito(caso)
        linhas_borda.append({
            'caso_id': cid, 'descricao': descricao, 'esperado_regra': esperado,
            'nivel_risco': y if y is not None else -1, **f,
        })
        casos.append({'caso_id': cid, 'descricao': descricao, 'esperado_regra': esperado, **caso})
    pd.DataFrame(linhas_borda).to_csv(SAIDA / 'borda.csv', index=False)
    (SAIDA / 'borda_casos.json').write_text(json.dumps(casos, ensure_ascii=False, indent=2), encoding='utf-8')

    tot = {'treino': len(treino), 'validacao': len(validacao), 'teste': len(teste)}
    print('tamanhos:', tot)
    print('distribuicao treino:', treino['nivel_risco'].value_counts().sort_index().to_dict())
    print('distribuicao teste :', teste['nivel_risco'].value_counts().sort_index().to_dict())
    chaves = lambda df: set(map(tuple, df[FEATURES + ['nivel_risco']].values.tolist()))
    print('sobreposicao treino x teste:', len(chaves(treino) & chaves(teste)),
          '| treino x validacao:', len(chaves(treino) & chaves(validacao)))


if __name__ == '__main__':
    main()

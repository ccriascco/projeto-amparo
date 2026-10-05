"""Treina o modelo v2 com o conjunto de treino, ajusta hiperparâmetros pela validação
e registra a curva de aprendizado. Guarda a versão anterior antes de substituí-la.
"""
import json
import pickle
import platform
import shutil
from pathlib import Path

import pandas as pd
import sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score

from regras import FEATURES

RAIZ = Path(__file__).resolve().parent
DADOS = RAIZ / 'dados'
RESULTADOS = RAIZ / 'resultados'
RESULTADOS.mkdir(exist_ok=True)
IA = RAIZ.parent
ANTERIOR = IA / 'modelos_anteriores' / 'v1'
SEMENTE = 42


def carregar(nome):
    df = pd.read_csv(DADOS / f'{nome}.csv')
    return df[FEATURES], df['nivel_risco']


def guardar_versao_anterior():
    ANTERIOR.mkdir(parents=True, exist_ok=True)
    for arq in ['modelo_risco.pkl', 'colunas_modelo.pkl']:
        origem = IA / arq
        if origem.exists() and not (ANTERIOR / arq).exists():
            shutil.copy2(origem, ANTERIOR / arq)


def main():
    guardar_versao_anterior()
    Xtr, ytr = carregar('treino')
    Xva, yva = carregar('validacao')

    grade = []
    for n in (100, 300):
        for profundidade in (None, 6, 10):
            for folha in (1, 5):
                m = RandomForestClassifier(n_estimators=n, max_depth=profundidade,
                                           min_samples_leaf=folha, random_state=SEMENTE, n_jobs=-1)
                m.fit(Xtr, ytr)
                pv = m.predict(Xva)
                grade.append({
                    'n_estimators': n, 'max_depth': profundidade, 'min_samples_leaf': folha,
                    'acuracia_treino': round(accuracy_score(ytr, m.predict(Xtr)), 4),
                    'acuracia_validacao': round(accuracy_score(yva, pv), 4),
                    'f1_macro_validacao': round(f1_score(yva, pv, average='macro'), 4),
                })
    grade.sort(key=lambda r: (-r['f1_macro_validacao'], -r['acuracia_validacao']))
    melhor = grade[0]

    curva = []
    final = None
    for n in range(10, melhor['n_estimators'] + 1, 10):
        m = RandomForestClassifier(n_estimators=n, max_depth=melhor['max_depth'],
                                   min_samples_leaf=melhor['min_samples_leaf'],
                                   random_state=SEMENTE, n_jobs=-1)
        m.fit(Xtr, ytr)
        curva.append({
            'arvores': n,
            'acuracia_treino': round(accuracy_score(ytr, m.predict(Xtr)), 4),
            'acuracia_validacao': round(accuracy_score(yva, m.predict(Xva)), 4),
        })
        final = m

    with open(RAIZ / 'modelo_candidato.pkl', 'wb') as f:
        pickle.dump(final, f)
    with open(RAIZ / 'colunas_candidato.pkl', 'wb') as f:
        pickle.dump(FEATURES, f)

    resumo = {
        'versao': 'v3-candidato',
        'features': FEATURES,
        'amostras': {'treino': len(Xtr), 'validacao': len(Xva)},
        'grade_hiperparametros': grade,
        'escolhido': melhor,
        'curva_aprendizado': curva,
        'ambiente': {'python': platform.python_version(), 'sklearn': sklearn.__version__},
    }
    (RESULTADOS / 'treino.json').write_text(json.dumps(resumo, ensure_ascii=False, indent=2), encoding='utf-8')
    print('escolhido:', melhor)
    print('ultimo ponto da curva:', curva[-1])


if __name__ == '__main__':
    main()

"""Compara Random Forest x Árvore de Decisão nos mesmos dados (v3, sementes 7 e 11).

Mesmo protocolo para os dois: treino com rótulos ruidosos, escolha de hiperparâmetros
pela validação (F1 macro) e avaliação final no teste limpo (gabarito).
"""
import json
from pathlib import Path

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score
from sklearn.tree import DecisionTreeClassifier

from regras import FEATURES

RAIZ = Path(__file__).resolve().parent
TREINOS = RAIZ / 'treinos'
SAIDA = TREINOS / 'comparacao'
SAIDA.mkdir(parents=True, exist_ok=True)

GRADES = {
    'RandomForest': (
        lambda p, f: RandomForestClassifier(n_estimators=100, max_depth=p, min_samples_leaf=f, random_state=42, n_jobs=-1),
        [(None, 1), (None, 5), (6, 1), (6, 5), (10, 1), (10, 5)],
    ),
    'ArvoreDecisao': (
        lambda p, f: DecisionTreeClassifier(max_depth=p, min_samples_leaf=f, random_state=42),
        [(None, 1), (None, 5), (6, 1), (6, 5), (10, 1), (10, 5)],
    ),
}


def carregar(pasta):
    base = TREINOS / pasta / 'dados'
    return (pd.read_csv(base / 'treino.csv'), pd.read_csv(base / 'validacao.csv'), pd.read_csv(base / 'teste.csv'))


def rodar(pasta):
    tr, va, te = carregar(pasta)
    linhas = []
    for nome, (fabrica, grade) in GRADES.items():
        melhor = None
        for p, f in grade:
            m = fabrica(p, f).fit(tr[FEATURES], tr['nivel_risco'])
            f1_val = f1_score(va['nivel_gabarito'], m.predict(va[FEATURES]), average='macro')
            if melhor is None or f1_val > melhor['f1_val']:
                melhor = {'modelo': m, 'p': p, 'f': f, 'f1_val': f1_val}
        m = melhor['modelo']
        p_te = m.predict(te[FEATURES])
        linhas.append({
            'dados': pasta,
            'modelo': nome,
            'max_depth': 'livre' if melhor['p'] is None else melhor['p'],
            'min_samples_leaf': melhor['f'],
            'acuracia_teste': round(accuracy_score(te['nivel_gabarito'], p_te), 4),
            'f1_macro_teste': round(f1_score(te['nivel_gabarito'], p_te, average='macro'), 4),
            'erros_teste': int((p_te != te['nivel_gabarito']).sum()),
            'alto_para_baixo': int(((te['nivel_gabarito'] == 2) & (p_te == 0)).sum()),
            'f1_val_escolhido': round(melhor['f1_val'], 4),
        })
    return linhas


def main():
    tabela = []
    for pasta in ('v3-seed7', 'v3-seed11'):
        tabela += rodar(pasta)
    df = pd.DataFrame(tabela)
    df.to_csv(SAIDA / 'comparacao.csv', index=False)
    (SAIDA / 'comparacao.json').write_text(json.dumps(tabela, ensure_ascii=False, indent=2), encoding='utf-8')
    print(df.to_string(index=False))


if __name__ == '__main__':
    main()

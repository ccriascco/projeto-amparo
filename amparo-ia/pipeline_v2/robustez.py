"""Robustez: desempenho no teste limpo quando o treino tem uma fração de rótulos errados."""
import json, random
from pathlib import Path
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from sklearn.tree import DecisionTreeClassifier
from regras import FEATURES

RAIZ = Path(__file__).resolve().parent
SAIDA = RAIZ / 'treinos' / 'comparacao' / 'robustez.json'
NIVEIS = [0, 1, 2]

def com_ruido(y, taxa, semente):
    rng = random.Random(semente)
    return [rng.choice([n for n in NIVEIS if n != v]) if rng.random() < taxa else v for v in y]

resultados = []
for pasta in ('v3-seed7', 'v3-seed11'):
    base = RAIZ / 'treinos' / pasta / 'dados'
    tr = pd.read_csv(base / 'treino.csv'); te = pd.read_csv(base / 'teste.csv')
    for taxa in (0.0, 0.10, 0.20, 0.30):
        y = com_ruido(tr['nivel_gabarito'].tolist(), taxa, 1000 + int(taxa * 100)) if taxa else tr['nivel_gabarito'].tolist()
        modelos = {
            'RandomForest': RandomForestClassifier(n_estimators=100, min_samples_leaf=5, random_state=42, n_jobs=-1),
            'ArvoreDecisao': DecisionTreeClassifier(min_samples_leaf=5, random_state=42),
        }
        for nome, m in modelos.items():
            m.fit(tr[FEATURES], y)
            p = m.predict(te[FEATURES])
            resultados.append({'dados': pasta, 'ruido': taxa, 'modelo': nome,
                               'acuracia_teste': round(accuracy_score(te['nivel_gabarito'], p), 4),
                               'alto_para_baixo': int(((te['nivel_gabarito'] == 2) & (p == 0)).sum())})
SAIDA.write_text(json.dumps(resultados, indent=2), encoding='utf-8')
print(pd.DataFrame(resultados).to_string(index=False))

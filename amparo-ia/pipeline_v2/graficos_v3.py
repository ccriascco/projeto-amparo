"""Gráficos do treinamento e do teste do candidato v3 (treinado com 10% de rótulos com ruído)."""
import json
import pickle
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

from regras import FEATURES

RAIZ = Path(__file__).resolve().parent
DADOS = RAIZ / 'dados'
RES = RAIZ / 'resultados'
SAIDA = RAIZ.parent.parent / 'Relatorios' / 'ia_v3'
SAIDA.mkdir(parents=True, exist_ok=True)
NOMES = ['Baixo', 'Medio', 'Alto']
SEMENTE = 42


def curva_limpa():
    tr = pd.read_csv(DADOS / 'treino.csv')
    va = pd.read_csv(DADOS / 'validacao.csv')
    cfg = json.loads((RES / 'treino.json').read_text(encoding='utf-8'))['escolhido']
    ns, ruido_tr, limpo_tr, ruido_va, limpo_va = [], [], [], [], []
    for n in range(10, cfg['n_estimators'] + 1, 10):
        m = RandomForestClassifier(n_estimators=n, max_depth=cfg['max_depth'],
                                   min_samples_leaf=cfg['min_samples_leaf'], random_state=SEMENTE, n_jobs=-1)
        m.fit(tr[FEATURES], tr['nivel_risco'])
        ns.append(n)
        ruido_tr.append((m.predict(tr[FEATURES]) == tr['nivel_risco']).mean())
        limpo_tr.append((m.predict(tr[FEATURES]) == tr['nivel_gabarito']).mean())
        ruido_va.append((m.predict(va[FEATURES]) == va['nivel_risco']).mean())
        limpo_va.append((m.predict(va[FEATURES]) == va['nivel_gabarito']).mean())
    return ns, ruido_tr, limpo_tr, ruido_va, limpo_va


def grafico_curva():
    ns, rtr, ltr, rva, lva = curva_limpa()
    fig, ax = plt.subplots(figsize=(7.5, 4.5))
    ax.plot(ns, ltr, 'o-', label='treino x gabarito limpo')
    ax.plot(ns, rtr, 's--', alpha=0.6, label='treino x rótulo com ruído')
    ax.plot(ns, lva, 'o-', label='validação x gabarito limpo')
    ax.plot(ns, rva, 's--', alpha=0.6, label='validação x rótulo com ruído')
    ax.axhline(0.90, color='gray', ls=':', lw=1)
    ax.set_xlabel('número de árvores')
    ax.set_ylabel('acurácia')
    ax.set_ylim(0.85, 1.01)
    ax.set_title('Curva de aprendizado (candidato v3)')
    ax.legend(loc='lower right', fontsize=8)
    fig.tight_layout()
    fig.savefig(SAIDA / 'curva_aprendizado.png', dpi=130)


def grafico_matriz(cm, titulo, arquivo):
    cm = np.array(cm)
    fig, ax = plt.subplots(figsize=(5, 4.5))
    im = ax.imshow(cm, cmap='Blues')
    ax.set_xticks(range(3), NOMES)
    ax.set_yticks(range(3), NOMES)
    ax.set_xlabel('previsto')
    ax.set_ylabel('gabarito')
    for i in range(3):
        for j in range(3):
            ax.text(j, i, cm[i, j], ha='center', va='center', color='white' if cm[i, j] > cm.max() / 2 else 'black')
    ax.set_title(titulo)
    fig.colorbar(im, ax=ax, fraction=0.046)
    fig.tight_layout()
    fig.savefig(SAIDA / arquivo, dpi=130)


def grafico_comparacao(t):
    modelos = [('v1 (anterior)', 'v1'), ('v2 (em produção)', 'v2_anterior'), ('v3 (candidato)', 'v2')]
    x = np.arange(3)
    fig, ax = plt.subplots(figsize=(8, 4.5))
    largura = 0.27
    for i, (rotulo, chave) in enumerate(modelos):
        f1 = [t[chave]['por_nivel'][n]['f1-score'] for n in NOMES]
        ax.bar(x + (i - 1) * largura, f1, largura, label=f"{rotulo}: acurácia {t[chave]['acuracia']}")
    ax.set_xticks(x, NOMES)
    ax.set_ylim(0, 1.08)
    ax.set_ylabel('F1-score (teste limpo)')
    ax.set_title('Comparação por nível de risco')
    ax.legend(loc='lower right', fontsize=8)
    fig.tight_layout()
    fig.savefig(SAIDA / 'comparacao_modelos.png', dpi=130)


def main():
    t = json.loads((RES / 'teste.json').read_text(encoding='utf-8'))
    grafico_curva()
    grafico_matriz(t['v2']['matriz_confusao'], 'Matriz de confusão: candidato v3 (teste)', 'matriz_candidato.png')
    grafico_matriz(t['v1']['matriz_confusao'], 'Matriz de confusão: v1 (teste)', 'matriz_v1.png')
    grafico_comparacao(t)
    print('graficos em', SAIDA)


if __name__ == '__main__':
    main()

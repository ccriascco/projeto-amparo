"""Gera os gráficos do relatório a partir dos JSON de treino e de teste."""
import json
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

RAIZ = Path(__file__).resolve().parent
RESULTADOS = RAIZ / 'resultados'
SAIDA = RAIZ.parent.parent / 'Relatorios' / 'ia_v2'
SAIDA.mkdir(parents=True, exist_ok=True)
NOMES = ['Baixo', 'Medio', 'Alto']


def curva():
    dados = json.loads((RESULTADOS / 'treino.json').read_text(encoding='utf-8'))['curva_aprendizado']
    x = [p['arvores'] for p in dados]
    fig, ax = plt.subplots(figsize=(7, 4))
    ax.plot(x, [p['acuracia_treino'] for p in dados], marker='o', label='treino')
    ax.plot(x, [p['acuracia_validacao'] for p in dados], marker='s', label='validação')
    ax.set_xlabel('número de árvores')
    ax.set_ylabel('acurácia')
    ax.set_ylim(0.9, 1.01)
    ax.set_title('Curva de aprendizado (modelo v2)')
    ax.legend()
    fig.tight_layout()
    fig.savefig(SAIDA / 'curva_aprendizado.png', dpi=130)


def matriz(cm, titulo, arquivo):
    cm = np.array(cm)
    fig, ax = plt.subplots(figsize=(5, 4.5))
    im = ax.imshow(cm, cmap='Blues')
    ax.set_xticks(range(3), NOMES)
    ax.set_yticks(range(3), NOMES)
    ax.set_xlabel('previsto')
    ax.set_ylabel('esperado (gabarito)')
    for i in range(3):
        for j in range(3):
            ax.text(j, i, cm[i, j], ha='center', va='center',
                    color='white' if cm[i, j] > cm.max() / 2 else 'black')
    ax.set_title(titulo)
    fig.colorbar(im, ax=ax, fraction=0.046)
    fig.tight_layout()
    fig.savefig(SAIDA / arquivo, dpi=130)


def comparacao(teste):
    f1_v2 = [teste['v2']['por_nivel'][n]['f1-score'] for n in NOMES]
    f1_v1 = [teste['v1']['por_nivel'][n]['f1-score'] for n in NOMES]
    x = np.arange(3)
    fig, ax = plt.subplots(figsize=(7, 4))
    ax.bar(x - 0.2, f1_v1, 0.4, label=f"v1 (anterior) acurácia {teste['v1']['acuracia']}")
    ax.bar(x + 0.2, f1_v2, 0.4, label=f"v2 (nova) acurácia {teste['v2']['acuracia']}")
    ax.set_xticks(x, NOMES)
    ax.set_ylim(0, 1.05)
    ax.set_ylabel('F1-score')
    ax.set_title('Teste: F1 por nível de risco, v1 x v2')
    ax.legend(loc='lower right')
    fig.tight_layout()
    fig.savefig(SAIDA / 'comparacao_v1_v2.png', dpi=130)


def main():
    teste = json.loads((RESULTADOS / 'teste.json').read_text(encoding='utf-8'))
    curva()
    matriz(teste['v2']['matriz_confusao'], 'Matriz de confusão: v2 (teste)', 'matriz_v2.png')
    matriz(teste['v1']['matriz_confusao'], 'Matriz de confusão: v1 (teste)', 'matriz_v1.png')
    comparacao(teste)
    print('graficos em', SAIDA)


if __name__ == '__main__':
    main()

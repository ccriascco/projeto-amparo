"""Avalia o modelo v2 e a versão anterior (v1) no conjunto de teste e nos casos de borda.

Saídas em pipeline_v2/resultados/: teste.json e borda_resultados.csv.
"""
import json
import pickle
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

from regras import FEATURES, NIVEIS

RAIZ = Path(__file__).resolve().parent
DADOS = RAIZ / 'dados'
RESULTADOS = RAIZ / 'resultados'
IA = RAIZ.parent
V1 = IA / 'modelos_anteriores' / 'v1'
ROTULOS = [0, 1, 2]
NOMES = [NIVEIS[r] for r in ROTULOS]


def carregar_modelo(caminho_modelo, caminho_colunas):
    with open(caminho_modelo, 'rb') as f:
        modelo = pickle.load(f)
    with open(caminho_colunas, 'rb') as f:
        colunas = pickle.load(f)
    return modelo, colunas


def metricas(y, p):
    rel = classification_report(y, p, labels=ROTULOS, target_names=NOMES, output_dict=True, zero_division=0)
    cm = confusion_matrix(y, p, labels=ROTULOS)
    alto_para_baixo = int(((np.asarray(y) == 2) & (np.asarray(p) == 0)).sum())
    return {
        'acuracia': round(accuracy_score(y, p), 4),
        'por_nivel': {n: {k: round(rel[n][k], 4) for k in ('precision', 'recall', 'f1-score', 'support')} for n in NOMES},
        'f1_macro': round(rel['macro avg']['f1-score'], 4),
        'matriz_confusao': cm.tolist(),
        'erros_perigosos_alto_para_baixo': alto_para_baixo,
    }


def main():
    v2, cols2 = carregar_modelo(RAIZ / 'modelo_candidato.pkl', RAIZ / 'colunas_candidato.pkl')
    v2_antigo, cols2_antigo = carregar_modelo(IA / 'modelos_anteriores' / 'v3-historico-completo' / 'modelo_risco.pkl', IA / 'modelos_anteriores' / 'v3-historico-completo' / 'colunas_modelo.pkl')
    v1, cols1 = carregar_modelo(V1 / 'modelo_risco.pkl', V1 / 'colunas_modelo.pkl')

    teste = pd.read_csv(DADOS / 'teste.csv')
    y = teste['nivel_risco'].values

    p2 = v2.predict(teste[cols2])
    # A v1 foi treinada com a contagem de TODOS os acionamentos (inclusive enganos).
    t1 = teste.assign(qtd_panico_acionado=teste['qtd_panico_todos'])
    p1 = v1.predict(t1[cols1])
    p_antigo = v2_antigo.predict(teste[cols2_antigo])

    resultado = {
        'conjunto': 'teste', 'n': len(teste),
        'distribuicao': teste['nivel_risco'].value_counts().sort_index().to_dict(),
        'v2': metricas(y, p2),
        'v1': metricas(y, p1),
        'v2_anterior': metricas(y, p_antigo),
    }

    # Influência do botão: zerar os acionamentos válidos muda a classificação?
    com_botao = teste[teste['qtd_panico_acionado'] > 0]
    sem = com_botao.assign(qtd_panico_acionado=0)
    mudou_sem = (v2.predict(sem[cols2]) != v2.predict(com_botao[cols2])).mean()
    # Engano tratado como válido: o modelo supervaloriza o acionamento?
    engano = teste[teste['qtd_panico_todos'] > teste['qtd_panico_acionado']]
    comengano = engano.assign(qtd_panico_acionado=engano['qtd_panico_todos'])
    mudou_engano = (v2.predict(comengano[cols2]) != v2.predict(engano[cols2])).mean() if len(engano) else None
    resultado['botao'] = {
        'casos_com_botao_valido': int(len(com_botao)),
        'taxa_mudanca_ao_remover_botao': round(float(mudou_sem), 4),
        'casos_com_engano': int(len(engano)),
        'taxa_mudanca_se_engano_contasse': round(float(mudou_engano), 4) if mudou_engano is not None else None,
    }

    borda = pd.read_csv(DADOS / 'borda.csv')

    def resposta_api(modelo, colunas, linhas):
        """Reproduz a API: idade inválida é recusada; sem dados na janela, a regra decide antes do modelo."""
        previsto = modelo.predict(linhas[colunas])
        respostas = []
        for (_, l), p in zip(linhas.iterrows(), previsto):
            if l['idade'] < 0:
                respostas.append('recusado (422)')
            elif l['qtd_ocorrencias_totais'] == 0 and l['qtd_panico_acionado'] == 0:
                respostas.append(('Baixo' if l['possui_historico_anterior'] else 'Medio') + ' (regra da API, antes do modelo)')
            else:
                respostas.append(NIVEIS[p])
        return respostas

    tabela = borda[['caso_id', 'descricao', 'esperado_regra']].copy()
    tabela['resposta_candidato'] = resposta_api(v2, cols2, borda)
    tabela['resposta_producao_anterior'] = [NIVEIS[v] for v in v2_antigo.predict(borda[cols2_antigo])]
    tabela['acertou_candidato'] = tabela['esperado_regra'] == tabela['resposta_candidato']
    tabela['acertou_producao_anterior'] = tabela['esperado_regra'] == tabela['resposta_producao_anterior']
    tabela.to_csv(RESULTADOS / 'borda_resultados.csv', index=False)
    resultado['borda'] = {
        'n': len(borda),
        'acertos_candidato': int(tabela['acertou_candidato'].sum()),
        'acertos_producao_anterior': int(tabela['acertou_producao_anterior'].sum()),
    }

    (RESULTADOS / 'teste.json').write_text(json.dumps(resultado, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({k: resultado[k] for k in ('v2', 'v2_anterior', 'borda')}, ensure_ascii=False, indent=1)[:2500])
    print(tabela.to_string())


if __name__ == '__main__':
    main()

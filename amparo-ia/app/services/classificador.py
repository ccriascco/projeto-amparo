"""Classificação de risco: regra de histórico insuficiente e o modelo Random Forest."""
import pickle
import pandas as pd

from app.config import logger
from app.models.dados_usuaria import DadosUsuaria

# O modelo é lido da pasta de onde o serviço é iniciado (amparo-ia), como sempre foi.
try:
    with open('modelo_risco.pkl', 'rb') as f:
        modelo = pickle.load(f)
    with open('colunas_modelo.pkl', 'rb') as f:
        colunas = pickle.load(f)
except FileNotFoundError:
    modelo = None
    colunas = []


def classificar(dados: DadosUsuaria):
    try:
        # 1. Regra de Negocio: Historico insuficiente
        if dados.qtd_ocorrencias_totais == 0 and dados.qtd_panico_acionado == 0:
            if dados.possui_historico_anterior:
                return {
                    "risco": "Baixo",
                    "codigo": 0,
                    "justificativa": "Sem ocorrencias nem acionamentos nos ultimos 30 dias."
                }
            return {
                "risco": "Medio",
                "codigo": 1,
                "justificativa": "Historico insuficiente. O sistema assume nivel Medio por seguranca."
            }

        if modelo is None:
            return {"erro": "Modelo nao treinado."}

        # 2. Montar DataFrame
        df_novo = pd.DataFrame([{
            'idade': dados.idade,
            'qtd_ocorrencias_totais': dados.qtd_ocorrencias_totais,
            'dias_desde_ultima_ocorrencia': dados.dias_desde_ultima_ocorrencia,
            'frequencia_aumentou': dados.frequencia_aumentou,
            'teve_viol_fisica': dados.teve_viol_fisica,
            'teve_viol_sexual': dados.teve_viol_sexual,
            'teve_ameaca': dados.teve_ameaca,
            'teve_viol_psicologica': dados.teve_viol_psicologica,
            'teve_viol_moral': dados.teve_viol_moral,
            'teve_viol_patrimonial': dados.teve_viol_patrimonial,
            'qtd_panico_acionado': dados.qtd_panico_acionado
        }])

        df_novo = df_novo[colunas]

        # 3. Predicao
        previsao = modelo.predict(df_novo)[0]
        mapa_risco = {0: "Baixo", 1: "Medio", 2: "Alto"}

        return {
            "risco": mapa_risco[previsao],
            "codigo": int(previsao),
            "justificativa": "Classificacao baseada em Inteligencia Artificial (Random Forest)."
        }
    except Exception as e:
        logger.exception("Falha ao classificar risco")
        return {"erro": "Falha interna ao calcular o risco."}

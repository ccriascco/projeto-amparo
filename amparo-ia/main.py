import os
import logging
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
import pickle
import pandas as pd
import warnings
warnings.filterwarnings('ignore')

logger = logging.getLogger("amparo_ia")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Amparo IA - Cerebro Preditivo")

INTERNAL_SECRET = os.environ.get("IA_SHARED_SECRET")
if not INTERNAL_SECRET:
    logger.warning(
        "IA_SHARED_SECRET não configurado: o endpoint /classificar está "
        "aceitando qualquer chamada. Defina a variável de ambiente antes de "
        "expor este serviço fora de localhost."
    )

try:
    with open('modelo_risco.pkl', 'rb') as f:
        modelo = pickle.load(f)
    with open('colunas_modelo.pkl', 'rb') as f:
        colunas = pickle.load(f)
except FileNotFoundError:
    modelo = None
    colunas = []

class DadosUsuaria(BaseModel):
    idade: int
    qtd_ocorrencias_totais: int
    dias_desde_ultima_ocorrencia: int
    frequencia_aumentou: int
    teve_viol_fisica: int
    teve_viol_sexual: int
    teve_ameaca: int
    qtd_panico_acionado: int

def verificar_origem(x_internal_secret: str | None):
    if INTERNAL_SECRET and x_internal_secret != INTERNAL_SECRET:
        raise HTTPException(status_code=401, detail="Acesso não autorizado.")

@app.post("/classificar")
def classificar_risco(dados: DadosUsuaria, x_internal_secret: str | None = Header(default=None)):
    verificar_origem(x_internal_secret)
    try:
        # 1. Regra de Negocio: Historico insuficiente
        if dados.qtd_ocorrencias_totais == 0 and dados.qtd_panico_acionado == 0:
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

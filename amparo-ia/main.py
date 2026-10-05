import os
import logging
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
import pickle
import pandas as pd
import warnings
warnings.filterwarnings('ignore')

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / "amparo-backend" / ".env")

logger = logging.getLogger("amparo_ia")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Amparo IA - Cerebro Preditivo")

INTERNAL_SECRET = os.environ.get("IA_SHARED_SECRET")
if not INTERNAL_SECRET:
    raise RuntimeError(
        "IA_SHARED_SECRET não definido. Configure no .env do amparo-backend "
        "(ou no amparo-ia/.env). O serviço não sobe sem autenticação."
    )

try:
    with open('modelo_risco.pkl', 'rb') as f:
        modelo = pickle.load(f)
    with open('colunas_modelo.pkl', 'rb') as f:
        colunas = pickle.load(f)
except FileNotFoundError:
    modelo = None
    colunas = []

FLAG = Field(ge=0, le=1)
CONTAGEM = Field(ge=0, le=1000)


class DadosUsuaria(BaseModel):
    idade: int = Field(ge=0, le=120)
    qtd_ocorrencias_totais: int = CONTAGEM
    dias_desde_ultima_ocorrencia: int = Field(ge=0, le=999)
    frequencia_aumentou: int = FLAG
    teve_viol_fisica: int = FLAG
    teve_viol_sexual: int = FLAG
    teve_ameaca: int = FLAG
    qtd_panico_acionado: int = CONTAGEM
    teve_viol_psicologica: int = Field(default=0, ge=0, le=1)
    teve_viol_moral: int = Field(default=0, ge=0, le=1)
    teve_viol_patrimonial: int = Field(default=0, ge=0, le=1)

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

"""Dados que o backend envia para classificar o risco (validados pelo FastAPI)."""
from pydantic import BaseModel, Field

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
    # 1 quando a usuária tem histórico, mas nada dentro da janela de 30 dias.
    possui_historico_anterior: int = Field(default=0, ge=0, le=1)

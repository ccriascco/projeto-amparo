"""Rota POST /classificar: confere o segredo do backend e devolve a classificação."""
from fastapi import FastAPI, Header, HTTPException

from app.config import INTERNAL_SECRET
from app.models.dados_usuaria import DadosUsuaria
from app.services.classificador import classificar


def verificar_origem(x_internal_secret: str | None):
    if INTERNAL_SECRET and x_internal_secret != INTERNAL_SECRET:
        raise HTTPException(status_code=401, detail="Acesso não autorizado.")


def classificar_risco(dados: DadosUsuaria, x_internal_secret: str | None = Header(default=None)):
    verificar_origem(x_internal_secret)
    return classificar(dados)


def registrar_rotas(app: FastAPI):
    app.post("/classificar")(classificar_risco)

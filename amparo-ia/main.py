"""Entrada do serviço de IA: `python -m uvicorn main:app` (na pasta amparo-ia).

app/config.py           .env, log e o segredo compartilhado (o serviço não sobe sem ele)
app/models/             dados que chegam do backend
app/services/           regra de histórico e o modelo de risco
app/routes/             POST /classificar
"""
from fastapi import FastAPI

import app.config  # noqa: F401  carrega o .env e exige o segredo antes de tudo

app = FastAPI(title="Amparo IA - Cerebro Preditivo")

from app.routes.classificar import registrar_rotas  # noqa: E402  carrega o modelo depois de conferir o segredo

registrar_rotas(app)

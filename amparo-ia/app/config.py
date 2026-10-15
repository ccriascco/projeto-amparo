"""Configuração do serviço: .env, log e o segredo compartilhado com o backend."""
import os
import logging
from pathlib import Path
from dotenv import load_dotenv
import warnings
warnings.filterwarnings('ignore')

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / "amparo-backend" / ".env")

logger = logging.getLogger("amparo_ia")
logging.basicConfig(level=logging.INFO)

INTERNAL_SECRET = os.environ.get("IA_SHARED_SECRET")
if not INTERNAL_SECRET:
    raise RuntimeError(
        "IA_SHARED_SECRET não definido. Configure no .env do amparo-backend "
        "(ou no amparo-ia/.env). O serviço não sobe sem autenticação."
    )

"""Testes do serviço de IA (POST /classificar), rodados a partir da pasta amparo-ia:

    python -m unittest discover -s tests -t .

Usam o modelo real (modelo_risco.pkl) e um segredo fictício, definido só neste processo.
"""
import os
import unittest

os.environ['IA_SHARED_SECRET'] = 'segredo-de-teste'

from fastapi import HTTPException  # noqa: E402

import main  # noqa: E402
from app.models.dados_usuaria import DadosUsuaria  # noqa: E402
from app.routes.classificar import classificar_risco  # noqa: E402
from app.services import classificador  # noqa: E402

SEGREDO = os.environ['IA_SHARED_SECRET']
BASE = {
    'idade': 30,
    'qtd_ocorrencias_totais': 3,
    'dias_desde_ultima_ocorrencia': 5,
    'frequencia_aumentou': 1,
    'teve_viol_fisica': 0,
    'teve_viol_sexual': 0,
    'teve_ameaca': 1,
    'qtd_panico_acionado': 0,
}
ROTULOS = {0: 'Baixo', 1: 'Medio', 2: 'Alto'}


def classificar(**campos):
    return classificar_risco(DadosUsuaria(**{**BASE, **campos}), SEGREDO)


class TestContrato(unittest.TestCase):
    def test_rota_registrada(self):
        rotas = {(r.path, tuple(sorted(r.methods))) for r in main.app.routes if hasattr(r, 'methods')}
        self.assertIn(('/classificar', ('POST',)), rotas)

    def test_segredo_errado_ou_ausente(self):
        for segredo in (None, 'errado'):
            with self.assertRaises(HTTPException) as ctx:
                classificar_risco(DadosUsuaria(**BASE), segredo)
            self.assertEqual(ctx.exception.status_code, 401)

    def test_validacao_dos_campos(self):
        for campo, valor in (('idade', 500), ('teve_viol_fisica', 2), ('qtd_ocorrencias_totais', -1)):
            with self.assertRaises(ValueError):
                DadosUsuaria(**{**BASE, campo: valor})


class TestRegraDeHistorico(unittest.TestCase):
    def test_sem_historico_assume_medio(self):
        r = classificar(qtd_ocorrencias_totais=0, qtd_panico_acionado=0)
        self.assertEqual((r['risco'], r['codigo']), ('Medio', 1))

    def test_historico_antigo_sem_nada_em_30_dias_e_baixo(self):
        r = classificar(qtd_ocorrencias_totais=0, qtd_panico_acionado=0, possui_historico_anterior=1)
        self.assertEqual((r['risco'], r['codigo']), ('Baixo', 0))


class TestModelo(unittest.TestCase):
    def test_modelo_carregado_com_as_colunas(self):
        self.assertIsNotNone(classificador.modelo)
        self.assertEqual(len(classificador.colunas), 11)

    def test_resposta_do_modelo(self):
        r = classificar()
        self.assertIn(r['codigo'], ROTULOS)
        self.assertEqual(r['risco'], ROTULOS[r['codigo']])
        self.assertIn('Random Forest', r['justificativa'])

    def test_violencia_fisica_com_panico_recente_e_alto(self):
        r = classificar(teve_viol_fisica=1, teve_ameaca=1, qtd_panico_acionado=2, dias_desde_ultima_ocorrencia=1)
        self.assertEqual(r['risco'], 'Alto')


if __name__ == '__main__':
    unittest.main()

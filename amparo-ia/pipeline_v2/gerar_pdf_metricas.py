"""PDF com acurácia, precisão, recall, F1 e matriz de confusão dos modelos no teste limpo."""
from pathlib import Path

import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, confusion_matrix, precision_recall_fscore_support
from sklearn.tree import DecisionTreeClassifier

from regras import FEATURES

RAIZ = Path(__file__).resolve().parent
IA = RAIZ.parent
SAIDA = IA.parent / 'Relatorios' / 'metricas_modelos.pdf'
NOMES = ['Baixo', 'Médio', 'Alto']

estilos = getSampleStyleSheet()
titulo = ParagraphStyle('t', parent=estilos['Title'], fontSize=18, spaceAfter=10)
h2 = ParagraphStyle('h2', parent=estilos['Heading2'], fontSize=13, spaceBefore=12, spaceAfter=6)
h3 = ParagraphStyle('h3', parent=estilos['Heading3'], fontSize=11, spaceBefore=8, spaceAfter=4)
corpo = ParagraphStyle('c', parent=estilos['BodyText'], fontSize=9.5, leading=13, spaceAfter=5)
pequeno = ParagraphStyle('p', parent=corpo, fontSize=8, leading=10)


def tabela(cab, linhas, larguras, destaque_diag=False):
    t = Table([cab] + linhas, colWidths=larguras)
    estilo = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f3b57')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8.5),
        ('GRID', (0, 0), (-1, -1), 0.4, colors.grey),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]
    if destaque_diag:
        for i in range(1, 4):
            estilo.append(('BACKGROUND', (i, i), (i, i), colors.HexColor('#d9f2d9')))
    t.setStyle(TableStyle(estilo))
    return t


def bloco_metricas(nome, y, p):
    acc = accuracy_score(y, p)
    pr, rc, f1, sup = precision_recall_fscore_support(y, p, labels=[0, 1, 2], zero_division=0)
    mc = confusion_matrix(y, p, labels=[0, 1, 2])
    linhas = [[NOMES[i], f'{pr[i]:.4f}', f'{rc[i]:.4f}', f'{f1[i]:.4f}', str(sup[i])] for i in range(3)]
    linhas.append(['Macro', f'{pr.mean():.4f}', f'{rc.mean():.4f}', f'{f1.mean():.4f}', str(int(sup.sum()))])
    matriz = [[NOMES[i]] + [str(mc[i][j]) for j in range(3)] for i in range(3)]
    return [
        Paragraph(nome, h3),
        Paragraph(f'Acurácia: <b>{acc * 100:.2f}%</b>', corpo),
        tabela(['Nível', 'Precisão', 'Recall', 'F1-score', 'Suporte'], linhas, [3 * cm, 3 * cm, 3 * cm, 3 * cm, 3 * cm]),
        Spacer(1, 5),
        Paragraph('Matriz de confusão (linhas: gabarito; colunas: previsto)', pequeno),
        tabela(['Gabarito \\ Previsto', 'Baixo', 'Médio', 'Alto'], matriz, [4.5 * cm, 2.6 * cm, 2.6 * cm, 2.6 * cm], destaque_diag=True),
        Spacer(1, 6),
    ]


def carregar(pasta):
    base = RAIZ / 'treinos' / pasta / 'dados'
    return pd.read_csv(base / 'treino.csv'), pd.read_csv(base / 'teste.csv')


def main():
    historia = [
        Paragraph('Métricas de desempenho: Random Forest x Árvore de Decisão', titulo),
        Paragraph('Avaliação no conjunto de teste limpo (gabarito das regras de negócio). Modelos treinados com 10% de '
                  'rótulos com ruído no treino. Precisão, recall e F1 por nível de risco, com matriz de confusão. '
                  'Os valores são calculados diretamente dos modelos.', corpo),
    ]

    historia.append(Paragraph('1. Random Forest (modelo em produção)', h2))
    for pasta in ('v3-seed7', 'v3-seed11'):
        tr, te = carregar(pasta)
        rf = RandomForestClassifier(n_estimators=100, min_samples_leaf=5, random_state=42, n_jobs=-1)
        rf.fit(tr[FEATURES], tr['nivel_risco'])
        historia += bloco_metricas(f'Teste {pasta.replace("v3-", "").replace("seed", "semente ")}', te['nivel_gabarito'], rf.predict(te[FEATURES]))

    historia.append(Paragraph('2. Árvore de Decisão (profundidade 6)', h2))
    for pasta in ('v3-seed7', 'v3-seed11'):
        tr, te = carregar(pasta)
        dt = DecisionTreeClassifier(max_depth=6, min_samples_leaf=5, random_state=42)
        dt.fit(tr[FEATURES], tr['nivel_risco'])
        historia += bloco_metricas(f'Teste {pasta.replace("v3-", "").replace("seed", "semente ")}', te['nivel_gabarito'], dt.predict(te[FEATURES]))

    historia.append(Paragraph('Leitura', h2))
    historia.append(Paragraph(
        'Com dados sintéticos e sem ruído, os dois modelos têm métricas muito altas. A diferença está no nível Alto: '
        'é o nível que importa mais, porque um caso de risco alto classificado como baixo é o erro mais grave. '
        'Essas métricas não substituem a validação com dados reais rotulados por especialistas, e não mostram a '
        'robustez a rótulos errados, que está no PDF de comparação.', corpo))

    doc = SimpleDocTemplate(str(SAIDA), pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm,
                            topMargin=2 * cm, bottomMargin=2 * cm, title='Métricas dos modelos de risco', author='Amparo IA')
    doc.build(historia)
    print('PDF gerado em', SAIDA)


if __name__ == '__main__':
    main()

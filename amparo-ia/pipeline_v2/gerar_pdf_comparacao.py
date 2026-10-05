"""Gera o PDF da comparação Random Forest x Árvore de Decisão com base em comparacao.json."""
import json
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

RAIZ = Path(__file__).resolve().parent
DADOS = json.loads((RAIZ / 'treinos' / 'comparacao' / 'comparacao.json').read_text(encoding='utf-8'))
SAIDA = RAIZ.parent.parent / 'Relatorios' / 'comparacao_random_forest_vs_arvore.pdf'

N_TESTE = 1350
IMG_ACURACIA = RAIZ.parent.parent / 'Relatorios' / 'ia_comparacao' / 'robustez_acuracia.png'
IMG_PERIGOSOS = RAIZ.parent.parent / 'Relatorios' / 'ia_comparacao' / 'robustez_erros_perigosos.png'
ROBUSTEZ = json.loads((RAIZ / 'treinos' / 'comparacao' / 'robustez.json').read_text(encoding='utf-8'))


def _media(modelo, campo, r):
    v = [d[campo] for d in ROBUSTEZ if d['modelo'] == modelo and d['ruido'] == r]
    return sum(v) / len(v)


ROBUSTEZ_LINHAS = [
    [f'{int(r*100)}%', f"{_media('RandomForest','acuracia_teste',r)*100:.2f}%", f"{_media('ArvoreDecisao','acuracia_teste',r)*100:.2f}%",
     f"{_media('RandomForest','alto_para_baixo',r):.0f}", f"{_media('ArvoreDecisao','alto_para_baixo',r):.0f}"]
    for r in (0.0, 0.1, 0.2, 0.3)
]
TOTAL = 2 * N_TESTE

estilos = getSampleStyleSheet()
titulo = ParagraphStyle('t', parent=estilos['Title'], fontSize=18, spaceAfter=10)
h2 = ParagraphStyle('h2', parent=estilos['Heading2'], fontSize=13, spaceBefore=12, spaceAfter=6)
corpo = ParagraphStyle('c', parent=estilos['BodyText'], fontSize=10, leading=14, alignment=TA_JUSTIFY, spaceAfter=6)
pequeno = ParagraphStyle('p', parent=corpo, fontSize=8.5, leading=11)


def tabela(cabecalho, linhas, larguras):
    t = Table([cabecalho] + linhas, colWidths=larguras)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f3b57')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8.5),
        ('GRID', (0, 0), (-1, -1), 0.4, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#eef3f8')]),
        ('ALIGN', (1, 1), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    return t


def agregar(modelo):
    linhas = [d for d in DADOS if d['modelo'] == modelo]
    return {
        'erros': sum(d['erros_teste'] for d in linhas),
        'perigosos': sum(d['alto_para_baixo'] for d in linhas),
    }


rf = agregar('RandomForest')
dt = agregar('ArvoreDecisao')


def linha(d):
    return [
        d['dados'].replace('v3-seed', 'semente '), d['modelo'] if d['modelo'] == 'RandomForest' else 'Árvore de Decisão',
        str(d['max_depth']), str(d['min_samples_leaf']),
        f"{d['acuracia_teste'] * 100:.2f}%", str(d['erros_teste']), str(d['alto_para_baixo']),
    ]


historia = [
    Paragraph('Comparação de algoritmos: Random Forest x Árvore de Decisão', titulo),
    Paragraph('Modelo de classificação de risco da Amparo (v3). Dados sintéticos com 10% de rótulos com ruído '
              'no treino e na validação. Avaliação no conjunto de teste limpo (gabarito das regras de negócio).', corpo),

    Paragraph('1. Resultados no teste', h2),
    tabela(
        ['Dados', 'Modelo', 'Profundidade', 'Folha mín.', 'Acurácia', 'Erros', 'Alto→Baixo'],
        [linha(d) for d in DADOS],
        [2.6 * cm, 3.6 * cm, 2.4 * cm, 2 * cm, 2.2 * cm, 1.6 * cm, 2.2 * cm],
    ),
    Paragraph('Teste: 1.350 casos por conjunto de dados. "Alto→Baixo" é o erro mais grave: '
              'risco alto classificado como baixo.', pequeno),

    Paragraph('2. Resumo nos dois conjuntos (2.700 casos de teste)', h2),
    tabela(
        ['Modelo', 'Erros totais', 'Taxa de erro', 'Erros Alto→Baixo'],
        [
            ['Random Forest', str(rf['erros']), f"{rf['erros'] / TOTAL * 100:.2f}%", str(rf['perigosos'])],
            ['Árvore de Decisão', str(dt['erros']), f"{dt['erros'] / TOTAL * 100:.2f}%", str(dt['perigosos'])],
        ],
        [4.5 * cm, 3.5 * cm, 3.5 * cm, 4 * cm],
    ),
    Spacer(1, 8),

    Paragraph('3. Qual é o melhor, com base no teste', h2),
    Paragraph(
        f'<b>O Random Forest é a melhor escolha.</b> Nos dois conjuntos de teste ele cometeu {rf["erros"]} erro em '
        f'{TOTAL} casos ({rf["erros"] / TOTAL * 100:.2f}%) e nenhum erro perigoso. A Árvore de Decisão cometeu '
        f'{dt["erros"]} erros ({dt["erros"] / TOTAL * 100:.2f}%), incluindo <b>{dt["perigosos"]} caso de risco alto '
        'classificado como baixo</b>, que é o erro mais grave para este sistema.', corpo),
    Paragraph(
        'O critério principal é o erro perigoso, porque classificar uma situação de risco alto como baixo pode '
        'deixar uma mulher sem apoio. Por isso a comparação prioriza essa métrica antes da acurácia. '
        'Nesse critério, o Random Forest é superior.', corpo),
    Paragraph(
        'A Árvore de Decisão teve acurácia de 100% no conjunto de semente 7, o que mostra que ela consegue aprender a '
        'regra. A diferença aparece no conjunto de semente 11, onde ela errou 5 casos, um deles perigoso. O Random '
        'Forest, que combina 100 árvores, errou menos e de forma mais estável entre os dois conjuntos.', corpo),

    Paragraph('4. Vantagem da Árvore de Decisão', h2),
    Paragraph(
        'A árvore tem uma vantagem real: suas regras podem ser lidas diretamente e revisadas por um especialista. Um '
        'Random Forest com 100 árvores é mais difícil de explicar. Se a explicabilidade for exigida pela validação com '
        'profissionais, é possível extrair as regras da árvore para revisão, sem trocar o modelo em produção.', corpo),

    Paragraph('5. Vantagens do Random Forest, medidas', h2),
    Paragraph(
        'O principal benefício aparece quando o treino tem rótulos errados, o que acontece com dados reais rotulados por '
        'pessoas. Medimos os dois modelos com 0%, 10%, 20% e 30% de rótulos errados no treino, sempre avaliados no '
        'mesmo teste limpo. A tabela abaixo mostra a média dos dois conjuntos de dados.', corpo),
    tabela(
        ['Rótulos errados', 'Acurácia RF', 'Acurácia Árvore', 'Erros perigosos RF', 'Erros perigosos Árvore'],
        ROBUSTEZ_LINHAS,
        [3.2 * cm, 3 * cm, 3.4 * cm, 3.6 * cm, 3.8 * cm],
    ),
    Spacer(1, 6),
    Image(str(IMG_ACURACIA), width=15 * cm, height=8.6 * cm),
    Image(str(IMG_PERIGOSOS), width=15 * cm, height=8.6 * cm),
    Paragraph(
        'Sem ruído, os dois modelos empatam. Com 10% de rótulos errados, a Árvore já erra casos perigosos e o Random '
        'Forest não erra nenhum. Com 30%, a Árvore cai para cerca de 75% de acerto, enquanto o Random Forest mantém '
        'quase 100%. A razão é que a Árvore decora os erros dos rótulos, e o Random Forest, por fazer a média de 100 '
        'árvores, cancela esses erros.', corpo),

    Paragraph('6. Limitações desta comparação', h2),
    Paragraph(
        '• Os dados são sintéticos. A comparação mede a capacidade de aprender a regra com ruído, e não a qualidade '
        'da classificação com pessoas reais.<br/>'
        '• A diferença entre os modelos é pequena: poucos casos em 2.700. Com esse volume, a comparação indica '
        'estabilidade, mas não tem significância estatística forte.<br/>'
        '• A busca de hiperparâmetros foi pequena (6 combinações por modelo), escolhida pela validação.<br/>'
        '• O erro perigoso da Árvore aconteceu em um único caso, e isso pode ser sorte do conjunto de dados.', corpo),

    Paragraph('7. Recomendação', h2),
    Paragraph(
        'Manter o <b>Random Forest</b> em produção. Reavaliar os dois modelos com dados reais rotulados por '
        'especialistas antes de qualquer mudança. Se a explicabilidade for prioridade, a Árvore de Decisão pode ser '
        'usada como ferramenta de apoio à revisão das regras.', corpo),
]


def main():
    doc = SimpleDocTemplate(str(SAIDA), pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm,
                            topMargin=2 * cm, bottomMargin=2 * cm,
                            title='Comparação Random Forest x Árvore de Decisão', author='Amparo IA')
    doc.build(historia)
    print('PDF gerado em', SAIDA)


if __name__ == '__main__':
    main()

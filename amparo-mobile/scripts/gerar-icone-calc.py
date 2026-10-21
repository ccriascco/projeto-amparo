"""Gera o ícone genérico de calculadora usado no Modo Disfarce.

Uso (na pasta amparo-mobile):  python scripts/gerar-icone-calc.py
Saídas em assets/images/:
  calc-icon.png             iOS (1024x1024, sem transparência)
  calc-icon-foreground.png  Android, primeiro plano do ícone adaptativo (1024x1024, com transparência)
O fundo do ícone adaptativo do Android é a cor FUNDO (configurada no app.json).

Desenho próprio e genérico: não copia a calculadora de nenhum fabricante.
"""
from pathlib import Path

from PIL import Image, ImageDraw

ESCALA = 4  # desenha em 4096 e reduz, para as bordas ficarem suaves
LADO = 1024 * ESCALA
FUNDO = (47, 52, 55)  # #2F3437
CORPO = (236, 238, 240)
VISOR = (64, 70, 74)
TECLA = (196, 201, 205)
DESTAQUE = (242, 163, 58)  # #F2A33A
SAIDA = Path(__file__).resolve().parent.parent / 'assets' / 'images'


def desenhar(d: ImageDraw.ImageDraw, area: int) -> None:
    """Desenha a calculadora centrada num quadrado de lado `area` (em pixels da escala grande)."""
    base = (LADO - area) // 2
    largura = int(area * 0.70)
    altura = area
    x0 = base + (area - largura) // 2
    y0 = base
    raio = int(area * 0.09)
    d.rounded_rectangle([x0, y0, x0 + largura, y0 + altura], radius=raio, fill=CORPO)

    margem = int(largura * 0.12)
    visor_alto = int(altura * 0.22)
    d.rounded_rectangle(
        [x0 + margem, y0 + margem, x0 + largura - margem, y0 + margem + visor_alto],
        radius=int(raio * 0.45),
        fill=VISOR,
    )

    colunas, linhas = 3, 4
    topo = y0 + margem + visor_alto + int(margem * 0.9)
    vao = int(largura * 0.06)
    tecla_l = (largura - 2 * margem - (colunas - 1) * vao) // colunas
    tecla_a = (y0 + altura - margem - topo - (linhas - 1) * vao) // linhas
    for lin in range(linhas):
        for col in range(colunas):
            tx = x0 + margem + col * (tecla_l + vao)
            ty = topo + lin * (tecla_a + vao)
            cor = DESTAQUE if col == colunas - 1 else TECLA
            d.rounded_rectangle([tx, ty, tx + tecla_l, ty + tecla_a], radius=int(tecla_l * 0.22), fill=cor)


def salvar(img: Image.Image, nome: str) -> None:
    img.resize((1024, 1024), Image.LANCZOS).save(SAIDA / nome, optimize=True)
    print('gerado', SAIDA / nome)


# iOS: o sistema arredonda os cantos; a imagem é quadrada e sem transparência
ios = Image.new('RGB', (LADO, LADO), FUNDO)
desenhar(ImageDraw.Draw(ios), int(LADO * 0.62))
salvar(ios, 'calc-icon.png')

# Android: só o primeiro plano, dentro da área segura do ícone adaptativo (~61% do centro)
frente = Image.new('RGBA', (LADO, LADO), (0, 0, 0, 0))
desenhar(ImageDraw.Draw(frente), int(LADO * 0.50))
salvar(frente, 'calc-icon-foreground.png')

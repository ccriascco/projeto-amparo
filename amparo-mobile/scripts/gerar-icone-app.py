"""Gera o ícone principal do Amparo a partir da marca oficial (o símbolo da gota em assets/images/logo.png).

Uso (na pasta amparo-mobile):  python scripts/gerar-icone-app.py
Saídas em assets/images/:
  icon.png                     iPhone e padrão do Expo (1024x1024, fundo vinho, sem transparência)
  android-icon-foreground.png  Android, primeiro plano do ícone adaptativo (símbolo branco, transparente)
  android-icon-background.png  Android, fundo do ícone adaptativo (vinho)
  android-icon-monochrome.png  Android 13+, ícone temático (mesmo desenho do primeiro plano)
  favicon.png                  aba do navegador (48x48)
  splash-icon.png              tela de abertura (símbolo branco sobre o fundo vinho do app.json)
O ícone de calculadora do Modo Disfarce é outro (scripts/gerar-icone-calc.py) e não muda aqui.
"""
from pathlib import Path

from PIL import Image

PASTA = Path(__file__).resolve().parent.parent / 'assets' / 'images'
VINHO = (149, 75, 110, 255)  # #954B6E, a cor do design e do app.json
VAZIO = (0, 0, 0, 0)


def simbolo() -> Image.Image:
    """Recorta o símbolo (à esquerda do nome "Amparo") do logo, pelo primeiro vão vazio entre eles."""
    logo = Image.open(PASTA / 'logo.png').convert('RGBA')
    alfa = logo.split()[3]
    largura, altura = logo.size
    colunas = [max(alfa.getpixel((x, y)) for y in range(altura)) for x in range(largura)]
    x = next(i for i, v in enumerate(colunas) if v > 0)
    vazias = 0
    while x < largura:
        vazias = vazias + 1 if colunas[x] == 0 else 0
        if vazias >= 8:
            break
        x += 1
    recorte = logo.crop((0, 0, x - vazias + 1, altura))
    return recorte.crop(recorte.getbbox())


def compor(simb: Image.Image, lado: int, fracao: float, fundo) -> Image.Image:
    """Símbolo centralizado ocupando `fracao` do lado, sobre o fundo dado."""
    tela = Image.new('RGBA', (lado, lado), fundo)
    escala = lado * fracao / max(simb.size)
    s = simb.resize((round(simb.width * escala), round(simb.height * escala)), Image.LANCZOS)
    tela.alpha_composite(s, ((lado - s.width) // 2, (lado - s.height) // 2))
    return tela


def salvar(img: Image.Image, nome: str) -> None:
    img.save(PASTA / nome, optimize=True)
    print('gerado', PASTA / nome)


s = simbolo()
salvar(compor(s, 1024, 0.56, VINHO).convert('RGB'), 'icon.png')  # iPhone não aceita transparência
# Android: o sistema recorta o ícone adaptativo; o símbolo fica dentro da área segura (~61% do centro)
salvar(compor(s, 1024, 0.46, VAZIO), 'android-icon-foreground.png')
salvar(compor(s, 1024, 0.46, VAZIO), 'android-icon-monochrome.png')
salvar(Image.new('RGBA', (1024, 1024), VINHO), 'android-icon-background.png')
salvar(compor(s, 48, 0.72, VINHO), 'favicon.png')
salvar(compor(s, 400, 0.62, VAZIO), 'splash-icon.png')

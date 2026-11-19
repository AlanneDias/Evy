#!/usr/bin/env python3
"""Gera recortes PNG transparentes das fotos existentes do catálogo EVY.
Não redesenha nem substitui os itens; remove apenas o fundo conectado às bordas.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
OUT = ASSETS / "cutouts"
OUT.mkdir(parents=True, exist_ok=True)

def cutout(src):
    image = Image.open(src).convert("RGBA")
    w, h = image.size
    rgb = image.convert("RGB")
    work = rgb.copy()
    marker = (255, 0, 249)
    # As fotos do acervo têm fundo claro esverdeado; inundação só da borda
    # impede remover tecidos, recortes ou detalhes internos da roupa.
    seeds = [
        (0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1),
        (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2),
    ]
    for seed in seeds:
        r, g, b = work.getpixel(seed)
        if (r, g, b) == marker:
            continue
        if max(r, g, b) < 152 or g < b + 5:
            continue
        ImageDraw.floodfill(work, seed, marker, thresh=64)
    pixels = list(work.getdata())
    mask = Image.new("L", (w, h))
    mask.putdata([0 if p == marker else 255 for p in pixels])
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.65))
    image.putalpha(mask)
    print("ALPHA_STATS", src.name, "corner", rgb.getpixel((0, 0)), "transparent_fraction", round(sum(v < 64 for v in mask.getdata()) / (w*h), 3))
    dst = OUT / (src.stem + ".png")
    image.save(dst, optimize=True, compress_level=9)
    return dst

for src in sorted(ASSETS.glob("*.webp")):
    if src.stem == "evy-vitrine-realista":
        continue  # A parede e a ambientação devem permanecer verdes.
    dst = cutout(src)
    print(src.name, "->", dst.relative_to(ROOT))

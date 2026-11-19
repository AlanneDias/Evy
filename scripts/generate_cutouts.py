#!/usr/bin/env python3
"""Gera recortes PNG transparentes das fotos existentes do catálogo EVY.
Não redesenha nem substitui os itens; remove apenas o fundo conectado às bordas.
"""
from pathlib import Path
import json
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
        if max(r, g, b) < 75:
            continue
        # Verde-claro e fundos neutros de estúdio, sem afetar a silhueta.
        green_bg = g > b + 8 and g > r + 3 and g > 140
        neutral_bg = max(r, g, b) - min(r, g, b) < 23 and min(r, g, b) > 160
        dark_studio_bg = max(r, g, b) - min(r, g, b) < 32 and max(r, g, b) > 75
        if not (green_bg or neutral_bg or dark_studio_bg):
            continue
        tolerance = 64 if green_bg else (32 if neutral_bg else 18)
        ImageDraw.floodfill(work, seed, marker, thresh=tolerance)
    pixels = list(work.getdata())
    mask = Image.new("L", (w, h))
    mask.putdata([0 if p == marker else 255 for p in pixels])
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.65))
    image.putalpha(mask)
    stats[src.stem] = {"corner_rgb": list(rgb.getpixel((0, 0))), "transparent_fraction": round(sum(v < 64 for v in mask.getdata()) / (w*h), 3)}
    print("ALPHA_STATS", src.name, stats[src.stem])
    dst = OUT / (src.stem + ".png")
    image.save(dst, optimize=True, compress_level=9)
    return dst

stats = {}
for src in sorted(ASSETS.glob("*.webp")):
    if src.stem == "evy-vitrine-realista":
        continue  # A parede e a ambientação devem permanecer verdes.
    dst = cutout(src)
    print(src.name, "->", dst.relative_to(ROOT))

(OUT / "transparency-report.json").write_text(json.dumps(stats, indent=2), encoding="utf-8")

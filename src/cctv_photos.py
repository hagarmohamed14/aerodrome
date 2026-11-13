"""Split the user's CCTV-style photo grids into single views (burned-in CAM labels / timestamps cropped off)."""
from PIL import Image
G3 = dict(xs=[(10, 526), (543, 1058), (1075, 1590)], ys=[(6, 290), (308, 594), (610, 894)])
G2 = dict(xs=[(10, 795), (808, 1590)], ys=[(10, 445), (458, 890)])
# grid file, layout, kept band of each tile (fraction of tile height) — removes the overlay text
GRIDS = {'a': (G3, (0, .77)), 'b': (G2, (0, .84)), 'c': (G3, (0, .80)), 'd': (G2, (.12, .86)), 'e': (G2, (0, .85))}
def tiles(assets):
    out = {}
    for g, (L, (t0, t1)) in GRIDS.items():
        im = Image.open(assets / f'grid_{g}.jpg')
        n = 0
        for y0, y1 in L['ys']:
            for x0, x1 in L['xs']:
                n += 1; h = y1 - y0
                out[f'{g}{n}'] = im.crop((x0, y0 + round(h * t0), x1, y0 + round(h * t1)))
    for k in list(out):  # zoomed left / right views so every camera can get its own image
        im = out[k]; w, h = im.size; cw = int(w * .62)
        out[k + 'L'] = im.crop((0, 0, cw, h)); out[k + 'R'] = im.crop((w - cw, 0, w, h))
        out[k + 'Z'] = im.crop((int(w * .2), int(h * .15), int(w * .8), int(h * .85)))  # centre zoom
    hg = Image.open(assets / 'hangar.jpg'); W, H = hg.size
    out['h1'] = hg
    out['h2'] = hg.crop((0, int(H * .2), int(W * .6), H))          # left wing, engine & work stands
    out['h3'] = hg.crop((int(W * .4), int(H * .2), W, H))          # right wing & tooling
    out['h4'] = hg.crop((int(W * .2), int(H * .45), int(W * .8), H))  # engines open (inspection)
    out['h5'] = hg.crop((int(W * .15), 0, int(W * .85), int(H * .6)))  # tail & hangar doors
    out['h6'] = hg.crop((0, int(H * .45), int(W * .45), H))              # left engine & work stands
    out['h7'] = hg.crop((int(W * .55), int(H * .45), W, H))              # right engine & tooling
    return out

"""Tidy the website's 360° perfume frames: one clean outline for all four.

The brushed-metal studio set (scripts/perfume-spin.py, oud3/leather3/
vanilla3/wood3, then scripts/perfume-spin-finish.py) left these faults, the
same on every bottle:
  - beside the neck, on the left, a patch of the cap's shadow on the wall was
    kept as if it were glass;
  - under the base, the bottle's reflection in the metal (and a ledge of the
    metal itself, wider than the bottle) was kept below the glass;
  - where the print was lifted off the glass, the row-by-row fill left
    streaks and blocks, and broke the dip tube where it ran behind a word;
    both show as the print turns away;
  - the four outlines differed by a pixel or so here and there.

This works on the frames themselves (public/products/perfumes/<slug>/
01..36.webp), since every frame of every bottle shares one framing:
  1. one outline for all four: the per-pixel median of their four outlines,
     made symmetric about the bottle's axis by keeping the narrower side of
     each row (the shadow is on the left only, so the neck takes the right
     side's shape; the walls come out straight);
  2. the base cut along the line where the glass meets its reflection, a half
     ellipse fitted to that dark line on all four bottles;
  3. where that outline reaches a pixel or two past a bottle's own cut-out,
     the colour comes from the same bottle just inside the edge (glass) or
     from another bottle's cap (the caps are the same part, lit the same);
  4. the glass behind the print is recovered from the turn itself (each
     pixel's brightest frames, when the print is elsewhere), the print's old
     place is filled again, mostly up and down so the tube and the light's
     vertical streaks carry through, and every frame gets the new glass
     behind its print. The EAU DE PARFUM row sits on the liquid's curved
     surface, which a fill can't follow, so it is left as it was.
So all four are now exactly the same size and stand on the same line.

usage: python3 -I scripts/perfume-spin-tidy.py public/products/perfumes
       (needs numpy and Pillow; run once, on frames fresh from
       perfume-spin-finish.py)
"""
import sys
from concurrent.futures import ProcessPoolExecutor
import numpy as np
from PIL import Image, ImageFilter

SLUGS = ["vanilla-no-02", "wood-no-03", "leather-no-04", "oud-no-05"]
FRAMES = 36
# Measured on the 1200px frames (bottle 62% of the height, as the finish
# script places it): the axis, the walls' half-width, and the base ellipse
# y = BASE_Y + BASE_DEPTH * sqrt(1 - ((x - AXIS) / HALF) ** 2) through the
# dark line where glass meets reflection (fitted on all four, ±1px).
AXIS, HALF = 598.4, 186.1
BASE_Y, BASE_DEPTH = 913.8, 36.3
CAP_BOTTOM = 405           # rows above this are the cap
PRINT = (565, 812)         # rows the print moves through
SURFACE = 748              # from here down: the liquid's surface (left as is)
LUMA = np.array([0.299, 0.587, 0.114], np.float32)


def mirror(a, axis):
    """a reflected about x = axis, with linear interpolation."""
    W = a.shape[1]
    xm = 2 * axis - np.arange(W, dtype=np.float32)
    i0 = np.floor(xm).astype(int)
    f = (xm - i0)[None, :]
    return a[:, np.clip(i0, 0, W - 1)] * (1 - f) + a[:, np.clip(i0 + 1, 0, W - 1)] * f


def outline(alphas):
    a = np.median(np.stack(alphas), 0)
    a = np.minimum(a, mirror(a, AXIS))
    H, W = a.shape
    x = np.arange(W, dtype=np.float32)
    u = np.clip((x - AXIS) / HALF, -1, 1)
    cut = BASE_Y + BASE_DEPTH * np.sqrt(1 - u * u)
    y = np.arange(H, dtype=np.float32)[:, None]
    return a * np.clip((cut[None, :] - y) / 1.5 + 0.5, 0, 1)


def refill_print(frames, alpha):
    """New glass behind the print, in every frame (step 4)."""
    y0, y1 = PRINT
    rgb = frames[:, y0:y1, :, :3].astype(np.float32)
    L = rgb @ LUMA
    # the glass: the mean of each pixel's three brightest frames (the print
    # only ever darkens it)
    top = np.argsort(-L, 0)[:3]
    P = np.take_along_axis(rgb, top[..., None].repeat(3, -1), 0).mean(0)
    LP = P @ LUMA
    # where the print was lifted: under the front frame's print, widened
    text = (LP - L[0]) > 25
    hole = np.array(Image.fromarray(text.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(9))) > 0
    inner = np.array(Image.fromarray((alpha[y0:y1] * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(9))) > 250
    hole &= inner
    hole[SURFACE - y0:] = False
    # fill: diffusion, eight times stronger up/down than across
    wy = 8.0
    Q = P.copy()
    for _ in range(2000):
        new = (wy * (np.roll(Q, 1, 0) + np.roll(Q, -1, 0)) + np.roll(Q, 1, 1) + np.roll(Q, -1, 1)) / (2 * wy + 2)
        Q[hole] = new[hole]
    # each frame is glass * (1 - a) + ink * a: swap the glass, keep the print
    inkL = float(np.percentile(L[0][text], 3))
    clear = np.clip((L - inkL) / np.maximum(LP - inkL, 1)[None], 0, 1)
    rgb[:, hole] += (Q - P)[hole][None] * clear[:, hole][..., None]
    frames[:, y0:y1, :, :3] = np.clip(np.round(rgb), 0, 255).astype(np.uint8)


def fill_edges(rgb, own, shape, cap_rgb, cap_alpha):
    """Colour for outline pixels a bottle's own cut-out left (nearly) empty."""
    out = rgb.copy()
    need = (shape > 0.02) & (own < 0.35)
    # the cap: take it from another bottle's cap, which has it
    cap = need.copy(); cap[CAP_BOTTOM:] = False
    take = cap & (cap_alpha > 0.6)
    out[take] = cap_rgb[take]
    need &= ~take
    # the glass: carry the nearest solid pixel out to the edge, along the row
    for y in np.unique(np.where(need)[0]):
        solid = np.where(own[y] > 0.9)[0]
        if not len(solid):
            continue
        for x in np.where(need[y])[0]:
            out[y, x] = rgb[y, solid[np.abs(solid - x).argmin()]]
    return out


def one(job):
    root, slug, shape, donor_rgb, donor_alpha = job
    frames = np.stack([np.array(Image.open(f"{root}/{slug}/{i:02d}.webp").convert("RGBA"))
                       for i in range(1, FRAMES + 1)])
    own = frames[0, ..., 3].astype(np.float32) / 255
    refill_print(frames, own)
    a = np.round(shape * 255).astype(np.uint8)
    for i in range(FRAMES):
        rgb = fill_edges(frames[i, ..., :3], own, shape, donor_rgb, donor_alpha)
        rgb[a == 0] = 0
        Image.fromarray(np.dstack([rgb, a])).save(f"{root}/{slug}/{i + 1:02d}.webp", "WEBP", quality=90, method=6)
    return slug


def main(root):
    first = [np.array(Image.open(f"{root}/{s}/01.webp").convert("RGBA")) for s in SLUGS]
    if all((f[int(BASE_Y + BASE_DEPTH) + 3:, :, 3] == 0).all() for f in first):
        sys.exit("already tidied")
    alphas = [f[..., 3].astype(np.float32) / 255 for f in first]
    shape = outline(alphas)
    # the cap donor for each bottle: the other bottle whose cut-out misses the
    # least of the outline's cap
    miss = [((a[:CAP_BOTTOM] < shape[:CAP_BOTTOM] - 0.1)).sum() for a in alphas]
    jobs = []
    for k, slug in enumerate(SLUGS):
        d = min((j for j in range(len(SLUGS)) if j != k), key=lambda j: miss[j])
        jobs.append((root, slug, shape, first[d][..., :3], alphas[d]))
    with ProcessPoolExecutor(4) as ex:
        for slug in ex.map(one, jobs):
            print(slug, "done", flush=True)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "public/products/perfumes")

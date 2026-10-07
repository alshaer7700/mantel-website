"""Make a 360° turn for a round perfume bottle from one front photo.

The bottle is a body of revolution and only the front carries print, so a
turn is: the same cut-out silhouette and cap (lit the same way, so the
highlights stay put), with the printed label wrapped round the body. Past the
sides the print is on the back, seen faintly mirrored through the glass.

usage: python3 -I scripts/perfume-spin.py <src.jpg> <out_dir> <name> [frames]
       (needs numpy, opencv-python-headless and Pillow: a one-off tool, not
       part of the site build)

How the frames were made for the four by Mantel. bottles (2026-10):
  1. SPECS below: the cap and body measured off a grid laid over each photo.
  2. GrabCut, seeded from those measurements, finds the outline; the left
     side (plain wall behind it) is mirrored about the bottle's axis, and
     the box under the curved base is carved away.
  3. The print is lifted off the glass and the gaps filled row by row.
  4. Each of 36 frames wraps the print round the body; past the sides it
     shows faintly mirrored through the glass.
Output goes to public/products/perfumes/<slug>/01..36.webp, and the
product's spin_images (supabase/039) point at those files.
"""
import json, sys, math
import numpy as np, cv2

SPECS = {
    # crop-grid measurements (orig = crop + (250, 600)); y values are orig rows
    # cap: x0,x1 at mid height, top, bottom ; body: widest x0,x1, top (under neck),
    # y where full width is reached, bottom ; neck half-width at body top ; text band
    "leather": dict(cap=(505, 960, 892, 1205), body=(450, 1040, 1225, 1390, 1995), top_half=150, band=(1425, 1735)),
    "oud":     dict(cap=(420, 900, 870, 1215), body=(355, 998, 1240, 1430, 2050), top_half=185, band=(1455, 1795)),
    "wood":    dict(cap=(445, 940, 790, 1150), body=(380, 1035, 1160, 1360, 1995), top_half=185, band=(1380, 1715)),
    "vanilla": dict(cap=(480, 978, 748, 1120), body=(408, 1078, 1135, 1320, 1995), top_half=180, band=(1365, 1705)),
}


def refine_edges(L, rows, est_l, est_r, win=22):
    gx = cv2.Sobel(cv2.GaussianBlur(L, (5, 5), 0), cv2.CV_32F, 1, 0, ksize=3)
    xl, xr = [], []
    W = L.shape[1]
    for y, el, er in zip(rows, est_l, est_r):
        a0, a1 = max(0, int(el - win)), min(W - 1, int(el + win))
        b0, b1 = max(0, int(er - win)), min(W - 1, int(er + win))
        seg = np.abs(gx[y, a0:a1]); segr = np.abs(gx[y, b0:b1])
        xl.append(a0 + seg.argmax() if seg.size and seg.max() > 25 else el)
        xr.append(b0 + segr.argmax() if segr.size and segr.max() > 25 else er)
    xl = np.array(xl, float); xr = np.array(xr, float)
    # outliers back to the estimate, then smooth along y
    xl = np.where(np.abs(xl - est_l) > win * 0.9, est_l, xl)
    xr = np.where(np.abs(xr - est_r) > win * 0.9, est_r, xr)
    k = 21
    pad = lambda v: np.pad(v, k // 2, mode="edge")
    med = lambda v: np.array([np.median(pad(v)[i:i + k]) for i in range(len(v))])
    sm = lambda v: np.convolve(pad(med(v)), np.ones(k) / k, mode="valid")
    return sm(xl), sm(xr)


def silhouette(L, sp):
    # ── silhouette ────────────────────────────────────────────────────────
    cx0, cx1, ct, cb = sp["cap"]
    bx0, bx1, btop, bfull, bbot = sp["body"]
    bcx, bhw = (bx0 + bx1) / 2, (bx1 - bx0) / 2
    ccx, chw = (cx0 + cx1) / 2, (cx1 - cx0) / 2
    edges = {}
    # cap: straight sides, rounded top/bottom corners
    rows = np.arange(ct, cb + 1)
    rc = 28
    def cap_hw(y):
        d = min(y - ct, cb - y)
        return chw - (rc - math.sqrt(max(0, rc * rc - (rc - d) ** 2)) if d < rc else 0)
    est = np.array([cap_hw(y) for y in rows])
    l, r = refine_edges(L, rows, ccx - est, ccx + est, win=14)
    for y, a, b in zip(rows, l, r):
        edges[int(y)] = (a, b)
    # neck: a short collar between cap and body
    nhw = sp["top_half"] * 0.82
    for y in range(cb + 1, btop):
        edges[y] = (bcx - nhw, bcx + nhw)
    # body: dome from the neck out to full width, straight sides, rounded base
    rows = np.arange(btop, bbot + 1)
    rb = 70
    def body_hw(y):
        if y < bfull:
            t = (bfull - y) / (bfull - btop)
            return sp["top_half"] + (bhw - sp["top_half"]) * math.sqrt(max(0, 1 - t * t))
        d = bbot - y
        return bhw - (rb - math.sqrt(max(0, rb * rb - (rb - d) ** 2)) if d < rb else 0)
    est = np.array([body_hw(y) for y in rows])
    l, r = refine_edges(L, rows, bcx - est, bcx + est, win=22)
    for y, a, b in zip(rows, l, r):
        edges[int(y)] = (a, b)

    return edges


def grabcut_edges(img, L, sp):
    """GrabCut seeded from the measured outline, then made symmetric about
    the bottle's axis using the left side only (the box sits to the right)."""
    H, W = img.shape[:2]
    edges0 = silhouette(L, sp)
    est = np.zeros((H, W), np.uint8)
    for y, (a, b) in edges0.items():
        est[y, int(a):int(b) + 1] = 1
    m = np.full((H, W), cv2.GC_BGD, np.uint8)
    m[cv2.dilate(est, np.ones((61, 61), np.uint8)) > 0] = cv2.GC_PR_BGD
    m[est > 0] = cv2.GC_PR_FGD
    m[cv2.erode(est, np.ones((71, 71), np.uint8)) > 0] = cv2.GC_FGD
    bgd = np.zeros((1, 65), np.float64); fgd = np.zeros((1, 65), np.float64)
    cv2.grabCut(img.astype(np.uint8), m, None, bgd, fgd, 6, cv2.GC_INIT_WITH_MASK)
    fg = ((m == cv2.GC_FGD) | (m == cv2.GC_PR_FGD)).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(fg)
    fg = (lab == 1 + st[1:, cv2.CC_STAT_AREA].argmax()).astype(np.uint8)
    ct, bbot = sp["cap"][2], sp["body"][4]
    btop, y1 = sp["body"][2], sp["band"][1]
    left, right = {}, {}
    for y in range(ct, bbot + 1):
        xs = np.where(fg[y])[0]
        if len(xs):
            left[y], right[y] = xs.min(), xs.max()
    axis = np.median([(left[y] + right[y]) / 2 for y in range(btop, y1) if y in left])
    cap_axis = np.median([(left[y] + right[y]) / 2 for y in range(ct + 20, sp["cap"][3] - 20) if y in left])
    rows = sorted(left)
    hw = np.array([(cap_axis if y <= sp["cap"][3] else axis) - left[y] for y in rows], float)
    k = 9
    hp = np.pad(hw, k // 2, mode="edge")
    hw = np.array([np.median(hp[i:i + k]) for i in range(len(hw))])
    edges = {}
    for y, h in zip(rows, hw):
        c = cap_axis if y <= sp["cap"][3] else axis
        if h > 5:
            edges[y] = (c - h, c + h)
    # the base sits on a black box: drop bottom rows that are box, not glass
    for y in sorted(edges, reverse=True):
        a, b = edges[y]
        if np.median(L[y, int(a + 0.2 * (b - a)):int(b - 0.2 * (b - a))]) < 95:
            del edges[y]
        else:
            break
    return edges


def fill_rows(img, hole):
    """Fill masked pixels by straight lines between the colours either side,
    row by row: the liquid's gradients and the meniscus are horizontal, so
    this leaves no smudge where the print was."""
    out = img.copy()
    H, W = hole.shape
    for y in np.where(hole.any(axis=1))[0]:
        row = hole[y]
        x = 0
        while x < W:
            if not row[x]:
                x += 1; continue
            x0 = x
            while x < W and row[x]: x += 1
            x1 = x  # hole is [x0, x1)
            a = img[y, max(0, x0 - 3):x0].mean(axis=0) if x0 > 0 else img[y, x1:x1 + 3].mean(axis=0)
            b = img[y, x1:min(W, x1 + 3)].mean(axis=0) if x1 < W else a
            t = (np.arange(x0, x1) - x0 + 1) / (x1 - x0 + 1)
            out[y, x0:x1] = a[None, :] * (1 - t[:, None]) + b[None, :] * t[:, None]
    # soften the fill vertically a touch so rows don't streak
    blur = cv2.GaussianBlur(out, (1, 5), 0)
    out[hole] = blur[hole]
    return out


def build(src, name, frames=36):
    sp = SPECS[name]
    img = cv2.imread(src).astype(np.float32)
    H, W = img.shape[:2]
    L = cv2.cvtColor(img.astype(np.uint8), cv2.COLOR_BGR2LAB)[..., 0].astype(np.float32)

    edges = grabcut_edges(img, L, sp)

    mask = np.zeros((H, W), np.float32)
    xs = np.arange(W, dtype=np.float32)
    for y, (a, b) in edges.items():
        mask[y] = np.clip(xs - a + 0.5, 0, 1) * np.clip(b - xs + 0.5, 0, 1)
    # the base's bottom edge curves (the camera looks slightly down), and the
    # black box shows below that curve: carve it away column by column
    ybot = max(edges)
    for x in range(W):
        col = np.where(mask[:, x] > 0)[0]
        if not len(col): continue
        y = col.max()
        while y > ybot - 90 and mask[y, x] > 0 and L[y, x] < 120:
            mask[y, x] = 0
            y -= 1
    mask = cv2.GaussianBlur(mask, (3, 3), 0)

    # ── lift the print off the glass ──────────────────────────────────────
    y0, y1 = sp["band"]
    band = np.zeros((H, W), bool)
    for y in range(y0, y1):
        if y not in edges: continue
        a, b = edges[y]
        band[y, int(a + 0.06 * (b - a)):int(b - 0.06 * (b - a))] = True
    bg = cv2.medianBlur(L.astype(np.uint8), 41).astype(np.float32)
    text = band & (L < bg - 24)
    text = cv2.dilate(text.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
    text &= band
    clean = fill_rows(img, text)
    cleanL = cv2.cvtColor(clean.astype(np.uint8), cv2.COLOR_BGR2LAB)[..., 0].astype(np.float32)
    ink = np.percentile(img[text], 3, axis=0) if text.any() else np.array([25, 22, 20], np.float32)
    inkL = float(np.percentile(L[text], 3)) if text.any() else 20.0
    alpha = np.where(text, np.clip((cleanL - L) / np.maximum(cleanL - inkL, 1), 0, 1), 0).astype(np.float32)

    # ── frames ────────────────────────────────────────────────────────────
    ys = np.arange(y0, y1)
    out_frames = []
    for f in range(frames):
        th = 2 * math.pi * f / frames
        frame = clean.copy()
        a_tot = np.zeros((H, W), np.float32)
        for y in ys:
            if y not in edges: continue
            a, b = edges[y]
            c, hw = (a + b) / 2, (b - a) / 2
            x = xs
            u = np.clip((x - c) / hw, -1, 1)
            inside = np.abs(x - c) < hw
            psi = np.arcsin(u)
            # front surface: the print that was at angle phi is now at phi + th
            phi = psi - th
            front = inside & (np.cos(phi) > 0.02)
            src_x = c + hw * np.sin(phi)
            af = np.interp(src_x, xs, alpha[y]) * front
            # back surface, seen through the glass: mirrored and faint
            phib = (math.pi - psi) - th
            back = inside & (np.cos(phib) > 0.02)
            src_xb = c + hw * np.sin(phib)
            ab = np.interp(src_xb, xs, alpha[y]) * back * 0.28
            a_tot[y] = np.maximum(af, ab)
        a_tot = cv2.GaussianBlur(a_tot, (0, 0), 0.6)
        frame = frame * (1 - a_tot[..., None]) + ink[None, None, :] * a_tot[..., None]
        out_frames.append(frame)

    # ── crop to the bottle, square canvas, consistent scale ───────────────
    ys_m, xs_m = np.where(mask > 0.01)
    top, bot = ys_m.min(), ys_m.max()
    left, right = xs_m.min(), xs_m.max()
    size = 1000
    fill = 0.62  # bottle height as a share of the canvas
    scale = size * fill / (bot - top + 1)
    results = []
    for frame in out_frames:
        rgba = np.dstack([frame, mask * 255]).clip(0, 255).astype(np.uint8)
        crop = rgba[top:bot + 1, left:right + 1]
        h, w = crop.shape[:2]
        crop = cv2.resize(crop, (max(1, round(w * scale)), max(1, round(h * scale))), interpolation=cv2.INTER_AREA)
        canvas = np.zeros((size, size, 4), np.uint8)
        h, w = crop.shape[:2]
        oy, ox = (size - h) // 2, (size - w) // 2
        canvas[oy:oy + h, ox:ox + w] = crop
        results.append(canvas)
    return results


if __name__ == "__main__":
    src, out, name = sys.argv[1], sys.argv[2], sys.argv[3]
    n = int(sys.argv[4]) if len(sys.argv) > 4 else 36
    import os
    os.makedirs(out, exist_ok=True)
    fr = build(src, name, n)
    for i, c in enumerate(fr):
        rgba = cv2.cvtColor(c, cv2.COLOR_BGRA2RGBA)
        from PIL import Image
        Image.fromarray(rgba).save(f"{out}/{i + 1:02d}.webp", "WEBP", quality=82, method=6)
    print(name, len(fr), "frames")

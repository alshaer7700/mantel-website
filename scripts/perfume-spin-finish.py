"""From full-resolution masters (scripts/perfume-spin.py): website frames, MP4s, GIFs.

usage: python3 -I scripts/perfume-spin-finish.py <masters_dir> public/products/perfumes <media_out>
"""
import sys, os, subprocess, shutil
from concurrent.futures import ProcessPoolExecutor
from PIL import Image, ImageFilter
import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()
M, WEB, MEDIA = sys.argv[1], sys.argv[2], sys.argv[3]
PAPER = (245, 243, 238)
NAMES = [("vanilla", "vanilla-no-02", "Vanilla-N02"), ("wood", "wood-no-03", "Wood-N03"),
         ("leather", "leather-no-04", "Leather-N04"), ("oud", "oud-no-05", "Oud-N05")]

def load(n):
    files = sorted(os.listdir(f"{M}/{n}"))
    fr = [Image.open(f"{M}/{n}/{f}").convert("RGBA") for f in files]
    box = fr[0].getbbox()
    for f in fr[1:]:
        b = f.getbbox(); box = (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
    return [f.crop(box) for f in fr]

def fit(b, h):
    s = h / b.height
    return b.resize((round(b.width * s), round(b.height * s)), Image.LANCZOS)

def place(b, W, H, share, bg=PAPER):
    b = fit(b, H * share)
    if bg is None:
        c = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    else:
        c = Image.new("RGBA", (W, H), bg + (255,))
    c.alpha_composite(b, ((W - b.width) // 2, (H - b.height) // 2))
    return c if bg is None else c.convert("RGB")

def mp4(imgs, path, fps=36, loops=3):
    tmp = path + ".d"; os.makedirs(tmp, exist_ok=True)
    for i, im in enumerate(imgs * loops): im.save(f"{tmp}/{i:05d}.png", compress_level=1)
    subprocess.run([FF, "-y", "-loglevel", "error", "-framerate", str(fps), "-i", f"{tmp}/%05d.png",
                    "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-crf", "13", "-preset", "slower",
                    "-tune", "film", "-movflags", "+faststart", path], check=True)
    shutil.rmtree(tmp)

def gif(imgs, path, fps):
    tmp = path + ".d"; os.makedirs(tmp, exist_ok=True)
    for i, im in enumerate(imgs): im.save(f"{tmp}/{i:05d}.png", compress_level=1)
    pal = f"{tmp}/pal.png"
    subprocess.run([FF, "-y", "-loglevel", "error", "-framerate", str(fps), "-i", f"{tmp}/%05d.png", "-vf", "palettegen=max_colors=256:stats_mode=full", pal], check=True)
    subprocess.run([FF, "-y", "-loglevel", "error", "-framerate", str(fps), "-i", f"{tmp}/%05d.png", "-i", pal,
                    "-lavfi", "paletteuse=dither=floyd_steinberg", "-loop", "0", path], check=True)
    shutil.rmtree(tmp)

def one(args):
    n, slug, label = args
    fr = load(n)
    # website: 36 angles, 1200px square, transparent, bottle 62% of the height
    os.makedirs(f"{WEB}/{slug}", exist_ok=True)
    for i, f in enumerate(fr[::3]):
        place(f, 1200, 1200, 0.62, bg=None).save(f"{WEB}/{slug}/{i + 1:02d}.webp", "WEBP", quality=90, method=6)
    # video: every one of the 108 angles, 1080x1350, bottle 74% of the height
    mp4([place(f, 1080, 1350, 0.74) for f in fr], f"{MEDIA}/{label}-360.mp4")
    # GIF: 54 angles, 720x900
    gif([place(f, 720, 900, 0.74) for f in fr[::2]], f"{MEDIA}/{label}-360.gif", 18)
    return label

if __name__ == "__main__":
    os.makedirs(MEDIA, exist_ok=True)
    with ProcessPoolExecutor(4) as ex:
        for r in ex.map(one, NAMES): print(r, "done", flush=True)
    sets = [load(n) for n, _, _ in NAMES]
    grid = []
    for i in range(108):
        g = Image.new("RGB", (1080, 1350), PAPER)
        for k, fr in enumerate(sets):
            g.paste(place(fr[i], 540, 675, 0.76), ((k % 2) * 540, (k // 2) * 675))
        grid.append(g)
    mp4(grid, f"{MEDIA}/by-Mantel-perfumes-360.mp4")
    gif([g.resize((720, 900), Image.LANCZOS) for g in grid[::2]], f"{MEDIA}/by-Mantel-perfumes-360.gif", 18)
    print("all done")

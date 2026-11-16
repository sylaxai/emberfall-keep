"""Look gates for EMBERFALL KEEP screenshots (SUNWRIGHT thresholds, copied exactly).

Thresholds (winner-lessons.md section 3, SUNWRIGHT tools/measure-shots.mjs):
  saturation mean >= 0.33 (aim 0.45), mean luminance >= 0.45,
  luminance SD >= 40, warm (mean R > mean B), near-black < 2%,
  no 64x64 block with mean luminance < 0.15.
Blown 32px blocks are counted (informational: blocks with mean > 0.98).
Usage: python3 tools/measure-shots.py [--shots-dir screenshots] [--fail]
Exit 0 unless --fail and any gate fails.
"""
import argparse
import colorsys
import statistics
import sys
from pathlib import Path

from PIL import Image

GATES = {
    "saturation": ("mean saturation >= 0.33", lambda m: m["sat"] >= 0.33),
    "mean_luminance": ("mean luminance >= 0.45", lambda m: m["mean_lum"] >= 0.45),
    "luminance_sd": ("luminance SD >= 40", lambda m: m["sd"] >= 40),
    "warm": ("warm (mean R > mean B)", lambda m: m["mean_r"] > m["mean_b"]),
    "near_black": ("near-black < 2%", lambda m: m["near_black"] < 0.02),
    "dark_blocks": ("no 64x64 block darker than 0.15", lambda m: m["dark_blocks"] == 0),
}


def measure(path):
    im = Image.open(path).convert("RGB")
    px = list(im.getdata())
    n = len(px)
    lum = [0.2126 * r + 0.7152 * g + 0.0722 * b for r, g, b in px]
    sats = [colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)[1] for r, g, b in px]
    g = im.convert("L")
    w, h = im.size
    dark_blocks = 0
    blown_blocks = 0
    for by in range(0, h - 63, 64):
        for bx in range(0, w - 63, 64):
            block = g.crop((bx, by, bx + 64, by + 64))
            m = sum(list(block.getdata())) / 4096 / 255
            if m < 0.15:
                dark_blocks += 1
    for by in range(0, h - 31, 32):
        for bx in range(0, w - 31, 32):
            block = g.crop((bx, by, bx + 32, by + 32))
            m = sum(list(block.getdata())) / 1024 / 255
            if m > 0.98:
                blown_blocks += 1
    return {
        "sat": sum(sats) / n,
        "mean_lum": sum(lum) / n / 255,
        "sd": statistics.pstdev(lum),
        "mean_r": sum(p[0] for p in px) / n,
        "mean_b": sum(p[2] for p in px) / n,
        "near_black": sum(1 for v in lum if v < 0.02 * 255) / n,
        "dark_blocks": dark_blocks,
        "blown_32px_blocks": blown_blocks,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--shots-dir", default="screenshots")
    ap.add_argument("--fail", action="store_true")
    args = ap.parse_args()
    shots = sorted(Path(args.shots_dir).glob("*.jpg"))
    if not shots:
        print("no screenshots found")
        return 1
    all_ok = True
    for shot in shots:
        m = measure(shot)
        print(f"{shot.name}: sat={m['sat']:.3f} meanLum={m['mean_lum']:.3f} "
              f"sd={m['sd']:.1f} R={m['mean_r']:.0f} B={m['mean_b']:.0f} "
              f"nearBlack={m['near_black']:.3%} dark64={m['dark_blocks']} "
              f"blown32={m['blown_32px_blocks']}")
        for name, (label, test) in GATES.items():
            ok = test(m)
            all_ok = all_ok and ok
            print(f"  {'PASS' if ok else 'FAIL'} {name}: {label}")
    print("ALL GATES PASS" if all_ok else "GATES FAILING (see above)")
    return 0 if (all_ok or not args.fail) else 1


if __name__ == "__main__":
    sys.exit(main())

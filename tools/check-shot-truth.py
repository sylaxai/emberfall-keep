"""Screenshot truth checks (SUNWRIGHT tools/check-shot-truth.mjs pattern):
every HUD number on every dossier screenshot is recomputed from a headless
replay at the captured tick and asserted equal. The replay runs the exact
shot the browser runs (same seed + step count from shots.json), so any
difference means the captured frame is not the deterministic sim.
Usage: python3 tools/check-shot-truth.py [--port 8080]
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))
from shoot import arguments, game_server, load_shot, monitor, check_errors, shots  # noqa: E402

from playwright.sync_api import sync_playwright  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent


def replay(shot_name, seed, steps):
    cmd = ["node", str(ROOT / "tools" / "replay-shot.mjs"),
           "--shot", shot_name, "--seed", str(seed)]
    if steps:
        cmd += ["--steps", str(steps)]
    out = subprocess.run(cmd, check=True, capture_output=True, text=True, cwd=ROOT)
    return json.loads(out.stdout.strip().splitlines()[-1])


def main():
    args = arguments()
    all_ok = True
    with game_server(args.port) as url, sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            page = browser.new_page(viewport={"width": 1280, "height": 720})
            errors = monitor(page)
            for shot in shots():
                q = parse_qs(urlparse(shot["query"]).query)
                name = q["shot"][0]
                seed = int(q.get("seed", ["1"])[0])
                steps = int(q["steps"][0]) if "steps" in q else 0
                expected = replay(name, seed, steps)
                load_shot(page, url, shot)
                actual = page.evaluate("""() => {
                    const s = window.__game.state;
                    let foes = 0;
                    for (const e of s.enemies) if (e.active) foes++;
                    foes += s.spawnCount - s.spawnIndex;
                    return {gold: s.gold, lives: s.lives, wave: s.wave,
                            score: s.score, kills: s.kills, foes};
                }""")
                ok = actual == expected
                all_ok = all_ok and ok
                print(f"{shot['name']} ({shot['query']}): "
                      f"{'PASS' if ok else 'FAIL'} browser={actual} replay={expected}")
                check_errors(errors)
            check_errors(errors)
        finally:
            browser.close()
    print("TRUTH CHECK: ALL PASS" if all_ok else "TRUTH CHECK: FAILING")
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())

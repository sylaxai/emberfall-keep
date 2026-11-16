# Look-grade eval — EMBERFALL KEEP (+ NEON VOID verdict)

Date: 2026-11-16 ~13:20 WIB. Skills applied: `threejs_exposure_color_grading`
(scene-referred pipeline: meter → exposure → one tone-map owner → display-domain
LUT) and `threejs_visual_validation` (fixed-view contracts, seed sweep via staged
shots, no-post baseline = pre-grade screenshots). `llm_as_judge`: NO local judge
model exists on this VM (no ollama, no local models) — pairwise A/B judge check
skipped, not faked.

## Baseline (measured with tools/measure-shots.py, pre-grade screenshots)

Gates (SUNWRIGHT #1 thresholds): sat ≥0.33, mean lum ≥0.45, lum SD ≥40,
warm (R>B), near-black <2%, no 64×64 block <0.15.

| shot | sat | lum | SD | warm | nblk | dark64 | gates |
|---|---|---|---|---|---|---|---|
| EF 1-cover | 0.53 | 0.13 | 31.4 | F | 0.000 | 0.063 | 2/6 |
| EF 2-play | 0.42 | 0.22 | 29.2 | T | 0.000 | 0.094 | 3/6 |
| EF 3-action | 0.42 | 0.23 | 32.0 | T | 0.000 | 0.094 | 3/6 |
| EF 4-win | 0.53 | 0.13 | 28.5 | F | 0.000 | 0.063 | 2/6 |
| NV 1-cover | 0.75 | 0.06 | 28.3 | F | 0.551 | 0.024 | 1/6 |
| NV 2-play | 0.74 | 0.04 | 14.9 | F | 0.047 | 0.031 | 1/6 |
| NV 3-action | 0.74 | 0.05 | 22.2 | F | 0.048 | 0.031 | 1/6 |
| NV 4-over | 0.74 | 0.05 | 21.4 | F | 0.544 | 0.024 | 1/6 |

## Grade simulation (offline, PIL on baseline JPEGs — /tmp/grade-sim*.py)

Key finding: uniform display-domain grades trade gates against each other.
Screen (additive) lifts raise lum but crush saturation (0.74→0.08) and SD.
Gamma lifts preserve saturation but lum stalls ~0.31. Best identity-preserving
NV grade (γ0.35, sat×2, contrast×1.8): 3/6, lum 0.31, SD 20 — and viewed, it
turns the void into flat purple graph paper: the darkness IS the identity.
No display-domain grade reaches 5/6 on any NV frame; SD≥40 is structurally
unreachable without changing frame content (a re-skin), which is out of scope.
For EF, γ0.45 + sat×2 + contrast×1.8 simulated 6/6 on both gameplay frames.

## Implemented (EMBERFALL only): SVG display-domain grade on the canvas

`game/index.html`: `canvas{filter:url(#grade)}` + inline `<filter id="grade"
color-interpolation-filters="sRGB">`:
1. feComponentTransfer gamma 0.45 (all channels) — shadow/mid lift;
2. feColorMatrix saturate 2.0 — restores saturation the lift removes;
3. feComponentTransfer linear slope 1.8, intercepts R −0.38 / G −0.40 / B −0.42 —
   contrast + a small warm bias (EMBERFALL is a warm fantasy game; the bias also
   fixes a 1-unit R/B tie on the play frame).
Presentation-only: no game logic, sim, input, HUD, or asset changed. Graceful
degradation: if a renderer ignores the filter, the game plays dark as before.

## After (real re-capture via tools/shoot.py + tools/measure-shots.py)

| shot | sat | lum | SD | warm | nblk | dark64 | gates |
|---|---|---|---|---|---|---|---|
| EF 1-cover | 0.93 | 0.29 | 40.6 | F | 0.000 | 23 blk | 3/6 |
| EF 2-play | 0.69 | 0.47 | 43.1 | T (77>68) | 0.000 | 0 | **6/6 PASS** |
| EF 3-action | 0.69 | 0.48 | 45.1 | T (80>68) | 0.000 | 0 | **6/6 PASS** |
| EF 4-win | 0.93 | 0.28 | 38.2 | F | 0.000 | 23 blk | 3/6 |

Viewed: gameplay frames are bright, readable, warm — the fantasy-TD look
survives and improves. Title/win frames are legible gold-on-green but still
fail lum/warm/dark-blocks: the title overlay (`#07130ee0`) dims the field to
~12%. Lifting it enough to pass would wash out the title panel's dark
backdrop — a re-skin of the title screen, not a grade. Left as is, reported
plainly. Overall LOOK GATES still FAIL (all 4 shots must pass), but the two
gameplay frames — the ones that show the game to a judge — now fully pass.

## Verification (after the change)

- Truth check `tools/check-shot-truth.py`: ALL PASS (4/4, HUD numbers match
  headless replay exactly).
- Sim `node tools/sim.js` ×20: WIN 20/20.
- Kit check `makefun check --repo . --worktree --transcripts
  ~/workspace/makefun/emberfall-bundle.tar.gz`: **13 passed, 0 failed**,
  6 skipped, 5 at submission — identical to the polish baseline
  (thinking_reproduces 93.5%, 712/761 authored).
- Frame time (Playwright rAF probe, 3 s): filter ON mean 18.5 ms vs OFF
  18.6 ms — no measurable cost.
- Dossier regenerated (`MAKEFUN_OUTPUT_DIR=out node main.ts`): 858,426 B
  (< 1.5 MiB gate; was 704,249 B — brighter frames compress less), image
  sha256 match the new screenshots.
- Screenshots all ≤256 KiB (141–170 KB).

## NEON VOID verdict: NO CHANGE

No display-domain grade passes its look gates without destroying its art
direction (verified by simulation + visual inspection of graded frames).
The neon-on-black identity caps mean luminance by design; the gates as
written (copied from SUNWRIGHT, a bright game) are unreachable for it
without a full re-skin, which the 2026-11-16 polish already ruled out.
NEON VOID is left exactly as polished. Its best lever for the submit
decision is not brightness — it is the gameplay/hook already in place.

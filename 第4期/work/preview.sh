#!/bin/zsh
# Preview chapters: build their storyboard alone, render stills at three moments of every scene, make contact sheets.
# usage: ./preview.sh NAME 01 02     -> prints the sheet image paths (Read them) and the scene timing table
set -e
cd "$(dirname "$0")"
NAME=$1; shift
python3 sb_build.py sb_prev_$NAME.json "$@"
NO_AUDIO=1 EDIT_DIR=edit_N INTRO_BASE="重估_片头_第4期_学历" EP_JS=ep_prev_$NAME.js python3 build_ep.py sb_prev_$NAME.json 2>&1 | grep -v -i "warn\|pkg_resources" | tail -4
python3 - "$NAME" <<'PY'
import json, sys, subprocess, glob, os
from PIL import Image, ImageDraw
name = sys.argv[1]
E = json.loads(open(f'../render/ep_prev_{name}.js').read()[10:])
SB = json.load(open(f'sb_prev_{name}.json'))
# keep only this preview's scenes' time span
ts, lab = [], []
for k, s in enumerate(E['scenes']):
    dur = s['t1'] - s['t0']
    for tag, t in (('A', s['t0'] + min(1.2, dur * 0.2)), ('B', s['t0'] + dur * 0.55), ('C', s['t1'] - 0.45)):
        ts.append(round(t, 2)); lab.append(f"{SB['scenes'][k]['ch']}#{k} {tag} {t:.1f}s")
    print(f"scene {k:2d} ch{SB['scenes'][k]['ch']}  {s['t0']:7.1f}-{s['t1']:7.1f} ({dur:4.1f}s)  t0={SB['scenes'][k]['t0']}")
d = f'qa_prev_{name}'
subprocess.run(['rm', '-rf', d])
env = dict(os.environ, EPJS=f'ep_prev_{name}.js')
subprocess.run(['node', 'render.mjs', '--stills', ','.join(map(str, ts)), '--dir', f'../work/{d}'], cwd='../render', env=env, check=True, capture_output=True)
fs = sorted(glob.glob(f'{d}/*.jpg'), key=lambda f: float(f.split('_')[-1][:-4]))
sheets = []
for k in range(0, len(fs), 12):
    sheet = Image.new('RGB', (4 * 360, 3 * 500), 'white'); dr = ImageDraw.Draw(sheet)
    for i, f in enumerate(fs[k:k + 12]):
        x, y = (i % 4) * 360, (i // 4) * 500
        sheet.paste(Image.open(f).resize((360, 480)), (x, y)); dr.text((x + 4, y + 484), lab[k + i], fill=(0, 0, 200))
    out = f'prev_{name}_{k // 12}.jpg'; sheet.save(out, quality=85); sheets.append(out)
print('SHEETS:', ' '.join(os.path.abspath(s) for s in sheets))
PY

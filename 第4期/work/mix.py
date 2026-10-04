"""Final audio on the EP timeline, mastered like 第 2 期 and the 《重估》 intro (-14 LUFS, limiter at -1.5 dBTP).

python3 mix.py out.wav
  [0, Tco] cold open voice | [Tco, ...] the intro's own audio (voices + its music, already mastered)
  | [Tb, Tbe] body voice | [Tbe, Tend] end card: a soft D-minor chord (第 2 期's end chord), synthesized here.
"""
import json, subprocess, sys
from pathlib import Path
import numpy as np
from scipy.io import wavfile

sys.path.insert(0, str(Path.home() / 'Documents/Codex/2026-09-28/wu-du/chonggu_intro'))
import music as mu  # noqa: E402

HERE = Path(__file__).resolve().parent
import os
ED = HERE / os.environ.get('EDIT_DIR', 'edit')
SR = 48000
out = Path(sys.argv[1])
T = json.load(open(ED / 'ep_times.json'))
voice = wavfile.read(ED / 'ep_voice.wav')[1].astype(np.float64)
INTRO = HERE.parent / 'outputs' / (os.environ.get('INTRO_BASE', '重估_片头_第3期_注意力与直觉') + '.mp4')


def db(x):
    return 10 ** (x / 20)


def chord(names, dur, piano_db=-26, pad_db=-34, arpeggio=0.09):
    n = int(dur * SR)
    y = np.zeros(n)
    for k, nm in enumerate(names):
        f = mu.note_hz(nm)
        p = mu.piano(f, min(dur, 4.5), amp=1.0, decay=2.6 if f < 262 else 1.8)
        mu.place(y, p / (np.max(np.abs(p)) + 1e-9) * db(piano_db - 2 * (k > 2)), 0.05 + k * arpeggio)
    pad = mu.pad([mu.note_hz(nm) for nm in names], dur, amp=1.0, attack=0.9, release=1.6)
    y += pad / (np.max(np.abs(pad)) + 1e-9) * db(pad_db)
    y = mu.room(y, 1.8, 0.22, seed=5)
    fade = np.cos(np.clip((np.arange(n) / SR - (dur - 1.4)) / 1.4, 0, 1) * np.pi / 2) ** 2
    return y * fade


def lufs(path):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(path), '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    return float(r.split('Integrated loudness:')[1].split('I:')[1].split('LUFS')[0])


Tco, Tb, Tbe, Tend = T['Tco'], T['Tb'], T['Tbe'], T['Tend']
n = int((Tend + 0.3) * SR)
v = np.zeros(n)
v[:min(n, len(voice))] = voice[:n]
# the body voice is mastered on its own (speech only), then the intro is laid in at its own level
tmp = out.with_suffix('.v.wav')
wavfile.write(tmp, SR, np.stack([v, v], 1).astype(np.float32))   # measure as the final stereo (mono counts 3 dB lower)
g = -14.0 - lufs(tmp)
v *= db(g)
# room tone: Tencent Meeting's noise gate leaves digital silence between phrases, which reads as drop-outs.
# A very quiet, band-limited noise bed (about -64 dBFS after mastering) under the cold open and the body keeps the air.
rng = np.random.default_rng(7)
wn = rng.standard_normal(n)
from scipy.signal import butter, sosfilt
bed = sosfilt(butter(2, [90, 4500], btype='band', fs=SR, output='sos'), wn)
bed = sosfilt(butter(1, 900, btype='low', fs=SR, output='sos'), bed) * 0.6 + bed * 0.4   # tilt towards pink
bed *= db(-64.0) / (np.sqrt(np.mean(bed ** 2)) + 1e-12)
envb = np.zeros(n)
for a_, b_ in ((0.0, Tco - 0.6), (Tb - 0.3, Tbe)):
    i0, i1 = int(a_ * SR), int(b_ * SR)
    envb[i0:i1] = 1.0
from scipy.ndimage import uniform_filter1d
envb = uniform_filter1d(envb, int(0.5 * SR))
v += bed * envb                  # after the speech gain: lands at about -64 dBFS
mu.place(v, chord(['D3', 'A3', 'D4', 'F4', 'A4', 'D5'], Tend - Tbe + 0.3, piano_db=-25 - g, pad_db=-33 - g) * db(g), Tbe + 0.05)
ia = out.with_suffix('.intro.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(INTRO), '-vn', '-ac', '2', '-ar', str(SR), '-c:a', 'pcm_f32le', str(ia)], check=True)
intro = wavfile.read(ia)[1].astype(np.float64)
ia.unlink()
y = np.stack([v, v], 1)
k = int(round(Tco * SR))
m = min(len(intro), n - k)
y[k:k + m] += intro[:m]
wavfile.write(tmp, SR, y.astype(np.float32))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(tmp), '-af', 'alimiter=limit=0.84:attack=2:release=60:level=disabled',
                '-c:a', 'pcm_f32le', str(out)], check=True)
tmp.unlink()
print(out, f'{lufs(out):.1f} LUFS')

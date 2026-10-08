"""Score, sound cues and narration -> audio/final.wav (-14 LUFS, stereo 48 kHz).

Everything is synthesized here with the felt piano / pads / pulses of extras/chonggu_intro/music.py; nothing
is sampled.  Times come from the picture: `node render.mjs --events data/events.json` exports every cue the
renderer knows about (scene starts, the drop, the crumble, the silent stretch, the roots ...).
"""
from __future__ import annotations

import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT.parent / "extras" / "chonggu_intro"))
from music import SR, duck, echo, note_hz, pad, piano, place, room, sub_pulse, tick  # noqa: E402

EV = json.loads((ROOT / "data" / "events.json").read_text())
A, M, TOTAL = EV["acts"], EV["marks"], EV["total"]
N = int((TOTAL + 1.0) * SR)


def read_wav(path: Path) -> np.ndarray:
    with wave.open(str(path)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
        assert w.getframerate() == SR and w.getnchannels() == 1, path
    return x


def chord(names: str) -> list[float]:
    return [note_hz(n) for n in names.split()]


def noise(dur: float, seed: int, smooth: int = 1) -> np.ndarray:
    n = np.random.default_rng(seed).standard_normal(int(dur * SR))
    return np.convolve(n, np.ones(smooth) / smooth, mode="same") if smooth > 1 else n


# ------------------------------------------------------------------------------------------- score
# A minor, slow.  (start, pad chord, arpeggio notes, step seconds or 0 for pad only)
Am, F, C, G, Dm = ("A2 E3 C4", "A3 C4 E4 B4"), ("F2 C3 A3", "F3 A3 C4 G4"), ("C3 G3 E4", "C4 E4 G4 D5"), ("G2 D3 B3", "G3 B3 D4 A4"), ("D3 A3 F4", "D4 F4 A4 E5")
Bb = ("Bb2 F3 D4", "Bb3 D4 F4 C5")


def progression() -> list[tuple]:
    P = []

    def run(t0, t1, chords, step):
        n = len(chords)
        for i in range(n):
            P.append((t0 + (t1 - t0) * i / n, *chords[i], step))

    run(0.0, A["threads"], [Am], 0)
    run(A["threads"], M["split"], [Am, F, C, G], 0.62)
    run(M["split"], A["fog"], [Dm, Am, ("A1 E2 A2", "")], 0)
    run(A["fog"], A["chart"], [("A2 E3 B3", "B4 E5 A5")], 0.9)
    run(A["chart"], M["divorce"] - 0.4, [Am, F, C, G, Am, F], 0.33)
    run(M["divorce"] - 0.4, M["drop"], [("A2 E3 A3", "")], 0)
    run(M["drop"], EV["scenes"]["bricks"] - 0.4, [Dm, Am, Dm], 0.62)
    run(EV["scenes"]["bricks"] - 0.4, M["crumble"], [C, G, Am, F], 0.33)
    run(M["crumble"], A["stable"], [("A1 E2 A2", ""), Am], 0)
    run(A["stable"], A["sand"], [("F2 C3 A3 G4", "F3 C4 G4 A4"), C, ("F2 C3 A3", "F3 A3 C4 G4"), G, ("G2 D3 Bb3", "")], 0.75)
    run(A["sand"], A["choice"], [Am, Dm, Am], 0.75)
    run(A["choice"], A["compass"], [C, G], 0.75)
    run(A["compass"], A["journey"], [F, G, Am, C], 0.5)
    run(A["journey"], M["pain0"], [F, C, Dm, Bb, F, C, Dm, G], 0.4)
    run(M["pain0"], M["silent"], [("D2 A2 Eb3", ""), Am], 0)
    run(M["silent"], M["call"], [("A1 E2", "")], 0)
    run(M["call"], M["root"], [("F2 C3 F3", "")], 0)
    run(M["root"], TOTAL + 1, [("F2 C3 A3 G4", "")], 0)
    return sorted(P)


def score() -> np.ndarray:
    mus = np.zeros(N)
    P = progression()
    bounds = [p[0] for p in P] + [TOTAL + 1.0]
    for i, (t0, ch, arp, step) in enumerate(P):
        t1 = bounds[i + 1]
        if t1 - t0 < 0.2:
            continue
        quiet = M["silent"] <= t0 < M["call"]
        place(mus, pad(chord(ch), t1 - t0 + 1.4, amp=0.03 if quiet else 0.07, attack=1.0, release=1.6), max(0, t0 - 0.3))
        if step and arp:
            notes = chord(arp)
            k, t = 0, t0
            while t < t1 - 0.05:
                f = notes[k % len(notes)] if k % 8 != 7 else notes[0] * 2
                place(mus, piano(f, 1.8, amp=0.07 if step < 0.5 else 0.08, decay=1.2 if step < 0.5 else 1.8, bright=0.8), t)
                k += 1
                t += step
            if step < 0.4:  # a soft pulse on the bar while the numbers move
                for tb in np.arange(t0, t1 - 0.1, step * 4):
                    place(mus, sub_pulse(note_hz(ch.split()[0]) / 2, 0.8, amp=0.1, decay=0.4), tb)
    # the ending: a wide warm chord when the word lands, ringing out
    for i, n in enumerate(("F2", "C3", "A3", "E4", "G4", "C5")):
        place(mus, piano(note_hz(n), 6.0, amp=0.075, decay=4.0, bright=0.9), M["root"] + i * 0.09)
    place(mus, sub_pulse(43.65, 3.0, amp=0.2, decay=1.4), M["root"])
    return room(mus, seconds=2.6, wet=0.3)


# ------------------------------------------------------------------------------------------- cues
STEP_NOTES = ["C4", "D4", "E4", "G4", "A4", "C5"]


def cues() -> np.ndarray:
    fx = np.zeros(N)
    for j, e in enumerate(EV["events"]):
        t, k, d = e["t"], e["k"], e.get("d", 0.0)
        if k == "pop":
            place(fx, piano(note_hz("E5"), 0.6, amp=0.045, decay=0.2, bright=1.3), t)
            place(fx, tick(amp=0.04, freq=2600, seed=j), t)
        elif k == "tick":
            place(fx, tick(amp=0.025 if e.get("quiet") else 0.05, freq=3200, seed=j), t)
        elif k == "title":
            for i, n in enumerate(("A3", "E4", "A4")):
                place(fx, piano(note_hz(n), 3.0, amp=0.05, decay=2.0, bright=0.9), t + i * 0.06)
        elif k == "ring":
            for i, n in enumerate(("E5", "B5")):
                place(fx, piano(note_hz(n), 1.8, amp=0.045, decay=1.2, bright=1.3), t + i * 0.09)
        elif k in ("snap", "zap"):
            n = noise(0.35, j, 3) * np.exp(-np.arange(int(0.35 * SR)) / SR * 18)
            place(fx, 0.25 * n, t)
            place(fx, sub_pulse(48, 1.0, amp=0.18, decay=0.4), t)
        elif k == "crackle":
            rng = np.random.default_rng(j)
            for tt in np.sort(rng.uniform(0, d, 40)):
                place(fx, tick(dur=0.02, amp=0.012 + 0.02 * rng.random(), freq=900 + 1800 * rng.random(), seed=int(tt * 1e4)), t + tt)
        elif k in ("low", "drop", "thud"):
            amp = 0.1 if e.get("quiet") else (0.2 if k == "drop" else 0.15)
            place(fx, sub_pulse(41.2 if k == "drop" else 55, 1.6, amp=amp, decay=0.7), t)
        elif k == "mark":
            place(fx, piano(note_hz("A2"), 2.5, amp=0.08, decay=1.8, bright=0.7), t)
            place(fx, piano(note_hz("Bb3"), 2.5, amp=0.035, decay=1.6, bright=0.8), t + 0.02)
        elif k == "flicker":
            rng = np.random.default_rng(j)
            for tt in np.arange(0, d, 0.21):
                place(fx, piano(note_hz(("B5", "E6", "A5")[int(rng.integers(3))]), 0.3, amp=0.012, decay=0.15, bright=1.5), t + tt)
        elif k == "swell":
            n = noise(d + 0.5, j, 120)
            tt = np.arange(len(n)) / SR
            place(fx, 0.22 * n * (tt / (d + 0.5)) ** 2 * np.exp(-((tt - d) ** 2) * 4), t)
        elif k == "draw":
            n = noise(0.9, j, 30)
            tt = np.arange(len(n)) / SR
            place(fx, 0.05 * n * np.sin(np.pi * tt / 0.9), t)
        elif k == "patter":
            rng = np.random.default_rng(j)
            for tt in np.sort(rng.uniform(0, d, 34)):
                place(fx, tick(dur=0.025, amp=0.01 + 0.01 * rng.random(), freq=2400 + 1600 * rng.random(), seed=int(tt * 1e4)), t + tt)
        elif k == "rise":
            pass  # the arpeggio carries it
        elif k == "brick":
            place(fx, tick(dur=0.05, amp=0.03, freq=1400 + 30 * e["i"], seed=j), t)
        elif k == "crumble":
            rng = np.random.default_rng(j)
            for tt in np.sort(rng.uniform(0, d, 70)):
                place(fx, tick(dur=0.05, amp=0.015 + 0.025 * rng.random(), freq=700 + 1400 * rng.random(), seed=int(tt * 1e4)), t + tt * (0.4 + 0.6 * tt / d))
            place(fx, sub_pulse(46, 1.4, amp=0.15, decay=0.6), t)
        elif k == "step":
            place(fx, piano(note_hz(STEP_NOTES[e["i"]]), 2.2, amp=0.07, decay=1.4, bright=1.0), t)
        elif k == "ghost":
            for i, n in enumerate(("B3", "C4")):
                place(fx, piano(note_hz(n), 2.0, amp=0.035, decay=1.4, bright=0.7), t + i * 0.25)
        elif k == "sand":
            n = noise(d + 0.4, j, 2)
            tt = np.arange(len(n)) / SR
            env = np.minimum(1, tt / 0.3) * np.minimum(1, (d + 0.4 - tt) / 0.6)
            grain = (np.random.default_rng(j + 1).random(len(n)) < 0.004) * 1.0
            place(fx, (0.02 if e.get("quiet") else 0.05) * (0.3 * n + 3 * grain * n) * env, t)
        elif k == "rewind":
            n = noise(d + 0.3, j, 40)
            tt = np.arange(len(n)) / SR
            env = np.sin(np.pi * np.clip(tt / (d + 0.3), 0, 1)) ** 1.5
            sweep = np.sin(2 * np.pi * np.cumsum(900 * np.exp(-tt * 2.2) + 120) / SR)
            place(fx, 0.09 * n * env + 0.03 * sweep * env, t)
        elif k in ("shimmer", "align"):
            notes = ("A5", "C6", "E6", "G6") if k == "shimmer" else ("C5", "E5", "G5", "C6")
            for i in range(10):
                place(fx, piano(note_hz(notes[i % 4]), 1.2, amp=0.018, decay=0.7, bright=1.3), t + i * d / 10)
        elif k == "pass":
            place(fx, piano(note_hz("G5"), 1.0, amp=0.02, decay=0.6, bright=1.2), t)
        elif k == "join":
            for i, n in enumerate(("C5", "E5", "A5")):
                place(fx, piano(note_hz(n), 2.0, amp=0.045, decay=1.4, bright=1.1), t + i * 0.12)
        elif k == "sprinkle":
            rng = np.random.default_rng(j)
            for tt in np.sort(rng.uniform(0, d, 40)):
                place(fx, piano(note_hz(("E6", "G6", "A6", "C7")[int(rng.integers(4))]), 0.4, amp=0.008 + 0.008 * rng.random(), decay=0.2, bright=1.6), t + tt)
        elif k == "wind":
            n = noise(d, j, 200)
            tt = np.arange(len(n)) / SR
            place(fx, 0.35 * n * np.sin(np.pi * tt / d) ** 2, t)
        elif k == "scratch":
            n = noise(d, j, 2)
            tt = np.arange(len(n)) / SR
            place(fx, 0.03 * n * (0.5 + 0.5 * np.sin(2 * np.pi * 14 * tt)) * np.sin(np.pi * tt / d), t)
        elif k == "pain":
            for i, n in enumerate(("D3", "Eb3", "Ab3")):
                place(fx, piano(note_hz(n), d + 1.0, amp=0.03, decay=1.5, bright=0.6), t + i * 0.05)
        elif k == "hush":
            pass
        elif k == "root":
            n = noise(d, j, 400)
            tt = np.arange(len(n)) / SR
            place(fx, 0.5 * n * (tt / d) ** 1.5 * np.exp(-((tt - d) ** 2) * 1.5), t)
            place(fx, sub_pulse(36.7, d, amp=0.12, decay=d * 0.6), t + 0.3)
        elif k == "sprout":
            for i, n in enumerate(("C6", "G6")):
                place(fx, piano(note_hz(n), 1.6, amp=0.03, decay=1.0, bright=1.3), t + i * 0.14)
    return echo(fx)


# ------------------------------------------------------------------------------------------- voice and mix
def voice() -> np.ndarray:
    v = np.zeros(N)
    for ln in EV["lines"]:
        f = ROOT / "audio" / ln["file"]
        if not f.exists():
            print("missing", f.name)
            continue
        place(v, read_wav(f), ln["t0"])
    return v


def main():
    v, mus, fx = voice(), score(), cues()
    # silent stretch: music almost gone
    tt = np.arange(N) / SR
    hush = 1 - 0.7 * np.clip((tt - M["silent"]) / 1.5, 0, 1) * (1 - np.clip((tt - M["call"]) / 1.0, 0, 1))
    mus *= hush
    mus = duck(mus, v, depth_db=8.0)
    mix = v * 1.0 + mus * 0.08 + fx * 0.55
    k = int(1.2 * SR)
    mix[N - k:] *= np.linspace(1, 0, k)
    mix *= 0.9 / np.abs(mix).max()
    raw = ROOT / "audio" / "mix_raw.wav"
    with wave.open(str(raw), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
    comp = ROOT / "audio" / "mix_comp.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-af",
                    "acompressor=threshold=-20dB:ratio=3:attack=4:release=90:makeup=1,alimiter=limit=0.89:attack=2:release=40:level=false",
                    str(comp)], check=True)
    out = ROOT / "audio" / "final.wav"
    # fixed gain to -14 LUFS, then a true-peak limiter: keeps the mix's own dynamics (loudnorm would go dynamic
    # here because of the sub hits and lift every pause)
    def integrated(path):
        e = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
        tail = e[e.rindex("Summary:"):]
        return float(tail.split("I:")[1].split("LUFS")[0])
    gain = -14.0 - integrated(comp)
    for _ in range(3):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(comp), "-af",
                        f"volume={gain:.2f}dB,alimiter=limit=0.84:attack=1:release=60:level=false,aresample=48000", "-ac", "2", str(out)], check=True)
        got = integrated(out)
        if abs(got + 14.0) < 0.25:
            break
        gain += -14.0 - got
    print(f"integrated {got:.1f} LUFS (gain {gain:+.1f} dB)")
    print("->", out)


if __name__ == "__main__":
    main()

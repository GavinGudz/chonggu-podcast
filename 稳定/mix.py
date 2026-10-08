"""Score + sound design + narration -> audio/final.wav (-14 LUFS, stereo 48 kHz).

Everything is synthesized here (wavetable strings, plucks, bass, drums, risers, impacts); nothing is sampled.
The score is a 90 BPM grid; each scene of the picture picks its own groove, chords and intensity, and the big
moments (the strike, the drop, the crumble, 爆雷, 扎根) land on the exact frame from data/events.json.
"""
from __future__ import annotations

import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT.parent / "extras" / "chonggu_intro"))
from music import SR, envelope_follow, note_hz, piano  # noqa: E402

EV = json.loads((ROOT / "data" / "events.json").read_text())
A, M, TOTAL = EV["acts"], EV["marks"], EV["total"]
N = int((TOTAL + 1.5) * SR)
BPM = 90
BEAT = 60 / BPM
BAR = 4 * BEAT


# ------------------------------------------------------------------------------------------- helpers
def read_wav(path: Path) -> np.ndarray:
    with wave.open(str(path)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
        assert w.getframerate() == SR and w.getnchannels() == 1, path
    return x


class Bus:
    def __init__(self):
        self.L = np.zeros(N); self.R = np.zeros(N)

    def add(self, sig, at, pan=0.0, gain=1.0):
        k = int(at * SR)
        if k >= N or k + len(sig) <= 0:
            return
        if k < 0:
            sig = sig[-k:]; k = 0
        m = min(len(sig), N - k)
        gl, gr = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
        self.L[k:k + m] += sig[:m] * gain * gl
        self.R[k:k + m] += sig[:m] * gain * gr


def t_(dur):
    return np.arange(int(dur * SR)) / SR


def lp(x, f, order=2):
    return sosfilt(butter(order, min(f, SR / 2 - 100) / (SR / 2), "low", output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f / (SR / 2), "high", output="sos"), x)


def bp(x, f1, f2, order=2):
    return sosfilt(butter(order, [f1 / (SR / 2), min(f2, SR / 2 - 100) / (SR / 2)], "band", output="sos"), x)


def noise(dur, seed=0):
    return np.random.default_rng(seed).standard_normal(int(dur * SR))


def chord(names):
    return [note_hz(n) for n in names.split()]


TAB = 4096
_ph = np.arange(TAB) / TAB
SAW = sum(((-1) ** (k + 1)) * np.sin(2 * np.pi * k * _ph) / k for k in range(1, 48)) * (2 / np.pi)
SAW_SOFT = sum(((-1) ** (k + 1)) * np.sin(2 * np.pi * k * _ph) / k for k in range(1, 12)) * (2 / np.pi)


def osc(freq, dur, table=SAW, detune=0.0, phase=0.0):
    n = int(dur * SR)
    ph = (phase + np.cumsum(np.full(n, freq * (1 + detune) / SR))) % 1.0
    return np.interp(ph * TAB, np.arange(TAB), table)


# ------------------------------------------------------------------------------------------- instruments
def strings(freqs, dur, amp=0.1, attack=1.2, release=1.6, bright=2400, seed=0):
    """Supersaw section: three detuned voices per note, gentle lowpass, slow swell. Returns (L, R)."""
    r = np.random.default_rng(seed)
    n = int(dur * SR)
    L = np.zeros(n); R = np.zeros(n)
    for f in freqs:
        for d, side in ((-0.006, 0), (0.0, None), (0.0065, 1)):
            v = osc(f, dur, SAW, d, r.random())
            if side is None:
                L += v * 0.7; R += v * 0.7
            elif side == 0:
                L += v; R += v * 0.35
            else:
                R += v; L += v * 0.35
    t = t_(dur)
    env = np.clip(t / attack, 0, 1) ** 1.5 * np.clip((dur - t) / release, 0, 1)
    s = amp / max(1, len(freqs) * 2)
    return lp(L, bright) * env * s, lp(R, bright) * env * s


def pluck(freq, dur=0.6, amp=0.1, bright=1.0):
    t = t_(dur)
    out = np.zeros(len(t))
    for k in range(1, 9):
        f = freq * k
        if f > SR / 2.4:
            break
        out += (0.7 ** (k - 1)) * np.sin(2 * np.pi * f * t) * np.exp(-t * (5 + k * 3.5 / bright))
    return amp * out * (1 - np.exp(-t / 0.002))


def bell(freq, dur=1.6, amp=0.06):
    t = t_(dur)
    out = np.sin(2 * np.pi * freq * t) * np.exp(-t * 2.2) + 0.4 * np.sin(2 * np.pi * freq * 2.76 * t) * np.exp(-t * 4) + 0.2 * np.sin(2 * np.pi * freq * 5.4 * t) * np.exp(-t * 7)
    return amp * out * (1 - np.exp(-t / 0.001))


def bass(freq, dur, amp=0.2, cutoff=900):
    t = t_(dur)
    s = osc(freq, dur, SAW_SOFT) * 0.6 + np.sin(2 * np.pi * freq * t) * 0.8
    env = (1 - np.exp(-t / 0.005)) * np.exp(-t / max(dur, 0.2) * 1.2) * np.clip((dur - t) / 0.05, 0, 1)
    return amp * lp(s, cutoff) * env


def kick(amp=0.5):
    t = t_(0.5)
    f = 48 + 110 * np.exp(-t / 0.035)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.22)
    click = hp(noise(0.5, 3), 2000) * np.exp(-t / 0.002) * 0.3
    return amp * (s + click)


def snare(amp=0.3, seed=0):
    t = t_(0.35)
    return amp * (0.9 * bp(noise(0.35, seed), 1200, 9000) * np.exp(-t / 0.11) + 0.5 * np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05))


def clap(amp=0.3, seed=0):
    t = t_(0.4)
    env = sum(np.exp(-np.clip(t - d, 0, None) / 0.012) * (t >= d) for d in (0, 0.011, 0.023)) + 0.6 * np.exp(-np.clip(t - 0.03, 0, None) / 0.12) * (t >= 0.03)
    return amp * bp(noise(0.4, seed), 900, 6000) * env


def hat(amp=0.08, open_=False, seed=0):
    d = 0.35 if open_ else 0.06
    return amp * hp(noise(d, seed), 7000) * np.exp(-t_(d) / (0.12 if open_ else 0.016))


def shaker(amp=0.05, seed=0):
    t = t_(0.12)
    return amp * bp(noise(0.12, seed), 4000, 12000) * np.sin(np.pi * np.clip(t / 0.12, 0, 1)) ** 2


def tom(freq=110, amp=0.3):
    t = t_(0.6)
    return amp * np.sin(2 * np.pi * np.cumsum(freq * (1 + 0.5 * np.exp(-t / 0.04))) / SR) * np.exp(-t / 0.25)


def impact(amp=1.0, seed=0, big=True):
    d = 4.0 if big else 2.2
    t = t_(d)
    boom = np.sin(2 * np.pi * np.cumsum(30 + 70 * np.exp(-t / 0.12)) / SR) * np.exp(-t / (1.2 if big else 0.6))
    crash = lp(noise(d, seed), 6000) * np.exp(-t / (1.0 if big else 0.4)) * 0.35
    body = lp(noise(d, seed + 1), 400) * np.exp(-t / 0.3) * 1.2
    return amp * (boom + crash + body)


def riser(d, amp=0.3, seed=0):
    t = t_(d)
    k = t / d
    n = noise(d, seed)
    out = np.zeros(len(t))
    chunk = int(0.05 * SR)
    for i in range(0, len(t), chunk):
        f = 300 + 7000 * k[i] ** 2
        seg = n[i:i + chunk]
        if len(seg) > 16:
            out[i:i + chunk] = bp(seg, f * 0.7, f * 1.4, 1)
    pitch = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (2.5 * k)) / SR) * 0.25
    return amp * (out * k ** 2 * 1.6 + pitch * k ** 3)


def rev_cymbal(d, amp=0.3, seed=0):
    return amp * hp(noise(d, seed), 4000) * (t_(d) / d) ** 3


def whoosh(d, amp=0.3, seed=0):
    return amp * lp(noise(d, seed), 3000) * np.sin(np.pi * np.clip(t_(d) / d, 0, 1)) ** 2


def heartbeat(amp=0.35):
    t = t_(0.9)
    thump = lambda t0, a: a * np.sin(2 * np.pi * 52 * np.clip(t - t0, 0, None)) * np.exp(-np.clip(t - t0, 0, None) / 0.09) * (t >= t0)
    return amp * (thump(0, 1.0) + thump(0.22, 0.7))


def thunder(d, amp=0.4, seed=0):
    t = t_(d)
    env = np.exp(-t / (d * 0.5)) * (1 - np.exp(-t / 0.02))
    return amp * (lp(noise(d, seed), 300) * 3 * env + 0.5 * hp(noise(d, seed + 5), 1500) * np.exp(-t / 0.08))


# ------------------------------------------------------------------------------------------- arrangement
Am, F, C, G, Dm, E, Bb = "A2 C3 E3 A3", "F2 A2 C3 F3", "C3 E3 G3 C4", "G2 B2 D3 G3", "D3 F3 A3 D4", "E2 G#2 B2 E3", "Bb2 D3 F3 Bb3"
Em = "E3 G3 B3 E4"
FMAJ9 = "F2 C3 A3 E4 G4"
AMADD9 = "A2 E3 A3 C4 B4"
SECTIONS = []


def sec(t0, t1, **kw):
    if t1 - t0 > 0.2:
        SECTIONS.append((t0, t1, kw))


S = EV["scenes"]
J0 = A["journey"]
sec(A["slam"], A["threads"] + BAR * 0.5, chords=[AMADD9], pad=0.11, arp=0, drums=None)
sec(A["threads"], M["split"], chords=[F, C, Am, G], pad=0.07, arp=2, drums="soft", bass=1, glock=1)
sec(M["split"], A["fog"], chords=[Dm, Bb, "G2 Bb2 D3 G3", E], pad=0.09, arp=0, drums=None, bass=1)
sec(A["fog"], A["chart"], chords=["A2 E3 B3 C4"], pad=0.07, arp=0, drums="tick")
sec(A["chart"], M["divorce"] - 0.35, chords=[Am, F, C, G], pad=0.06, arp=4, drums="drive", bass=2)
sec(M["divorce"], M["drop"], chords=["A1 E2 Bb2"], pad=0.06, drums=None)
sec(M["drop"], S["bricks"] - 0.3, chords=[Dm, Am, Bb, F], pad=0.08, arp=1, drums="half", bass=1)
sec(S["bricks"] - 0.3, M["crumble"], chords=[C, G, Am, F], pad=0.07, arp=2, drums="drive", bass=2, glock=1)
sec(M["crumble"], A["stable"], chords=[Am, "A2 E3 A3"], pad=0.06, arp=1, drums=None)
sec(A["stable"], M["cut"], chords=[FMAJ9, G, Am, C], pad=0.11, arp=2, drums="build", bass=1)
sec(M["cut"], A["sand"], chords=["G2 Bb2 C#3 E3"], pad=0.07, drums=None)
sec(A["sand"], A["choice"], chords=[Am, Em, F, "E2 G#2 B2 D3"], pad=0.07, arp=1, drums="tick")
sec(A["choice"], A["compass"], chords=[Am, G, F, E], pad=0.08, arp=2, drums="drive", bass=2)
sec(A["compass"], J0, chords=[F, G, Am, C], pad=0.09, arp=4, drums="build", bass=1, glock=1)
sec(J0, M["pain0"], chords=[C, G, Am, F], pad=0.08, arp=4, drums="pop", bass=2, glock=1)
sec(M["pain0"], M["pain1"] + 0.3, chords=[Dm, "Bb2 D3 F3 Ab3"], pad=0.08, arp=2, drums="drive", bass=2)
sec(M["pain1"] + 0.3, M["silent"], chords=[F, G], pad=0.08, arp=2, drums="pop", bass=2)
sec(M["silent"], M["call"], chords=["A2 E3"], pad=0.04, arp=0, drums=None, sparse=1)
sec(M["call"], M["root"], chords=[F, G], pad=0.11, arp=4, drums="roll")
sec(M["root"], TOTAL + 1.5, chords=[FMAJ9, C, G, Am], pad=0.13, arp=4, drums="anthem", bass=2, glock=1)


def drum_hits(style, i, tb, t0, t1, b, drums):
    beat, sub = i // 4, i % 4
    k = (tb - t0) / max(1e-3, t1 - t0)
    if style == "soft":
        if sub == 0 and beat in (0, 2): drums.add(kick(0.32), tb)
        if sub == 0 and beat in (1, 3): drums.add(clap(0.12, i), tb, 0.1)
        if sub == 2: drums.add(shaker(0.05, i), tb, 0.4)
    elif style == "tick":
        if sub in (0, 2): drums.add(hat(0.035, seed=i), tb, 0.5)
        if sub == 0 and beat == 0: drums.add(kick(0.18), tb)
    elif style == "drive":
        if sub == 0: drums.add(kick(0.42), tb)
        if sub == 0 and beat in (1, 3): drums.add(snare(0.2, i), tb, -0.05)
        drums.add(hat(0.05 if sub % 2 == 0 else 0.03, seed=i + b), tb, 0.35)
    elif style == "half":
        if sub == 0 and beat == 0: drums.add(kick(0.4), tb)
        if sub == 0 and beat == 2: drums.add(snare(0.18, i), tb)
        if sub == 2: drums.add(hat(0.03, seed=i), tb, 0.4)
    elif style == "build":
        if sub == 0 and (beat % 2 == 0 or k > 0.5): drums.add(kick(0.3 + 0.2 * k), tb)
        if k > 0.35 and sub == 0 and beat in (1, 3): drums.add(snare(0.12 + 0.12 * k, i), tb)
        if sub == 2 and k > 0.2: drums.add(tom(98 if beat % 2 else 130, 0.12 + 0.1 * k), tb, -0.3 + 0.6 * (beat % 2))
        if k > 0.6: drums.add(hat(0.035, seed=i), tb, 0.4)
    elif style == "pop":
        if sub == 0 and beat in (0, 2): drums.add(kick(0.4), tb)
        if sub == 2 and beat == 1: drums.add(kick(0.25), tb)
        if sub == 0 and beat in (1, 3): drums.add(clap(0.2, i), tb)
        drums.add(shaker(0.05 if sub % 2 else 0.03, i + b), tb, 0.45)
    elif style == "roll":
        rate = 1 if k < 0.4 else 2 if k < 0.75 else 4
        if i % (4 // rate) == 0: drums.add(snare(0.06 + 0.22 * k, i), tb)
        if sub == 0: drums.add(kick(0.2 + 0.3 * k), tb)
    elif style == "anthem":
        if sub == 0: drums.add(kick(0.5), tb)
        if sub == 0 and beat in (1, 3): drums.add(snare(0.22, i), tb); drums.add(clap(0.15, i), tb)
        drums.add(hat(0.06 if sub == 2 else 0.03, open_=(sub == 2), seed=i + b), tb, 0.4)


def score():
    mus, drums = Bus(), Bus()
    for si, (t0, t1, p) in enumerate(SECTIONS):
        chords = p["chords"]
        first = np.ceil(t0 / BEAT - 1e-6) * BEAT
        nbars = max(1, int(np.ceil((t1 - first) / BAR)))
        for b in range(nbars):
            cs = first + b * BAR
            ce = min(t1, cs + BAR)
            cstart = t0 if b == 0 else cs
            fr = chord(chords[b % len(chords)])
            if ce - cstart > 0.1:
                L, R = strings(fr[1:] + [fr[-1] * 2], ce - cstart + 1.4, amp=p["pad"], attack=0.25 if b else 1.0, release=1.4, bright=1800 + 1400 * (p["pad"] > 0.09), seed=si * 31 + b)
                mus.add(L, cstart, -0.6); mus.add(R, cstart, 0.6)
            if p.get("arp"):
                step = {1: BEAT, 2: BEAT / 2, 4: BEAT / 4}[p["arp"]]
                notes = fr[1:] + [fr[1] * 2, fr[2] * 2]
                k, tt = 0, cs
                while tt < ce - 1e-3:
                    if tt >= t0:
                        mus.add(pluck(notes[(k * 2 + (k // 4)) % len(notes)] * 2, 0.5, amp=0.07 if p["arp"] < 4 else 0.05, bright=1.3), tt, 0.35 * np.sin(k * 1.3))
                    k += 1; tt += step
            if p.get("glock") and b % 2 == 0:
                for i, f in enumerate([fr[-1] * 4, fr[-2] * 4, fr[-1] * 4 * 1.122, fr[-3] * 4]):
                    tb = cs + i * BEAT
                    if t0 <= tb < ce:
                        mus.add(bell(f, 1.4, 0.035), tb, -0.3 + 0.2 * i)
            if p.get("bass"):
                root = fr[0] / (2 if fr[0] > 100 else 1)
                if p["bass"] == 1:
                    if cs >= t0:
                        mus.add(bass(root, min(BAR, ce - cs), 0.22), cs)
                else:
                    for i in range(8):
                        tb = cs + i * BEAT / 2
                        if t0 <= tb < ce:
                            mus.add(bass(root * (2 if i % 4 == 3 else 1), BEAT / 2 * 0.9, 0.16, cutoff=700), tb)
            if p.get("drums"):
                for i in range(16):
                    tb = cs + i * BEAT / 4
                    if t0 <= tb < ce:
                        drum_hits(p["drums"], i, tb, t0, t1, b, drums)
        if p.get("sparse"):
            for k, tt in enumerate(np.arange(t0 + 0.5, t1, 1.6)):
                mus.add(piano(chord("E5 C5 A4 B4 E4")[k % 5], 2.5, amp=0.08, decay=2.0, bright=0.8), tt, 0.2 * np.sin(k))
    return mus, drums


def sfx():
    fx = Bus()
    for j, e in enumerate(EV["events"]):
        t, k, d = e["t"], e["k"], e.get("d", 0.0)
        soft = e.get("soft") or e.get("quiet")
        if k == "riser":
            fx.add(riser(d, 0.22, j), t); fx.add(rev_cymbal(d, 0.18, j), t)
            for i, tt in enumerate(np.arange(0.2, d, 0.32)):
                fx.add(pluck(note_hz("A5") * (1.5 if i % 2 else 1), 0.3, 0.025), t + tt, 0.6 * np.sin(i))
        elif k == "strike":
            fx.add(impact(0.75, j), t); fx.add(thunder(2.5, 0.3, j), t + 0.05, -0.3)
        elif k == "slam":
            fx.add(impact(0.28 if soft else 0.55, j, big=not soft), t); fx.add(rev_cymbal(0.9, 0.15, j), t - 0.9)
        elif k == "boom":
            fx.add(impact(0.45, j, big=False), t)
        elif k == "drop":
            fx.add(impact(0.7, j), t)
        elif k == "crumble":
            fx.add(impact(0.5, j, big=False), t)
            r = np.random.default_rng(j)
            for tt in np.sort(r.uniform(0, d, 60)):
                fx.add(bell(1800 + 2400 * r.random(), 0.25, 0.012), t + tt, r.uniform(-0.8, 0.8))
        elif k in ("coins", "coin"):
            n = e.get("n", 1 if k == "coin" else 14)
            r = np.random.default_rng(j)
            for i in range(n):
                fx.add(bell(2400 + 1600 * r.random(), 0.35, 0.02 if soft else 0.035), t + ((i / n) * d if d else 0), r.uniform(-0.7, 0.7))
        elif k == "crackle":
            r = np.random.default_rng(j)
            for tt in np.sort(r.uniform(0, d, 30)):
                fx.add(hp(noise(0.03, int(tt * 1e4)), 1500) * np.exp(-t_(0.03) / 0.006) * 0.05, t + tt, r.uniform(-0.5, 0.5))
        elif k in ("swoosh", "whoosh", "transition"):
            dd = d or 0.8
            fx.add(whoosh(dd, 0.12 if k == "transition" else 0.2, j), t - dd * 0.4)
        elif k == "pop":
            fx.add(pluck(note_hz("E6"), 0.3, 0.05, 1.6), t, 0.2)
        elif k in ("chime", "card"):
            for i, n in enumerate(("E6", "B6") if k == "chime" else ("A5",)):
                fx.add(bell(note_hz(n), 1.6, 0.05), t + i * 0.09, -0.2 + 0.4 * i)
        elif k == "tick":
            fx.add(hat(0.04 if soft else 0.07, seed=j), t, 0.3)
        elif k == "shatter":
            r = np.random.default_rng(j)
            fx.add(hp(noise(0.6, j), 3000) * np.exp(-t_(0.6) / 0.15) * (0.12 if soft else 0.22), t)
            for tt in np.sort(r.uniform(0, 0.6, 20)):
                fx.add(bell(3000 + 3000 * r.random(), 0.3, 0.02), t + tt, r.uniform(-0.8, 0.8))
        elif k == "rumble":
            fx.add(thunder(d + 1.0, 0.35, j), t)
        elif k == "orb":
            fx.add(bell(note_hz("C6"), 1.2, 0.04), t, 0.3)
        elif k == "heartbeat":
            for tt in np.arange(0, d, 0.75):
                fx.add(heartbeat(0.32), t + tt)
        elif k == "flicker":
            for i, tt in enumerate(np.arange(0, d, 0.27)):
                fx.add(pluck(note_hz(("B5", "E6", "A5")[i % 3]), 0.2, 0.015, 2), t + tt, np.sin(i))
        elif k == "thunder":
            fx.add(thunder(d + 1.5, 0.28 if soft else 0.45, j), t, 0.2)
        elif k == "swell":
            fx.add(rev_cymbal(d, 0.12, j), t)
        elif k == "glitch":
            fx.add(np.concatenate([np.sign(np.sin(2 * np.pi * 220 * t_(0.04))) * 0.04, np.zeros(int(0.03 * SR))] * 3), t)
        elif k == "thud":
            fx.add(impact(0.25, j, big=False), t)
        elif k == "step":
            fx.add(piano(note_hz(("C4", "E4", "G4", "C5", "E5", "G5")[e["i"]]), 2.2, amp=0.09, decay=1.4, bright=1.1), t)
            fx.add(tom(80 + 12 * e["i"], 0.22), t)
        elif k == "sand":
            tt = t_(d)
            fx.add(hp(noise(d, j), 3000) * (0.015 if soft else 0.035) * np.minimum(1, tt / 0.4) * np.minimum(1, (d - tt) / 0.6), t, 0.4)
        elif k == "rewind":
            tt = t_(d)
            sweep = np.sin(2 * np.pi * np.cumsum(1200 * np.exp(-tt * 2.5) + 80) / SR)
            fx.add(0.08 * sweep * np.sin(np.pi * np.clip(tt / d, 0, 1)) + whoosh(d, 0.15, j), t)
        elif k == "pass":
            fx.add(whoosh(0.9, 0.06, j), t - 0.4, 0.5)
        elif k == "join":
            for i, n in enumerate(("C6", "E6", "A6")):
                fx.add(bell(note_hz(n), 1.8, 0.045), t + i * 0.12, -0.4 + 0.4 * i)
        elif k in ("shimmer", "sprinkle"):
            r = np.random.default_rng(j)
            for i in range(14):
                fx.add(bell(note_hz(("C6", "E6", "G6", "B6", "D7")[i % 5]), 0.9, 0.018), t + i * (d or 1) / 14, r.uniform(-0.8, 0.8))
        elif k == "wind":
            fx.add(whoosh(d, 0.3, j), t); fx.add(riser(min(d, 1.4), 0.12, j), t - 1.2)
        elif k == "pain":
            for i, n in enumerate(("D2", "Eb2")):
                fx.add(bass(note_hz(n), d + 0.6, 0.12, cutoff=2500), t + i * 0.03)
        elif k == "rain":
            tt = t_(d)
            env = np.minimum(1, tt / 1.2) * np.minimum(1, (d - tt) / 1.0) * 0.03
            fx.add(bp(noise(d, j), 2000, 9000) * env, t, -0.3); fx.add(bp(noise(d, j + 1), 2000, 9000) * env, t, 0.3)
        elif k == "root":
            fx.add(riser(d, 0.3, j), t); fx.add(rev_cymbal(d, 0.25, j), t)
        elif k == "final":
            fx.add(impact(0.9, j), t)
            L, R = strings(chord("F2 C3 F3 A3 C4 E4 G4 C5"), 9.0, amp=0.22, attack=0.05, release=4.0, bright=4200, seed=j)
            fx.add(L, t, -0.7); fx.add(R, t, 0.7)
            for i, n in enumerate(("F3", "C4", "A4", "E5", "G5", "C6")):
                fx.add(piano(note_hz(n), 6.0, amp=0.07, decay=4.0, bright=1.0), t + i * 0.08, -0.5 + 0.2 * i)
        elif k == "sprout":
            for i, n in enumerate(("G6", "C7")):
                fx.add(bell(note_hz(n), 1.6, 0.04), t + i * 0.14, 0.3)
    return fx


def stereo_room(L, R, seconds=2.4, wet=0.22):
    n = int(seconds * SR)
    out = []
    for ch, seed in ((L, 3), (R, 4)):
        r = np.random.default_rng(seed)
        ir = r.standard_normal(n) * np.exp(-np.arange(n) / SR / (seconds / 6.9))
        ir = np.convolve(ir, np.ones(24) / 24, mode="same"); ir /= np.sqrt((ir ** 2).sum())
        w = np.fft.irfft(np.fft.rfft(ch, len(ch) + n) * np.fft.rfft(ir, len(ch) + n))[: len(ch)]
        out.append(ch * (1 - wet) + w * wet * 2.2)
    return out


def voice():
    v = np.zeros(N)
    for ln in EV["lines"]:
        f = ROOT / "audio" / ln["file"]
        if not f.exists():
            print("missing", f.name); continue
        x = read_wav(f)
        k = int(ln["t0"] * SR); m = min(len(x), N - k)
        v[k:k + m] += x[:m]
    return v + 0.25 * hp(v, 3500) - 0.1 * lp(v, 150)   # a touch of presence, less mud


def main():
    v = voice()
    mus, drums = score()
    fx = sfx()
    mL, mR = stereo_room(mus.L, mus.R, 2.6, 0.3)
    fL, fR = stereo_room(fx.L, fx.R, 2.0, 0.18)
    env = envelope_follow(v)
    level = np.clip(env / (np.percentile(env, 95) + 1e-9), 0, 1)
    dm, dd, df = 10 ** (-14 * level / 20), 10 ** (-10 * level / 20), 10 ** (-6 * level / 20)
    tt = np.arange(N) / SR
    hush = 1 - 0.75 * np.clip((tt - M["silent"]) / 1.5, 0, 1) * (1 - np.clip((tt - M["call"]) / 1.0, 0, 1))
    gm, gd, gf = 0.17, 0.15, 0.32
    L = v + (mL * dm * gm + drums.L * dd * gd) * hush + fL * df * gf
    R = v + (mR * dm * gm + drums.R * dd * gd) * hush + fR * df * gf
    k = int(1.4 * SR)
    fade = np.ones(N); fade[N - k:] = np.linspace(1, 0, k)
    L *= fade; R *= fade
    peak = max(np.abs(L).max(), np.abs(R).max())
    L, R = L * 0.9 / peak, R * 0.9 / peak
    raw = ROOT / "audio" / "mix_raw.wav"
    with wave.open(str(raw), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(np.stack([L, R], 1), -1, 1) * 32767).astype(np.int16).tobytes())
    comp = ROOT / "audio" / "mix_comp.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-af", "acompressor=threshold=-20dB:ratio=2.5:attack=5:release=120:makeup=1", str(comp)], check=True)
    out = ROOT / "audio" / "final.wav"

    def integrated(path):
        e = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
        return float(e[e.rindex("Summary:"):].split("I:")[1].split("LUFS")[0])
    gain = -14.0 - integrated(comp)
    for _ in range(3):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(comp), "-af", f"volume={gain:.2f}dB,alimiter=limit=0.84:attack=1:release=60:level=false,aresample=48000", str(out)], check=True)
        got = integrated(out)
        if abs(got + 14.0) < 0.25:
            break
        gain += -14.0 - got
    print(f"integrated {got:.1f} LUFS (gain {gain:+.1f} dB)")


if __name__ == "__main__":
    main()

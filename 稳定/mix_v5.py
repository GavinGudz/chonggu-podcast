"""v5 score: the v4 score plus motion you can hear.  Wind that follows the camera's speed, a soft walking pulse,
sounds for the dust rising, the fly-through, the counter rewinding and the things that start to orbit.
Events come from page/v5.js (node render.mjs --page v5.html --events data/events_v5.json)."""
from __future__ import annotations
import json, subprocess, sys, wave
from pathlib import Path
import numpy as np
ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT.parent / "extras" / "chonggu_intro"))
from music import SR, envelope_follow, note_hz, piano  # noqa: E402
import mix as M  # instruments: strings, bell, pluck, impact, riser, rev_cymbal, whoosh, heartbeat, hp, lp, noise, t_, stereo_room, Bus

EV = json.loads((ROOT / "data" / "events_v5.json").read_text())
END = float(sys.argv[1]) if len(sys.argv) > 1 else EV["total"]
N = int((END + 1.0) * SR)
mk = EV["marks"]


class Bus:
    def __init__(self): self.L = np.zeros(N); self.R = np.zeros(N)
    def add(self, sig, at, pan=0.0, gain=1.0):
        k = int(at * SR)
        if k >= N: return
        m = min(len(sig), N - k); gl, gr = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
        self.L[k:k + m] += sig[:m] * gain * gl; self.R[k:k + m] += sig[:m] * gain * gr


def ch(s): return [note_hz(n) for n in s.split()]


def pad(bus, t, dur, names, amp=0.06, bright=1500, seed=0, attack=0.8, release=1.2, width=0.55):
    L_, R_ = M.strings(ch(names), dur, amp=amp, attack=attack, release=release, bright=bright, seed=seed)
    bus.add(L_, t, -width); bus.add(R_, t, width)


def pn(bus, t, name, amp=0.07, dur=2.4, decay=1.8, bright=0.8, pan=0.0):
    bus.add(piano(note_hz(name), dur, amp=amp, decay=decay, bright=bright), t, pan)


def progression(bus, t0, t1, prog, bar, pad_amp=0.06, arp_amp=0.07, bright=1600, seed=0):
    """Chords (pad) with a piano figure spread evenly over each bar, from t0 until t1."""
    t, k = t0, 0
    while t < t1 - 0.2:
        p, a = prog[k % len(prog)]
        pad(bus, t, min(bar + 1.2, t1 - t + 1.0), p, pad_amp, bright, seed + k)
        notes = a.split()
        for j, n in enumerate(notes):
            tt = t + j * bar / len(notes)
            if n != "." and tt < t1 - 0.1: pn(bus, tt, n, arp_amp, pan=0.3 * np.sin(j + k))
        t += bar; k += 1


def pulse(bus, t0, t1, period, amp=0.16, cut=140, hat=0.0):
    t = t0
    while t < t1:
        bus.add(M.lp(M.kick(amp), cut), t)
        if hat: bus.add(M.hat(hat, seed=int(t * 10)), t + period / 2, 0.25)
        t += period


def score():
    mus = Bus()
    # 0  opening: a low drone that swells toward the break; the title chord
    d = mk["snap"]
    L_, R_ = M.strings(ch("A1 E2 A2"), d + 0.3, amp=0.10, attack=d * 0.8, release=0.3, bright=900)
    mus.add(L_, 0.0, -0.5); mus.add(R_, 0.0, 0.5)
    pad(mus, mk["title"], 5.0, "A2 E3 A3 C4 E4 B4", 0.14, 2600, 3, 0.6, 2.6, 0.6)
    for i, n in enumerate(("A2", "E3", "C4", "B4")): pn(mus, mk["title"] + 1.1 + i * 0.07, n, 0.09, 4.0, 3.0, 0.9, -0.3 + 0.2 * i)
    # 1  together: felt piano A minor -> F -> C -> G
    progression(mus, mk["t0"], mk["split"], [("A2 E3 C4", "A4 C5 E5 B4"), ("F2 C3 A3", "A4 C5 F5 E5"), ("C3 G3 E4", "G4 C5 E5 D5"), ("G2 D3 B3", "G4 B4 D5 A4")], 2.4, seed=10)
    pulse(mus, mk["t0"], mk["split"], 1.2)
    # 2  apart; what it pulls on; money
    progression(mus, mk["split"], mk["f1"] - 0.5, [("D3 F3 A3", "D5 . A4 ."), ("Bb2 D3 F3", "F5 . D5 ."), ("G2 Bb2 D3", "D5 . Bb4 ."), ("A2 C#3 E3", "E5 . C#5 .")], 3.0, 0.07, 0.06, 1300, 30)
    pad(mus, mk["money2"], mk["f1"] - mk["money2"] + 1.0, "D1 A1 D2", 0.12, 500, 41, 0.3, 1.5)
    # 3  fog: an airy cluster, nothing to hold on to
    pad(mus, mk["f1"] - 0.6, mk["chart"] - mk["f1"] + 1.2, "A3 B3 E4 F4 B4", 0.05, 3200, 50, 1.5, 1.5, 0.8)
    r = np.random.default_rng(3)
    for tt in np.arange(mk["f1"], mk["chart"], 0.7): mus.add(M.bell(r.uniform(1800, 4200), 1.2, 0.008), tt + r.uniform(0, 0.4), r.uniform(-0.8, 0.8))
    # 4  the chart: a clock, then the months adding up
    pad(mus, mk["chart"] - 0.3, mk["savings"] - mk["chart"] + 1.0, "A2 E3 G3 B3 D4", 0.06, 1800, 60, 1.2, 1.0)
    for tt in np.arange(mk["chart"], mk["savings"], 0.6): mus.add(M.pluck(note_hz("E5" if int((tt - mk["chart"]) / 0.6) % 2 else "A5"), 0.3, 0.025, 0.7), tt, 0.3)
    progression(mus, mk["savings"], mk["div"], [("A2 E3 C4", "A4 C5 E5 A5 E5 C5 B4 C5"), ("C3 G3 E4", "C5 E5 G5 C6 G5 E5 D5 E5"), ("F2 C3 A3", "A4 C5 F5 A5 F5 C5 B4 C5"), ("G2 D3 B3", "B4 D5 G5 B5 G5 D5 C5 D5")], 2.4, 0.06, 0.045, 2000, 70)
    pulse(mus, mk["savings"], mk["div"], 0.6, 0.12, 140, 0.02)
    # 5  divorce, the chunks breaking off, saving again
    progression(mus, mk["div"], mk["again"] - 0.2, [("D2 A2 D3 F3", "D4 . . ."), ("Bb1 F2 Bb2 D3", "F4 . . .")], 3.0, 0.08, 0.06, 1100, 80)
    progression(mus, mk["again"] - 0.2, mk["b1"] - 0.3, [("D3 F3 A3", "A4 D5 F5 E5"), ("F2 C3 A3", "A4 C5 F5 C5"), ("C3 G3 E4", "G4 C5 E5 D5"), ("A2 E3 C4", "A4 C5 E5 C5")], 2.8, 0.06, 0.06, 1500, 90)
    # 6  looking back over the months; the fall; how many years
    progression(mus, mk["b1"] - 0.3, mk["w1"] - 0.8, [("A2 E3 C4", "E5 . C5 ."), ("E2 B2 G3", "D5 . B4 ."), ("F2 C3 A3", "C5 . A4 ."), ("C3 G3 E4", "E5 . G5 .")], 3.2, 0.06, 0.065, 1400, 100)
    # 7  “稳定”: one warm chord; then the stairs climb and a city grows
    pad(mus, mk["w1"] - 0.8, 5.5, "C2 G2 C3 G3 E4 D5", 0.12, 2400, 110, 1.2, 2.5, 0.7)
    for i, n in enumerate(("C4", "G4", "E5", "D5")): pn(mus, mk["want"] + 0.5 + i * 0.09, n, 0.08, 4.0, 3.0, 0.9, -0.3 + 0.2 * i)
    progression(mus, mk["base"] - 0.6, mk["interrupt"], [("C3 G3 E4", "C5 E5 G5 E5"), ("G2 D3 B3", "B4 D5 G5 D5"), ("A2 E3 C4", "C5 E5 A5 E5"), ("F2 C3 A3", "A4 C5 F5 C5")], 2.4, 0.07, 0.05, 2200, 120)
    pulse(mus, mk["base"] - 0.6, mk["interrupt"], 1.2)
    # 8  the crack that hasn't happened yet; fear; crumbling
    pad(mus, mk["interrupt"], mk["u1"] - mk["interrupt"] + 1.0, "B2 F3 C4", 0.06, 900, 130, 0.4, 1.5)
    progression(mus, mk["u1"], mk["restart"] - 0.1, [("A2 E3 C4", "E5 . . ."), ("F2 C3 E3", "C5 . . ."), ("D2 A2 F3", "A4 . . ."), ("E2 B2 G#3", "B4 . . .")], 3.6, 0.05, 0.05, 1100, 140)
    # 9  the second time: a decision, a ring that blows up, side by side
    progression(mus, mk["TR1"] + 0.3, mk["d1"] - 0.5, [("A2 E3 A3", "A4 E5 A4 E5"), ("G2 D3 G3", "G4 D5 G4 D5"), ("F2 C3 F3", "F4 C5 F4 C5"), ("E2 B2 E3", "E4 B4 G#4 B4")], 2.4, 0.07, 0.05, 1700, 150)
    pulse(mus, mk["TR1"] + 0.3, mk["d1"] - 0.5, 0.6, 0.12, 120)
    # 10 the stars: who I want to become; strategy, tactics, action
    pad(mus, mk["d1"] - 0.5, mk["t1"] - mk["d1"] + 0.8, "D3 A3 E4 A4", 0.08, 2600, 160, 2.0, 1.5, 0.8)
    for i, tt in enumerate(np.arange(mk["d1"] + 1.0, mk["t1"] - 0.5, 0.5)): mus.add(M.bell(note_hz(["A5", "E6", "D6", "F#6", "E6", "B5", "A5", "C#6"][i % 8]), 1.6, 0.012), tt, 0.5 * np.sin(i))
    pad(mus, mk["serve"] - 0.3, 3.5, "D2 A2 D3 F#3 A3 E4", 0.1, 2400, 165, 0.8, 1.6, 0.7)
    # 11 meeting people, TA, sweetness: lighter, a little pop
    progression(mus, mk["t1"] - 0.3, mk["spice"] - 0.4, [("C3 G3 E4", "C5 E5 G5 E5 D5 E5 G5 E5"), ("G2 D3 B3", "B4 D5 G5 D5 C5 D5 G5 D5"), ("A2 E3 C4", "C5 E5 A5 E5 D5 E5 A5 E5"), ("F2 C3 A3", "A4 C5 F5 C5 B4 C5 F5 C5")], 2.4, 0.06, 0.04, 2400, 170)
    pulse(mus, mk["t1"] - 0.3, mk["pain"] - 0.6, 0.6, 0.11, 150, 0.025)
    progression(mus, mk["spice"] - 0.4, mk["pain"] - 0.6, [("F2 C3 A3", "A4 C5 F5 A5 F5 C5 A4 C5"), ("C3 G3 E4", "G4 C5 E5 G5 E5 C5 G4 C5"), ("D3 A3 F4", "A4 D5 F5 A5 F5 D5 A4 D5"), ("Bb2 F3 D4", "Bb4 D5 F5 Bb5 F5 D5 Bb4 D5")], 2.4, 0.07, 0.045, 2600, 180)
    # 12 pain
    progression(mus, mk["pain"] - 0.6, mk["r1"] - 0.3, [("A2 E3 B3 C4", "E5 . F5 ."), ("F2 C3 F#3 A3", "C5 . B4 .")], 2.4, 0.08, 0.06, 1200, 190)
    # 13 silence: a single note now and then
    pad(mus, mk["r1"] - 0.3, mk["root"] - mk["r1"] - 0.8, "A1 E2", 0.05, 500, 200, 2.0, 1.0)
    for i, tt in enumerate(np.arange(mk["r1"] + 0.5, mk["root"] - 1.8, 2.8)): pn(mus, tt, ["E5", "C5", "A4", "B4"][i % 4], 0.05, 3.0, 2.6, 0.6, 0.2 * np.sin(i))
    # 14 taking root, and the morning
    pad(mus, mk["root"] - 1.4, 1.6, "C2 G2", 0.08, 400, 210, 1.3, 0.3)
    pad(mus, mk["root"], 6.0, "C2 C3 G3 E4 G4 D5", 0.16, 2600, 211, 0.15, 3.0, 0.7)
    for i, n in enumerate(("C3", "G3", "E4", "D5", "G5")): pn(mus, mk["root"] + i * 0.06, n, 0.1, 5.0, 3.6, 1.0, -0.4 + 0.2 * i)
    pad(mus, mk["root"] + 3.0, END - mk["root"] - 2.5, "F2 C3 A3 E4 G4", 0.08, 2200, 212, 1.5, 2.0, 0.7)
    for i, n in enumerate(("A5", "E5", "G5", "C6", "E6")): mus.add(M.bell(note_hz(n), 2.4, 0.016), mk["root"] + 3.5 + i * 0.7, -0.5 + 0.25 * i)
    return mus


def wind():
    """Air rushing past, louder and brighter the faster the camera moves."""
    sp = EV["speed"]; v = np.interp(np.arange(N) / SR, np.arange(len(sp["v"])) * sp["dt"], sp["v"])
    g = np.clip(v / 24, 0, 1)
    out = []
    for seed in (77, 78):
        air = M.bp(M.noise(N / SR, seed), 600, 5200); rum = M.lp(M.noise(N / SR, seed + 10), 240)
        out.append(air * (0.012 + 0.42 * g ** 1.6) + rum * (0.04 + 0.45 * g))
    return out


def sfx():
    fx = Bus()
    for j, e in enumerate(EV["events"]):
        t, k, d = e["t"], e["k"], e.get("d", 0.0)
        if t > END: continue
        if k == "heartbeat":
            for tt in np.arange(0.15, d, 0.86): fx.add(M.heartbeat(0.42), t + tt)
        elif k == "ticks":   # the day counter racing, faster and faster
            tt = 0.0
            while tt < d:
                fx.add(M.hat(0.03 + 0.03 * tt / d, seed=int(tt * 100)), t + tt, 0.3)
                tt += 0.11 * (1 - 0.75 * tt / d)
        elif k == "snap":
            crack = M.hp(M.noise(0.25, 7), 2500) * np.exp(-M.t_(0.25) / 0.03) * 0.6
            fx.add(crack, t); fx.add(M.impact(0.55, j, big=False), t + 0.01)
            for i in range(6): fx.add(M.bell(2600 + 900 * i, 0.5, 0.012), t + 0.02 * i, -0.6 + 0.25 * i)
        elif k == "swell": fx.add(M.rev_cymbal(d, 0.12, j), t)
        elif k == "title": fx.add(M.impact(0.22, j, big=True), t - 0.05)
        elif k == "chime":
            for i, n in enumerate(("E6", "B6")): fx.add(M.bell(note_hz(n), 1.8, 0.04), t + i * 0.11, -0.2 + 0.4 * i)
        elif k == "tick": fx.add(M.hat(0.04, seed=j), t, 0.3)
        elif k == "split":
            fx.add(M.impact(0.4, j, big=False), t); fx.add(M.hp(M.noise(0.2, j), 3000) * np.exp(-M.t_(0.2) / 0.03) * 0.3, t)
        elif k == "ripple": fx.add(M.rev_cymbal(0.8, 0.08, j), t - 0.8); fx.add(M.whoosh(d, 0.08, j), t)
        elif k == "rise":   # the dust lifting: a riser with sparkles
            fx.add(M.riser(d, 0.08, j), t)
            r = np.random.default_rng(5)
            for i in range(16): fx.add(M.bell(r.uniform(2200, 5200), 0.6, 0.007), t + r.uniform(0, d), r.uniform(-0.8, 0.8))
        elif k == "thru":
            fx.add(M.whoosh(0.8, 0.22, j), t - 0.62); fx.add(M.impact(0.26, j, big=True), t)
        elif k == "rewind": fx.add(M.riser(d, 0.12, j)[::-1].copy(), t, 0.1)
        elif k == "arrive":
            fx.add(M.whoosh(0.6, 0.07, j), t - 0.5, [-0.5, 0.5, 0.2][e["i"]])
            fx.add(M.pluck(note_hz(["E5", "C5", "A4"][e["i"]]), 1.2, 0.06, 0.9), t, 0.2)
        elif k == "swoosh": fx.add(M.whoosh(d, 0.12, j), t)
        elif k == "column":
            fx.add(M.lp(M.kick(0.3), 200), t)
            for i, n in enumerate(("C5", "E5", "A5")): fx.add(M.bell(note_hz(n), 1.4, 0.02), t + i * 0.05, -0.3 + 0.3 * i)
        elif k == "drop":
            fx.add(M.hp(M.noise(0.2, j), 2500) * np.exp(-M.t_(0.2) / 0.03) * 0.35, t); fx.add(M.impact(0.3, j, big=False), t + 0.45)
            fx.add(M.pluck(note_hz(["A3", "F3", "D3"][e["i"]]), 1.0, 0.06, 0.6), t, -0.2)
        elif k == "fall": fx.add(M.whoosh(0.6, 0.12, j), t - 0.1); fx.add(M.impact(0.4, j, big=False), t + 0.45)
        elif k == "gather":
            fx.add(M.rev_cymbal(d, 0.08, j), t)
            r = np.random.default_rng(j)
            for i in range(14): fx.add(M.bell(r.uniform(2400, 5600), 0.6, 0.006), t + r.uniform(0, d), r.uniform(-0.8, 0.8))
        elif k == "build": fx.add(M.riser(d, 0.05, j), t)
        elif k == "step": fx.add(M.pluck(note_hz(["C4", "D4", "E4", "G4", "A4", "C5", "D5", "E5", "G5", "A5", "C6", "D6", "E6", "G6"][min(13, e["k"])]), 0.9, 0.04, 0.8), t, 0.15)
        elif k == "crack":
            fx.add(M.hp(M.noise(0.3, j), 3000) * np.exp(-M.t_(0.3) / 0.04) * 0.3, t)
            for i, n in enumerate(("B5", "C6")): fx.add(M.bell(note_hz(n), 1.4, 0.02), t + i * 0.04, -0.2 + 0.4 * i)
        elif k == "heart":
            for tt in np.arange(0.0, d, 0.86): fx.add(M.heartbeat(0.36), t + tt)
        elif k == "land": fx.add(M.impact(0.22, j, big=False), t); fx.add(M.bell(note_hz("A5"), 1.6, 0.02), t + 0.05)
        elif k == "boom":
            fx.add(M.impact(0.65, j, big=True), t); fx.add(M.thunder(2.2, 0.25, j), t + 0.05)
            fx.add(M.hp(M.noise(0.25, j), 2500) * np.exp(-M.t_(0.25) / 0.03) * 0.5, t)
        elif k == "stars":
            r = np.random.default_rng(j)
            for i in range(16): fx.add(M.bell(r.uniform(2600, 6000), 0.9, 0.006), t + r.uniform(0, d), r.uniform(-0.9, 0.9))
        elif k == "beam":
            fx.add(M.whoosh(0.5, 0.05, j), t - 0.2)
            for i, n in enumerate(("D5", "A5", "E6")): fx.add(M.bell(note_hz(n), 2.0, 0.018), t + i * 0.07, -0.4 + 0.4 * i)
        elif k == "swell2": fx.add(M.rev_cymbal(d, 0.1, j), t - d + 0.2)
        elif k == "sparkle":
            r = np.random.default_rng(j)
            for i in range(int(8 * d)): fx.add(M.bell(r.uniform(2200, 5200), 0.7, 0.007), t + r.uniform(0, d), r.uniform(-0.9, 0.9))
        elif k == "thorns":
            r = np.random.default_rng(j)
            for i in range(10):
                tt, pan = t + r.uniform(0, d), r.uniform(-0.8, 0.8)
                fx.add(M.bell(r.uniform(700, 1400), 0.5, 0.015), tt, pan); fx.add(M.hp(M.noise(0.05, i), 4000) * np.exp(-M.t_(0.05) / 0.01) * 0.05, tt, pan)
        elif k == "rain":
            n = int(d * SR); env = np.clip(np.minimum(np.arange(n) / (1.5 * SR), (n - np.arange(n)) / (1.0 * SR)), 0, 1)
            fx.add(M.bp(M.noise(d, 91), 1200, 7000) * env * 0.035, t, -0.3); fx.add(M.bp(M.noise(d, 92), 1200, 7000) * env * 0.035, t, 0.3)
        elif k == "dive": fx.add(M.rev_cymbal(d, 0.12, j), t); fx.add(M.whoosh(d, 0.1, j), t)
        elif k == "root": fx.add(M.impact(0.5, j, big=True), t)
        elif k == "rethink":
            for i, n in enumerate(("E6", "F6", "B6")): fx.add(M.bell(note_hz(n), 1.6, 0.018), t + i * 0.09, -0.4 + 0.4 * i)
    return fx


def main():
    v = np.zeros(N)
    for ln in EV["lines"]:
        if ln["t0"] > END: continue
        x = M.read_wav(ROOT / "audio" / ln["file"]); k = int(ln["t0"] * SR); m = min(len(x), N - k); v[k:k + m] += x[:m]
    v = v + 0.25 * M.hp(v, 3500) - 0.1 * M.lp(v, 150)
    mus, fx = score(), sfx()
    wL, wR = wind(); fx.L += wL; fx.R += wR
    mL, mR = M.stereo_room(mus.L, mus.R, 2.8, 0.32); fL, fR = M.stereo_room(fx.L, fx.R, 2.0, 0.2)
    env = envelope_follow(v); lv = np.clip(env / (np.percentile(env, 95) + 1e-9), 0, 1)
    dm, df = 10 ** (-12 * lv / 20), 10 ** (-5 * lv / 20)
    L = v + mL * dm * 0.42 + fL * df * 0.5; R = v + mR * dm * 0.42 + fR * df * 0.5
    fade = np.ones(N); k0 = min(N, int((END - 1.0) * SR)); fade[k0:] = np.linspace(1, 0, N - k0) ** 1.5; L *= fade; R *= fade
    pk = max(np.abs(L).max(), np.abs(R).max()); L, R = L * 0.9 / pk, R * 0.9 / pk
    raw = ROOT / "audio" / "v5_raw.wav"
    with wave.open(str(raw), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(np.stack([L, R], 1), -1, 1) * 32767).astype(np.int16).tobytes())
    out = ROOT / "audio" / "v5_final.wav"
    e = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(raw), "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    I = float(e[e.rindex("Summary:"):].split("I:")[1].split("LUFS")[0])
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-af", f"volume={-14 - I:.2f}dB,alimiter=limit=0.84:attack=1:release=60:level=false", str(out)], check=True)
    print("->", out, f"(gain {-14 - I:+.1f} dB)")


if __name__ == "__main__":
    main()

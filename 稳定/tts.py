"""Narration in 顾东政's cloned voice.

F5-TTS (zero-shot) clones the voice from one ~10 s clip of his episode-4 recording (voice/ref_*.wav,
cut from work/src48.wav).  Each line of script.json is synthesized on its own, trimmed, and checked
with whisper: if the recognized text drifts too far from the script the line is regenerated with
another seed.  Whisper's timestamps also give every character a time, which the picture uses as
anchors.

    .venv-tts/bin/python tts.py            # only lines whose text/ref/seed changed
    .venv-tts/bin/python tts.py --force    # everything
-> audio/line_XX.wav (48 kHz mono), data/timeline.json, data/asr.json
"""
from __future__ import annotations

import difflib
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).parent
LEAD_IN = 6.2      # wordless opening: coins, lightning, the title
TAIL = 7.5         # the roots grow after the last line
MAX_RATE = 5.0     # characters per second; he talks at about 4.3
TARGET_RATE = 4.4
MAX_CER = 0.0      # every syllable of the script must be heard; otherwise regenerate
TRIES = 3

PUNCT = re.compile(r"[\s，。、？！：；——…“”‘’（）,.?!:;()\-]")


def norm(s: str) -> str:
    return PUNCT.sub("", s)


def cn_num(n: int) -> str:
    d = "零一二三四五六七八九"
    if n < 10:
        return d[n]
    if n < 100:
        return ("" if n // 10 == 1 else d[n // 10]) + "十" + ("" if n % 10 == 0 else d[n % 10])
    return str(n)


def cer(ref: str, hyp: str) -> float:
    """Error rate on toneless pinyin, so homophones (故东正 for 顾东政, 叫做 for 叫作) don't count."""
    from pypinyin import lazy_pinyin
    hyp = re.sub(r"\d+", lambda m: cn_num(int(m.group())), hyp)   # whisper writes 三十 as 30
    a, b = lazy_pinyin(norm(ref)), lazy_pinyin(norm(hyp))
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    same = sum(m.size for m in sm.get_matching_blocks())
    return ((len(a) - same) + (len(b) - same)) / max(1, len(a))   # missing and extra syllables both count


def trim(src: Path, dst: Path):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-af",
                    "silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.03,areverse,"
                    "silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.06,areverse,"
                    "afade=t=in:d=0.015",
                    "-ar", "48000", "-ac", "1", str(dst)], check=True)


def duration(path: Path) -> float:
    info = sf.info(str(path))
    return info.frames / info.samplerate


_whisper = None


def asr(path: Path) -> dict:
    import mlx_whisper
    r = mlx_whisper.transcribe(str(path), path_or_hf_repo="mlx-community/whisper-large-v3-turbo", language="zh",
                               word_timestamps=True, initial_prompt="以下是普通话的句子。", condition_on_previous_text=False)
    words = [{"w": w["word"].strip(), "t0": w["start"], "t1": w["end"]} for s in r["segments"] for w in s.get("words", [])]
    return {"text": "".join(w["w"] for w in words) or r["text"], "words": words}


def char_times(text: str, said: str, a: dict, dur: float) -> list[float]:
    """A start time for every character of `text` (display text).  `said` is what was synthesized
    (digits spelled out etc.); whisper's words give times for the characters it recognized, the rest
    are interpolated."""
    # whisper chars with times (spread each word's span over its characters)
    hc, ht = [], []
    for w in a["words"]:
        cs = norm(w["w"])
        for k, c in enumerate(cs):
            hc.append(c)
            ht.append(w["t0"] + (w["t1"] - w["t0"]) * k / max(1, len(cs)))
    s_chars = [c for c in said]
    s_idx = [i for i, c in enumerate(s_chars) if norm(c)]
    s_norm = "".join(s_chars[i] for i in s_idx)
    t_said = [None] * len(s_chars)
    sm = difflib.SequenceMatcher(None, s_norm, "".join(hc), autojunk=False)
    for m in sm.get_matching_blocks():
        for k in range(m.size):
            t_said[s_idx[m.a + k]] = ht[m.b + k]
    # proportional fallback weights: punctuation is a pause
    weights = [0.0 if not norm(c) else 1.0 for c in s_chars]
    for i, c in enumerate(s_chars):
        if c in "，、：；":
            weights[i] = 1.6
        elif c in "。？！":
            weights[i] = 2.4
    cum = np.concatenate([[0], np.cumsum(weights)])
    prop = [dur * cum[i] / cum[-1] for i in range(len(s_chars))]
    known = [(i, t) for i, t in enumerate(t_said) if t is not None]
    if len(known) < 2:
        t_said = prop
    else:
        # monotone, interpolated in the proportional domain
        xs = [prop[i] for i, _ in known]
        ys = list(np.maximum.accumulate([t for _, t in known]))
        t_said = list(np.interp(prop, xs, ys, left=None, right=None))
        for i in range(len(t_said)):
            if prop[i] < xs[0]:
                t_said[i] = max(0.0, ys[0] - (xs[0] - prop[i]))
            elif prop[i] > xs[-1]:
                t_said[i] = min(dur, ys[-1] + (prop[i] - xs[-1]))
    # display text -> said text
    out = [None] * len(text)
    sm = difflib.SequenceMatcher(None, text, said, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        for k in range(i2 - i1):
            j = j1 + (k * (j2 - j1)) // max(1, i2 - i1) if j2 > j1 else max(0, j1 - 1)
            out[i1 + k] = t_said[min(j, len(t_said) - 1)]
    return [round(float(x), 3) for x in out]


def main():
    force = "--force" in sys.argv
    spec = json.loads((ROOT / "script.json").read_text())
    adir, ddir = ROOT / "audio", ROOT / "data"
    adir.mkdir(exist_ok=True); ddir.mkdir(exist_ok=True)
    cache_p = ddir / "asr.json"
    cache = json.loads(cache_p.read_text()) if cache_p.exists() and not force else {}
    ref, ref_text = str(ROOT / spec["ref"]), spec["ref_text"]
    REFS = json.loads((ROOT / spec["refs"]).read_text()) if spec.get("refs") else {}
    speed = spec.get("speed", 1.0)
    tts = None
    for i, ln in enumerate(spec["lines"]):
        said = ln.get("tts", ln["text"])
        ref_f, ref_t = (str(ROOT / REFS[ln["mood"]]["file"]), REFS[ln["mood"]]["text"]) if ln.get("mood") else (ref, ref_text)
        key = json.dumps([said, ref_f, ref_t, ln.get("speed", speed), ln.get("seed", 0)], ensure_ascii=False)
        wav = adir / f"line_{i:02d}.wav"
        if cache.get(ln["id"], {}).get("key") == key and wav.exists():
            continue
        if tts is None:
            from f5_tts.api import F5TTS
            tts = F5TTS()
        best = None
        for k in range(TRIES):
            seed = ln.get("seed", 0) * 100 + 11 + k * 7
            y, sr, _ = tts.infer(ref_f, ref_t, said, seed=seed, speed=ln.get("speed", speed), nfe_step=32,
                                 show_info=lambda *a: None)
            raw = adir / f"_raw_{i:02d}_{k}.wav"
            sf.write(raw, y, sr)
            out = adir / f"_try_{i:02d}_{k}.wav"
            trim(raw, out)
            raw.unlink()
            a = asr(out)
            e = cer(said, a["text"])
            print(f"{i:02d} try {k} seed {seed} cer {e:.2f}  {a['text']}", flush=True)
            if best is None or e < best[0]:
                best = (e, out, a, seed)
            if e <= MAX_CER:
                break
        e, out, a, seed = best
        rate = len(norm(said)) / duration(out)
        if rate > MAX_RATE:   # rushed: one more go, slowed to his natural pace
            sp2 = ln.get("speed", speed) * TARGET_RATE / rate   # F5: lower speed = slower
            y, sr, _ = tts.infer(ref_f, ref_t, said, seed=seed, speed=sp2, nfe_step=32, show_info=lambda *a: None)
            raw = adir / f"_raw_{i:02d}_slow.wav"; sf.write(raw, y, sr)
            out2 = adir / f"_try_{i:02d}_slow.wav"; trim(raw, out2); raw.unlink()
            a2 = asr(out2); e2 = cer(said, a2["text"])
            print(f"{i:02d} slowed {rate:.1f} c/s -> speed {sp2:.2f}: {len(norm(said)) / duration(out2):.1f} c/s cer {e2:.2f}  {a2['text']}", flush=True)
            if e2 <= e + 0.04 and len(norm(said)) / duration(out2) < rate:
                e, out, a = e2, out2, a2
        out.replace(wav)
        for f in list(adir.glob(f"_try_{i:02d}_*.wav")):
            f.unlink()
        cache[ln["id"]] = {"key": key, "cer": round(e, 3), "seed": seed, "heard": a["text"], "words": a["words"]}
        cache_p.write_text(json.dumps(cache, ensure_ascii=False, indent=1))
    # timeline
    t = LEAD_IN
    lines = []
    for i, ln in enumerate(spec["lines"]):
        wav = adir / f"line_{i:02d}.wav"
        d = duration(wav)
        said = ln.get("tts", ln["text"])
        ct = char_times(ln["text"], said, cache[ln["id"]], d)
        lines.append({"id": ln["id"], "scene": ln["scene"], "text": ln["text"], "i": i, "file": wav.name,
                      "t0": round(t, 3), "t1": round(t + d, 3), "chars": [round(t + x, 3) for x in ct],
                      "cer": cache[ln["id"]]["cer"]})
        print(f"{i:02d} {t:7.2f}-{t + d:7.2f} cer {cache[ln['id']]['cer']:.2f}  {ln['text']}")
        t += d + ln.get("gap", spec["gap"])
    total = lines[-1]["t1"] + TAIL
    (ddir / "timeline.json").write_text(json.dumps({"total": round(total, 3), "lead": LEAD_IN, "lines": lines}, ensure_ascii=False, indent=1))
    print(f"total {total:.2f} s")


if __name__ == "__main__":
    main()

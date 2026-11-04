"""口播的三道命令：voice（录音 → 整条口播）、check-voice（整句核对）、timeline（按口播重排时间线）。
python -m chonggu voice [--force] [--from 步骤] [--no-denoise]
  prep 解码、切低频、降噪 → asr 整段听写 → select 每小句挑最后一遍 → assemble 拼原始口播 → audit 查接缝 → seams 定静音
  → chunks 拆段查重念【门槛：查出来的重念都听过了】→ chain 人声链 → mute 接缝换成静音、前后逐字比【门槛：没有新少的字】
  → lines 每句收停顿、提速 → narration 整条口播【门槛：voice/flags.tsv 没有 open】
  每一步的输入没变就跳过（voice/.stamps.json）；听写按声音内容缓存，改了一句只重听这一句。
python -m chonggu check-voice [--only 句id,句id]    整条口播逐句听写、和字幕比【门槛：flags.tsv 没有 open】
python -m chonggu timeline                          按 narration.wav 重排 timeline.json（逐字时刻、章节、呼吸点）

人要改的三个文件（都在 voice/ 里）：
  ovr.json           某一小句取录音里的哪一段（格式见 assemble.py）
  seams_review.json  接缝听过以后的决定（格式见 seams.py）
  flags.tsv          每一处要听的地方；听过改 status

回归（比如拿第 8 期的录音重做）：episode.yaml 的 voice.inputs 指到现成的中间结果（se、hp、asr、sel、seams），
voice.ovr 指到人工核过的 ovr，breath、quotes 照第 8 期写，再跑 voice、timeline；checks.diff_timelines 和参考的 timeline.json 比。"""
import shutil
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt
from chonggu.gates import GateFailed
from chonggu.voice import common as C
from chonggu.voice.common import SR, load_json, dump_json, read_wav, write_wav

STAGES = ['prep', 'asr', 'select', 'assemble', 'audit', 'seams', 'chunks', 'chain', 'mute', 'lines', 'narration']

def add_arguments(p, cmd='voice'):
    """给 cli.py 用（可选）：这几个命令认的参数"""
    if cmd == 'voice':
        p.add_argument('--force', action='store_true', help='每一步都重算（听写缓存照用）')
        p.add_argument('--from', dest='from_stage', choices=STAGES, help='从这一步起重算')
        p.add_argument('--no-denoise', action='store_true', help='不降噪（没装 clearvoice 时用）')
    elif cmd == 'check-voice':
        p.add_argument('--only', help='只查这几句（句id，逗号隔开）')
        p.add_argument('--voice', help='查哪条口播（默认 voice/narration.wav）')
    elif cmd == 'timeline':
        p.add_argument('--voice', help='按哪条口播重排（默认 voice/narration.wav，旁边要有同名的 .spans.json）')

class Run:
    def __init__(self, ep, args=None, gates=True):
        self.ep, self.c = ep, C.vcfg(ep); self.args = args; self.gates = gates
        self.force = bool(getattr(args, 'force', False))
        f = getattr(args, 'from_stage', None) or getattr(args, 'from_', None)
        self.start = STAGES.index(f) if f else None
        self.st = C.Stamps(ep.voice('.stamps.json')); self.fl = C.Flags(self.c.flags); self._ear = None
        self.T = C.load_timeline(self.c); self.beats = self.T['beats']; self.texts = {b['id']: b['text'] for b in self.beats}
        self.qids = C.quote_ids(ep); self.quotes = C.quotes(ep)
        self.bsig = [(b['id'], b['text']) for b in self.beats] + [c.get('first') for c in self.T['chapters']]
        self._toks = None
    @property
    def ear(self):
        if self._ear is None: self._ear = C.Ear(self.ep)
        return self._ear
    @property
    def toks(self):
        if self._toks is None:
            from chonggu.voice.select_takes import tok_for
            self._toks = tok_for(self.beats)
        return self._toks
    def need(self, name, outs, *ins):
        """要重算就返回输入的指纹，不用就返回 None"""
        s = C.sig(*ins)
        if self.force or (self.start is not None and STAGES.index(name) >= self.start) or any(not Path(o).exists() for o in outs) or not self.st.same(name, s):
            print(f'== {name}', flush=True); return s
        print(f'== {name}：输入没变，跳过', flush=True); return None
    def done(self, name, s):
        self.st.put(name, s)
        if self._ear is not None: self._ear.save()
    def gate(self, kinds, msg):
        bad = self.fl.open(kinds)
        if bad and not self.gates: print(f'（回归：不挡）{msg}：{len(bad)} 处 open'); return
        if bad:
            for r in bad[:12]: print('  ', '\t'.join(r[1:]))
            raise GateFailed(f'{msg}：{len(bad)} 处还是 open（{self.c.flags}）。听过以后把 status 改成 ok，或者改好 ovr.json / seams_review.json 再跑')
    def X(self):
        se, hp = read_wav(self.c.se), read_wav(self.c.hp); return se, se + .1 * hp[:len(se)]

    # ---------- 每一步 ----------
    def prep(self):
        c = self.c; need_wav = not ('asr' in c.fixed or 'sel' in c.fixed)   # 整段听写要原始录音
        if 'se' in c.fixed and 'hp' in c.fixed and (not need_wav or Path(c.wav).exists()): return
        if 'wav' not in c.fixed and not c.recording: raise GateFailed('episode.yaml 里没写 voice.recording（主讲的原始录音）')
        den = bool(c.denoise) and not getattr(self.args, 'no_denoise', False)
        s = self.need('prep', [c.wav, c.hp, c.se], c.fixed.get('wav') or c.recording, c.hp_hz, den)
        if not s: return
        if 'wav' not in c.fixed:
            if not Path(c.recording).exists(): raise GateFailed(f'找不到录音 {c.recording}')
            C.decode(c.recording, c.wav)
        if 'hp' not in c.fixed:   # 只切低频的原声（二阶高通 70 Hz，同第 8 期的 rec16_hp.wav）
            x = read_wav(c.wav); write_wav(c.hp, sosfilt(butter(2, float(c.hp_hz), btype='high', fs=SR, output='sos'), x).astype(np.float32))
        if 'se' not in c.fixed:
            if den:
                from chonggu.voice.denoise import denoise
                denoise(Path(c.hp), Path(c.se))
            else: print('不降噪：rec_se.wav 就是切了低频的原声'); shutil.copyfile(c.hp, c.se)
        self.done('prep', s)

    def asr(self):
        c = self.c
        if 'asr' in c.fixed or 'sel' in c.fixed: return
        prompt = C.prompt_for(c, self.beats); s = self.need('asr', [c.asr], c.wav, prompt)
        if not s: return
        from chonggu.voice.asr import transcribe
        r = transcribe(C.x16(read_wav(c.wav)), sr=16000, language='zh', prompt=prompt, word_timestamps=True, no_speech_threshold=.5)   # 同第 8 期的 asr.py
        dump_json(C.asr_compact(r), c.asr); print(len(r['segments']), '段'); self.done('asr', s)

    def select(self):
        c = self.c
        if 'sel' in c.fixed: return
        s = self.need('select', [c.sel], c.asr, self.bsig, sorted(self.qids))
        if not s: return
        from chonggu.voice.select_takes import select, report
        sel, flags = select(self.beats, self.qids, load_json(c.asr)); dump_json(sel, c.sel, indent=0); report(sel, flags); self.done('select', s)

    def assemble(self):
        from chonggu.voice.assemble import apply_ovr, missing, assemble
        c = self.c; ovr = load_json(c.ovr) if c.ovr.exists() else {}
        qd = {}
        for b in self.beats:
            if b['id'] in self.qids:
                q = self.quotes.get(b['id']) or {}
                if q.get('dur') is None: raise GateFailed(f"原声句 {b['id']} 没有时长：episode.yaml 的 quotes 里写 dur，或者给出 file")
                qd[b['id']] = q['dur']
        gapT = load_json(c.raw_gaps) if c.raw_gaps else C.est_timeline(c, self.T)
        S = load_json(c.sel); S2 = apply_ovr(S, ovr)
        self.fl.set_kind('take', [(x['id'], x['k'], f"{x['why']} {x['text']} 取了 {x.get('pick')}") for x in S2 if x['why'] in ('best_partial', 'missing')])
        bad = missing(S2, self.beats, self.qids)
        if bad: raise GateFailed('这些小句在录音里没找到，在 voice/ovr.json 里给出录音的起止（或者 null = 没念）：\n  ' + '\n  '.join(bad))
        s = self.need('assemble', [c.narr_raw, c.spans, c.groups], c.sel, ovr, c.se, c.hp, self.bsig, qd, C.gaps_of(gapT))
        if not s: return
        se, hp = read_wav(c.se), read_wav(c.hp)
        y, spans, LOG = assemble(self.beats, self.T['chapters'], S, ovr, se, hp, qd, C.gaps_of(gapT))
        write_wav(c.narr_raw, y); dump_json(spans, c.spans); dump_json(LOG, c.groups); self.done('assemble', s)

    def audit(self):
        c = self.c
        if 'local' in c.fixed or 'seams' in c.fixed: return
        s = self.need('audit', [c.local], c.narr_raw, c.groups, c.se, c.hp)
        if not s: return
        from chonggu.voice.seams import audit
        se, X = self.X(); local = audit(read_wav(c.narr_raw), se, X, load_json(c.groups), self.ear)
        dump_json(local, c.local, indent=0); self.done('audit', s)

    def seams(self):
        c = self.c
        if 'seams' not in c.fixed:
            rv = load_json(c.review) if c.review.exists() else {}
            s = self.need('seams', [c.seams], c.local, rv, c.groups, c.se, self.bsig)
            if s:
                from chonggu.voice.seams import decide
                dump_json(decide(load_json(c.local), load_json(c.groups), read_wav(c.se), rv, self.texts, self.toks), c.seams, indent=0); self.done('seams', s)
        from chonggu.voice.checks import neighbours   # 每次都查（快）：静掉的是不是邻句自己的字
        self.fl.set_kind('clip', neighbours(load_json(c.seams), load_json(c.groups), self.beats, self.qids))

    def chunks(self):
        c = self.c; s = self.need('chunks', [c.chunks], c.se, c.groups, c.seams, self.bsig)
        if s:
            from chonggu.voice.checks import chunks_check
            res, hits = chunks_check(read_wav(c.se), load_json(c.groups), load_json(c.seams), self.beats, self.ear)
            dump_json(res, c.chunks, indent=0); self.fl.set_kind('repeat', hits); self.done('chunks', s)
        self.gate(['repeat'], '拆段查重：有念了半句又重念的地方没处理（在 ovr.json 里改成只用最后完整的那遍）')

    def chain(self):
        c = self.c; s = self.need('chain', [c.narr_base], c.narr_raw)
        if not s: return
        from chonggu.voice.chain import chain
        I = chain(c.narr_raw, c.narr_base); print(f'人声链：原来 {I:.1f} LUFS → -16'); self.done('chain', s)

    def mute(self):
        c = self.c; s = self.need('mute', [c.narr_c, c.mute_check], c.narr_base, c.seams, c.groups, c.se, c.hp, self.bsig)
        if s:
            from chonggu.voice.seams import apply
            from chonggu.voice.checks import mute_diff
            _, X = self.X(); seams = load_json(c.seams); y = read_wav(c.narr_base)
            y2, tot = apply(y, seams, load_json(c.groups), X); write_wav(c.narr_c, y2); print(f'换成静音 {tot:.1f} 秒')
            res, bad = mute_diff(y, y2, load_json(c.spans), seams, self.beats, self.toks, self.ear, C.prompt_for(c, self.beats))
            dump_json(res, c.mute_check, indent=0); self.fl.set_kind('mute', bad); self.done('mute', s)
        self.gate(['mute'], '静音前后逐字比：静音以后有句子少了字（静掉的是这句自己的字：在 seams_review.json 的 keep 里留着它）')

    def lines(self):
        c = self.c; out = Path(c.lines); s = self.need('lines', [out / 'pick.json'], c.narr_c, c.spans, c.pause_cap, c.max_tempo, c.target_cpm, c.tempo, self.bsig, sorted(self.qids))
        if not s: return
        from chonggu.voice.lines import cut_lines
        cut_lines(read_wav(c.narr_c), load_json(c.spans), self.texts, self.qids, out, float(c.pause_cap), float(c.max_tempo), float(c.target_cpm), c.tempo)
        self.done('lines', s)

    def narration(self):
        c = self.c; est = C.est_timeline(c, self.T); BR = C.breath(self.ep)
        qf = {i: q for i, q in self.quotes.items() if i in self.qids}
        for b in self.beats:
            if b['id'] in self.qids and not (qf.get(b['id']) or {}).get('file'): raise GateFailed(f"原声句 {b['id']} 没有文件：episode.yaml 的 quotes 里写 file")
            if b['id'] in self.qids and not qf[b['id']]['file'].exists(): raise GateFailed(f"找不到原声句 {b['id']} 的文件 {qf[b['id']]['file']}（fetch-assets 或放进这一期的 assets/）")
        if est is None: print('注意：没有估算时间线（timeline_est.json），稿子里写的（停 x）这次不算')
        pk = Path(c.lines) / 'pick.json'
        s = self.need('narration', [c.narration, c.narr_spans], pk, *[Path(f) for f in Path(c.lines).glob('*.wav')], self.bsig, BR, C.gaps_of(est), {i: str(q['file']) for i, q in qf.items()})
        if s:
            from chonggu.voice.narration import narrate
            pick = load_json(pk); lost = [b['id'] for b in self.beats if b['id'] not in self.qids and b['id'] not in pick]
            if lost: raise GateFailed('这些句子没有切出来的真声（重跑 voice --from lines）：' + ', '.join(lost))
            v, q, spans = narrate(self.beats, self.T['chapters'], Path(c.lines), pick, qf, BR, C.gaps_of(est))
            write_wav(c.narration, v); write_wav(c.quotes_wav, q); dump_json(spans, c.narr_spans); self.done('narration', s)

def run_voice(ep, args=None, gates=True):
    """gates=False 只给回归测试用：门槛照查、照写 flags.tsv，但不停"""
    r = Run(ep, args, gates)
    try:
        for name in STAGES: getattr(r, name)()
    finally:
        if r._ear is not None: r._ear.save()
    r.gate(['take', 'clip', 'repeat', 'mute'], 'voice/flags.tsv 里还有要听的地方')   # line（整句核对）归 check-voice 管
    print('口播好了：', r.c.narration)
    return r.c.narration

def run_check_voice(ep, args=None):
    from chonggu.voice.checks import check_lines
    from chonggu.voice.select_takes import tok_for
    c = C.vcfg(ep); T = C.load_timeline(c); beats = T['beats']; fl = C.Flags(c.flags)
    wav = Path(getattr(args, 'voice', None) or c.narration); sp = wav.with_suffix('.spans.json')
    if not wav.exists() or not sp.exists(): raise GateFailed(f'没有 {wav.name} 或 {sp.name}：先跑 voice')
    only = set(str(getattr(args, 'only', '') or '').replace('，', ',').split(',')) - {''} or None
    ear = C.Ear(ep)
    res, bad = check_lines(read_wav(wav), load_json(sp), beats, C.quote_ids(ep), tok_for(beats), ear, C.prompt_for(c, beats), only)
    ear.save(); dump_json(res, c.check, indent=0)
    if only:   # 只查了几句：别的句子原来的记录留着
        bad = [r for r in bad] + [(r[2], r[3], r[4]) for r in fl.rows if r[1] == 'line' and r[2] not in only]
    fl.set_kind('line', bad)
    print(f'{len(res)} 句；要听的 {len(bad)} 句（{c.flags}）')
    open_ = fl.open()
    if open_: raise GateFailed(f'整句核对：{len(open_)} 处还是 open（{c.flags}）。听过以后把 status 改成 ok，或者改好再跑 voice')
    return c.check

def run_timeline(ep, args=None):
    from chonggu.voice.timeline import make, apply_breath, report
    c = C.vcfg(ep); T = C.load_timeline(c); qids = C.quote_ids(ep)
    wav = Path(getattr(args, 'voice', None) or c.narration); sp = wav.with_suffix('.spans.json')
    if not wav.exists() or not sp.exists(): raise GateFailed(f'没有 {wav.name} 或 {sp.name}：先跑 voice')
    SP = load_json(sp); lost = [b['id'] for b in T['beats'] if b['id'] not in SP]
    if lost: raise GateFailed('口播和 timeline.json 的句子对不上（稿子改过以后要重跑 voice）：' + ', '.join(lost))
    if T.get('estimated') and c.own_est and not c.timeline_est.exists(): shutil.copyfile(c.timeline, c.timeline_est)   # 估算时间线留着：稿子里写的（停 x）在这里
    prev = Path(ep.out('timeline_prev.json')); prev.parent.mkdir(parents=True, exist_ok=True); shutil.copyfile(c.timeline, prev)
    ear = C.Ear(ep)
    v = wav.resolve(); vd = Path(ep.voice()).resolve()
    NT, low = make(read_wav(wav), SR, SP, T, qids, ear, voice=v.relative_to(vd).as_posix() if v.is_relative_to(vd) else str(wav)); ear.save()   # 记相对 voice/ 的路径
    n = apply_breath(NT, C.breath(ep), qids); dump_json(NT, c.timeline)
    report(NT); print(n, '个呼吸点；对齐偏差大的', len(low), '句', low if low else '')
    return c.timeline

run = run_voice

"""渲染：stills（抽帧看）和 render（一章一章渲成片、接起来、配上混好的声音）。

  python -m chonggu stills <期> 12.5 30 61.2 [--h 540] [--out 文件夹]      没给时刻：每章抽 3 张（1/4、1/2、3/4 处）
  python -m chonggu render <期> --res 1080|2k [--only rv,ls] [--workers 6]

做法照第 8 期 v18 的 finish_v18.sh：一次只渲一章（--stable 8 --tol .002，2K 加 --gpumem 8192），盯着日志等「video ->」，
渲完不退出就 TERM（卡住太久没动静就整组停掉、重来一次）；日志写 out/parts（2K 是 out/parts2k）/log_<序号>_<前缀>_<分辨率>.txt；
日志里有 pageerror / 出错 / 找不到 / 空档 / 重叠 / 读不到文件就停；每章长度和时间线差 0.2 秒以上就停；
全部章节按时间线的顺序接起来（不靠文件名排序）；声音从混好的 1080p 成片里拿（mix 那一步出的）。
渲之前的门槛：画面代码逐个文件 node --check；画面代码里引用的句子和字都在 timeline.json 里；每章都有画面代码；
页面整个搭一遍（导出切点，out/cues.json）不报错；帧率只能是 30。

舞台文件由三个地方拼起来（网址依次找）：<期>/out/stage（这里生成的 index.html）、<期>（timeline.json、ch/、assets/）、工具包 stage/。
文件名和 qa / mix / pack 一样（chonggu.qa.common 的写法）：分章 out/parts/、out/parts2k/，无声整片 <版本>_noaudio.mp4 / <版本>_2k_noaudio.mp4，成片 ep.file_stem('film', …)。
"""
from __future__ import annotations

import json
import os
import re
import shutil
import signal
import subprocess
import time
from pathlib import Path

from chonggu import paths
from chonggu.gates import GateFailed
from chonggu.render import fonts, skin

FPS = 30
RES = {'1080': 1080, '1080p': 1080, 'fhd': 1080, '2k': 1440, '1440': 1440, '1440p': 1440, '720': 720, '720p': 720, '540': 540, '540p': 540}
# 页面报的错：pageerror、console.error（[page:error]）、读不到文件（http 4xx），和 film_base / K.seq / 树报的这几种
BAD = re.compile(r'\[pageerror\]|\[page:error\]|\[http 4\d\d\]|\[出错\]|出错|找不到|读不到|树上没有|空档|重叠|没有镜头|K\.seq')


# ---------------- 小工具 ----------------
def _a(o, name, default=None):
    """Episode 是 dict-like 也有属性：两种都认"""
    v = getattr(o, name, None)
    if v is None and hasattr(o, 'get'):
        try:
            v = o.get(name)
        except Exception:
            v = None
    return default if v is None else v


def _arg(args, *names, default=None):
    for n in names:
        v = getattr(args, n, None) if args is not None else None
        if v not in (None, '', []):
            return v
    return default


def _list(v) -> list[str]:
    """'a,b' / ['a', 'b'] / ['a,b'] → ['a', 'b']"""
    if v in (None, '', []):
        return []
    if isinstance(v, (str, int, float)):
        v = [v]
    return [x.strip() for s in v for x in str(s).split(',') if x.strip()]


def _raw(ep) -> dict:
    return _a(ep, 'raw', {}) or {}


def _stage_opt(ep, key, default=None):
    """舞台的设置：episode.yaml 的 stage: 段，没有就看顶层同名键"""
    r = _raw(ep)
    st = r.get('stage') or {}
    return st[key] if key in st else r.get(key, default)


def _render_opt(ep, key, default=None):
    r = _a(ep, 'render', {}) or {}
    v = r.get(key) if hasattr(r, 'get') else getattr(r, key, None)
    return default if v is None else v


def _per_res(v, rk):
    """render 里的数可以按分辨率写：{1080: 6, 2k: 5}"""
    if isinstance(v, dict):
        for k in (rk, rk.upper(), '1080p' if rk == '1080' else '2K', RES.get(rk)):
            if k in v:
                return v[k]
        return None
    return v


def _rel(ep, p) -> str:
    """这一期目录下的相对路径（网址用，正斜杠）"""
    p = Path(p)
    if p.is_absolute():
        p = p.relative_to(ep.root)
    return p.as_posix()


def height(res) -> int:
    k = str(res).strip().lower()
    if k in RES:
        return RES[k]
    if k.rstrip('p').isdigit():
        return int(k.rstrip('p'))
    raise GateFailed(f'分辨率「{res}」不认识（1080 或 2k）')


def res_key(res) -> str:
    """'1080' / '2k'（成片只有这两种）；别的高度（抽样渲的 540、720）是 '<高>p'，文件分开放，不配声音"""
    h = height(res)
    return {1080: '1080', 1440: '2k'}.get(h, f'{h}p')


def _tool(name: str) -> str:
    """ffmpeg / ffprobe / node / npm 的完整路径（chonggu.paths.tool：环境变量 CHONGGU_FFMPEG 这类 → PATH → 缓存的 bin/）"""
    p = paths.tool(name)
    if not p:
        hint = {'ffmpeg': 'Mac：brew install ffmpeg；Windows：winget install Gyan.FFmpeg', 'ffprobe': '和 ffmpeg 一起装',
                'node': '装 Node.js 22.12 以上（https://nodejs.org 的 LTS 版）', 'npm': '和 Node.js 一起装'}.get(name, '')
        raise GateFailed(f'找不到 {name}。{hint}')
    return p


def duration(p: Path) -> float:
    r = subprocess.run([_tool('ffprobe'), '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(p)], capture_output=True, text=True, encoding='utf-8')
    try:
        return float(r.stdout.strip())
    except ValueError:
        raise GateFailed(f'{Path(p).name} 读不出长度：{r.stderr.strip()[:200]}')


def _has_audio(p: Path) -> bool:
    r = subprocess.run([_tool('ffprobe'), '-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', str(p)], capture_output=True, text=True, encoding='utf-8')
    return bool(r.stdout.strip())


def _ffmpeg(*args):
    r = subprocess.run([_tool('ffmpeg'), '-v', 'error', '-y', *map(str, args)], capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode:
        raise GateFailed('ffmpeg 出错：' + r.stderr.strip()[-800:])


# ---------------- 文件名（和 chonggu.qa.common 一样） ----------------
def name(ep, kind, res=None) -> str:
    """先问 ep.file_stem（episode.yaml 里的格式），它不认识就按第 8 期的写法拼"""
    rk = res_key(res) if res else None
    try:
        s = ep.file_stem(kind, rk)
    except (KeyError, ValueError, TypeError, AttributeError, NotImplementedError):
        s = None
    if s:
        s = str(s)
        return s if Path(s).suffix else s + '.mp4'
    N, V, R = _a(ep, 'number'), _a(ep, 'version'), '2K' if rk == '2k' else '1080p'
    title = _raw(ep).get('title') or _a(ep, 'slug')
    return {'film': f'重估_第{N}期_{title}_{V}_{R}.mp4', 'noaudio': f'{V}_noaudio.mp4' if R != '2K' else f'{V}_2k_noaudio.mp4', 'novo': f'{V}_novo.mp4'}[kind]


def parts_dir(ep, res) -> Path:
    rk = res_key(res)
    return Path(ep.out({'1080': 'parts', '2k': 'parts2k'}.get(rk, f'parts_{rk}')))


def noaudio_path(ep, res) -> Path:
    """接好的没声音的整片（mix 那一步拿它配声音）"""
    rk = res_key(res)
    return Path(ep.out(name(ep, 'noaudio', rk) if rk in ('1080', '2k') else f"{_a(ep, 'version')}_{rk}_noaudio.mp4"))


def final_path(ep, res) -> Path:
    """成片（带声音）"""
    return Path(ep.out(name(ep, 'film', res_key(res))))


# ---------------- 准备舞台 ----------------
def stage_dir() -> Path:
    return paths.stage_dir()


def ensure_node() -> str:
    """node ≥ 22.12（puppeteer 25 要）；stage/node_modules 里没有 puppeteer 就 npm ci（顺带下载 Chrome for Testing）"""
    node = _tool('node')
    v = subprocess.run([node, '--version'], capture_output=True, text=True, encoding='utf-8', errors='replace').stdout.strip().lstrip('v')
    if not v or tuple(int(x) for x in v.split('.')[:2]) < (22, 12):
        raise GateFailed(f'Node.js 版本 {v or "?"} 太旧，要 22.12 以上（puppeteer 25 要）')
    if not (stage_dir() / 'node_modules' / 'puppeteer').exists():
        print('== 装渲染用的 puppeteer 和 Chrome for Testing（第一次，约 1–3 分钟）', flush=True)
        env = dict(os.environ)
        if env.get('CHONGGU_CHROME'):
            env['PUPPETEER_SKIP_DOWNLOAD'] = '1'
        cmd = [_tool('npm'), 'ci' if (stage_dir() / 'package-lock.json').exists() else 'install', '--no-audit', '--no-fund']
        if subprocess.run(cmd, cwd=stage_dir(), env=env).returncode:
            raise GateFailed('npm 装 puppeteer 失败（看上面的输出；公司网络可能要设代理）')
    return node


def timeline(ep) -> dict:
    p = Path(ep.root) / 'timeline.json'
    if not p.exists():
        raise GateFailed(f'{p.name} 还没有：先跑 python -m chonggu timeline')
    return json.loads(p.read_text(encoding='utf-8'))


def chapters(ep) -> list[dict]:
    """episode.yaml 的章节：[{pre, name, file, branch, label, meta}]，file 是相对这一期的路径"""
    out = []
    for c in _a(ep, 'chapters', []) or []:
        g = (lambda k, d=None: c.get(k, d)) if hasattr(c, 'get') else (lambda k, d=None: getattr(c, k, d))
        f = g('file') or f"ch/{g('pre')}.js"
        if not (ep.root / f).exists() and (ep.root / 'ch' / f).exists():
            f = f'ch/{f}'
        out.append({'pre': g('pre'), 'name': g('name'), 'file': _rel(ep, f), 'branch': g('branch'), 'label': g('label'), 'meta': g('meta') or {}})
    return out


def _host(ep):
    h = _a(ep, 'host')
    return h.get('name') if isinstance(h, dict) else h


def _existing(ep, rel_dir: str, first: str, prefix: str, pres: list[str]) -> list[str]:
    """登记表文件：first（counts.json）在前，再按章节顺序 <prefix>_<前缀>.json，再其余的"""
    d = ep.root / rel_dir
    if not d.is_dir():
        return []
    have = {p.name for p in d.glob(f'{prefix}*.json')}
    out = []
    for n in [first] + [f'{prefix}_{p}.json' for p in pres] + sorted(have):
        if n in have and f'{rel_dir.rstrip("/")}/{n}' not in out:
            out.append(f'{rel_dir.rstrip("/")}/{n}')
    return out


def stage_config(ep) -> dict:
    """写进 index.html 的 window.EP：舞台上每期不一样的东西（各 js 文件头写了用法）"""
    chs = chapters(ep)
    pres = [c['pre'] for c in chs]
    docs = dict(_stage_opt(ep, 'docs', {}) or {})
    docs.setdefault('dir', 'assets/s1')
    tree = dict(_stage_opt(ep, 'tree', {}) or {})
    keep = tree.get('keep', 'tree_keep.json')
    counts = _existing(ep, 'assets/clips', 'counts.json', 'counts', pres) + [c for c in _list(_stage_opt(ep, 'counts')) if (ep.root / c).exists()]
    return {
        'show': _raw(ep).get('show', '重估'), 'number': _a(ep, 'number'), 'slug': _a(ep, 'slug'), 'version': _a(ep, 'version'),
        'host': _host(ep), 'host_mark': _stage_opt(ep, 'host_mark'), 'opinion_en': _stage_opt(ep, 'opinion_en'),
        'chapters': chs, 'branches': _stage_opt(ep, 'branches', {}) or {}, 'palettes': _stage_opt(ep, 'palettes', {}) or {},
        'title_card': _a(ep, 'title_card', {}) or {}, 'interludes': _a(ep, 'interludes', {}) or {},
        'tree': tree, 'tree_keep': keep if keep and (ep.root / keep).exists() else None,
        'logos': _stage_opt(ep, 'logos', {}) or {}, 'docs': docs, 'photo_dir': _stage_opt(ep, 'photo_dir'),
        'data': _stage_opt(ep, 'data', {}) or {}, 'default_bg': _stage_opt(ep, 'default_bg'), 'sub_max': _stage_opt(ep, 'sub_max', 22),
        'counts': list(dict.fromkeys(counts)), 'boxes': _existing(ep, docs['dir'], 'boxes.json', 'boxes', pres),
    }


def write_index(ep) -> Path:
    """按 episode.yaml 生成 <期>/out/stage/index.html（章节脚本按章节顺序，不靠手写清单）"""
    cfg = stage_config(ep)
    tpl = (stage_dir() / 'index.template.html').read_text(encoding='utf-8')
    tag = lambda s: f'<script src="{s}"></script>'
    props = ''.join(tag(p) for p in _list(_stage_opt(ep, 'props')))
    files = list(dict.fromkeys(c['file'] for c in cfg['chapters']))
    title = f"{cfg['show']} 第{cfg['number']}期 {cfg['slug'] or ''} {cfg['version'] or ''}".strip()
    ep_json = json.dumps(cfg, ensure_ascii=False, default=str).replace('<', '\\u003c')
    html = (tpl.replace('{{TITLE}}', title).replace('{{EP}}', ep_json).replace('{{PROPS}}', props + ('\n' if props else ''))
            .replace('{{CHAPTERS}}', ''.join(tag(f) for f in files) + '\n'))
    out = Path(ep.out('stage', 'index.html'))
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding='utf-8')
    return out


def roots(ep) -> list[Path]:
    return [Path(ep.out('stage')), Path(ep.root), stage_dir()]


def node_env() -> dict:
    """render.mjs 的环境：ffmpeg 在哪（paths.tool 找到的，可能在缓存的 bin/ 里，不在 PATH 上）"""
    env = dict(os.environ)
    ff = paths.tool('ffmpeg')
    if ff:
        env['CHONGGU_FFMPEG'] = ff
    return env


def node_cmd(ep, *args) -> list[str]:
    cmd = [ensure_node(), str(stage_dir() / 'render.mjs')]
    for r in roots(ep):
        cmd += ['--root', str(r)]
    return cmd + [str(a) for a in args]


def prepare(ep) -> dict:
    """字体、贴图、puppeteer、index.html 都放好；返回时间线"""
    if int(_render_opt(ep, 'fps', FPS)) != FPS:
        raise GateFailed(f'render.fps 只能是 {FPS}（实拍帧序列和画面代码都按 30fps 算）')
    fonts.ensure()
    skin.build(stage_dir() / 'skin')
    ensure_node()
    T = timeline(ep)
    write_index(ep)
    return T


# ---------------- 门槛：画面代码 ----------------
def code_files(ep) -> list[Path]:
    """要查语法的 js：工具包舞台的全部、props、这一期 ch/ 下的和 episode.yaml 登记的章节文件"""
    st = stage_dir()
    fs = [f for f in sorted(st.rglob('*.js')) + sorted(st.glob('*.mjs')) if 'node_modules' not in f.parts]
    for p in _list(_stage_opt(ep, 'props')):
        for base in (Path(ep.out('stage')), Path(ep.root), st):
            if (base / p).exists():
                fs.append(base / p); break
        else:
            fs.append(Path(ep.root) / p)   # 哪儿都没有：下面报「文件不存在」
    fs += sorted((Path(ep.root) / 'ch').glob('*.js')) + [Path(ep.root) / c['file'] for c in chapters(ep)]
    return list(dict.fromkeys(f.resolve() for f in fs))


def code_gate(ep) -> list[Path]:
    """每个 js 文件单独 node --check（一个文件坏了，报的就是它）"""
    node, bad = ensure_node(), []
    fs = code_files(ep)
    for f in fs:
        if not f.exists():
            bad.append(f'{f.name}：文件不存在'); continue
        r = subprocess.run([node, '--check', str(f)], capture_output=True, text=True, encoding='utf-8')
        if r.returncode:
            msg = [l for l in r.stderr.splitlines() if l.strip()]
            bad.append(f'{f.name}：' + ' / '.join(msg[:4]))
    if bad:
        raise GateFailed('画面代码有语法错误：\n  ' + '\n  '.join(bad))
    return fs


Q = r"""(['"])"""
REF = re.compile(r"(?<![\w$])(cue|w|c)\(\s*" + Q + r"([A-Za-z][\w]*)\2\s*(?:,\s*" + Q + r"((?:(?!\4).)*)\4\s*)?\)")
REFB = re.compile(r"(?<![\w$])(B|BE)\(\s*" + Q + r"([A-Za-z][\w]*)\2\s*\)")
REFC = re.compile(r"(?<![\w$])cutId\(\s*\w+\s*,\s*" + Q + r"([A-Za-z][\w]*)\1\s*\)")
CHNAME = re.compile(r"CH\.push\(\s*\{\s*name:\s*" + Q + r"((?:(?!\1).)+)\1")


def refs(ep, T: dict | None = None) -> dict:
    """画面代码里引用的句子和字（cue / w / c / B / BE / K.cutId）：{bad: {文件: [坏的引用…]}, missing: [没有画面代码的章名]}"""
    T = T or timeline(ep)
    BT = {b['id']: b['text'] for b in T['beats']}
    bad, names = {}, set()
    root = Path(ep.root)
    for f in dict.fromkeys([root / c['file'] for c in chapters(ep)] + sorted((root / 'ch').glob('*.js'))):
        if not f.exists():
            continue
        s = f.read_text(encoding='utf-8')
        names |= {m.group(2) for m in CHNAME.finditer(s)}
        b = [m.group(0) for m in REF.finditer(s) if m.group(3) not in BT or (m.group(5) and m.group(5) not in BT[m.group(3)])]
        b += [m.group(0) for m in REFB.finditer(s) if m.group(3) not in BT] + [m.group(0) for m in REFC.finditer(s) if m.group(2) not in BT]
        if b:
            bad[_rel(ep, f)] = list(dict.fromkeys(b))
    return {'bad': bad, 'missing': [c['name'] for c in T['chapters'] if c['name'] not in names]}


def refs_gate(ep, T: dict | None = None, allow_missing: bool = False) -> dict:
    r = refs(ep, T)
    msg = [f'{f}：{", ".join(b[:8])}{" …" if len(b) > 8 else ""}' for f, b in r['bad'].items()]
    if msg:
        msg[0:0] = ['画面代码引用的句子或字在 timeline.json 里找不到（选的字要真的出现在那句里，注意中英文之间的空格和全角标点）：']
    if r['missing'] and not allow_missing:
        msg.append('这几章还没有画面代码（ch/*.js 里没有 CH.push({name: …}) 对得上）：' + '、'.join(r['missing']))
    if msg:
        raise GateFailed('\n  '.join(msg))
    return r


def log_problems(text: str) -> list[str]:
    """渲染日志里的错（去重）"""
    return list(dict.fromkeys(l.strip() for l in text.splitlines() if BAD.search(l)))


# ---------------- 导出切点（mix 用；渲染前也用它把页面整个搭一遍） ----------------
def cues(ep, out: Path | None = None, prepared: bool = False) -> dict:
    """画面代码登记的切点、音效、原声、出处（K.SCENES / K.SFX / K.AUD / K.SRC）→ out/cues.json；页面报错就 GateFailed"""
    if not prepared:
        prepare(ep)
    out = Path(out or ep.out('cues.json'))
    out.parent.mkdir(parents=True, exist_ok=True)
    r = subprocess.run(node_cmd(ep, '--cues', out), capture_output=True, text=True, encoding='utf-8', errors='replace', env=node_env())
    log = r.stdout + r.stderr
    if r.returncode or not out.exists():
        raise GateFailed('页面搭不起来（导出切点失败）：\n' + log[-1500:])
    bad = log_problems(log)
    if bad:
        raise GateFailed('页面有错（导出切点时）：\n  ' + '\n  '.join(bad[:20]))
    return json.loads(out.read_text(encoding='utf-8'))


export_cues = cues


# ---------------- stills ----------------
def _times(args, T) -> list[float]:
    ts = [float(x) for x in _list(_arg(args, 'times', 'time', 't', 'at'))]
    if ts:
        return ts
    only = set(_list(_arg(args, 'only')))
    chs = [c for c in T['chapters'] if not only or c['pre'] in only]
    every = _arg(args, 'every')
    if every:
        out = []
        for c in chs:
            x = c['t0']
            while x < c['t1'] - 1e-6:
                out.append(round(x, 2)); x += float(every)
        return out
    return [round(c['t0'] + (c['t1'] - c['t0']) * k, 2) for c in chs for k in (.25, .5, .75)]


def run_stills(ep, args=None) -> list[Path]:
    """抽帧看：按时刻截 jpg 到 out/stills（或 --out）；页面有错就 GateFailed（图已经写好了）"""
    T = prepare(ep)
    code_gate(ep)
    r = refs(ep, T)   # 抽帧是用来查错的：引用不对只提醒，页面上会显示出错的章
    for f, b in r['bad'].items():
        print(f'  ！{f} 引用了时间线里没有的句子或字：{", ".join(b[:8])}', flush=True)
    if r['missing']:
        print('  ！这几章还没有画面代码：' + '、'.join(r['missing']), flush=True)
    ts = _times(args, T)
    h = int(_arg(args, 'h', 'height', default=540))
    out = Path(_arg(args, 'out', default=ep.out('stills')))
    out.mkdir(parents=True, exist_ok=True)
    cmd = node_cmd(ep, '--stills', ','.join(f'{t:.3f}' for t in ts), '--h', h, '--out', out)
    if _arg(args, 'stable'):
        cmd += ['--stable', str(_arg(args, 'stable')), '--tol', '.002']
    p = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', env=node_env())
    log = p.stdout + p.stderr
    (out / 'log_stills.txt').write_text(log, encoding='utf-8')
    if p.returncode or 'stills ->' not in log:
        raise GateFailed('抽帧失败：\n' + log[-1500:])
    shots = [out / f's_{t:06.2f}.jpg' for t in ts]
    print(f'stills -> {out}（{len(shots)} 张，{h}p）', flush=True)
    bad = log_problems(log)
    if bad:
        raise GateFailed('抽帧写好了，但页面有错：\n  ' + '\n  '.join(bad[:20]))
    return shots


# ---------------- render ----------------
def _stop(p: subprocess.Popen, hard=False):
    """连 Chrome、ffmpeg 一起停（Windows 用 taskkill /T，Mac 发给整个进程组）"""
    if p.poll() is not None:
        return
    if os.name == 'nt':
        subprocess.run(['taskkill', '/T', '/F', '/PID', str(p.pid)], capture_output=True)
    else:
        try:
            os.killpg(p.pid, signal.SIGKILL if hard else signal.SIGTERM)
        except ProcessLookupError:
            pass
    try:
        p.wait(15)
    except subprocess.TimeoutExpired:
        if os.name != 'nt':
            try:
                os.killpg(p.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
        else:
            p.kill()
        try:
            p.wait(15)
        except subprocess.TimeoutExpired:   # 停不掉也不在这里抛（抛了就不会重渲，还丢下没人管的 Chrome）：告诉人去任务管理器里结束
            print(f'  ! 进程 {p.pid} 停不掉：在任务管理器（Windows）或活动监视器（Mac）里结束 node / chrome', flush=True)


def _watch(cmd: list[str], log: Path, stall: float) -> tuple[str, bool]:
    """跑 render.mjs，输出写进 log；等到「video ->」或者它自己退出；stall 秒一个字都没写就算卡死。返回 (日志, 卡死了没有)"""
    kw = {'creationflags': subprocess.CREATE_NEW_PROCESS_GROUP} if os.name == 'nt' else {'start_new_session': True}
    with open(log, 'w', encoding='utf-8') as lf:
        p = subprocess.Popen(cmd, stdout=lf, stderr=subprocess.STDOUT, env=node_env(), **kw)
        last, size, stalled = time.time(), -1, False
        try:
            while True:
                time.sleep(3)
                txt = log.read_text(encoding='utf-8', errors='replace')
                if 'video ->' in txt:   # 渲完了：等它自己退 10 秒，不退就 TERM（第 8 期常卡在关浏览器）
                    try:
                        p.wait(10)
                    except subprocess.TimeoutExpired:
                        _stop(p)
                    break
                if p.poll() is not None:
                    break
                if len(txt) != size:
                    size, last = len(txt), time.time()
                elif time.time() - last > stall:   # 进度每 15 秒一行，这么久一个字都没写 = 卡死了
                    stalled = True
                    _stop(p, hard=True)
                    break
        except BaseException:   # Ctrl-C：别留下没人管的 Chrome
            _stop(p, hard=True)
            raise
    return log.read_text(encoding='utf-8', errors='replace'), stalled


def render_range(ep, out, t0, t1, h=1080, workers=6, stable=8, tol=.002, gpumem=None, log=None, stall=300.0) -> Path:
    """渲一段（全片时刻 t0–t1）到 out；qa.fix_spikes 补半帧也用它。查日志、查长度，不过就 GateFailed"""
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    if not (Path(ep.root) / 'out' / 'stage' / 'index.html').exists():   # 单独调（qa.fix_spikes）时舞台可能还没搭
        prepare(ep)
    log = Path(log or out.with_name(f'log_{out.stem}.txt'))
    new = out.with_name(out.name + '.new.mp4')
    args = ['--video', new, '--from', f'{t0:.4f}', '--to', f'{t1:.4f}', '--h', h, '--workers', workers, '--stable', stable, '--tol', tol]
    if gpumem:
        args += ['--gpumem', gpumem]
    txt, stalled = _watch(node_cmd(ep, *args), log, stall)
    if 'video ->' not in txt:
        raise GateFailed(f"{out.name} 渲染失败{'（卡住了）' if stalled else ''}，日志 {log}：\n" + txt[-1200:])
    bad = log_problems(txt)
    if bad:
        raise GateFailed(f'{out.name} 页面有错，日志 {log.name}：\n  ' + '\n  '.join(bad[:12]))
    d, want = duration(new), round(t1 * FPS) / FPS - round(t0 * FPS) / FPS
    if abs(d - want) >= .2:
        raise GateFailed(f'{out.name} 长度 {d:.2f} 秒，应该是 {want:.2f} 秒（差 0.2 秒以上）')
    paths.replace(new, out)   # Windows 上旧的那份正在播放器里开着：等一会儿再试，还不行就说清楚
    return out


def _render_chapter(ep, k: int, c: dict, H: int, o: dict) -> Path:
    """渲一章（finish_v18.sh 的 one()）：渲到 .new.mp4，盯着日志，查错、查长度，过了才换掉旧的；卡死了重来一次"""
    d = parts_dir(ep, o['rk'])
    d.mkdir(parents=True, exist_ok=True)
    out, log = d / f"{k:02d}_{c['pre']}.mp4", d / f"log_{k:02d}_{c['pre']}_{o['label']}.txt"
    T0 = time.time()
    for attempt in range(1 + o['retries']):
        try:
            render_range(ep, out, c['t0'], c['t1'], H, o['workers'], o['stable'], o['tol'], o['gpumem'], log, o['stall'])
            break
        except GateFailed as e:
            if '卡住了' in str(e) and attempt < o['retries']:
                print(f"  {c['pre']} {o['label']} 卡住了（{o['stall']:.0f} 秒没动静），重来一次", flush=True)
                continue
            raise GateFailed(f"{c['pre']}（{c['name']}）：{e}")
    print(f"  {c['pre']} {o['label']} 完 {time.strftime('%H:%M:%S')}（{time.time() - T0:.0f} 秒）", flush=True)
    return out


def concat(ep, res, T: dict | None = None) -> Path | None:
    """各章按时间线的顺序接起来（清单写死顺序，不靠文件名排序）。缺章就返回 None"""
    T = T or timeline(ep)
    d = parts_dir(ep, res)
    names = [f"{k:02d}_{c['pre']}.mp4" for k, c in enumerate(T['chapters'])]
    miss = [n for n in names if not (d / n).exists()]
    if miss:
        print(f"  还缺 {len(miss)} 章没渲（{', '.join(miss[:6])}），先不接", flush=True)
        return None
    (d / 'list.txt').write_text(''.join(f"file '{n}'\n" for n in names), encoding='utf-8')   # 只写文件名：Windows 的反斜杠、中文路径都不用转义
    out = noaudio_path(ep, res)
    _ffmpeg('-f', 'concat', '-safe', '0', '-i', d / 'list.txt', '-c', 'copy', out)
    dd = duration(out)
    if abs(dd - T['duration']) >= .5:
        raise GateFailed(f'接好的整片 {dd:.2f} 秒，时间线是 {T["duration"]:.2f} 秒')
    return out


def mux(video: Path, audio_from: Path, out: Path) -> Path:
    """画面用 video 的，声音用 audio_from 的（不重新编码）"""
    out = Path(out)
    tmp = out.with_name('_mux_' + out.name)
    _ffmpeg('-i', video, '-i', audio_from, '-map', '0:v', '-map', '1:a', '-c', 'copy', '-shortest', '-movflags', '+faststart', tmp)
    paths.replace(tmp, out)
    return out


def run_render(ep, args=None) -> dict:
    """一章一章渲（--res 1080|2k，--only 前缀,前缀），接起来；有混好的 1080p 就把声音配上。返回 {parts, noaudio, final}"""
    res = _arg(args, 'res')
    if not res:   # episode.yaml 的 render.res 可以是一个或一串（[1080, 2k]），没给 --res 就渲第一个
        r = _render_opt(ep, 'res', '1080')
        res = r[0] if isinstance(r, (list, tuple)) else r
    H, rk = height(res), res_key(res)
    label = {'1080': '1080p', '2k': '2K'}.get(rk, rk)
    T = prepare(ep)
    code_gate(ep)
    refs_gate(ep, T)
    only = _list(_arg(args, 'only'))
    known = [c['pre'] for c in T['chapters']]
    if set(only) - set(known):
        raise GateFailed(f"--only 里有时间线没有的章：{', '.join(sorted(set(only) - set(known)))}（有：{', '.join(known)}）")
    cues(ep, prepared=True)   # 先把页面整个搭一遍：镜头空档、重叠、出错的章在这里就停，不用等渲完一章才知道
    big = H >= 1440
    o = {'rk': rk, 'label': label,
         'workers': int(_arg(args, 'workers', default=_per_res(_render_opt(ep, 'workers'), rk) or (5 if big else 6))),
         'stable': _per_res(_render_opt(ep, 'stable'), rk) or 8, 'tol': _per_res(_render_opt(ep, 'tol'), rk) or .002,
         'gpumem': _per_res(_render_opt(ep, 'gpumem'), rk) or (8192 if big else None),   # 2K 时浏览器默认的显存额度不够，树上的标签只剩空框
         'stall': float(_arg(args, 'stall', default=_render_opt(ep, 'stall', 300))), 'retries': int(_arg(args, 'retries', default=1))}
    which = ', '.join(only) if only else f'全部 {len(known)} 章'
    gm = f" --gpumem {o['gpumem']}" if o['gpumem'] else ''
    print(f"== 渲染 {label} {time.strftime('%H:%M:%S')}：{which}，每章 {o['workers']} 路，--stable {o['stable']} --tol {o['tol']}{gm}", flush=True)
    parts = [_render_chapter(ep, k, c, H, o) for k, c in enumerate(T['chapters']) if not only or c['pre'] in only]
    result = {'parts': parts, 'noaudio': None, 'final': None}
    na = concat(ep, res, T)
    if not na:
        return result
    result['noaudio'] = na
    if rk not in ('1080', '2k') or _arg(args, 'no_mux', 'nomux'):
        return result
    mixed = final_path(ep, '1080')
    if mixed.exists() and _has_audio(mixed):   # 声音一律从混好的 1080p 成片里拿（2K 也是）
        result['final'] = mux(na, mixed, final_path(ep, res))
        novo = Path(ep.out(name(ep, 'novo')))
        if rk == '1080' and novo.exists() and _has_audio(novo):   # 不带口播的那一版也换上新画面
            mux(na, novo, novo)
        print(f"  成片 {result['final'].name}（声音来自 {mixed.name}）", flush=True)
    else:
        print(f"  没声音的整片 {na.name}；下一步 python -m chonggu mix{'（混好以后 2K 会自动配上同一条声音）' if big else ''}", flush=True)
    return result


def add_arguments(p, command: str):
    """给 cli.py 用：stills / render 的参数"""
    if command == 'stills':
        p.add_argument('times', nargs='*', help='时刻（秒），不给就每章抽 3 张')
        p.add_argument('--h', type=int, default=540, help='高（像素），默认 540')
        p.add_argument('--out', help='截图放哪（默认 out/stills）')
        p.add_argument('--every', type=float, help='每隔几秒抽一张')
        p.add_argument('--only', help='只抽这几章（前缀，逗号分开）')
        p.add_argument('--stable', type=int, help='截到画面稳定为止（和成片一样，慢一点）')
    elif command == 'render':
        p.add_argument('--res', default=None, help='1080 或 2k（默认 episode.yaml 的 render.res，没写就 1080）')
        p.add_argument('--only', help='只渲这几章（前缀，逗号分开）；渲完照样把全部章接起来')
        p.add_argument('--workers', type=int, help='每章开几路浏览器（默认 1080p 6 路、2K 5 路）')
        p.add_argument('--stall', type=float, help='日志多少秒没动静算卡死（默认 300）')
        p.add_argument('--no-mux', dest='no_mux', action='store_true', help='只接画面，不配声音')


add_args = add_arguments


def run(ep, args=None):
    """chonggu.cli 按命令名调：args.command 是 stills 就抽帧，否则渲染"""
    return run_stills(ep, args) if _arg(args, 'command', 'cmd') == 'stills' else run_render(ep, args)

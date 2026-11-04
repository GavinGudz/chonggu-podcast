"""打包（第 8 期 tools/pack_v18.py 和 finish_v18.sh 的完整手机版）：python -m chonggu pack <期> [--no-edit] [--no-parts] [--no-full]
- 手机版分段：720p，按 episode.yaml 的 pack.phone_parts 分组（每段几章），每段要小于 29.5 MiB（手机上收文件的上限，pack.phone.max_mib 可改），超了就把画质再压一点重出；
  压到 crf 36 还超就按时长算码率再压（第 8 期这里直接放弃、也不报错，编辑包里的手机版是 42.7 MB）。还超就停。
- 编辑包 out/编辑包_<版本>/：逐句口播（从整条口播按 spans 切，和片子里一模一样）、逐句清单、整条口播、没有口播的画面加配乐（1080p / 720p / 手机版）、说明。
- 完整手机版：960×540 一整个，按片长算码率，小于 29.5 MiB，给主讲戴耳机从头看完（第 9 节）。
同一个模块也管 cover（cover.py）和 intro（intro.py）。"""
import json, os, re, shutil, subprocess, zipfile
from pathlib import Path
from chonggu import paths
from chonggu.gates import GateFailed
from chonggu.qa import common as C


def sh(*a):   # 第一个是程序名（ffmpeg）：按 paths 找到完整路径（CHONGGU_FFMPEG、PATH、缓存的 bin/），找不到就停
    subprocess.run([paths.need(str(a[0])), *map(str, a[1:])], check=True, capture_output=True)


def fresh_dir(P):
    """清空重建一个文件夹。Windows 上 rmtree 会悄悄跳过正开着的文件（播放器里的 wav、记事本里的说明.md、资源管理器的预览），删不干净就说清楚"""
    shutil.rmtree(P, ignore_errors=True)
    if Path(P).exists():
        raise GateFailed(f'{Path(P).name} 删不掉：里面有文件正被打开着（播放器、记事本、资源管理器预览），关掉再跑')
    Path(P).mkdir(parents=True)


def phone(src, dst, t0=None, t1=None, crf=28, scale='-2:720', ab='96k', ac=2, max_mib=29.5):
    PHONE_MAX = max_mib * C.MiB; cut = ['-ss', f'{t0:.3f}', '-to', f'{t1:.3f}'] if t0 is not None else []
    enc = lambda v: sh('ffmpeg', '-v', 'error', '-y', *cut, '-i', src, '-vf', f'scale={scale}', '-c:v', 'libx264', '-preset', 'fast', *v,
                       '-c:a', 'aac', '-b:a', ab, '-ac', ac, '-movflags', '+faststart', dst)
    while True:
        enc(['-crf', str(crf)])
        if dst.stat().st_size < PHONE_MAX or crf >= 36:
            break
        crf += 2
    dur = (t1 - t0) if t0 is not None else C.duration(src)
    for k in (1, .85, .7):   # crf 36 还超：按时长算码率（留 6% 给封装）
        if dst.stat().st_size < PHONE_MAX:
            return dst
        vb = int(max(50e3, (PHONE_MAX * .94 * 8 / dur - int(ab[:-1]) * 1e3) * k))
        enc(['-b:v', str(vb), '-maxrate', str(int(vb * 1.4)), '-bufsize', str(int(vb * 2.8))])
    if dst.stat().st_size >= PHONE_MAX:
        raise GateFailed(f'{dst.name} 压不到 {max_mib:g} MiB 以下（{dst.stat().st_size / C.MiB:.1f} MiB）：把这一段再分小一点')
    return dst


def groups(ep, T):
    """pack.phone_parts：[{name, chapters: [前缀…]}] 或 {名字: [前缀…]}；没写就按章顺序凑，每段不超过 3 分半。"""
    g = C.phone_cfg(ep).get('parts')
    if isinstance(g, dict):
        g = [{'name': k, 'chapters': v} for k, v in g.items()]
    if g:
        return [(x['name'], list(x['chapters'])) if isinstance(x, dict) else (x[0], list(x[1])) for x in g]
    out, cur, t = [], [], 0
    for c in T['chapters']:
        d = c['t1'] - c['t0']
        if cur and t + d > 210:
            out.append(cur); cur, t = [], 0
        cur.append(c); t += d
    out += [cur] if cur else []
    return [('+'.join(c['name'].split('：')[-1] for c in g_), [c['pre'] for c in g_]) for g_ in out]


def phone_parts(ep, T, src):
    CH = {c['pre']: c for c in T['chapters']}; G = groups(ep, T); out = []; P = C.phone_cfg(ep)
    for k, (nm, ps) in enumerate(G, 1):
        miss = [p for p in ps if p not in CH]
        if miss:
            raise GateFailed(f'pack.phone_parts 里的章 {miss} 在 timeline.json 里没有')
        nm = re.sub(r'[\\/:*?"<>|]', '_', str(nm))   # Windows 文件名不能有这几个字符
        dst = Path(ep.out(C.name(ep, 'phone', f'{k}of{len(G)}_{nm}')))
        out.append(phone(src, dst, CH[ps[0]]['t0'], CH[ps[-1]]['t1'], crf=P['crf'], scale=f"-2:{P['height']}", max_mib=P['max_mib']))
    print('手机版', len(out), '段')
    return out


SHUOMING = """# 第 {N} 期 {V} 口播编辑包

## 里面有什么
- `逐句/`（也打包成 `逐句_{n}句.zip`，手机上用 `逐句_{n}句_手机版.zip` 里的 m4a）：片子里现在用的 {n} 句你的口播，一句一个文件，按出场顺序编号。文件名是「序号_句号_开头几个字」，比如 `{eg}`。这是已经去噪、收紧停顿、提速以后的样子，跟片子里一模一样。
- `逐句清单.txt`：每句的文件名、句号、在片子里第几秒开口、这句的字（就是字幕）。采访原声那几句也列在里面，标了「不是你的口播」。
- `口播整条_{V}_从0秒对齐.wav`（手机上用 `.m4a`）：整条口播，从 0 秒开始，和片子的时间一一对得上。
- `画面加配乐_没有你的口播_{V}.mp4`（电脑上用 `_720p` 那个，手机上用 `_手机版` 那个）：片子的画面，有配乐、音效和采访原声，只是没有你的口播。

## 两种改法

### A. 逐句改（推荐）
1. 打开 `逐句/` 里你想改的那几句，用任何软件改：剪掉口误、换成重录的一遍、调快调慢都行。也可以整句重新录。
2. **文件名不要改**，改完的直接覆盖原文件。不想要的句子，把文件删掉就行。
3. 字幕想跟着改，在 `逐句清单.txt` 里那一行的最后一栏改字。
4. 把改过的文件（或者整个文件夹）和清单发回来。重排时间线以后，画面跟着字自动对齐，再出新版。

### B. 在整条上改
1. 在剪映 / Premiere / Final Cut 里新建项目，把 `画面加配乐_没有你的口播` 和 `口播整条` 都从 0 秒开始放进去，一上一下对齐。
2. 只调音量、降噪、换音色这类不改时长的，改完直接导出那条口播发回来就能用。
3. 删了一段、加了停顿、挪了位置都没关系，改完把整条口播导出发回来，重新识别每一句在哪，画面跟着走。
"""


def link_or_copy(a, b):   # 同一块盘上先试硬链接（1 GB 的成片不用再拷一份），不行再拷
    b = Path(b)
    try:
        b.unlink(missing_ok=True)
    except PermissionError:
        raise GateFailed(f'{b.name} 删不掉：正被打开着（播放器、资源管理器预览），关掉再跑') from None
    try:
        os.link(a, b)
    except OSError:
        shutil.copy2(a, b)


def edit_pack(ep, T):
    V = ep.version; NOVO = C.novo(ep)
    if not Path(NOVO).exists():
        raise GateFailed(f'没有不带口播的版本 {Path(NOVO).name}，先跑 python -m chonggu mix')
    W = C.voice_wav(ep, T); SP = json.loads(C.spans_of(W).read_text(encoding='utf-8')); Q = C.quote_ids(ep)
    P = Path(ep.out(C.name(ep, 'editpack', ext=''))); fresh_dir(P); (P / '逐句').mkdir(); (P / '逐句_m4a').mkdir()
    rows, n = [], 0
    for b in T['beats']:
        i = b['id']; t = b.get('vstart', b['start'])
        if i in Q:
            rows.append(f"（原声）\t{i}\t{t:.2f}\t{b['text']}\t不是你的口播"); continue
        if i not in SP:
            raise GateFailed(f'{C.spans_of(W).name} 里没有 {i} 这句，口播和时间线对不上：重跑 voice 和 timeline')
        n += 1; a, z = SP[i]; head = re.sub(r'[^\w]', '', b['text'])[:12]; f = f'{n:03d}_{i}_{head}'
        sh('ffmpeg', '-v', 'error', '-y', '-ss', f'{a:.3f}', '-to', f'{z:.3f}', '-i', W, '-c:a', 'pcm_s24le', P / '逐句' / f'{f}.wav')
        sh('ffmpeg', '-v', 'error', '-y', '-i', P / '逐句' / f'{f}.wav', '-c:a', 'aac', '-b:a', '128k', P / '逐句_m4a' / f'{f}.m4a')
        rows.append(f"{f}.wav\t{i}\t{t:.2f}\t{b['text']}")
    (P / '逐句清单.txt').write_text('文件名\t句号\t片子里第几秒开口\t这句的字（字幕）\n' + '\n'.join(rows) + '\n', encoding='utf-8')
    for d, z in (('逐句', f'逐句_{n}句.zip'), ('逐句_m4a', f'逐句_{n}句_手机版.zip')):
        with zipfile.ZipFile(P / z, 'w', zipfile.ZIP_STORED) as Z:
            for f in sorted((P / d).iterdir()):
                Z.write(f, f'{d}/{f.name}')
    whole = P / f'口播整条_{V}_从0秒对齐.wav'
    sh('ffmpeg', '-v', 'error', '-y', '-i', W, '-af', 'apad', '-t', f"{T['duration']:.3f}", '-c:a', 'pcm_s24le', whole)
    sh('ffmpeg', '-v', 'error', '-y', '-i', whole, '-c:a', 'aac', '-b:a', '160k', whole.with_suffix('.m4a'))
    link_or_copy(NOVO, P / f'画面加配乐_没有你的口播_{V}.mp4')
    sh('ffmpeg', '-v', 'error', '-y', '-i', NOVO, '-vf', 'scale=1280:720', '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-c:a', 'aac', '-b:a', '128k',
       P / f'画面加配乐_没有你的口播_{V}_720p.mp4')
    phone(NOVO, P / f'画面加配乐_没有你的口播_{V}_手机版.mp4', crf=32, max_mib=C.phone_cfg(ep)['max_mib'])
    eg = next((r.split('\t')[0] for r in rows if not r.startswith('（')), '001_a1_开头几个字.wav')
    (P / '说明.md').write_text(SHUOMING.format(N=ep.number, V=V, n=n, eg=eg), encoding='utf-8')
    print('编辑包', n, '句 →', P.name)
    return P


def phone_full(ep, src):
    """完整手机版：960×540，单声道 56k，视频码率按片长算（第 8 期 16 分钟用 180k）。"""
    dst = Path(ep.out(C.name(ep, 'phone_full'))); dur = C.duration(src); PHONE_MAX = C.phone_cfg(ep)['max_mib'] * C.MiB
    vb = int(min(900e3, max(80e3, PHONE_MAX * .92 * 8 / dur - 56e3)))
    for k in (1, .85, .7):
        v = int(vb * k)
        sh('ffmpeg', '-v', 'error', '-y', '-i', src, '-vf', 'scale=960:540', '-c:v', 'libx264', '-preset', 'medium', '-b:v', str(v), '-maxrate', str(int(v * 1.45)),
           '-bufsize', str(int(v * 2.9)), '-c:a', 'aac', '-b:a', '56k', '-ac', '1', '-movflags', '+faststart', dst)
        if dst.stat().st_size < PHONE_MAX:
            print('完整手机版', f'{dst.stat().st_size / C.MiB:.1f} MiB →', dst.name); return dst
    raise GateFailed(f'完整手机版压不到 {PHONE_MAX / C.MiB:g} MiB 以下（{dst.stat().st_size / C.MiB:.1f} MiB）')


def pack(ep, args=None):
    T = C.timeline(ep); src = Path(C.film(ep, '1080')); cfg = getattr(ep, 'pack', None) or {}
    if not src.exists():
        raise GateFailed(f'没有成片 {src.name}，先跑 python -m chonggu mix')
    out = []
    if not getattr(args, 'no_parts', False):
        out += phone_parts(ep, T, src)
    if not getattr(args, 'no_edit', False) and cfg.get('edit_pack', cfg.get('editpack', True)):
        out.append(edit_pack(ep, T))
    if not getattr(args, 'no_full', False):
        out.append(phone_full(ep, src))
    return out


def add_args(p, command='pack'):
    if command == 'pack':
        p.add_argument('--no-parts', action='store_true', help='不出手机版分段')
        p.add_argument('--no-edit', action='store_true', help='不出口播编辑包')
        p.add_argument('--no-full', action='store_true', help='不出完整手机版')
    elif command == 'cover':
        p.add_argument('--preview', help='另存一张两种封面并排的预览图')


def cover(ep, args=None):
    from .cover import make
    return make(ep, getattr(args, 'preview', None))


def intro(ep, args=None):
    from .intro import write
    return write(ep)


def run(ep, args=None):   # 一个模块管三个命令：pack / cover / intro（命令行按 args.command 分）
    cmd = getattr(args, 'command', None) or getattr(args, 'cmd', None) or 'pack'
    return {'pack': pack, 'cover': cover, 'intro': intro}[cmd](ep, args)


run_pack, run_cover, run_intro = pack, cover, intro

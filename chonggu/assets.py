"""fetch-assets：把 assets/manifest.json 登记的配乐、音效下载到每个人自己的缓存（paths.assets_dir()），把 stage/fonts/FONTS.json 的开源字体放进 stage/fonts/。
python -m chonggu fetch-assets [<期>] [--only 名字,…] [--kind music|sfx|speech] [--from 文件夹] [--pin] [--list]
- 写了 <期>（如 demo）：只下这一期用得到的（配乐编排、音效、口播录音、原声句），字体照样放好。
- 已经有、sha256 对得上的不再下；sha256 还没钉（null）的，下载后 --pin 把 sha256 和大小写回清单（清单进 git，下次谁下都按它核对）。
- 钉了 sha256 而下下来对不上：不要这个文件，算失败（文件被换过，或者网络把它改了）。
- 没有直链的（manual）：打开 page 手动下载，再 --from 下载文件夹（按文件名里的编号 source_id 认），或者直接放到它该在的位置。
  Pixabay 的一律手动：它的条款第 8 条不许用程序自动下载、批量复制（就算清单里有人填了直链，这里也不下）。
- 清单有两份：assets/manifest.json（公开，进 git）和 assets/manifest.local.json（只在本机，不进 git：作品页还没核过授权的先放这里）。
- --from 文件夹：先在这个文件夹里找（同名、或文件名里有编号），找到就复制，不用联网（比如从上一台电脑拷来的素材）。
有下载失败或对不上的，最后 GateFailed；只缺手动下载的，提醒但不算失败（用不到它的期照样能做）。"""
import hashlib, json, shutil, time, urllib.error, urllib.request
from pathlib import Path
from chonggu import paths
from chonggu.gates import GateFailed

UA = 'chonggu-kit/0.1 (open-source podcast toolkit)'   # 照实说是哪个程序（Wikimedia 要求 User-Agent 说清是谁）；不为绕过哪个网站的限制改它


def load_manifest():
    """公开清单，assets 里再接上本机清单的（每条带 _local: True，存回时分开写）"""
    with open(paths.manifest_path(), encoding='utf-8') as f: M = json.load(f)
    M['assets'] = M.get('assets', []) + [a for a in paths.manifest_rows() if a.get('_local')]
    return M


def _write(p, M):
    tmp = p.with_name(p.name + '.tmp')
    with open(tmp, 'w', encoding='utf-8', newline='\n') as f: f.write(json.dumps(M, ensure_ascii=False, indent=1) + '\n')
    paths.replace(tmp, p)


def save_manifest(M):
    A = M['assets']; L = paths.local_manifest_path()
    _write(paths.manifest_path(), {**M, 'assets': [a for a in A if not a.get('_local')]})
    loc = [{k: v for k, v in a.items() if k != '_local'} for a in A if a.get('_local')]
    if loc:
        with open(L, encoding='utf-8') as f: ML = json.load(f)
        _write(L, {**ML, 'assets': loc})
    paths._manifest_index.cache_clear()


def sha256(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()


def download(url, dest, tries=3):
    """下载到 dest（先写 .part，下完再改名）；回 sha256"""
    dest = Path(dest); dest.parent.mkdir(parents=True, exist_ok=True); tmp = dest.with_name(dest.name + '.part'); err = None
    for k in range(tries):
        try:
            h = hashlib.sha256(); n = 0
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=60) as r, open(tmp, 'wb') as f:
                total = int(r.headers.get('Content-Length') or 0); last = time.time()
                for b in iter(lambda: r.read(1 << 16), b''):
                    f.write(b); h.update(b); n += len(b)
                    if total > 5e6 and time.time() - last > 2:
                        print(f'    {n / 1e6:.1f} / {total / 1e6:.1f} MB', end='\r', flush=True); last = time.time()
            if total and n != total: raise OSError(f'只下了 {n} / {total} 字节')
            paths.replace(tmp, dest); return h.hexdigest()
        except (urllib.error.URLError, OSError, TimeoutError) as e:
            err = e; tmp.unlink(missing_ok=True)
            if isinstance(e, urllib.error.HTTPError) and e.code in (403, 404, 410): break   # 不是网络抖动，重试也没用
            time.sleep(2 + 3 * k)
    raise OSError(f'{err}')


def matches(a, query):
    n = a['name']; return any(q in (n, Path(n).name, Path(n).stem, str(a.get('source_id'))) for q in query)


def find_local(a, dirs):
    """在 --from 的文件夹里找这一条：同名，或者文件名里有它的编号（Pixabay 手动下载的文件名是 作者-曲名-编号.mp3）"""
    n = Path(a['name']); sid = str(a.get('source_id') or '')
    for d in dirs:
        for c in (d / n, d / n.name):
            if c.is_file(): return c
        if len(sid) >= 5:
            hit = sorted(p for p in d.rglob(f'*{sid}*{n.suffix}') if p.is_file())
            if hit: return hit[0]
    return None


def fetch(a, dirs, pin, force):
    """放好一条；回 (状态, 说明)：have / got / manual / bad"""
    dest = paths.asset(a['name']); want = a.get('sha256')
    if dest.exists() and not force:
        if not want:
            if pin: a['sha256'] = sha256(dest); a['bytes'] = dest.stat().st_size; return 'have', '已有（钉上 sha256）'
            return 'have', '已有'
        if sha256(dest) == want: return 'have', '已有'
        print(f'  ! {a["name"]} 和清单的 sha256 对不上，重新拿一份')
    src = find_local(a, dirs) if dirs else None
    if src:
        got = sha256(src)
        if want and got != want:
            if not a.get('url'):   # 手动下载的：网站给的文件可能和登记时那份不一样，提醒、照样用
                print(f'  ! {a["name"]}：{src.name} 和清单登记的那份不一样（网站可能换了文件），用之前听一下')
            else:
                return 'bad', f'{src} 的 sha256 和清单不一样（不是同一个文件）'
        if not want and a.get('bytes') and src.stat().st_size != a['bytes'] and a.get('url'):
            src = None   # 大小和登记的不一样，又有直链：不用这份，下载
        else:
            dest.parent.mkdir(parents=True, exist_ok=True); shutil.copyfile(src, dest)
            if a.get('bytes') and dest.stat().st_size != a['bytes']:
                print(f'  ! {a["name"]}：{src.name} 的大小（{dest.stat().st_size}）和登记的（{a["bytes"]}）不一样，确认是同一首')
            if pin and not want: a['sha256'] = got; a['bytes'] = dest.stat().st_size
            return 'got', f'从 {src.parent} 复制'
    if a.get('source') == 'pixabay':   # 条款第 8 条：不许程序自动下载、批量复制。只在浏览器里手动下
        where = a.get('page') or f"Pixabay 上搜编号 {a.get('source_id')}"
        return 'manual', f'要手动下载（Pixabay 不许程序下载）：{where} → 放到 {dest}'
    if not a.get('url'):
        return 'manual', f'要手动下载：{a.get("page") or "（没有页面）"} → 放到 {dest}'
    try:
        print(f'  下载 {a["name"]} …', flush=True); got = download(a['url'], dest)
    except OSError as e:
        return 'bad', f'下载失败：{e}（{a["url"]}；在国内可能要开代理，或者换个网络）'
    if want and got != want:
        dest.unlink(missing_ok=True); return 'bad', f'下载下来的 sha256 不对（{got[:12]}…，清单是 {want[:12]}…）'
    if a.get('bytes') and dest.stat().st_size != a['bytes']:
        print(f'  ! {a["name"]} 的大小（{dest.stat().st_size}）和第 8 期那份（{a["bytes"]}）不一样：网站可能换了文件，听一下再用')
    if pin and not want: a['sha256'] = got; a['bytes'] = dest.stat().st_size
    return 'got', '下载好了'


def fonts():
    """舞台字体（stage/fonts/FONTS.json）：交给 chonggu.render.fonts（已经有、对得上的不再下）"""
    try:
        from chonggu.render import fonts as F
    except ImportError as e:
        return [f'字体：chonggu.render.fonts 不在（{e}），没放字体']
    try:
        got = F.ensure(download=True); print(f'  字体 {len(got)} 个，都在 stage/fonts/'); return []
    except GateFailed as e:
        return [str(e)]


def episode_names(ep):
    """这一期用得到的清单素材（python -m chonggu fetch-assets <期>：CI 只下示例期要的那几个）：
    配乐编排里的曲子和爆点音效、留下的那几类画面音效（sfx_keep，按 mix 的 MAP / sfx_map 换成文件名）、口播录音、原声句。
    画面代码登记了哪些音效要渲染时才知道，这里按 sfx_keep 多拿一点（音效都很小）。"""
    from chonggu.mix.plan import MAP
    P = {}
    if ep.music_plan.exists():
        P = json.loads(ep.music_plan.read_text(encoding='utf-8'))
    SM = {**MAP, **P.get('sfx_map', {})}
    want = {s['file'] for s in P.get('sections', [])} | {SM.get(h['sfx'], SM['pop']) for h in P.get('hits', [])}
    want |= {SM[k] for k in P.get('sfx_keep', []) if k in SM}
    rec = ((ep.raw.get('voice') or {}).get('recording'))
    want |= {str(x) for x in [rec] + [q.get('file') for q in ep.quotes.values()] if x}
    return {str(w).replace('\\', '/') for w in want}


def run(ep, args=None):
    M = load_manifest(); A = M['assets']
    only = [x.strip() for x in str(getattr(args, 'only', '') or '').replace('，', ',').split(',') if x.strip()]
    kind = getattr(args, 'kind', None); pin = bool(getattr(args, 'pin', False)); force = bool(getattr(args, 'force', False))
    dirs = [Path(d).expanduser() for d in (getattr(args, 'from_dir', None) or [])]
    for d in dirs:
        if not d.is_dir(): raise GateFailed(f'--from 的文件夹不存在：{d}')
    sel = [a for a in A if (not only or matches(a, only)) and (not kind or a.get('kind') == kind)]
    if only and not sel: raise GateFailed(f'清单里没有：{", ".join(only)}')
    if ep is not None:   # 只要这一期用得到的（清单里没有的，是这一期自己 assets/ 里的东西，不管）
        want = episode_names(ep)
        sel = [a for a in sel if a['name'] in want or Path(a['name']).name in want or Path(a['name']).stem in want]
        print(f'（只管第 {ep.number} 期 {ep.slug} 用到的 {len(sel)} 个）')
    if getattr(args, 'list', False):
        for a in sel:
            p = paths.asset(a['name'])
            print(f"  {'✓' if p.exists() else '·'} {a['name']:<32} {a.get('kind', ''):<6} {a.get('license', ''):<24} {a.get('author', '')}" + ('（手动）' if not a.get('url') or a.get('source') == 'pixabay' else '') + ('（本机清单：作品页还没核过）' if a.get('_local') else ''))
        print(f'缓存：{paths.assets_dir()}'); return
    print(f'== 素材：{len(sel)} 个 → {paths.assets_dir()}')
    R = {'have': [], 'got': [], 'manual': [], 'bad': []}
    for a in sel:
        st, msg = fetch(a, dirs, pin, force); R[st].append((a['name'], msg))
        if st in ('got', 'bad'): print(f"  {'✓' if st == 'got' else '✗'} {a['name']}：{msg}")
    bad = [f'{n}：{m}' for n, m in R['bad']]
    if not only and not kind and not getattr(args, 'no_fonts', False):
        print('== 字体'); bad += fonts()
    if pin: save_manifest(M); print('  已把 sha256 写进 assets/manifest.json（这个文件要提交）')
    print(f"已有 {len(R['have'])}，新放好 {len(R['got'])}，要手动下载 {len(R['manual'])}，失败 {len(R['bad'])}")
    for n, m in R['manual']: print(f'  ! {n}：{m}')
    if R['manual']: print('  （手动下好以后：python -m chonggu fetch-assets --from <下载文件夹>）')
    unpinned = [a['name'] for a in sel if not a.get('sha256') and paths.asset(a['name']).exists()]
    if unpinned and not pin: print(f'  ! {len(unpinned)} 个还没钉 sha256：维护清单的人跑一次 python -m chonggu fetch-assets --pin 并提交 assets/manifest.json')
    if bad: raise GateFailed('素材没放齐：\n  ' + '\n  '.join(bad))


def add_args(p):
    p.add_argument('--only', help='只要这几个（清单里的 name、文件名或编号，逗号分开）')
    p.add_argument('--kind', choices=['music', 'sfx', 'speech'], help='只要配乐、音效或口播录音')
    p.add_argument('--from', dest='from_dir', action='append', metavar='文件夹', help='先从这个文件夹里找（可以写几次）')
    p.add_argument('--pin', action='store_true', help='把下好的文件的 sha256 写回 assets/manifest.json')
    p.add_argument('--force', action='store_true', help='已经有的也重新拿')
    p.add_argument('--list', action='store_true', help='只列出清单和哪些已经有了')
    p.add_argument('--no-fonts', action='store_true', help='不管字体')

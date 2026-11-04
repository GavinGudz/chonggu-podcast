"""发布（第 8 期 tools/upload_v18.sh 改写成 Python，只用 gh 命令行）：python -m chonggu publish <期> [--yes]
默认空跑：读 GitHub 现在的样子，只打印会改什么，一个字都不写。主讲看完完整手机版、说了「可以发」之后才加 --yes 真传。
- 成片一整个放进 Release（单个文件上限 2 GB，git 里每个文件上限 100 MB），不拆分段；asset 用 ASCII 文件名，中文名当显示名（label）。
- 换文件不用 --clobber（它先删旧的再传新的，传到一半停掉 Release 里就没这个文件了；第 8 期 Release 空了 23 分钟）：
  先用临时名传新的 → 核对大小、state=uploaded → 删旧的 → 把新的改回原名（下载链接不变）。
- output 分支：这一期的文件夹 第N期/ 放 README.md（1080p 和 2K 两个下载都写上）、两张封面、发布简介；根目录 README 是索引，
  这一期只留一行（有就换掉、没有就加在表头下面），别的行不动。都用 gh api 写，请求体写进文件再 --input（封面转成 base64 有几 MB，放命令行会超长）。
  不 clone 这个仓库（里面全是视频）。
- 要传的必须就是 qa 查过的那份：成片的大小和修改时间要和 out/qa/passed.json 记的一样。
仓库是公开的：传上去的东西所有人都能下载。
publish:
  repo: <账号>/<仓库>                                         # 节目的公开仓库
  branch: output
  tag: ep{number}-{version}
  asset_slug: anthropic_s1                                    # Release 里的文件名 chonggu_ep8_anthropic_s1_v18_1080p.mp4（只用英文和数字）
  limit_gb: 1.95
  ai_label: true
  notes: …（Release 说明，不写就按模板）
  changes: [这一版改了什么, …]
  index_note: 主讲单人口播（本人真声）                       # 索引那一行、README 里的一句介绍"""
import base64, json, os, re, shutil, subprocess, tempfile, time
from pathlib import Path
from urllib.parse import quote
from chonggu import paths
from chonggu.gates import GateFailed
from chonggu.qa import common as C
from chonggu.qa.run import stamp
from chonggu.pack.cover import host_name
from chonggu.pack.intro import ai_line


class GH:
    """gh 命令行的一层薄壳。dry=True 时读照读、写只记下来不做。测试里换掉 _gh 就能假装是 GitHub。"""

    def __init__(self, repo, dry=True):
        self.repo, self.dry, self.done, self.tmp = repo, dry, [], None

    def _gh(self, args, stream=False):
        exe = paths.tool('gh') or 'gh'
        try:
            if stream:   # 上传：让 gh 自己打进度
                return subprocess.run([exe, *args]).returncode, '', ''
            r = subprocess.run([exe, *args], capture_output=True, text=True, encoding='utf-8', errors='replace')
        except FileNotFoundError:   # 没装 gh：空跑照样列计划（publish 看到非 0 就说「没登录或没装」）
            return 127, '', '没装 gh（Windows：winget install -e --id GitHub.cli；Mac：brew install gh）'
        return r.returncode, r.stdout, r.stderr

    def get(self, path):   # 读；404 回 None
        code, out, err = self._gh(['api', path])
        if code:
            if '404' in err or 'Not Found' in err:
                return None
            raise GateFailed(f'gh api {path} 失败：{err.strip()[-300:]}')
        return json.loads(out) if out.strip() else {}

    def write(self, what, args, body=None, stream=False):
        """写：空跑时只打印「会……」。body 写进临时文件，用 --input 传。"""
        self.done.append((what, args, body))
        if self.dry:
            print('  会' + what); return None
        if body is not None:
            f = Path(self.tmp) / 'req.json'; f.write_text(json.dumps(body, ensure_ascii=False), encoding='utf-8'); args = [*args, '--input', str(f)]
        code, out, err = self._gh(args, stream)
        if code:
            raise GateFailed(f'{what}失败：{err.strip()[-300:]}')
        print('  已' + what)
        return json.loads(out) if out.strip().startswith('{') else out


def fmt(s, **k):
    return str(s).format(**k)


def info(ep):
    cfg = getattr(ep, 'publish', None) or {}; N, V = ep.number, ep.version
    if not cfg.get('repo'):
        raise GateFailed('episode.yaml 里没有 publish.repo')
    I = dict(cfg=cfg, repo=cfg['repo'], branch=cfg.get('branch', 'output'), tag=fmt(cfg.get('tag', 'ep{number}-{version}'), number=N, version=V),
             limit=float(cfg.get('limit_gb', 1.95)), folder=f'第{N}期', date=str(cfg.get('date') or getattr(ep, 'date', None) or time.strftime('%Y-%m-%d')),
             title=(ep.raw or {}).get('title') or ep.slug, host=host_name(ep), films=[])
    I['rtitle'] = cfg.get('title') or f"第 {N} 期 · {I['title']}（{V}）"
    for rk in ('2k', '1080'):
        f = Path(C.film(ep, rk))
        if not f.exists():
            continue
        a = C.name(ep, 'release', rk)   # chonggu_ep8_anthropic_s1_v18_1080p.mp4（publish.asset / names.release 可改格式）
        if not re.fullmatch(r'[A-Za-z0-9_.-]+', a):
            raise GateFailed(f'Release 里的文件名 {a} 要用 ASCII（中文名写在显示名里）')
        w, h = C.size_wh(f)
        I['films'].append(dict(res=rk, path=f, asset=a, label=f.name, size=f.stat().st_size, wh=f'{w}×{h}',
                               url=f"https://github.com/{I['repo']}/releases/download/{I['tag']}/{a}"))
    if not I['films']:
        raise GateFailed('没有成片，先跑 mix')
    I['dur'] = (lambda d: f'{int(d // 60)}:{int(d % 60):02d}')(C.duration(I['films'][-1]['path']))
    I['c16'], I['c34'] = C.name(ep, 'cover', '16比9', ext='.png'), C.name(ep, 'cover', '3比4', ext='.png')
    I['intro'] = C.name(ep, 'intro', ext='.md')
    return I


def notes(ep, I):
    if I['cfg'].get('notes'):
        return I['cfg']['notes']
    fs = '和'.join(f"{'2K' if f['res'] == '2k' else '1080p'}（{f['wh']}，{f['size'] / 1e9:.2f} GB）" for f in I['films'])
    return (f"《重估》第 {ep.number} 期 · {I['title']}，{ep.version}（{I['date']}）。横版 16:9，{I['dur']}。"
            f"{fs}{'两个文件内容一样，' if len(I['films']) > 1 else ''}都是一整个文件，下载即可播放。{I['cfg'].get('index_note') or I['host'] + '主讲'}。")


def readme(ep, I, T):
    dl = '\n'.join(f"- {'2K' if f['res'] == '2k' else '1080p'}（{f['wh']}，{f['size'] / 1e9:.2f} GB{'，画面更清楚，传 B 站用这个' if f['res'] == '2k' else ''}）：[{f['asset']}]({f['url']})"
                   for f in I['films'])
    ch = ' → '.join(c['name'] for c in T['chapters'])
    chg = I['cfg'].get('changes') or []
    return f"""# 第 {ep.number} 期 · {I['title']}

**最新版本 {ep.version}（{I['date']}）**：横版 16:9，{I['dur']}，{I['cfg'].get('index_note') or I['host'] + '主讲'}。

**下载（一整个文件，不用拼）**：
{dl}

（也可以在 [Releases](https://github.com/{I['repo']}/releases/tag/{I['tag']}) 页面下载。成片超过 git 单个文件 100 MB 的上限，所以放在 Release 里，不拆成分段。）

封面：横版 `{I['c16']}`，竖版 `{I['c34']}`。标题、简介、章节时间戳、标签：`{I['intro']}`。

## 章节
{ch}
""" + (f"\n## {ep.version} 改了什么\n" + '\n'.join(f'- {x}' for x in chg) + '\n' if chg else '') + f"""
## 发布时
- 上传平台时{ai_line(ep)}
"""


def index_row(ep, I, T):
    dl = '和'.join(f"{'2K' if f['res'] == '2k' else '1080p'}（[下载]({f['url']})）" for f in I['films'])
    m, d = (lambda x: (x[2], x[3]) if x else (time.strftime('%m'), time.strftime('%d')))(re.match(r'(\d{4})-(\d{1,2})-(\d{1,2})', I['date']))
    return (f"| [第 {ep.number} 期]({I['folder']}/) | {ep.version}：横版 16:9，{I['dur']}；{dl}{'两个文件' if len(I['films']) > 1 else ''}，放在 Release，不拆分段；"
            f"封面：横版 `{I['c16']}`、竖版 `{I['c34']}` | {int(m)}.{d} 制作，{I['title']}：{I['cfg'].get('index_note') or I['host'] + '主讲'}，"
            f"{len(T['chapters'])} 章；见该文件夹 README |")


def put_row(text, number, row):
    """索引里这一期只留一行：先去掉旧的（| [第 N 期] 开头），新行放在表头分隔线下面。回（新文字, 去掉了几行）。"""
    L = text.split('\n'); key = f'| [第 {number} 期]'
    old = [l for l in L if l.startswith(key)]; L = [l for l in L if not l.startswith(key)]
    i = next((k for k, l in enumerate(L) if l.startswith('|---') or l.startswith('| ---')), None)
    if i is None:   # 还没有表：加一个
        L += ['', '| 期数 | 最新版本 | 说明 |', '|---|---|---|']; i = len(L) - 1
    L.insert(i + 1, row)
    return '\n'.join(L), len(old)


def content(gh, I, path):   # output 分支上的一个文件：回（字节或 None, sha 或 None）；大于 1 MB 的 GitHub 不给内容，只给 sha
    j = gh.get(f"repos/{I['repo']}/contents/{quote(path)}?ref={quote(I['branch'])}")
    if not j:
        return None, None
    return base64.b64decode(j.get('content') or ''), j.get('sha')


def put(gh, I, path, data, msg):
    old, sha = content(gh, I, path); data = data.encode('utf-8') if isinstance(data, str) else data
    if old == data:
        print(f'  {path} 没变，不写'); return
    body = {'message': msg, 'branch': I['branch'], 'content': base64.b64encode(data).decode()}
    if sha:
        body['sha'] = sha
    gh.write(f"{'覆盖' if sha else '新建'} {I['branch']} 分支的 {path}（{len(body['content']) * 3 // 4 / 1024:.0f} KB）",
             ['api', '-X', 'PUT', f"repos/{I['repo']}/contents/{quote(path)}", '--jq', '.commit.html_url'], body)


def assets(gh, I):
    r = gh.get(f"repos/{I['repo']}/releases/tags/{quote(I['tag'])}")
    return r, {a['name']: a for a in (r or {}).get('assets', [])}


def check_asset(gh, I, name, size):
    _, A = assets(gh, I); a = A.get(name)
    if not a or a.get('size') != size or a.get('state') != 'uploaded':
        raise GateFailed(f"Release 里的 {name} 不对：{'没有' if not a else str(a.get('size')) + ' 字节，state=' + str(a.get('state'))}（本地 {size} 字节）。旧文件还在，没删")
    return a


def upload(gh, I, tmp, notes_file):
    rel, A = assets(gh, I); files = [Path(tmp) / f['asset'] for f in I['films']]; title = I['rtitle']
    for f, q in zip(I['films'], files) if not gh.dry else ():   # ASCII 名的硬链接（同一块盘上，不另占 1 GB），不行再拷
        try:
            os.link(f['path'], q)
        except OSError:
            shutil.copy2(f['path'], q)
    if rel is None:
        gh.write(f"新建 Release {I['tag']}（指向 {I['branch']} 分支），传 " + '、'.join(f"{f['asset']}（{f['size'] / 1e9:.2f} GB）" for f in I['films']),
                 ['release', 'create', I['tag'], '--repo', I['repo'], '--target', I['branch'], '--title', title, '--notes-file', str(notes_file),
                  *[f'{p}#{f["label"]}' for p, f in zip(files, I['films'])]], stream=True)
        if not gh.dry:
            for f in I['films']:
                check_asset(gh, I, f['asset'], f['size'])
        return
    for p, f in zip(files, I['films']):
        new = Path(f['asset']).stem + '.new' + Path(f['asset']).suffix; q = p.with_name(new)
        if not gh.dry:
            paths.replace(p, q)
        if new in A:   # 上一次传到一半留下的临时文件
            gh.write(f'删掉上次没传完的 {new}', ['api', '-X', 'DELETE', f"repos/{I['repo']}/releases/assets/{A[new]['id']}"])
        gh.write(f"先用临时名传 {new}（{f['size'] / 1e9:.2f} GB，旧的 {f['asset']} 先留着）",
                 ['release', 'upload', I['tag'], '--repo', I['repo'], f'{q}#{f["label"]}'], stream=True)
        a = check_asset(gh, I, new, f['size']) if not gh.dry else {'id': '<新文件 id>'}
        if not gh.dry:
            print(f'  核对过：{new} {a["size"]} 字节，state=uploaded')
        if f['asset'] in A:
            gh.write(f"删旧的 {f['asset']}（{A[f['asset']]['size'] / 1e9:.2f} GB）", ['api', '-X', 'DELETE', f"repos/{I['repo']}/releases/assets/{A[f['asset']]['id']}"])
        gh.write(f"把 {new} 改回 {f['asset']}（下载链接不变）", ['api', '-X', 'PATCH', f"repos/{I['repo']}/releases/assets/{a['id']}"],
                 {'name': f['asset'], 'label': f['label']})
        if not gh.dry:
            check_asset(gh, I, f['asset'], f['size'])
    for n in sorted(set(A) - {f['asset'] for f in I['films']} - {Path(f['asset']).stem + '.new' + Path(f['asset']).suffix for f in I['films']}):
        print(f'  Release 里另有 {n}（{A[n]["size"] / 1e9:.2f} GB），不动')
    gh.write(f"更新 Release {I['tag']} 的说明", ['release', 'edit', I['tag'], '--repo', I['repo'], '--title', title, '--notes-file', str(notes_file)])


def qa_ok(ep, I):
    p = Path(ep.out('qa', 'passed.json'))
    if not p.exists():
        return ['还没有通过的检查记录（out/qa/passed.json）：先跑 python -m chonggu qa']
    J = json.loads(p.read_text(encoding='utf-8'))['files']
    return [f"{f['label']} 在检查之后改过（或者没查过）：再跑一遍 qa" for f in I['films'] if J.get(f['label']) != stamp(f['path'])]


def publish(ep, yes=False, gh=None):
    I = info(ep); T = C.timeline(ep); gh = gh or GH(I['repo'], dry=not yes)
    print(('真传' if yes else '空跑（只看不写；主讲说「可以发」之后加 --yes 真传）') + f"：{I['repo']} 的 Release {I['tag']}，{I['branch']} 分支 {I['folder']}/")
    bad = qa_ok(ep, I) + [f"{f['label']} {f['size'] / 1e9:.2f} GB，超过 {I['limit']} GB（2K 用 crf 19 重压）" for f in I['films'] if f['size'] > I['limit'] * 1e9]
    if bad and yes:
        raise GateFailed('不能发：' + '；'.join(bad))
    for b in bad:
        print('  注意：' + b)
    code, out, err = gh._gh(['auth', 'status'])
    if code:
        if yes:
            raise GateFailed('gh 没登录：先跑 gh auth login')
        print('  gh 没登录或没装，只列计划，不读 GitHub'); gh.get = lambda path: None
    else:
        v = gh.get(f"repos/{I['repo']}")
        if v is None and yes:
            raise GateFailed(f"读不到仓库 {I['repo']}（不存在，或者这个 gh 账号没有权限）")
        print('  ' + ('读不到这个仓库（不存在，或者没权限）' if v is None else '仓库是公开的（PUBLIC），所有人都能下载' if not v.get('private') else '仓库是私有的'))
    tmp = tempfile.mkdtemp(prefix='publish_', dir=ep.out()); gh.tmp = tmp
    try:
        nf = Path(tmp) / 'notes.md'; nf.write_text(notes(ep, I), encoding='utf-8')
        upload(gh, I, tmp, nf)
        put(gh, I, f"{I['folder']}/README.md", readme(ep, I, T), f"第 {ep.number} 期 {ep.version}：README（成片在 Release {I['tag']}）")
        for n in (I['c16'], I['c34'], I['intro']):
            p = Path(ep.out(n))
            if p.exists():
                put(gh, I, f"{I['folder']}/{n}", p.read_bytes(), f'第 {ep.number} 期：{n}')
            else:
                print(f'  没有 {n}，不传（cover / intro 先跑）')
        idx, sha = content(gh, I, 'README.md'); row = index_row(ep, I, T)
        new, k = put_row(idx.decode('utf-8') if idx else '# 《重估》\n', ep.number, row)
        print(f"  索引：{'换掉' if k else '新加'}第 {ep.number} 期那一行" + (f'（原来有 {k} 行）' if k > 1 else '') + '：\n    ' + row)
        put(gh, I, 'README.md', new, f'索引：第 {ep.number} 期 {ep.version}')
        if yes:
            _, A = assets(gh, I)
            for f in I['films']:
                a = A.get(f['asset']) or {}
                print(f"  Release：{f['asset']} {a.get('size')} {a.get('state')}；本地 {f['size']}")
            print(f"Release: https://github.com/{I['repo']}/releases/tag/{I['tag']}\n文件夹: https://github.com/{I['repo']}/tree/{I['branch']}/{I['folder']}")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    return gh.done


def add_args(p):
    p.add_argument('--dry-run', action='store_true', help='空跑（默认就是）：只打印会改什么')
    p.add_argument('--yes', action='store_true', help='真传。只在主讲说了「可以发」之后用')


def run(ep, args=None):
    return publish(ep, yes=bool(getattr(args, 'yes', False)) and not getattr(args, 'dry_run', False))

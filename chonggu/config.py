"""每期一个配置 episodes/<期>/episode.yaml：load(期的文件夹) -> Episode。
- 所有文件名都由这里生成（ep.file_stem），各步骤不各自拼。
- 读进来先按 SCHEMA 查一遍（类型、必填、取值范围、拼错的键），有错就停（GateFailed），把每一处都列出来。
- ep 既是 dict（整理过、带默认值的配置），也能用属性取：ep.slug、ep.render['fps']、ep.quotes …；ep.raw 是 yaml 原样，ep.root 是这一期的文件夹。
- 只给几样东西补默认值（文件名、原声、呼吸点、章节、配乐编排、渲染的 fps/res）；cover、intro、pack、publish、stage、voice 这些段原样交给各自的步骤，
  默认值写在各步骤里（各模块开头有说明）。
episode.yaml 各个字段的说明见 episodes/_template/episode.yaml。"""
import json, re
from pathlib import Path
from chonggu.gates import GateFailed

ID = r'[a-z]+\d*q?'                 # 句子 id：a1、rv00、wh10q（q 结尾的是原声句）
BAD_NAME = set('<>:"/\\|?*')        # Windows 文件名里不能有的字
RESERVED = re.compile(r'(?i)(con|prn|aux|nul|com\d|lpt\d)(\..*)?')   # Windows 的设备名：aux、con.mp4 这样的都不能当文件名


def bad_win_name(s):
    """Windows 上不能当文件名的原因（能用回 None）"""
    s = str(s)
    if set(s) & BAD_NAME: return f'里有 Windows 文件名不能用的字（{"".join(sorted(BAD_NAME))}）'
    if RESERVED.fullmatch(s): return '是 Windows 的设备名（CON、PRN、AUX、NUL、COM1–9、LPT1–9），不能当文件名'
    if s.endswith(('.', ' ')): return '最后是点或空格，Windows 上不能当文件名'
    return None


# ---------- 配置的格式（像 JSON Schema，只用到这几样） ----------
# type：int num str bool list dict map null any，或几种之一的列表；dict 用 keys / required / open（open=True 不查多出来的键）；
# map 是「任意键 → 同一种值」，key 是键的正则；list 用 items；另有 min / max / enum / pattern（整串匹配）。值写成空（None）当没写。
def S(t, **k): return dict(type=t, **k)

NUM, STR, BOOL, ANY = S('num'), S('str'), S('bool'), S('any')
OPEN = S('dict', open=True)
PER_RES = lambda t, **k: S([t, 'map'], **k)                       # 渲染参数可以按分辨率分开写：{1080p: 6, 2K: 5}
QUOTE = S(['dict', 'str'], required=['file'], keys={'file': STR, 'dur': S('num', min=0), 'speaker': STR, 'db': NUM, 'src': STR, 'text': STR, 'lang': STR}, open=True)
CHAPTER = S('dict', required=['pre', 'name'], keys={'pre': S('str', pattern=r'[a-z]+'), 'name': STR, 'file': STR, 'branch': STR, 'meta': OPEN}, open=True)
SCHEMA = S('dict', required=['number', 'slug'], keys={
    'number': S('int', min=1),
    'slug': S('str', pattern=r'[\w.\-]+'),
    'title': STR, 'version': S('str', pattern=r'v\d+\w*'), 'host': S(['str', 'list', 'dict']), 'date': ANY, 'show': STR,
    'script': STR,
    'estimate': S('dict', keys={'rate': S('num', min=1, max=20), 'quote_dur': S('num', min=.5)}),
    'voice': OPEN,                                       # 口播流水线自己读（chonggu/voice/common.py 开头有说明）
    'quotes': S('map', key=ID, value=QUOTE),
    'breath': S(['map', 'str'], key=ID, value=S('num', min=0)),
    'interludes': S(['map', 'list'], key=r'[a-z]+', value=OPEN, items=S(['str', 'dict'])),
    'chapters': S('list', items=CHAPTER),
    'branches': S('map', key=r'\w+', value=S(['str', 'dict'], keys={'label': STR, 'pal': STR}, open=True)),   # money: {label: 钱, pal: money}，或只写 money: 钱
    'title_card': OPEN, 'stage': OPEN,
    'music': S('dict', keys={'plan': STR, 'loudness': S('dict', keys={'I': NUM, 'TP': NUM, 'LRA_min': NUM, 'peak_max': NUM, 'tol': S('num', min=0)})}, open=True),
    'music_plan': STR,
    'render': S('dict', keys={'fps': S('int', enum=[24, 25, 30, 50, 60]), 'res': S(['list', 'int', 'str'], items=S(['int', 'str'])),
                              'workers': PER_RES('int', min=1, max=32), 'stable': PER_RES('int', min=0, max=20), 'tol': PER_RES('num', min=0, max=.05),
                              'gpumem': PER_RES('int', min=0), 'stall': S('num', min=10)}, open=True),
    'pack': S('dict', keys={'phone_parts': S(['list', 'map']), 'edit_pack': BOOL}, open=True),
    'cover': OPEN, 'intro': OPEN,
    'publish': S('dict', keys={'repo': STR, 'branch': STR, 'tag': STR, 'asset_slug': STR, 'asset': STR, 'limit_gb': S('num', min=.1, max=2.0),
                               'ai_label': S(['bool', 'str']), 'notes': STR}, open=True),
    'names': S('map', key=r'\w+', value=STR),
    'qa': OPEN,
})

TYPES = {'int': lambda x: isinstance(x, int) and not isinstance(x, bool), 'num': lambda x: isinstance(x, (int, float)) and not isinstance(x, bool),
         'str': lambda x: isinstance(x, str), 'bool': lambda x: isinstance(x, bool), 'list': lambda x: isinstance(x, list),
         'dict': lambda x: isinstance(x, dict), 'map': lambda x: isinstance(x, dict), 'null': lambda x: x is None, 'any': lambda x: True}
TNAME = {'int': '整数', 'num': '数字', 'str': '文字', 'bool': 'true/false', 'list': '列表', 'dict': '一组键值', 'map': '一组键值', 'null': '空', 'any': '任意'}


def validate(x, s, at='episode.yaml'):
    """按 SCHEMA 查 x：回 (错误列表, 提醒列表)，每条写清楚是哪个位置。"""
    errs, warns = [], []
    ts = s['type'] if isinstance(s['type'], list) else [s['type']]
    t = next((t for t in ts if TYPES[t](x)), None)
    if t is None:
        return [f'{at}：应该是{"或".join(dict.fromkeys(TNAME[t] for t in ts))}，现在是 {x!r}'], []
    if t in ('int', 'num'):
        if 'min' in s and x < s['min']: errs.append(f'{at}：{x} 太小（至少 {s["min"]}）')
        if 'max' in s and x > s['max']: errs.append(f'{at}：{x} 太大（最多 {s["max"]}）')
    if 'enum' in s and t in ('int', 'num', 'str') and x not in s['enum']:
        errs.append(f'{at}：{x!r} 不在可选的 {s["enum"]} 里')
    if t == 'str' and 'pattern' in s and not re.fullmatch(s['pattern'], x):
        errs.append(f'{at}：「{x}」格式不对（要匹配 {s["pattern"]}）')
    if t == 'dict':
        for k in s.get('required', []):
            if x.get(k) in (None, ''): errs.append(f'{at}：缺 {k}')
        keys = s.get('keys', {})
        for k, v in x.items():
            if v is None: continue
            if k in keys:
                e, w = validate(v, keys[k], f'{at} › {k}'); errs += e; warns += w
            elif not s.get('open') and not str(k).startswith('_'):
                near = [q for q in keys if q[:3] == str(k)[:3]]
                warns.append(f'{at}：不认识的键 {k}' + (f'（是不是 {near[0]}？）' if near else '（会被忽略）'))
    if t == 'map':
        for k, v in x.items():
            if 'key' in s and not re.fullmatch(s['key'], str(k)): errs.append(f'{at}：键「{k}」格式不对（要匹配 {s["key"]}）')
            if 'value' in s and v is not None:
                e, w = validate(v, s['value'], f'{at} › {k}'); errs += e; warns += w
    if t == 'list' and 'items' in s:
        for i, v in enumerate(x):
            e, w = validate(v, s['items'], f'{at} › 第 {i + 1} 项'); errs += e; warns += w
    return errs, warns


# ---------- 文件名 ----------
NAMES = {
    'film': '重估_第{number}期_{title}_{version}_{res}.mp4',          # 成片（带声音）：res = 1080p / 2K
    'noaudio': '{version}{res_tag}_noaudio.mp4',                    # 渲染出来的无声画面（2K 的是 v18_2k_noaudio.mp4）
    'novo': '{version}_novo.mp4',                                   # 画面 + 配乐，没有口播（给主讲自己剪口播）
    'mix': 'mix_{version}.wav',                                     # 混好的整条声音
    'phone': '第{number}期{version}_手机_{part}.mp4',                # 手机版分段：part = 1of6_开头+多能赚
    'phone_full': '第{number}期{version}_完整版_手机.mp4',
    'editpack': '编辑包_{version}',                                  # 文件夹
    'cover': '重估_第{number}期_封面_{aspect}.png',                  # aspect = 16比9 / 3比4
    'intro': '发布简介_第{number}期.md',
    'credits': 'CREDITS_第{number}期.md',
    'release': 'chonggu_ep{number}_{slug}_{version}_{res}.mp4',     # 传到 GitHub Release 的文件名：只用 ASCII，slug = publish.asset_slug，res = 1080p / 2k
}
ALIAS = {'pack': 'editpack', 'edit_pack': 'editpack', 'video': 'film', 'asset': 'release', 'phone_part': 'phone'}
RES = {'540': '540p', '540p': '540p', '720': '720p', '720p': '720p', '1080': '1080p', '1080p': '1080p', '1440': '2K', '1440p': '2K', '2k': '2K',
       '2160': '4K', '2160p': '4K', '4k': '4K'}
HEIGHT = {'540p': 540, '720p': 720, '1080p': 1080, '2K': 1440, '4K': 2160}


def res_label(r):
    """1080 / '1080' / '1080p' → 1080p；1440 / '2k' / '2K' → 2K"""
    if r is None: return '1080p'
    k = str(r).strip().lower()
    if k not in RES: raise ValueError(f'不认识的分辨率 {r!r}（写 1080 或 2k）')
    return RES[k]


def res_height(r):
    return HEIGHT[res_label(r)]


def ascii_slug(s):
    return re.sub(r'[^A-Za-z0-9_.-]+', '_', str(s)).strip('_') or 'film'


class Episode(dict):
    """整理过的一期配置。属性：root、raw，和 dict 里的每个键（slug、number、version、quotes、chapters、render …）。"""
    def __init__(self, root, raw, data):
        super().__init__(data)
        self.__dict__['root'] = Path(root); self.__dict__['raw'] = raw

    def __getattr__(self, k):
        try: return self[k]
        except KeyError: raise AttributeError(k) from None

    def __setattr__(self, k, v):
        if k in ('root', 'raw'): self.__dict__[k] = v
        else: self[k] = v

    def __repr__(self):
        return f'<Episode 第{self.number}期 {self.slug} {self.version} @ {self.root}>'

    def _under(self, sub, parts):
        d = self.root / sub; p = d.joinpath(*map(str, parts)) if parts else d
        (p.parent if parts else p).mkdir(parents=True, exist_ok=True)
        return p

    def out(self, *parts):
        """out/ 下的路径（out/ 和上一级文件夹会建好）"""
        return self._under('out', parts)

    def voice(self, *parts):
        return self._under('voice', parts)

    def path(self, p):
        """episode.yaml 里写的相对路径 → 绝对路径（相对这一期的文件夹；绝对路径照用）"""
        p = Path(str(p)).expanduser(); return p if p.is_absolute() else self.root / p

    def chapter(self, pre):
        return next((c for c in self.chapters if c['pre'] == pre), None)

    def file_stem(self, kind, res=None, **kw):
        """标准输出文件名（含扩展名），例：file_stem('film', 1080) → 重估_第8期_Anthropic招股书_v18_1080p.mp4。
        kind：film noaudio novo mix phone phone_full editpack cover intro credits release；格式可在 episode.yaml 的 names 里改
        （release 也认 publish.asset）。phone 的第二个参数（或 part=）是分段名，cover 的（或 aspect=）是比例；不认识的 kind 抛 KeyError。"""
        k = ALIAS.get(kind, kind)
        fmt = self.names.get(k) or (self.publish.get('asset') if k == 'release' else None) or NAMES[k]
        lab = res_label(res if k not in ('phone', 'cover') else None)
        f = dict(number=self.number, slug=self.slug, title=self.title, version=self.version, res=lab, res_tag='' if lab == '1080p' else '_' + lab.lower(),
                 part=kw.get('part') or (res if k == 'phone' else None), aspect=kw.get('aspect') or (res if k == 'cover' else None) or '16比9')
        if k == 'release':
            f.update(slug=ascii_slug(self.publish.get('asset_slug') or self.slug), res=lab.lower())
        if '{part}' in fmt and not f['part']:
            raise ValueError('手机版分段的文件名要给分段名：file_stem("phone", "1of6_开头")')
        return fmt.format_map(f)


# ---------- 读 ----------
LOUD = {'I': -15.0, 'TP': -1.5, 'LRA_min': 4.0, 'peak_max': -1.0, 'tol': .5}   # 成片响度的门槛（qa 用）：−15±0.5 LUFS、LRA ≥4、峰值 ≤−1.0


def read_yaml(p):
    text = Path(p).read_text(encoding='utf-8-sig')
    try:
        import yaml
    except ImportError:
        try: return json.loads(text)   # JSON 也是合法的 YAML；没装 PyYAML 时至少认 JSON 写法
        except ValueError: raise GateFailed('读 episode.yaml 要 PyYAML：python -m pip install pyyaml（或重新跑一遍安装脚本）') from None
    try:
        return yaml.safe_load(text) or {}
    except yaml.YAMLError as e:
        hint = '（Windows 路径写成 C:/Users/…，或者用单引号 \'C:\\Users\\…\'：双引号里的 \\ 是转义）' if '\\' in text else ''
        raise GateFailed(f'{p} 不是合法的 YAML：{e}{hint}') from None


def find(ep_dir):
    """期的文件夹、episode.yaml 的路径、episodes/ 下的文件夹名、或期数（8、ep8、第8期）→ 期的文件夹；找不到回 None"""
    from chonggu import paths
    s = str(ep_dir).strip(); p = Path(s).expanduser()
    if p.is_file() and p.name.endswith(('.yaml', '.yml')): return p.parent
    if (p / 'episode.yaml').exists(): return p
    E = paths.episodes_dir()
    if (E / s / 'episode.yaml').exists(): return E / s
    m = re.fullmatch(r'(?:ep|第)?\s*(\d+)\s*期?', s, re.I)
    if m and E.is_dir():
        for y in sorted(E.glob('*/episode.yaml')):
            if y.parent.name.startswith('_'): continue
            if re.search(rf'^number:\s*{int(m[1])}\s*(#.*)?$', y.read_text(encoding='utf-8-sig'), re.M): return y.parent
    return None


def load(ep_dir, quiet=False):
    root = find(ep_dir)
    if root is None:
        raise GateFailed(f'找不到这一期：{ep_dir}（要一个有 episode.yaml 的文件夹；新的一期用 python -m chonggu new 建）')
    root = root.resolve(); raw = read_yaml(root / 'episode.yaml')
    if not isinstance(raw, dict): raise GateFailed(f'{root / "episode.yaml"} 里应该是一组「键: 值」')
    errs, warns = validate(raw, SCHEMA)
    data = None
    if not errs:
        data, e2, w2 = normalize(root, raw); errs += e2; warns += w2
    if errs:
        raise GateFailed(f'{root.name}/episode.yaml 有 {len(errs)} 处不对：\n' + '\n'.join('    ' + e for e in errs[:30])
                         + ''.join(f'\n    （另外）{w}' for w in warns[:8]))
    if warns and not quiet:
        for w in warns[:8]: print('  !', w)
    return Episode(root, raw, data)


def nz(d):
    return {k: v for k, v in (d or {}).items() if v not in (None, '')}


def normalize(root, raw):
    """带上默认值、把写法统一；顺带查几处字段之间对不对得上（回 数据, 错误, 提醒）"""
    errs, warns = [], []
    g = lambda k, d=None: raw.get(k) if raw.get(k) is not None else d
    d = dict(number=raw['number'], slug=raw['slug'], title=g('title', raw['slug']), version=g('version', 'v1'), host=g('host', ''),
             date=g('date'), script=root / g('script', 'script.md'))
    for k in ('title', 'slug', 'version'):
        why = bad_win_name(d[k])
        if why: errs.append(f'episode.yaml › {k}：「{d[k]}」{why}')
    heads = script_heads(d['script'])   # 稿子里的章：[(前缀, 章名, 第一句 id)]
    # 原声句：唯一的登记处
    q = {}
    for i, v in (g('quotes', {}) or {}).items():
        v = {'file': v} if isinstance(v, str) else dict(v)
        v.setdefault('dur', None); v.setdefault('speaker', '')
        if v['dur'] is not None: v['dur'] = float(v['dur'])
        q[str(i)] = v
    d['quotes'] = q; d['quote_ids'] = set(q)
    # 呼吸点：直接写，或写一个 json 文件
    b = g('breath', {}) or {}
    if isinstance(b, str):
        bp = root / b; d['breath_file'] = bp
        if bp.exists():
            try: b = {k: v for k, v in json.loads(bp.read_text(encoding='utf-8')).items() if not k.startswith('_')}
            except ValueError as e: errs.append(f'episode.yaml › breath：{bp.name} 不是合法的 JSON（{e}）'); b = {}
        else: warns.append(f'episode.yaml › breath：{b} 还没有'); b = {}
    try: d['breath'] = {str(k): float(v) for k, v in b.items()}
    except (TypeError, ValueError): errs.append('episode.yaml › breath：每一项要写「句id: 秒数」'); d['breath'] = {}
    # 章节：写了就用写的，没写就按稿子里的「## 章名 | 前缀」
    chs, seen = [], set()
    for c in g('chapters', []) or [{'pre': p, 'name': n} for p, n, _ in heads]:
        c = dict(c); c.setdefault('file', f"ch/{c['pre']}.js"); c.setdefault('branch', None)
        if c['pre'] in seen: errs.append(f'episode.yaml › chapters：前缀 {c["pre"]} 重复')
        seen.add(c['pre']); chs.append(c)
    d['chapters'] = chs
    br = (g('stage', {}) or {}).get('branches') or g('branches', {}) or {}
    d['branches'] = {k: ({'label': v} if isinstance(v, str) else dict(v)) for k, v in br.items()}
    for c in chs:
        if c['branch'] and d['branches'] and c['branch'] not in d['branches']:
            errs.append(f'episode.yaml › chapters › {c["pre"]}：树枝 {c["branch"]} 不在 branches 里（{", ".join(d["branches"])}）')
    # 新闻插段：{前缀: {...}} 统一成 [{pre, id, ...}]；id = 这一章第一句（插段放在它开口前的长气口里，混音按它让开）
    first = {p: f for p, _, f in heads}; il = g('interludes', []) or []
    il = [{'pre': k, **(v or {})} for k, v in il.items()] if isinstance(il, dict) else [dict(x) if isinstance(x, dict) else x for x in il]
    for x in il:
        if isinstance(x, dict) and not x.get('id') and first.get(x.get('pre')): x['id'] = first[x['pre']]
    d['interludes'] = il
    d['title_card'] = dict(g('title_card', {}) or {})
    m = dict(g('music', {}) or {}); m['loudness'] = {**LOUD, **nz(m.get('loudness'))}
    m['plan'] = m.get('plan') or g('music_plan') or 'music/plan.json'
    d['music'] = m; d['music_plan'] = root / m['plan']
    r = {'fps': 30, 'res': [1080], 'workers': None, 'stable': None, 'tol': None, 'gpumem': None, **nz(g('render'))}
    try: r['res'] = [res_height(x) for x in (r['res'] if isinstance(r['res'], list) else [r['res']])]
    except ValueError as e: errs.append(f'episode.yaml › render › res：{e}')
    d['render'] = r
    p = dict(g('pack', {}) or {}); pp = p.get('phone_parts') or []
    for part in ([{'name': k, 'chapters': v} for k, v in pp.items()] if isinstance(pp, dict) else pp):
        bad = [x for x in (part.get('chapters') or []) if x not in seen] if isinstance(part, dict) else []
        if bad: errs.append(f'episode.yaml › pack › phone_parts › {part.get("name")}：章节 {", ".join(bad)} 不在章节里')
    d['pack'] = p
    d['cover'] = dict(g('cover', {}) or {}); d['intro'] = dict(g('intro', {}) or {})
    d['publish'] = {'limit_gb': 1.95, 'ai_label': True, **nz(g('publish'))}
    d['names'] = dict(g('names', {}) or {})
    for k in d['names']:
        if k not in NAMES: warns.append(f'episode.yaml › names：不认识的文件类别 {k}（认得的：{", ".join(NAMES)}）')
    d['qa'] = dict(g('qa', {}) or {}); d['stage'] = dict(g('stage', {}) or {})
    return d, errs, warns


def script_heads(p):
    """稿子里的章（只看「## 章名 | 前缀」和每章第一句的 id；完整的解析在 chonggu.episode.parse_script）"""
    out = []
    try: lines = Path(p).read_text(encoding='utf-8-sig').splitlines()
    except OSError: return out
    for ln in lines:
        m = HEAD.match(ln.strip())
        if m: out.append([m[2], m[1].strip(), None]); continue
        m = LINE.match(ln.strip())
        if m and out and out[-1][2] is None: out[-1][2] = m[1]
    return [tuple(x) for x in out]


HEAD = re.compile(r'^##\s+(.+?)\s*[|｜]\s*([a-z]+)\s*$')                       # ## 章名 | 前缀
LINE = re.compile(r'^([a-z]+\d+q?)[ \t　]+(\S.*)$')                         # 句id 句子

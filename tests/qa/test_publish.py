"""发布：默认空跑一个字都不写；真传时先用临时名传、核对、删旧的、改回原名（不用 --clobber）；索引这一期只留一行；没过 qa 的不传。
GitHub 用一个假的（FakeGH）：记下每条 gh 命令，按命令改它自己的状态。"""
import base64, json, os
from pathlib import Path
from urllib.parse import unquote
import pytest
from chonggu.gates import GateFailed
from chonggu.qa import common as C, checks as K
from chonggu.publish import run as P

INDEX = """# 《重估》

| 期数 | 最新版本 | 说明 |
|---|---|---|
| [第 990 期](第990期/) | 别的期 | 不能动 |
| [第 99 期](第99期/) | 旧的一行 | 旧 |
| [第 98 期](第98期/) | v3 | 别动 |
"""


class FakeGH(P.GH):
    def __init__(self, repo, dry, release=True):
        super().__init__(repo, dry); self.calls, self.n = [], 100
        self.rel = {'assets': [{'id': 1, 'name': 'chonggu_ep99_demo_v1_1080p.mp4', 'size': 5, 'state': 'uploaded', 'label': '旧'}]} if release else None
        self.files = {'README.md': (INDEX.encode(), 'sha-index')}

    def _gh(self, args, stream=False):
        self.calls.append(list(args)); a = list(args)
        body = lambda: json.loads(Path(a[a.index('--input') + 1]).read_text(encoding='utf-8'))
        if a[:2] == ['auth', 'status']:
            return 0, '', ''
        if a[0] == 'api' and a[1] != '-X':
            p = a[1]
            if p == f'repos/{self.repo}':
                return 0, json.dumps({'private': False}), ''
            if '/releases/tags/' in p:
                return (0, json.dumps(self.rel), '') if self.rel else (1, '', 'HTTP 404: Not Found')
            k = unquote(p.split('/contents/')[1].split('?')[0])
            if k in self.files:
                return 0, json.dumps({'content': base64.b64encode(self.files[k][0]).decode(), 'sha': self.files[k][1]}), ''
            return 1, '', 'gh: Not Found (HTTP 404)'
        if a[:3] == ['api', '-X', 'PUT']:
            k = unquote(a[3].split('/contents/')[1]); b = body()
            assert (k in self.files) == ('sha' in b) and (k not in self.files or b['sha'] == self.files[k][1])
            self.files[k] = (base64.b64decode(b['content']), f'sha-{k}-new'); return 0, 'https://example/commit', ''
        if a[:3] == ['api', '-X', 'DELETE']:
            i = int(a[3].rsplit('/', 1)[1]); self.rel['assets'] = [x for x in self.rel['assets'] if x['id'] != i]; return 0, '', ''
        if a[:3] == ['api', '-X', 'PATCH']:
            i = int(a[3].rsplit('/', 1)[1]); b = body()
            assert all(x['name'] != b['name'] for x in self.rel['assets'])   # 旧的要先删掉才能改名
            next(x for x in self.rel['assets'] if x['id'] == i).update(name=b['name'], label=b['label']); return 0, '{}', ''
        if a[:2] in (['release', 'upload'], ['release', 'create']):
            assert '--clobber' not in a
            if a[1] == 'create':
                self.rel = {'assets': []}
            for f in [x for x in a if '#' in x]:
                p, label = f.split('#', 1); name = Path(p).name
                if any(x['name'] == name for x in self.rel['assets']):
                    return 1, '', 'asset already exists'
                self.n += 1; self.rel['assets'].append({'id': self.n, 'name': name, 'size': os.stat(p).st_size, 'state': 'uploaded', 'label': label})
            return 0, '', ''
        if a[:2] == ['release', 'edit']:
            return 0, '', ''
        raise AssertionError(f'没想到的 gh 命令：{a}')


@pytest.fixture
def film(episode):
    from qa_util import clip
    f = Path(C.film(episode, '1080')); clip(f, 'testsrc2=s=320x180:r=30:d=6'); return f


def passed(episode, film):
    from chonggu.qa.run import report
    report(episode, {'1080': film}, [K.Res('dur', '时长', K.OK, 'ok')], partial=False)


def test_put_row_keeps_other_rows():
    new, k = P.put_row(INDEX, 99, '| [第 99 期](第99期/) | 新的 | 新 |')
    L = new.split('\n')
    assert k == 1 and sum(l.startswith('| [第 99 期]') for l in L) == 1
    assert L[L.index('|---|---|---|') + 1] == '| [第 99 期](第99期/) | 新的 | 新 |'
    assert '| [第 990 期](第990期/) | 别的期 | 不能动 |' in L and '| [第 98 期](第98期/) | v3 | 别动 |' in L
    new2, k2 = P.put_row('# 空的\n', 7, '| [第 7 期](第7期/) | x | y |')
    assert k2 == 0 and new2.endswith('|---|---|---|\n| [第 7 期](第7期/) | x | y |')


def test_dry_run_writes_nothing(episode, film):
    gh = FakeGH(episode.publish['repo'], dry=True); before = json.dumps(gh.rel), dict(gh.files)
    plan = P.publish(episode, yes=False, gh=gh)
    assert (json.dumps(gh.rel), gh.files) == before                     # GitHub 上一点没变
    assert all(c[0] == 'auth' or (c[0] == 'api' and c[1] != '-X') for c in gh.calls)   # 只读
    what = [w for w, _, _ in plan]
    up = next(i for i, w in enumerate(what) if '临时名传 chonggu_ep99_demo_v1_1080p.new.mp4' in w)
    rm = next(i for i, w in enumerate(what) if w.startswith('删旧的 chonggu_ep99_demo_v1_1080p.mp4'))
    mv = next(i for i, w in enumerate(what) if w.startswith('把 chonggu_ep99_demo_v1_1080p.new.mp4 改回'))
    assert up < rm < mv and not any('--clobber' in a for _, a, _ in plan)


def test_real_run_needs_qa_record(episode, film):
    with pytest.raises(GateFailed, match='qa'):
        P.publish(episode, yes=True, gh=FakeGH(episode.publish['repo'], dry=False))


def test_real_run_replaces_asset_safely(episode, film):
    passed(episode, film); gh = FakeGH(episode.publish['repo'], dry=False)
    P.publish(episode, yes=True, gh=gh)
    A = gh.rel['assets']
    assert [(a['name'], a['size'], a['label']) for a in A] == [('chonggu_ep99_demo_v1_1080p.mp4', film.stat().st_size, film.name)]
    kinds = [' '.join(c[:3]) for c in gh.calls if c[0] in ('release', 'api') and (c[0] == 'release' or c[1] == '-X')]
    assert kinds.index('release upload ep99-v1') < kinds.index('api -X DELETE') < kinds.index('api -X PATCH')
    idx = gh.files['README.md'][0].decode()
    assert idx.count('| [第 99 期]') == 1 and '不能动' in idx and 'releases/download/ep99-v1/chonggu_ep99_demo_v1_1080p.mp4' in idx
    rd = gh.files['第99期/README.md'][0].decode()
    assert '1080p（320×180' in rd and '## 章节\n开头 → 正文：第二章' in rd


def test_first_release_is_created(episode, film):
    passed(episode, film); gh = FakeGH(episode.publish['repo'], dry=False, release=False)
    P.publish(episode, yes=True, gh=gh)
    c = next(c for c in gh.calls if c[:2] == ['release', 'create'])
    assert c[c.index('--target') + 1] == 'output' and gh.rel['assets'][0]['name'] == 'chonggu_ep99_demo_v1_1080p.mp4'


def test_changed_film_after_qa_is_refused(episode, film):
    passed(episode, film); os.utime(film, ns=(1, 1))
    with pytest.raises(GateFailed, match='检查之后改过'):
        P.publish(episode, yes=True, gh=FakeGH(episode.publish['repo'], dry=False))

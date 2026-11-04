"""舞台字体：stage/fonts/FONTS.json 里登记的开源字体（OFL），放到 stage/fonts/ 才能渲。

找的顺序：stage/fonts/ 里已经有、sha256 对 → 用；下载缓存里有（python -m chonggu fetch-assets 下的，paths.asset(文件名)）→ 复制过来；
都没有就照 url 下载（钉在 google/fonts 的一个提交上），sha256 不对就不要。许可证文本（OFL_*.txt）一起放。
"""
from __future__ import annotations

import hashlib
import json
import shutil
import sys
import urllib.request
from pathlib import Path

from chonggu import paths
from chonggu.gates import GateFailed


def font_dir() -> Path:
    return paths.stage_dir() / 'fonts'


def listing() -> list[dict]:
    """FONTS.json 里的字体"""
    return json.loads((font_dir() / 'FONTS.json').read_text(encoding='utf-8'))['fonts']


def sha256(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def _cached(name: str) -> Path | None:
    try:
        p = Path(paths.asset(name))
    except Exception:
        return None
    return p if p.exists() else None


def _download(url: str, dest: Path, want: str) -> None:
    tmp = dest.with_name(dest.name + '.part')
    print(f'  下载 {dest.name} …', flush=True)
    req = urllib.request.Request(url, headers={'User-Agent': 'chonggu-kit'})
    with urllib.request.urlopen(req, timeout=120) as r, open(tmp, 'wb') as f:
        shutil.copyfileobj(r, f, 1 << 20)
    got = sha256(tmp)
    if got != want:
        tmp.unlink(missing_ok=True)
        raise GateFailed(f'字体 {dest.name} 下载下来的 sha256 不对（{got[:12]}…，应该是 {want[:12]}…）：网络被改写了？换个网络再试')
    paths.replace(tmp, dest)


def _one(name: str, url: str, want: str, download: bool) -> str | None:
    """放好一个文件；返回问题（None = 好了）"""
    dest = font_dir() / name
    if dest.exists() and sha256(dest) == want:
        return None
    src = _cached(name)
    if src and sha256(src) == want:
        shutil.copyfile(src, dest)
        return None
    if not download:
        return f'{name} 没有（python -m chonggu fetch-assets 下载）'
    try:
        _download(url, dest, want)
    except GateFailed:
        raise
    except Exception as e:   # 没网、被墙
        return f'{name} 下载失败：{e}（url：{url}）'
    return None


def ensure(download: bool = True) -> list[Path]:
    """字体都放好；缺了又下不来就 GateFailed（用系统字体渲出来，Mac 和 Windows 的画面就不一样了）"""
    font_dir().mkdir(parents=True, exist_ok=True)
    bad = []
    for f in listing():
        for name, url, want in ((f['file'], f['url'], f['sha256']), (f.get('license_file'), f.get('license_url'), f.get('license_sha256'))):
            if name and url and want:
                p = _one(name, url, want, download)
                if p:
                    bad.append(p)
    if bad:
        raise GateFailed('舞台字体不全：\n  ' + '\n  '.join(bad))
    return [font_dir() / f['file'] for f in listing()]


if __name__ == '__main__':
    for p in ensure(download='--offline' not in sys.argv):
        print(p.name)

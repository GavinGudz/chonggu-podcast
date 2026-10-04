"""Assemble chapter storyboard files sb/ch_XX.py into one storyboard JSON.
python3 sb_build.py out.json [01 02 ...]   (no chapter list = all chapters 01..14)"""
import json, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
ns = {'__file__': str(HERE / 'sb_head.py')}
exec(open(HERE / 'sb_head.py').read(), ns)
chs = sys.argv[2:] or [f'{i:02d}' for i in range(1, 15)]
for c in chs:
    f = HERE / 'sb' / f'ch_{c}.py'
    if not f.exists():
        print('missing', f); continue
    n0 = len(ns['S'])
    exec(compile(open(f).read(), str(f), 'exec'), ns)
    for sc in ns['S'][n0:]:
        sc.setdefault('ch', c)
sb = {'episode': 4, 'label': None, 'handoff': 'intro', 'intro_speakers': ['gu'] * 4, 'date': '2026.10.04',
      'title': {'kicker': '重估 · 第 4 期', 'head': '重估学历', 'sub': '', 'ruleW': 480},
      'end': {'kicker': '', 'head': '谢谢收听', 'foot': '重估 · 第 4 期　　2026.10.04 录制', 'ruleW': 364, 'y0': 520},
      'chapters': [], 'scenes': ns['S']}
json.dump(sb, open(sys.argv[1], 'w'), ensure_ascii=False, indent=1)
print(len(ns['S']), 'scenes from', ' '.join(chs))

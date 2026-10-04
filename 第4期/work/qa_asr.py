import json, sys, re, difflib
import mlx_whisper
V = sys.argv[1]
r = mlx_whisper.transcribe(f'edit_{V}/final_audio.wav', path_or_hf_repo='mlx-community/whisper-large-v3-turbo', language='zh',
                           condition_on_previous_text=False, initial_prompt='以下是普通话播客《重估》的逐字稿。')
got = ''.join(s['text'] for s in r['segments'])
edl = json.load(open(f'edl_{V}.json'))
exp = ''.join(q['text'] for q in edl['cold_open']) + ''.join(p['text'] for c in edl['chapters'] for p in c['pieces'])
norm = lambda s: re.sub(r'[^一-鿿A-Za-z0-9]', '', s).lower()
a, b = norm(exp), norm(got)
sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
print(V, 'ratio', round(sm.ratio(), 3), len(a), len(b))
for op, i1, i2, j1, j2 in sm.get_opcodes():
    if op != 'equal' and max(i2 - i1, j2 - j1) >= 3:
        print(op, '期望:', a[max(0, i1 - 6):i2 + 6], '| 实际:', b[max(0, j1 - 6):j2 + 6])

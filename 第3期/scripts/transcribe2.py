import json, sys, time
from pathlib import Path
import mlx_whisper
src, out, model = sys.argv[1], sys.argv[2], sys.argv[3]
t = time.time()
result = mlx_whisper.transcribe(
    src, path_or_hf_repo=model, language='zh', word_timestamps=True, verbose=False,
    condition_on_previous_text=False,
    initial_prompt='以下是普通话播客《重估》的逐字稿，主持人吴原同（原同）和顾东政（东政）。用词：注意力价值，方向性直觉，网感，下注，Meme币，哈基米，职高，国企，央企，入党，waitlist，面试官，Zoom，财富自由，国庆，临床直觉，Codex，AI，股市，不构成投资建议。',
)
Path(out + '.json').write_text(json.dumps(result, ensure_ascii=False, indent=2))
Path(out + '.txt').write_text('\n'.join(f"[{s['start']:.2f}–{s['end']:.2f}] {s['text']}" for s in result['segments']))
print(f'Finished {src} in {time.time()-t:.1f}s', flush=True)

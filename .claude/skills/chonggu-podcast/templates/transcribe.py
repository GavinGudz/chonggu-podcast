"""Whole-recording transcript with word times (mlx-whisper on Apple silicon).
python3 transcribe.py <recording> <out_base> [model]   -> <out_base>.json (segments + words) and <out_base>.txt
The prompt (names, the episode's topic words) comes from WHISPER_PROMPT in episode.env: whisper spells names and
jargon the way the prompt does, which saves most of the proofreading."""
import json
import os
import sys
import time
from pathlib import Path

import mlx_whisper

src, out = sys.argv[1], sys.argv[2]
model = sys.argv[3] if len(sys.argv) > 3 else 'mlx-community/whisper-large-v3-mlx'
prompt = os.environ.get('WHISPER_PROMPT') or '以下是普通话播客《重估》的逐字稿，主持人吴原同（原同）和顾东政（东政）。'
t = time.time()
result = mlx_whisper.transcribe(src, path_or_hf_repo=model, language='zh', word_timestamps=True, verbose=False,
                                condition_on_previous_text=False, initial_prompt=prompt)
Path(out + '.json').write_text(json.dumps(result, ensure_ascii=False, indent=2))
Path(out + '.txt').write_text('\n'.join(f"[{s['start']:.2f}–{s['end']:.2f}] {s['text']}" for s in result['segments']))
print(f'Finished {src} in {time.time() - t:.1f}s', flush=True)

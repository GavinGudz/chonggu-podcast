"""Teacher-forced log-likelihood of candidate transcripts for an audio span (whisper large-v3, mlx)."""
import sys, json
import numpy as np, mlx.core as mx
from mlx_whisper.load_models import load_model
from mlx_whisper.audio import log_mel_spectrogram, pad_or_trim, N_FRAMES
from mlx_whisper.tokenizer import get_tokenizer
from scipy.io import wavfile
from scipy.signal import resample_poly

model = load_model('mlx-community/whisper-large-v3-mlx')
tok = get_tokenizer(multilingual=True, num_languages=model.dims.n_vocab - 51765 - 1 if False else 100, language='zh', task='transcribe')
import os
sr, x = wavfile.read(os.environ.get('WAV', 'src48.wav'))


def score(a, b, cands):
    seg = x[int(a * sr):int(b * sr)].astype(np.float32)
    y = resample_poly(seg, 1, 3).astype(np.float32)
    mel = log_mel_spectrogram(y, n_mels=model.dims.n_mels)
    mel = pad_or_trim(mel, N_FRAMES, axis=-2)
    feats = model.encoder(mel[None])
    out = []
    for c in cands:
        prefix = list(tok.sot_sequence_including_notimestamps)
        text = tok.encode(c)
        toks = prefix + text + [tok.eot]
        inp = mx.array([toks[:-1]])
        res = model.decoder(inp, feats)
        logits = res[0] if isinstance(res, tuple) else res
        logits = logits.reshape(-1, logits.shape[-1])
        lp = logits - mx.logsumexp(logits, axis=-1, keepdims=True)
        lp = np.array(lp)
        tgt = toks[1:]
        s = sum(float(lp[i, t]) for i, t in enumerate(tgt) if i >= len(prefix) - 1)
        out.append((round(s, 2), round(s / (len(text) + 1), 3), c))
    return sorted(out, reverse=True)


if __name__ == '__main__':
    spec = json.load(open(sys.argv[1]))
    for item in spec:
        print('==', item['a'], item['b'])
        for r in score(item['a'], item['b'], item['cands']):
            print('  ', r)

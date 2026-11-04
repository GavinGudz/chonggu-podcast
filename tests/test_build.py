"""build 串步骤：按顺序调每一步、--from / --to、每种分辨率各渲一遍、门槛没过就停并提示从哪一步接着做。不渲染、不听写（每一步换成假的）。"""
import argparse, sys
from pathlib import Path
import pytest

KIT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KIT))
from chonggu import build, config      # noqa: E402
from chonggu.gates import GateFailed   # noqa: E402

FIX = KIT / 'tests' / 'render' / 'fixture'


def A(**k):
    return argparse.Namespace(**{'from_stage': None, 'to_stage': None, 'res': None, 'workers': None, 'no_denoise': False, 'force': False, **k})


@pytest.fixture
def ep():
    return config.load(FIX, quiet=True)   # render.res: [1080]


@pytest.fixture
def calls(monkeypatch):
    log, fail = [], {}

    def fake(ep, cmd, **over):
        log.append((cmd, over))
        if cmd in fail: raise GateFailed(fail[cmd])
    monkeypatch.setattr(build, 'call', fake)
    return log, fail


def test_all_steps_in_order(ep, calls):
    log, _ = calls
    build.run(ep, A(res='1080,2k'))
    assert [c for c, _ in log] == ['script-check', 'voice', 'check-voice', 'timeline', 'render', 'render', 'mix', 'qa', 'pack']
    assert [o['res'] for c, o in log if c == 'render'] == ['1080', '2k']


def test_from_to(ep, calls):
    log, _ = calls
    build.run(ep, A(from_stage='render', to_stage='qa'))
    assert [c for c, _ in log] == ['render', 'mix', 'qa'] and log[0][1]['res'] == '1080'   # 没写 --res：用 episode.yaml 的 render.res
    with pytest.raises(GateFailed):
        build.run(ep, A(from_stage='qa', to_stage='voice'))


def test_stops_at_first_gate(ep, calls):
    log, fail = calls
    fail['mix'] = '响度没过'
    with pytest.raises(GateFailed) as e:
        build.run(ep, A(from_stage='timeline', no_denoise=True))
    assert [c for c, _ in log] == ['timeline', 'render', 'mix']
    assert '响度没过' in str(e.value) and '--from mix' in str(e.value) and 'fixture' in str(e.value)   # 提示里写得出这一期在哪


def test_step_args_are_command_defaults():
    mod, a = build.step_args('voice', no_denoise=True)
    assert a.no_denoise and a.command == 'voice' and hasattr(mod, 'run_voice')
    mod, a = build.step_args('render', res='2k')
    assert a.res == '2k' and a.command == 'render'

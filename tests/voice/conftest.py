"""口播流水线测试的 fixture（假的东西在 voice_fakes.py）"""
import sys
from pathlib import Path
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import voice_fakes  # noqa: E402

@pytest.fixture
def fake_engines(monkeypatch, tmp_path):
    return voice_fakes.install(monkeypatch, tmp_path)

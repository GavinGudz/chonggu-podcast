"""命令行：python -m chonggu <命令> [这一期] [选项]（装过以后也可以直接打 chonggu …）。
- 这一期：episodes/ 下的文件夹名、路径或期数（8、ep8）；不写就看 --ep、环境变量 CHONGGU_EP、当前文件夹；episodes/ 下只有一期就用它。
- 每个命令是它那个模块里的函数：有 run_<命令>(ep, args) 就调它，否则调 run(ep, args)（args.command / args.cmd 是命令名）。
  模块可以写 add_args(p[, 命令]) 或 add_arguments(p[, 命令]) 给自己的命令加选项；没写的就用这里的通用选项，认不出的选项放在 args.rest。
- 只在用到某个命令时才 import 它的模块（doctor、new 不用先装齐听写模型、numpy）。
- 门槛没过（GateFailed）：打出原因，退出码 2。"""
import argparse, difflib, importlib, inspect, os, re, sys
from pathlib import Path

COMMANDS = {   # 命令：(模块, 要不要指定一期, 说明)
    'new': ('chonggu.episode', False, '新建一期（从 episodes/_template 复制，填好 episode.yaml）'),
    'doctor': ('chonggu.doctor', False, '环境自检：缺什么、怎么装（--install 自动装齐）'),
    'fetch-assets': ('chonggu.assets', False, '下载配乐、音效、字体到本机缓存（按 sha256 核对）'),
    'script-check': ('chonggu.episode', True, '查稿子和 episode.yaml，生成估算时间线'),
    'voice': ('chonggu.voice.pipeline', True, '口播：录音 → 降噪 → 挑句 → 拼接 → 人声链 → 整条口播'),
    'check-voice': ('chonggu.voice.pipeline', True, '整句核对口播（多字、少字、重念）'),
    'timeline': ('chonggu.voice.pipeline', True, '按口播重排时间线（每个字的时刻）'),
    'stills': ('chonggu.render.run', True, '抽几帧看画面'),
    'render': ('chonggu.render.run', True, '渲染画面（--res 1080|2k，--only 章）'),
    'mix': ('chonggu.mix.plan', True, '按配乐编排混音，出成片'),
    'qa': ('chonggu.qa.run', True, '交付前检查（响度、闪帧、半帧、每章时长……）'),
    'pack': ('chonggu.pack.run', True, '手机版分段、编辑包'),
    'cover': ('chonggu.pack.run', True, '封面（16:9、3:4）'),
    'intro': ('chonggu.pack.run', True, '标题和发布简介'),
    'publish': ('chonggu.publish.run', True, '传到 GitHub Release（默认空跑；真传要人说「可以发」）'),
    'build': ('chonggu.build', True, '从口播一路做到打包，停在第一个没过的门槛'),
}

GENERIC = {   # 模块自己没定义选项时用的通用选项
    'voice': [('--no-denoise', dict(action='store_true', help='不降噪')), ('--from', dict(dest='from_stage', help='从这一步重做')),
              ('--force', dict(action='store_true', help='不管缓存，全部重做'))],
    'check-voice': [('--only', dict(help='只看这几句，逗号分开')), ('--voice', dict(help='整条口播 wav'))],
    'timeline': [('--voice', dict(help='整条口播 wav'))],
    'stills': [('--at', dict(help='哪几个时刻（秒），逗号分开')), ('--h', dict(type=int, default=540, help='高度')), ('--out', dict(help='放到哪个文件夹'))],
    'render': [('--res', dict(help='1080 或 2k')), ('--only', dict(help='只渲这几章（前缀，逗号分开）')), ('--workers', dict(type=int))],
    'mix': [('--sample', dict(nargs=2, type=float, metavar=('起秒', '止秒')))],
    'qa': [('--only', dict()), ('--skip', dict()), ('--no-video', dict(action='store_true'))],
    'publish': [('--dry-run', dict(action='store_true', help='空跑（默认）')), ('--yes', dict(action='store_true', help='真传'))],
    'build': [('--from', dict(dest='from_stage', help='从哪一步开始')), ('--to', dict(dest='to_stage', help='做到哪一步')), ('--res', dict())],
}


def usage():
    w = max(map(len, COMMANDS)) + 2
    lines = ['《重估》出片工具包    python -m chonggu <命令> [这一期] [选项]', '']
    lines += [f'  {k:<{w}}{v[2]}' for k, v in COMMANDS.items()]
    lines += ['', '这一期：episodes/ 下的文件夹名、路径或期数（如 8）；不写就用当前文件夹或环境变量 CHONGGU_EP。',
              '每个命令的选项：python -m chonggu <命令> -h        第一次用：python -m chonggu doctor']
    return '\n'.join(lines)


def utf8_io():
    """Windows 的终端和管道默认不是 UTF-8：输出一律 UTF-8，打不出的字换成 ?；子进程里的 python 也用 UTF-8"""
    for s in (sys.stdout, sys.stderr):
        try:
            if s.isatty() and os.name == 'nt': s.reconfigure(errors='replace')
            else: s.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, ValueError, OSError):
            pass
    os.environ.setdefault('PYTHONUTF8', '1'); os.environ.setdefault('PYTHONIOENCODING', 'utf-8')


def pick_episode(arg):
    from chonggu import config, paths
    if arg: return config.load(arg)
    for c in [os.environ.get('CHONGGU_EP')] + [str(p) for p in [Path.cwd(), *Path.cwd().parents][:3]]:
        if c and config.find(c): return config.load(c)
    E = paths.episodes_dir()
    eps = sorted(y.parent for y in E.glob('*/episode.yaml') if not y.parent.name.startswith('_')) if E.is_dir() else []
    if len(eps) == 1:
        print(f'（用的是 episodes/{eps[0].name}）'); return config.load(eps[0])
    from chonggu.gates import GateFailed
    have = '、'.join(p.name for p in eps) or '还没有（python -m chonggu new 建一期）'
    raise GateFailed(f'要指定是哪一期：python -m chonggu <命令> <这一期>。episodes/ 里有：{have}')


def build_parser(cmd, mod):
    desc = COMMANDS[cmd][2]
    p = argparse.ArgumentParser(prog=f'python -m chonggu {cmd}', description=desc, allow_abbrev=False)
    p.add_argument('--ep', help='这一期（文件夹名、路径或期数）')
    f = getattr(mod, 'add_args', None) or getattr(mod, 'add_arguments', None)
    if f:
        f(p, cmd) if len(inspect.signature(f).parameters) >= 2 else f(p)
    else:
        for flag, kw in GENERIC.get(cmd, []): p.add_argument(flag, **kw)
    return p, bool(f)


def load_module(cmd):
    name = COMMANDS[cmd][0]
    try:
        return importlib.import_module(name)
    except ModuleNotFoundError as e:
        miss = e.name or ''
        if miss.startswith('chonggu'):
            print(f'✗ 「{cmd}」这一步的代码（{name}）还没有：工具包不全，git pull 一下，或者看 docs/ 里这一步的说明', file=sys.stderr)
        else:
            print(f'✗ 缺 Python 包 {miss}：先跑 python -m chonggu doctor（会告诉你怎么装），或 python -m pip install -r requirements.txt', file=sys.stderr)
        raise SystemExit(3)


def reexec_utf8(argv):
    """Windows 上没开 UTF-8 模式（中文 Windows 默认按 GBK 读写文本、解码子进程输出）：带上 -X utf8 重跑一次自己。
    子进程里的 Python 和第三方库（clearvoice 读配置这类不写 encoding 的 open()）也就都是 UTF-8。回退出码。"""
    import subprocess
    os.environ['PYTHONUTF8'] = '1'
    os.environ.setdefault('CHONGGU_LAUNCHER', sys.argv[0])   # 是从哪个程序起的（doctor --install 要知道 chonggu.exe 是不是正开着）
    from chonggu import paths
    env = {**os.environ, 'PYTHONPATH': os.pathsep.join(x for x in (str(paths.kit_root()), os.environ.get('PYTHONPATH')) if x)}   # 在别的文件夹里起的也找得到 chonggu
    p = subprocess.Popen([sys.executable, '-X', 'utf8', '-m', 'chonggu', *argv], env=env)
    while True:
        try:
            return p.wait()
        except KeyboardInterrupt:   # Ctrl-C 子进程自己也收到了，等它收尾
            pass


def main(argv=None):
    from chonggu import paths   # noqa: F401  先读工具包的本机设置（chonggu.local.yaml）
    if argv is None and os.name == 'nt' and not sys.flags.utf8_mode and not os.environ.get('CHONGGU_NO_REEXEC'):
        return reexec_utf8(sys.argv[1:])
    utf8_io()
    argv = list(sys.argv[1:] if argv is None else argv)
    if not argv or argv[0] in ('-h', '--help', 'help'):
        print(usage()); return 0
    if argv[0] in ('--version', 'version'):
        from chonggu import __version__; print(__version__); return 0
    cmd, rest = argv[0], argv[1:]
    if cmd not in COMMANDS:
        near = difflib.get_close_matches(cmd, COMMANDS, n=1)
        print(f'没有「{cmd}」这个命令' + (f'，是不是 {near[0]}？' if near else '') + '\n\n' + usage(), file=sys.stderr); return 2
    from chonggu import config
    from chonggu.gates import GateFailed
    need = COMMANDS[cmd][1]; ep_arg = None
    if rest and not rest[0].startswith('-') and cmd != 'new':
        if config.find(rest[0]): ep_arg = rest.pop(0)   # 第一个不带 - 的就是这一期（stills 的时刻写在它后面）
        elif need and not re.fullmatch(r'[\d.,:]+', rest[0]):
            print(f'✗ 找不到这一期「{rest[0]}」：写 episodes/ 下的文件夹名、路径或期数', file=sys.stderr); return 2
    mod = load_module(cmd)
    p, own = build_parser(cmd, mod)
    args, unknown = p.parse_known_args(rest)
    if unknown and own:
        p.print_usage(sys.stderr); print(f'认不出这些选项：{" ".join(unknown)}（python -m chonggu {cmd} -h 看有哪些）', file=sys.stderr); return 2
    args.rest = unknown; args.cmd = args.command = cmd
    fn = getattr(mod, 'run_' + cmd.replace('-', '_'), None) or getattr(mod, 'run', None)
    if not callable(fn):
        print(f'✗ {COMMANDS[cmd][0]} 里没有 run_{cmd.replace("-", "_")} 或 run', file=sys.stderr); return 3
    try:
        ep_arg = ep_arg or args.ep
        ep = pick_episode(ep_arg) if need else (config.load(ep_arg) if ep_arg else None)
        fn(ep, args)
    except GateFailed as e:
        sys.stdout.flush(); print(f'\n✗ 没过：{e}', file=sys.stderr); return 2
    except KeyboardInterrupt:
        print('\n已停下', file=sys.stderr); return 130
    except FileNotFoundError as e:
        if e.filename is None and getattr(e, 'winerror', None) == 2:   # Windows 上 subprocess 找不到程序：没有文件名
            print('\n✗ 找不到要调用的程序（ffmpeg、ffprobe、node、gh 之类）：先跑 python -m chonggu doctor 看看缺什么', file=sys.stderr); return 3
        if e.filename and not Path(str(e.filename)).suffix and os.sep not in str(e.filename):   # 多半是 ffmpeg、node 之类没装
            print(f'\n✗ 找不到程序 {e.filename}：先跑 python -m chonggu doctor 看看缺什么', file=sys.stderr); return 3
        raise
    except Exception as e:
        import subprocess
        sys.stdout.flush()
        if isinstance(e, subprocess.CalledProcessError):
            tail = (e.stderr.decode('utf-8', 'replace') if isinstance(e.stderr, bytes) else e.stderr or '').strip()[-800:]
            print(f'\n✗ 外部程序出错（退出码 {e.returncode}）：{" ".join(map(str, e.cmd))[:300]}\n{tail}', file=sys.stderr); return 1
        print('\n出错了（下面是出错的位置）。先跑 python -m chonggu doctor 看看环境是不是齐的。', file=sys.stderr)
        raise
    return 0

"""build：从稿子一路做到打包，停在第一个没过的门槛。
python -m chonggu build <期> [--from 步骤] [--to 步骤] [--res 1080,2k] [--workers N] [--no-denoise] [--force]
步骤：script-check → voice → check-voice → timeline → render（episode.yaml 的 render.res 每种各渲一遍）→ mix → qa → pack
- 每一步就是单独跑那条命令：同一个模块、同样的默认参数、同样的门槛（各步的说明见 python -m chonggu <步骤> -h）。
  一步没过就停（GateFailed，退出码 2），告诉你改好以后从哪一步接着跑（--from 那一步）。
- 口播那几步有自己的缓存（输入没变就跳过），重跑 build 不会重听、重拼；--force 让口播全部重算。
- 出来的东西都在这一期的 out/：成片、不带口播的版本、手机版、编辑包、检查报告 out/qa/qa_<版本>.txt。
- cover、intro、publish 不在里面：封面和简介要人看，上传要人说「可以发」。"""
import time
from chonggu import cli
from chonggu.gates import GateFailed

STEPS = ['script-check', 'voice', 'check-voice', 'timeline', 'render', 'mix', 'qa', 'pack']


def step_args(cmd, **over):
    """这一步的命令自己的默认参数（和在命令行上什么选项都不加一样），再改几个"""
    mod = cli.load_module(cmd)
    p, _ = cli.build_parser(cmd, mod)
    a, rest = p.parse_known_args([])
    a.rest = rest; a.cmd = a.command = cmd
    for k, v in over.items(): setattr(a, k, v)
    return mod, a


def call(ep, cmd, **over):
    mod, a = step_args(cmd, **over)
    fn = getattr(mod, 'run_' + cmd.replace('-', '_'), None) or getattr(mod, 'run')
    return fn(ep, a)


def resolutions(ep, args):
    """--res 1080,2k；不写就按 episode.yaml 的 render.res（[1080] 或 [1080, 1440]）"""
    r = [x.strip() for x in str(getattr(args, 'res', None) or '').replace('，', ',').split(',') if x.strip()]
    return r or [str(h) for h in ep.render['res']]


def ep_ref(ep):
    """提示里怎么写这一期：episodes/ 下的写文件夹名（不一定等于 slug），别处的写相对当前文件夹的路径"""
    from pathlib import Path
    from chonggu import paths
    for base in (paths.episodes_dir(), Path.cwd()):
        try: return ep.root.relative_to(base.resolve()).as_posix()
        except ValueError: pass
    return str(ep.root)


def run(ep, args=None):
    a = lambda k, d=None: getattr(args, k, d) if args is not None else d
    i0 = STEPS.index(a('from_stage') or STEPS[0]); i1 = STEPS.index(a('to_stage') or STEPS[-1])
    if i0 > i1: raise GateFailed(f'--from {STEPS[i0]} 在 --to {STEPS[i1]} 后面')
    todo = STEPS[i0:i1 + 1]; T0 = time.time(); took = []
    print(f'== build 第 {ep.number} 期 {ep.slug} {ep.version}：{" → ".join(todo)}', flush=True)
    for cmd in todo:
        t = time.time(); print(f'\n======== {cmd} {time.strftime("%H:%M:%S")} ========', flush=True)
        try:
            if cmd == 'voice':
                call(ep, cmd, no_denoise=bool(a('no_denoise')), force=bool(a('force')))
            elif cmd == 'render':
                for r in resolutions(ep, args):
                    call(ep, cmd, res=r, workers=a('workers'))
            else:
                call(ep, cmd)
        except GateFailed as e:
            raise GateFailed(f'{cmd} 这一步：{e}\n  改好以后接着跑：python -m chonggu build {ep_ref(ep)} --from {cmd}') from None
        took.append((cmd, time.time() - t))
    print('\n== build 做完了：' + '，'.join(f'{c} {s:.0f} 秒' for c, s in took) + f'；一共 {(time.time() - T0) / 60:.1f} 分钟', flush=True)
    print(f'   成片和检查报告在 {ep.out()}；封面、简介：python -m chonggu cover / intro {ep.slug}', flush=True)
    return took


def add_args(p):
    p.add_argument('--from', dest='from_stage', choices=STEPS, help='从这一步开始（前面的当作已经做好）')
    p.add_argument('--to', dest='to_stage', choices=STEPS, help='做到这一步为止')
    p.add_argument('--res', help='渲哪几种（1080、2k，逗号分开；默认 episode.yaml 的 render.res）')
    p.add_argument('--workers', type=int, help='渲染时每章开几路浏览器（默认 episode.yaml 的 render.workers）')
    p.add_argument('--no-denoise', action='store_true', help='口播不降噪（没装 clearvoice 时用）')
    p.add_argument('--force', action='store_true', help='口播每一步都重算（听写缓存照用）')

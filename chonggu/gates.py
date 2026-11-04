"""自动门槛（SOP 第 9 节的检查写成断言）：没过就抛 GateFailed，命令停在这一步，后面的步骤不跑。
命令行把 GateFailed 打成「✗ 没过：……」，退出码 2；别的异常照常带出错的位置。"""
import sys


class GateFailed(Exception):
    """一道门槛没过。message 写给人看：哪里不对、怎么改。"""


def require(ok, message):
    if not ok:
        raise GateFailed(message)


class Gate:
    """一步里有好几项检查时用：逐项记下、打出来，最后有没过的就一起抛。
        g = Gate('稿子检查'); g.ok('句子 id 不重复'); g.bad('wh10 没有登记原声'); g.warn('ch/nx.js 还没写'); g.done()"""
    def __init__(self, title):
        self.title, self.fails, self.warns, self.oks = title, [], [], []

    def ok(self, msg): self.oks.append(msg); print('  ✓', msg)
    def bad(self, msg): self.fails.append(msg); print('  ✗', msg)
    def warn(self, msg): self.warns.append(msg); print('  !', msg)

    def check(self, cond, good, bad):
        (self.ok(good) if cond else self.bad(bad)); return bool(cond)

    def done(self):
        if self.fails:
            n = len(self.fails)
            raise GateFailed(f'{self.title}：{n} 处没过' + ('' if n > 6 else '：' + '；'.join(self.fails)))
        return self


def confirm(word, prompt):
    """要人亲口确认的门槛（上传前必须有人说「可以发」）：在终端里打出 word 才算过。不是在终端里跑的（没有人看着），直接不过。"""
    if not sys.stdin or not sys.stdin.isatty():
        raise GateFailed(f'{prompt}：要人在终端里输入「{word}」确认，现在没有人看着（不是交互终端），停下')
    try:
        got = input(f'{prompt}\n确认就输入「{word}」：').strip()
    except EOFError:
        got = ''
    if got != word:
        raise GateFailed(f'没有确认（输入的是「{got}」），停下')

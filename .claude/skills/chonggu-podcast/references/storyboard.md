# 分镜：怎么写 `work/sb/ch_XX.py`

## 先把一章想成一条线

每章开头写一段注释，说清楚这一章的「线」：这一章用哪几个图形把话串起来，前一章的什么东西在这里回来。第 4 期 ch02 的例子：

```
# ch 02 人家要的是能力 (顾东政). Threads: ch01's doors (学历 opens the first, 成绩 the second) -> intern badge
# -> the only red figure (department, then the years) -> what the job needs -> 问题 → 做出来 -> the road between
# -> the one-plank bridge (张飞 at the bridgehead, stamped 错) -> ch01's résumé again
```

全片要有一个母题反复出现（第 4 期是尺子，结尾回到片头的「默认 → 重估」）。画面不是给口播配插图，而是用一个画出来的比喻把这句话「演」出来：门推开、门票撕下、名字被划掉换成另一个词、一排人里只有一个是红的、天平两端一样重。

## 锚点

所有时间都用口播文字里逐字出现的短语表示（忽略标点和空格；英文、数字照写）：

- `scene('先从头说起', ...)`：场景从这句开口时开始，到下一个场景开始时结束（也可以给 `t1=`）。
- `at='小学'`：这个元素在说到「小学」时出现；`'$短语'` 是这个短语说完的时候；`'短语+0.4'` 是往后偏 0.4 秒。
- 写之前先打开 `work/sb/chapters_text.md`（剪辑后每章的口播文字，按时间排好），锚点只能从这里抄。剪辑表改了要重新生成这份文字，否则会出现 `scenes dropped`。

## 版面（3:4 竖版）

- 画布 1080×1440。内容宽 `CW = 960`，左边距 `X = 60`；顶栏在最上面，字幕在下方，引擎会把每个场景的内容在顶栏和字幕之间垂直居中，并保证不压到字幕。
- 一屏一个主意，元素一般 3–8 个，跟着口播一个个出现；同一屏里不要同时冒出一大段字。
- 颜色：墨黑为主，红只给「这一屏最要紧的那一个」；顾东政的章节可以带青绿，吴原同带琥珀。
- 字：大标题用宋体（`var(--serif)`，900），说明文字用苹方。

## 辅助函数（`sb_head.py`）

| 函数 | 画什么 |
|---|---|
| `K(text)` | 红色字距拉开的小标题（kicker），如 `K('先 从 头 说 起')` |
| `Hd(text, size=118)` / `Big(text)` / `P(text)` | 大标题 / 超大字 / 段落 |
| `Rule` / `HL(x, y, w)` / `Marker(text)` | 短横线 / 划线高亮 / 荧光笔 |
| `Box(title, x, y, w, h, style='dark'|'pink'|'dashed')` / `Card` / `Tag` / `Lab` / `Bub` | 方框（先描边后填色）/ 卡片 / 标签 / 说明文字 / 气泡 |
| `Arr(x, y, len_, dir_)` / `Chk(text, mark='v'|'x')` / `Node` | 箭头 / 打勾打叉 / 节点 |
| `Ic(name, x, y, size)` | 线描图标（book、eye、stairs、mountain……） |
| `Ruler(labels=..., dot=..., seg=...)` | 尺子，点在上面滑动 |
| `Board(rows=..., blur_at=...)` | 成绩榜，可以后来变模糊 |
| `Chat(msgs=[{who:'me'|'ai', text, at}], search=...)` | AI 聊天窗，可以搜索高亮 |
| `Curve(lines=[{type:'exp'|'decay'|'linear'|'flat'|'s'|'down', label}])` | 曲线（复利、贬值……） |
| `Stack(items=...)` | 自下而上越叠越高的积木 |
| `Door(label, inside, open_at)` / `Ticket(title, stubText)` / `Stamp(text)` | 门 / 门票 / 印章 |
| `Count(to, from, suffix)` | 数字滚动 |
| `Crowd(n, mode='funnel'|'pick')` | 一群小人，漏斗筛选或挑出一个 |
| `Swap(frm, to, strike_at, to_at)` | 划掉一个词换成另一个 |
| `Photo(key, x, y, w, h, cap=...)` | 真实照片，自动在画面上署名（读 `render/photos/epN_credits.json`） |
| `News(key, x, y, w, src='媒体 · 日期')` | 真实新闻截图（`render/news/<key>.png`） |

需要新图形时在 `render/engine.js` 里加一种 `kind`，再在 `sb_head.py` 加一个辅助函数——第 4 期就是这样加了尺子、成绩榜、聊天窗等 12 种。

## 照片和新闻截图

- 照片从 Wikimedia Commons 找（公共领域、CC0、CC BY、CC BY-SA），下载到 `render/photos/epN_<key>.jpg`，作者、许可、原始页面写进 `epN_credits.json`。CC BY-SA 的照片画面上要署名，`Photo()` 会自动加。
- 新闻截图：`node render/news_shot.mjs <key> <url> ...` 按手机宽度截页面顶部，再裁到只剩媒体名、标题、日期；新闻配图不截。出处和链接写进 `render/news/sources.json` 和发布简介。
- 放照片的场景不要再叠和口播重复的大字。

## 检查

```bash
chonggu.sh preview a 03 04     # 每个场景取开头、中间、结尾三帧拼成总览图，并打印场景时间表
```

用 Read 打开总览图，自己先过一遍：有没有空屏、字压字、元素出得太早（口播还没说到）、一屏塞太多、照片署名缺失；再给用户看。

# 《重估》做视频 SOP（第 8 期复盘）

2026-11-04 · 《重估》制作组

公开版（2026-11-25 整理）：本机路径写成 `~/…`，人名换成角色（主讲、发布人、制作人、搭档），内部数字略去。「制作人」指管那台 Mac 和 AI 代理的人。

## 1. 一页速查

一期视频走 10 步。每一步都有一道「门槛」：门槛没过，不往下走，也不发给任何人。第 8 期大部分返工都是因为某一步没过门槛就往下走了。

1. **稿子**（主讲人写，AI 帮查）。门槛：每个数字和原话都有出处；自己念一遍不拗口；平台敏感点过一遍。
2. **录音**（主讲人）。门槛：按第 4 节的「怎么念」录；录完写一张「我改了哪些词」的单子。
3. **剪口播**（AI 跑程序）。门槛：接缝检查、拆段查重复、整句对字幕，三项都过；字幕改成录音里的说法。
4. **画面代码和时间线**（AI）。门槛：代码语法检查通过；画面引用的字在字幕里都找得到；每章抽几帧看过。
5. **配乐和音效**（AI，主讲人听）。门槛：章名出来时音乐不突然、情绪对得上内容；全片响度 −15 LUFS。
6. **渲染**（电脑）。1080p 三章并行；2K 一章一章出，加大显存。
7. **交付前检查**（AI）。门槛：第 9 节清单全部打勾才发。
8. **主讲人看手机版**。标出时间点和问题，回到对应那一步改，改完再从第 7 步查。
9. **封面、标题、简介**。门槛：标题和封面是同一个钩子；有出处撑着；署名主讲人。
10. **上传和发布**。成片一整个放 GitHub Release；平台发布时勾「内容由 AI 生成」。

第 8 期最贵的教训：**发出去的东西必须是查过的那一份。** 改完不看就发，返工比查一遍慢得多。

## 2. 分工和工具

### 主讲只看这一段
1. 开工：和代理一起填开工单（第 3 节），约 10 分钟。
2. 读稿：代理在对话里贴出纯口播全文，你直接改。你说可以，才往下做。
3. 看 90 秒开场样片，说行还是不行。
4. 录音：照第 4 节一次念完，用微信「文件」或隔空投送发给制作人。
5. 录完当天：看代理列的「改了词 / 没念 / 念错」清单，回一句确认。念错的事实当天补录。
6. 等成片：代理每到一步会报一句，你不用问进度。
7. 戴耳机用手机看完整版，按「分:秒 + 问题」列给代理。
8. 定三件事：事实口误怎么修，封面选哪张，标题选哪个。
9. 你说「可以发」，代理才传 GitHub。发布人照第 11 节发平台。

### 谁做什么
| 角色 | 谁 | 负责 | 不负责 |
|---|---|---|---|
| 主讲 | 这期谁讲就是谁 | 选题、语气、改稿、录音、看样片、用手机完整看听一遍、决定事实口误怎么修、说「可以发」 | 写代码、调参数 |
| 发布人 | GitHub 仓库 `GavinGudz/chonggu-podcast` 和发布账号的主人 | 上传抖音和 B 站、勾选平台选项、署名、合集 | 改片子 |
| AI 代理 | Claude Code（跑在制作人的 Mac 上） | 查资料、核事实、写初稿、找素材、写画面代码、剪口播、混音、渲染、质检、封面简介、传 GitHub | 替人听声音（它听不到）；替人决定事实口误、署名、发不发；装要付费或要输 Mac 密码的软件（先说清多少钱、要主讲做什么。第 8 期装 After Effects 卡在密码上，后来没用） |
| 电脑 | 制作人的 Mac（18 核，128 GB 内存） | whisper 听写、降噪、逐帧渲染、ffmpeg 编码 | 不花额度 |

整套环境只在这台 Mac 上：前几期文件夹里的环境，加上制作人的 gh 登录（仓库协作者）。发布人主讲时只录音、看片。录音发给制作人，由制作人交给代理。

三条规矩：
- 主讲在配音、做画面之前看稿子。第 8 期全片做完才通读稿子，v1–v9 返工多次。
- 代理听不到声音。「好不好听」「刺不刺耳」「音乐大不大」，以主讲用手机听的结论为准。第 8 期配乐从「听不见」到「头痛」，都是主讲听出来的。
- 推 GitHub、给发布人发邮件，要主讲先说可以。**仓库是公开的**，传上去谁都能下载（第 11 节）。

### 片子是怎么做出来的（给不写代码的人）
片子不是在剪辑软件里剪的。每一章是一段网页程序。电脑把网页一帧一帧截图（每秒 30 帧，全片 29267 帧），再拼成视频。声音另外做好，最后合进去。
- 好处：改一句话，画面自动跟着字走。
- 坏处：改一个字幕，也要重新截图。

### 文件夹
本期工程在 `~/Documents/Codex/2026-10-27/chonggu-ep8/`。成片工程是其中的 `film_v9/`，命令默认在这里跑。

```
chonggu-ep8/
├─ 稿子_<主讲>_v*.md             各版稿子（v16_重录用.md 是录音念的那版）
├─ 外部事实核查底稿_v5.md、人机味审稿_v5.md、剪辑规范_v7.md
├─ work/facts_all.json            招股书引语比对结果
├─ film_full/                     v7 工程；lib/ audio_lib/ fonts/ 的真身在这里
└─ film_v9/
   ├─ index.html film.js film.css render.mjs   渲染页面和截图程序
   ├─ timeline.json               定稿时间线（字幕就是这里的 text）
   ├─ tree9.js space9.js treeskin.js   各章共用的树和 3D
   ├─ ch/*.js                     一章一个画面文件（calm.js 是三章共用）
   ├─ voice/                      口播：录音、听写、挑遍、接缝、人声链
   ├─ tools/                      构建、质检、封面、上传脚本
   ├─ assets/                     入库素材（clips/ s1/ v9/）
   ├─ raw/                        原始素材，按章分
   ├─ music_plan_v17.json         配乐编排
   ├─ lib audio_lib fonts node_modules   软链接，见下面「环境」
   └─ out/                        分章、成片、手机版、封面、简介（42 GB）
```

新工程放在 iCloud 不同步的地方：文件夹名以 `.nosync` 结尾，例如 `~/Documents/Codex/<日期>/chonggu-epN.nosync/`；或者只把 `out` 建成指向 `out.nosync` 的软链接。`~/Documents` 由 iCloud 同步，第 8 期 42 GB 的 `out/` 就在里面。它有没有被同步、有没有抢 CPU，还没核实。

### 名词
- 口播：主讲念的话。句 id：每句话的编号，比如 nx04（nx 是章，04 是第几句）。
- 遍（take）：同一句念一次就是一遍。听写（whisper）：电脑把声音转成字。
- 接缝：两段录音接在一起的地方。气口：没人说话、音乐抬起来的空档。
- dB：音量差，数越负越小声，小 10 dB 听着大约小一半。LUFS：整片的平均响度。LRA：响度的起伏，越小越平。
- 半帧：某一帧没画完就被截下来，一闪而过。2K：2560×1440，比 1080p 清楚。
- Release：GitHub 上放大文件的下载页。

### 给 AI 代理：环境
开工先核对（cwd `film_v9`）：
```bash
which python3 node ffmpeg rubberband gh
realpath lib audio_lib fonts node_modules ~/Documents/Codex/2026-10-25/chonggu-ep7/tts-env   # 不用 readlink，它只看一层
gh auth status; gh api user --jq .login; gh repo view GavinGudz/chonggu-podcast --json visibility
```

工程外的依赖。哪个文件夹被删了，对应那一步就跑不了：
| 哪一步 | 要什么 | 真身在哪 |
|---|---|---|
| 渲染 | node_modules | `~/Documents/Codex/2026-09-29/chonggu-ep3/render/node_modules`（第 3 期；中间经过 film_full、第 7 期 render/ 两层软链接） |
| 渲染 | Chrome | `render.mjs` 写死了 `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` |
| 降噪 | enh-clearvoice | `~/Documents/Codex/2026-10-25/chonggu-ep7/enh-clearvoice`（第 7 期） |
| 挑遍 | tts-env | `~/Documents/Codex/2026-10-14/chonggu-ep5/tts-env`（第 5 期；第 7 期那个只是软链接） |
| 查页码 | S-1 全文 | `~/Documents/Codex/2026-10-27/anthropic/work/anthropic_s1_sec_verified_text.txt` |
| 画面库 | lib、audio_lib、fonts | `chonggu-ep8/film_full/`（改 `lib/kit8.js` 会连 film_full 一起改） |

- 两个 python 不能互换。`select_takes.py` 用 `~/Documents/Codex/2026-10-25/chonggu-ep7/tts-env/bin/python`（有 pypinyin，没有 mlx_whisper），其余用系统 `python3`（有 mlx_whisper，没有 pypinyin）。
- 写死项开工先找全（cwd `film_v9`）：`grep -lE "第8期|第 8 期|v18|ep8|rec16|16\.json|anthropic_s1|v9_noaudio|QUOTE *=" tools/*.py tools/*.sh voice/*.py mix_plan.py render.mjs`。第 8 期查出 33 个文件，要逐个改。另外：清空 `voice/make_seams.py` 的 KEEP、MUTE_ANYWAY、EXTRA（里面是第 8 期的句 id）；`tools/s1page.py` 的文本路径换成本期文件，先拿 3 处已知页码验一遍；`repeat_audit.py` 的对比片换成上一版；封面脚本的底图换掉。
- 下一期建议：
    - lib、audio_lib、fonts、node_modules 真复制进新工程，不用软链接。
    - 原声句集合收进一个共享文件。现在是约 10 个脚本里的 `QUOTE`，加上 assemble.py 的 `FIX` 和 assemble_clone.py 的 `QA`。
    - 字幕单独做一层（ASS 或透明视频），最后用 ffmpeg 叠上去。第 8 期改 17 句字幕，就得整片重渲。

### 给 AI 代理：主要程序
| 程序 | 干什么 | 输入 | 输出 |
|---|---|---|---|
| `voice/asr.py` | 整条录音听写，带每个字的时刻 | `rec16.wav` | `asr16.json` |
| `voice/select_takes.py` | 每个小句挑最后完整的那遍 | `asr16.json`、`../timeline.json` | `sel16.json` |
| `voice/assemble.py` | 按挑好的遍拼出口播，打印说话字速 | `rec16_se.wav`、`rec16_hp.wav`、`asr16.json`、`sel16.json`、`ovr16.json`、`../timeline.json` | `narr_raw16.wav`、`narr_spans16.json`、`narr_groups16.json` |
| `voice/chain.py` | 人声链：去低频、去齿音、定响度 −16 LUFS | `narr_raw16.wav` | `narr16_c_base.wav` |
| `voice/audit_local.py` → `make_seams.py` → `apply_seams.py` | 找接缝碎音，原位换成静音 | 拼好的口播、`rec16_hp.wav` | `local16.json`、`seams16.json`、`narr16_c.wav` |
| `voice/owner_lines.py` | 逐句切出、收停顿、提速 | `narr16_c.wav` | `owner16/<句id>.wav` |
| `voice/assemble_clone.py` | 拼整条口播、加呼吸点、打印字速 | `owner16/` | `clone/v18_owner.wav`、`clone/v18_owner.spans.json` |
| `voice/make_timeline_voice.py` + `tools/apply_breath.py` | 按真声给每个字定时刻 | 整条口播 | `timeline.json` |
| `voice/check_lines.py` | 整条口播逐句听写，和字幕比 | `clone/v18_owner.wav`、`.spans.json` | 屏幕（重定向到 `out/check_*.txt`）、`check16.json` |
| `voice/chunks_check.py` | 原始录音按停顿拆段听写，相邻段开头相似就是重念 | `rec16_se.wav`、`narr_groups16.json`、`seams16.json` | 屏幕（`out/chunks_*.txt`）、`chunks16.json` |
| `render.mjs`（`tools/part.py` 包一层，写死 `--stable 3`） | 逐帧截图出视频 | `timeline.json`、`ch/*.js`、`assets/` | `out/parts/*.mp4` |
| `mix_plan.py` | 口播、配乐、音效、原声混到一起 | 无声画面、口播、`music_plan_v17.json` | 成片 mp4、`mix_plan.wav`、`cues.json` |
| `tools/pack_v18.py` | 手机版和编辑包 | 成片、`out/编辑包_v17/说明.md`（模板） | `out/第8期v18_手机_*`、`out/编辑包_v18/` |
| `tools/cover_v18b.py`、`tools/intro_v18.py` | 封面、发布简介 | 招股书截图、时间线 | 两张 png、`发布简介_第8期.md` |
| `tools/upload_v18.sh` | 传 Release、写 README | 成片、封面、简介 | GitHub 上的 `第8期/` |
| `tools/cross_check.py`、`tools/glitch_scan.py`、`tools/flicker_scan.py`、`../film_full/work/edit/flash.py` | 画面质检 | 成片 | 屏幕输出 |

## 3. 写稿

稿子是最便宜的返工点。主讲认可稿子和 90 秒开场样片之前，不配音，也不做全片画面。第 8 期 v4、v7 都是做完全片才被否掉的。

给主讲看稿：在对话里直接贴纯口播全文，让他能一键复制、直接改，再附上文件路径。不能只给路径。原声句照样标「〔原声 · 不念〕」。

### 开工单（动笔前，主讲确认）
写一页，九项：
1. 参考片 1–2 个。第 8 期是小Lin说。
2. 语气：偏激，还是温和解释型。第 8 期先要「偏激」，后改成小Lin式。
3. 目标时长：12–16 分钟。第 8 期 v3 写到 22 分钟，返工。
4. 谁主讲；单人还是双人；出不出镜。
5. 画幅和平台：横版 16:9 还是竖版；出不出 2K（第 8 期的 2K 是中途临时加的）。
6. 额度预算：全期最多用周额度的百分之几（第 13 节）。
7. 长期授权：哪些事代理可以直接做（第 8 期：Pixabay、Freesound CC0 的配乐和音效直接下），哪些一定要问（推 GitHub、发邮件、下载新模型、装软件）。
8. 主讲在哪个时区；抖音勾不勾「内容由 AI 生成」；平台风险管不管。
9. 代理自己做的假设，逐条列出。第 8 期代理以为「只用招股书」，主讲说：「我从来没有说过只用招股书的规矩」。

### 结构
- 用人、冲突、事件开场：别人的原话、真事件、文件里吓人的那句。第 8 期 v9 用印度合影和 Hugging Face 被黑开场，才被认可。
- 文件当证据，不当提纲。按招股书章节排的 v7 被说「像读稿」「要睡着」。
- 全片一个骨架，结尾回扣。第 8 期是一棵树：钱、方向盘、越界、下一代。
- 每 3–4 分钟一次起伏：一段新闻访谈，或一段快剪（第 6 节）。
- 固定开场：「这里是《重估》，我是〈主讲〉。」「我是〈搭档〉。」「我们重新审视那些被默认接受的答案。」「今天，我们重估______。」
- 片尾：「这里是《重估》，我是〈主讲〉。以上内容，不构成投资建议。」开头不放免责声明。
- 当事人原声单独成一句，稿子里标「〔原声 · 不念〕」，id 建议统一带 q。程序认原声不看 q，看写死的集合（第 8 期的 e0、rv00、nx15 就不带 q）。加一句或删一句原声，要同步改约 10 个脚本里的 `QUOTE`、assemble.py 的 `FIX`、assemble_clone.py 的 `QA`。

### 口语化
- 写成不均匀的口语。不要排比、三连、金句收尾，不要「这不是X，是Y」。
- 不念出处，不说谁算的、谁说的、有没有核实。第 8 期主讲为这类句子删了四次。
- 不用预告句：「先不说」「最后再拆」「你先记住」。
- 主持人不宣布自己的反应：「让我愣了一下」「有点意思」。
- 去翻译腔。分号改短句。「说白了」最多一次。一个比喻只在开头用一次、回扣一次。
- 指代要点名。稿子只写了「那家评测公司」（其实是 Irregular），主讲连问两次是不是 Hugging Face。
- 一句只讲一件事。官司那两句塞了两场判决，主讲「没看懂」，后来拆成了四句。
- 词频只拿来比新旧两版，不当及格线：主讲认可的 v16 里「呢」每千字 1.4 个，小Lin 是 3.4。人味够不够，以冷听众审稿加主讲读稿为准。命令见本节末。

### 事实和出处
- 每个数、每句引语都有出处。招股书引语用程序和原文比对（第 8 期 `work/facts_all.json`，364 条）。
- 页码用 `python3 tools/s1page.py "英文原句"` 查。它只认第 8 期那份 S-1，换文件要先改路径。第 8 期所有页码一度多了 1 页。
- 外部事实单独一份底稿，范例是 `外部事实核查底稿_v5.md`：每条标 [primary/high]、src、ok 或 >>> corrected。会变的条目（调查、指引、估值倍数）标「会变」，发布前复查（第 9 节）。
- 每次改语气、改结构后，事实再核一遍。v4 改写时漂出了「分成五类」，原文是四类。
- 别人贴来的资料也要核。第 8 期一份外部总结有 118 处说法，32 处夸大，1 处错。
- 图表上未披露的部分换一种样式画。第 8 期把 6,370 亿画到 2045 年，可披露的合同只到 2036 年。
- 审稿人渲染了原页说你错，就信原页。第 8 期代理坚持「第 48 页没错」，其实是第 47 页。

### 公平
- 写稿的代理是 Anthropic 的模型，开工时要向主讲申报这层利益冲突。
- OpenAI 和 Anthropic 的同类事，用一样的动词、一样多的细节、一样大的画面。
- 招股书自己承认的坏事照讲：亏损、到 2045 年的算力账单、诉讼、治理上的保留、模型风险。
- 公平审稿：每版稿子定稿前，派一个没参与写稿的子代理来审。输入是纯口播稿和 `ch/*.js` 里屏上的字。输出一张对照表：两家的每件同类事，各用了什么动词、几句话、画面几秒、什么标签。不对称的地方逐条列给主讲定，全部有结论才算过。第 8 期 v5 初稿写 Anthropic 偏软，就是这样抓出来的。

### 平台风险
- 写稿时就标出抖音的雷：领导人照片、时政、「下注」、加密货币、荐股、「财富自由」、美国意象。
- 第 8 期写着「平台风险先不管」，片里有总统、战争部长、真人照片。下一期在开工单里写明管不管。
- 被拒后默认保留内容：换掉最尖的词、截图打码、加说明，不整段删。
- 不诽谤，不荐股，预测说成主讲自己的看法。

### 数字和读音
- 口播里的数字只留最有冲击力的几个，其余放屏上。
- 查同音：「一签 20 年」听着像「一千二十年」，改成「签下来就是 20 年」。
- 换掉多音字：得（děi）改成「要」，转（zhuàn）改成「赚」。《重估》念 chóng。
- 录音前给主讲一张难读词表：英文名（Claude、Mythos、Opus、METR、Irregular、Hugging Face）、法名、人名。第 8 期主讲把《国防生产法》念成了《国防安全法》。

### 双人期
- 主持人少表态，冲突来自事实本身和搭档的回答。
- 问题要短，一行一个，一次只问一个，称呼照平时录音里的叫法。
- 不写主持人的个人情况，不编主持人的经历。要用，就用【】留空，让本人填。
- 第 7 期是两段各自独立、长度相近的独白，没有问答。

### 给 AI 代理
- 主讲否掉一句，就把同类说法全找出来，一次给他看，一次改完。
- 每版稿子派一个「冷听众」代理，只读纯口播，列出每个「那家」「它」指的是谁、哪句听不懂。
- 新增一种段落或素材类型（比如放松段）时，先给主讲一句话的方案和一个 10 秒的样，他点头再做。第 8 期第一版放松段用的是空镜，主讲要的是新闻访谈。
- 禁用词检查。cwd `film_v9`，查定稿字幕和画面上的字，不查旧稿：

```bash
P='我算|自己算|自算|我除|加了一下|回原文|自报|自己报|自己说|自述|别人没查|没人查|[没未]经.{0,6}核实|还在查|的说法|账上|这笔账|先不说|最后再拆|后面再讲|后面专门|你先记住|故意跳过|先猜一猜|愣了一下|有点意思|写得很直白|很容易漏掉|到这儿就清楚'
python3 -c "import json,re,sys;[print(b['id'],b['text']) for b in json.load(open('timeline.json'))['beats'] if re.search(sys.argv[1],b['text'])]" "$P"; grep -noE "'[^']*($P)[^']*'" ch/*.js
```

v18 的字幕查出 0 处。`ch/ob.js` 会查出 3 处「它的说法：…」，那是在标注 AI 的原话，属于正当引用。查出来的要逐条看，不一律删。

- 词频对比（新旧两版各跑一次）：

```bash
python3 - ../稿子_<本版>_纯口播.md <<'EOF'
import re, sys
s = ''.join(re.findall(r'[一-鿿]', open(sys.argv[1]).read())); k = len(s) / 1000
for w, r in {'其实': 2.9, '咱们': 1.1, '你看': 2.2, '呢': 3.4, '吧': 1.4, '这个': 7.3, '所以': 2.2, '然后': 1.4, '但是': 0.9, '它': 5.6}.items():
    print(w, round(s.count(w) / k, 1), '小Lin', r)
EOF
```

## 4. 录音

录音时多花 1 分钟，剪辑能省 1 小时。目标是每一句都有一遍干净、完整、前后带停顿的版本。第 8 期的接缝碎音和半句重念，根子都在录音：句间没停顿，念错了接着往下说。

### 怎么念
1. 一次把整稿念完。第 8 期用的是一条 24 分钟的录音（`voice/rec16/rec16_raw.m4a`，1459 秒）。
2. 一句一句念，念完停半秒以上再念下一句。
3. 念错了停 1–2 秒，从这句的开头整句重念。不要从错的那个词接着说。
4. 不要半句接半句。卡住就停，回到句首重来。最后完整的那遍算数。
5. 照平时跟朋友讲事的速度念，不用赶（第 8 期约 250 字/分）。后期会收停顿、再提速，成片约 310–320 字/分。
6. 「〔原声 · 不念〕」的句子跳过。
7. 难读词照词表念：《重估》念 chóng，英文名照英文念。

为什么：第 8 期 ob03、oa18、wh09、wh10、wh13、ct19 都是念了半句又重来，整句听写把两遍并成一遍，漏进了成片。句间没停顿，程序下刀时又把邻句的半个字带了进来（「开了家新公司，司」）。

### 改了词要说出来
- 念的时候可以改词、跳句。录完给代理发一句话：哪些句改了词，哪些没念。第 8 期字幕跟着录音改了 18 句，没留记录，只能靠听写一句句对出来。
- 事实性的词不临场改。改了要当场确认对不对。第 8 期 wh14 念成了《国防安全法》（应为《国防生产法》），oa17 把「Sacrifice rational」说成了「牺牲是值得的」，到 v18 都还没修。

### 设备和交录音
- 单人：手机语音备忘录就够。手机离嘴 20–30 厘米，别碰桌子和衣服；找安静的房间，关掉空调和风扇。
- 双人：每人在自己那头用动圈 USB 麦本地录，开录和结束时都拍手，后期靠拍手对齐。不用腾讯会议的音频：远端那路只剩 8 kHz 以下，后期修不回来。设备和录法见 `~/Documents/Codex/2026-10-26/播客录音设备_推荐和录法.md`。
- 录完自己听开头、中间、结尾各 30 秒，确认没有喷麦、没有持续的底噪。
- 交录音：在「语音备忘录」里点这条 → 分享 → 用微信「文件」发给制作人，或者隔空投送到制作人的 Mac。不要按住说话发语音消息。
- 交给 AI 的东西：录音文件，标过改词的稿子，故意没念的句子清单。

### 录完当天
1. 代理整条听写，和稿子逐句比，列出改词、跳句和事实口误。
2. 事实口误当天补录这一句，用同样的停顿、同样的嗓子（怎么并进来见第 5 节）。
3. 主讲确认改词清单，字幕照它改。

### 不用克隆声
第 8 期 v11–v15 用克隆声，被说「假声」「夹着嗓子」，整条路线作废，v16 起改用真声。以后：
1. 默认用真声。
2. 克隆只用于主讲点名的短词替换，不用来说新的观点。
3. 不克隆任何人的声音，除非本人同意。
4. 下载新的 TTS 模型之前先问主讲。
5. 真要换配音方案，先出 30 秒 A/B，量中位基频：和真声差超过 1 个半音就不用（IndexTTS-2.5 是 153–185 Hz，真声 141–145 Hz）。
6. 合成前把每句的拼音打出来查；英文名合成后用听写回查。

### 给 AI 代理：入库（cwd `film_v9/voice`）
- 先 `ffprobe rec16/rec16_raw.m4a` 看格式。第 8 期是微信文件发来的 AAC，48 kHz 单声道。整条链路保持 48 kHz。
- 转格式（第 8 期没留命令，这是推断）：`ffmpeg -i rec16/rec16_raw.m4a -ac 1 -ar 48000 -c:a pcm_f32le rec16.wav`
- `rec16_hp.wav`（只切低频）的生成命令和截止频率都没有记录，可 `assemble.py` 和 `apply_seams.py` 都要读它。下一期把这两步写进脚本。
- 降噪，cwd 必须是 `~/Documents/Codex/2026-10-25/chonggu-ep7/enh-clearvoice/ckpt`：`../bin/python -I ~/Documents/Codex/2026-10-27/chonggu-ep8/film_v9/voice/cv_se.py <输入.wav> ~/Documents/Codex/2026-10-27/chonggu-ep8/film_v9/voice/rec16_se.wav > ~/Documents/Codex/2026-10-27/chonggu-ep8/film_v9/voice/rec16/se.log 2>&1`。输入推断是 `rec16_hp.wav`。
- 听写：`python3 asr.py rec16.wav asr16.json > rec16/asr.log 2>&1`。跑之前把 `asr.py` 的 `initial_prompt` 换成本期的专有名词。
- 文件名里的 16 指第 16 次录音。换编号时，`audit_local.py`、`make_seams.py`、`apply_seams.py`、`chunks_check.py` 里写死的 `*16` 要一起改（第 2 节那条 grep 能全找出来）。

## 5. 剪口播

剪口播只求三件事：每句只留最后完整的那遍，接缝里不带别的声音，一个真字都不丢。第 8 期这一步错得最多。主讲两轮按时间点报错，v18c 从拼口播起几乎全片重来。

本节只适用单人单条录音。双人期两人各录一轨，用拍手对齐。第 7 期的双人做法在 `~/Documents/Codex/2026-10-25/chonggu-ep7/work/`（`assemble2.py`、`build_ep.py`），和 film_v9 不是一套，开工前先定用哪一套。

### 规则
1. **选遍**：每个小句取最后完整的那遍，念了半句的一律不用。主讲没念的句子从字幕里删掉。
2. **接缝碎音**：先看接缝边上那一小截声音。它 ≤0.45 秒、和正文隔着 ≥0.08 秒；或者切点落在声音中间、它 ≤0.7 秒（这是 `audit_local.py` 的条件）。如果它在原始录音里离前一遍近、离本句正文远，就是带进来的尾巴，原位换成静音。去掉它以后听写会少字的，就留着。
3. **先排除上一句自己的结尾**：做头部静音前，查一下这截是不是上一句的尾字。第 8 期 rv05「老大哥」的「哥」就是这样被静掉的。
4. **切点落在能量谷底**，不按 whisper 的字边界下刀。whisper 把「就是」标在 26.96 秒，实际 27.4 秒后才开口。
5. **半句重念**：`chunks_check.py` 把每句按 ≥0.15 秒的停顿拆成小段，逐段听写，相邻小段开头相似就是重念。整句听写会把重念并掉。
6. **整句对字幕**：`check_lines.py` 逐句听写，和字幕逐字比。每处差异三选一：① 照录音改字幕；② 标成念错，交给主讲；③ 判成听写错，但要有证据：用 `chunks_check.py` 拆段重听，或者用 `listen.py` 换个切法再听，两次都听成字幕上的字才算，重听结果写进 flags 文件。第 8 期 nx11 第一次听成「用上」，被直接当成听写错放过，结果「重视」真丢了。
7. **字幕跟着录音改**：改 `timeline.json` 里的 `text`，稿子 md 同步改。
8. **改前改后逐字比**：每次静音或剪切之后，跑两遍 check_lines 再 diff，新冒出来的少字全写进 flags 文件。第 8 期 nx04 的「今年 9 月」，就是静音工具算偏了位置删掉的。命令在下面（没实测过，按文件格式推断可行，每遍 2–3 分钟；每跑一次都会覆盖 `check16.json`）。
9. **待办文件**：筛查标出的问题全部写进 `out/flags_<版本>.txt`。代理来写，一行一条：`句id<TAB>来源(check_lines/chunks_check/select_takes/主讲)<TAB>问题<TAB>状态(open/改了/主讲定/听写错+证据)`。没有一条是 open 才交付。第 8 期 wh09、wh10、wh13、ct19 早被筛查标出，没进待办，漏进了成片。
10. **检查在渲染前做完**：阻塞执行，不过不渲。第 8 期核对放在后台和渲染同跑，查出 nx04 时片子已经渲完，只好补渲两章。
11. **主讲最后亲耳听**：检查全跑完后，主讲用手机从头听一遍，按时间点报问题。

### 提速倍数
`assemble.py` 跑完会打印「说话时 N 字/分」。倍数 = 300 ÷ N，最多 1.22（`owner_lines.py` 注释：再快字就赶了）；N 在 290 以上就不提速。第 8 期 N = 249，用 1.2，成片是 316 字/分。

### 给 AI 代理：命令顺序（cwd `film_v9/voice`）
```bash
python3 asr.py rec16.wav asr16.json > rec16/asr.log 2>&1
~/Documents/Codex/2026-10-25/chonggu-ep7/tts-env/bin/python select_takes.py asr16.json sel16.json
# 人工核对可疑句，手写 ovr16.json（听：python3 ../tools/listen.py 文件 起 长 zh）
REC=16 python3 assemble.py            # 打印「说话时 N 字/分」
python3 audit_local.py                # 逐条判，结论写进 make_seams.py 的 KEEP / MUTE_ANYWAY / EXTRA
python3 make_seams.py
python3 chain.py narr_raw16.wav narr16_c_base.wav
python3 apply_seams.py narr16_c_base.wav narr16_c.wav
# 规则 8：静音前后各听写一遍，再比
python3 check_lines.py narr16_c_base.wav narr_spans16.json > ../out/check_before_mute.txt 2>&1
python3 check_lines.py narr16_c.wav narr_spans16.json > ../out/check_after_mute.txt 2>&1
diff ../out/check_before_mute.txt ../out/check_after_mute.txt
REC=16 python3 owner_lines.py 1.2     # 倍数按上面算
BREATH=breath_v17.json PACE=v12 FLAT=1 python3 assemble_clone.py owner16 clone/v18_owner.wav all 1.0
python3 make_timeline_voice.py clone/v18_owner.wav clone/v18_owner.spans.json
cd .. && python3 tools/apply_breath.py voice/breath_v17.json && cd voice
python3 check_lines.py clone/v18_owner.wav clone/v18_owner.spans.json > ../out/check_v18c.txt 2>&1
python3 chunks_check.py > ../out/chunks_v18.txt
```

### `ovr16.json` 写法
| 写法 | 意思 |
|---|---|
| `"句id:小句序号": [起, 止]` | 这一小句用这一段（原始录音里的秒数） |
| `"句id:*": [起, 止]` | 整句用这一段；`[[起,止],[起,止]]` 是几段拼成一句 |
| `"句id:*": ["xx", 起, 止]` | 两头按字切；`"x"` 是只有尾巴按字切 |
| `"句id:k": null` | 主讲没念这一小句 |
| `"_exact": [句id]` | 这些句子每一段的两头都按字切 |
| `"_edge": {"句id:段序号": [起或null, 止或null]}` | 直接给定这一段的切点 |

### 易错点
- 一定要写 `REC=16`。不写，默认读第 11 次录音的文件。
- 不加 `CLAMP=1`，那是旧做法。
- `select_takes.py` 读 `../timeline.json` 里的字。跑之前，时间线里的字必须是主讲念的那一版。
- 改词或补录之后，这句旧的选段全部作废，要把 sel 和 check_lines 里这句听写出来的字和字幕逐字比一遍。第 8 期 v4 的旧 take 带着 cer=0 被选中（score_takes 按文件名缓存），发出去的是旧结尾。
- 补录怎么并进来：第 8 期没做过，没有现成办法。建议（没试过）：把补录文件接到原录音的末尾，原有的秒数不变，ovr 里原来的条目照用；从降噪那步起重跑，再在 ovr 里用 `"句id:*": [起, 止]` 指到末尾那段。
- 录音以后不再跑 `make_timeline.py`，它会覆盖定稿时间线。
- `make_timeline_voice.py` 和 `apply_breath.py` 成对跑，各跑一次。`apply_breath` 跑两遍，字幕时刻就错了。
- 真声必须 `FLAT=1`，不用 `breathe()`。第 8 期误用以后，口播被拉长到 17.7 分钟。
- 人声链（`chain.py`）只做去低频、去齿音、静态增益到 −16 LUFS 和限幅。不加压缩器，也不做动态响度标准化：这两样都会把齿音提亮，主讲要求「不能刺耳」。中间 wav 一律写 `subtype='FLOAT'`。
- 改了 `ovr16.json`、让某句重新分段以后，这句的接缝要重审一遍。
- `apply_seams.py` 改过以后，先在已知样例（nx04、rv05、b3/b4）上回归，再全量跑。
- `probe.py` 写死读 `rec11_se.wav`，`verify.py`、`dupcheck.py` 写死读 `asr11.json`。新录音直接用它们，会听错文件。
- 「（停 x）」的长停顿是从 `../timeline_est_v10.json` 读的。稿子里再改停顿，口播不会跟着变。
- `chunks_check.py` 读的是原始录音，查不出拼完以后才出的错（比如 nx04 的静音偏位），所以规则 8 的前后对比不能省。

## 6. 画面

画面有三条底线：时刻挂在字上；素材入库先查；改完代码先看帧，再整章渲。第 8 期两次整章空白、一次 1:18 闪，都是因为这三条没做到。

### 章节代码
- 一章一个文件 `ch/<章>.js`，写法是 `CH.push({name, build:(F,K,X)=>…})`，由 `index.html` 按顺序载入。
- 共享文件：`lib/*`（真身在 film_full）、`tree9.js`、`space9.js`、`treeskin.js`、`ch/calm.js`（wh、ob、nx 三章共用）、`film.js`、`timeline.json`、`mix_*.py`、稿子。并行时每人只改自己那一章，这些都不动。
- 子代理任务书的范例是 `film_v9/FIX_V17.md`。每份任务书第一段固定写两句：「任何人的邮箱、姓名、电话都不放进请求头（User-Agent）、网址、表单和文件，User-Agent 只写项目名」；「交付时和主讲看过的上一版逐镜对比，列出换掉了哪些镜头和素材」。第 8 期有子代理把主讲的邮箱写进了 Wikimedia 请求的 User-Agent。
- 规范按 `V10_ROLL.md` 写明的顺序叠加，排在后面的优先：`WRITE_V9.md` → `SPACE_V10.md` → `TREE_V10.md` → `V10_ROLL.md` → `FIX_V17.md`。`CHAPTERS_V9.md` 是各章的内容安排，另外看。
- 一章有语法错时，整个文件不执行，`film.js` 只画一个「（这一章还没做）」的占位，渲染照样成功。**「渲出来了」不等于「画对了」。**

### 按字定时
- 时刻只写 `cue(句id,'字')`、`w()`、`c()`、`B(id)`，不写死秒数。换了配音，画面自动跟上。
- `cue` 取的是这句里第一次出现的那个字。要第二次出现的，就换一个字挂。
- `B(id)` 是镜头切点，不是开口。有呼吸点的句子，开口用 `cue(id, 第一个字)`。`film_base.js` 里「B(句) 开口」那条注释已经过时。
- 删一句时，它独占的镜头、卡片、音效、出处一起删。
- 字幕改完，跑引用检查（见文末）。

### 素材
- 真东西优先：新闻视频、推文截图、报告原页、招股书原页、当事人原声。找不到才画动画。
- 免费实拍只用 Pexels、Pixabay（Mixkit 的 1080p 已经不免费了），Pixabay 上标了 AI 生成的跳过。学小Lin说只学结构和讲法，不用她的片段、音乐、卡片样式和原话。
- 一个素材全片只用一次。用之前先 `grep -rn <名字> ch/*.js assets/clips/counts_*.json` 查一遍。
- 入库用 `tools/clip.py`。前缀必须在 `film.js` 的 `PRE` 列表里（第 8 期是 a rv ls ct wh om oa ob nx cm），新前缀要先加进去，否则画面会报「实拍 … 没登记」。
- 入库后查素材自带的镜头切换（命令见文末）。`K.frameSrc` 会来回放，带切换的素材会闪。第 8 期 1:18 的那一下闪，是片名卡底片 `nf_dots` 自带的切换，从 v10 一直带到 v18。只用两个切点之间的干净段。
- 截图入库后查是不是白板（命令见文末）。第 8 期截招股书原页时坐标没算滚动，截成了一片白。
- 抽出的帧固定是 1920×1080。2K 版里的实拍是放大的，不会更清楚。
- 真人照片只用图注里写明是谁的。第 8 期一张没写人名的达沃斯照片，被标成了阿莫代。
- 引语只配说话者本人的画面，或者文件原页。第 8 期一句招股书原话配在了 Cat Wu 的特写上。
- 不用 AI 生成的人像，不给真人配他没说过的话。
- 要登录、要付费、返回 403 的素材不绕过，列给主讲自己下载。
- 下载的同时就往 CREDITS 记一行（第 7 节）。

### 片名卡
- 用 `K.titleCard`。底片带切换时，传 `c0`、`rate` 避开。第 8 期用的是 `c0: 2.45, rate: .55`：只取第 40–124 帧，放慢后铺满 4.8 秒。
- 片名卡的音乐要庄重（第 7 节）。

### 新闻访谈插段和快剪
- 放松段用新闻访谈原声，让观众不用跟着主讲的话去想。主讲原话：「要有信息量，放松指的是不需要听我的话去思考的放松」。
- 第 8 期三段分别放在 wh、ob、nx 开头（`ch/calm.js` 的 wall、feed、cinema），样式各不相同。
- 长度由呼吸点决定：`breath_v17.json` 里 wh01=18、ob01=16.8、nx01=15.1 秒。
- 快剪全片只用一处。第 8 期 om 一章约 25 秒的恐怖片式快剪得到了好评；章章都加，又会变成一种固定情绪。

### 动效规矩
- 不定格：没有超过 2 秒完全不动的画面；视频片段不冻住；空档里相机慢漂（每秒推 1.5%、转 0.3°，最长 4 秒）。
- 不闪：不闪白，不出空纸；颜色、位置、透明度不在一帧里跳变。
- 动画比念到的字早 2 帧起手；进场 10–14 帧缓出；大位移 ≥1 秒；回弹只给盖章和关键数字。
- 节奏按镜头类型定：图板停 4–9 秒，实拍 2–5 秒，全片每分钟约 10–13 刀。第 8 期照搬小Lin 的 28.7 刀/分，被说「过于碎了」。
- 空间：每镜至少两层；一章里树的画面不超过 20% 的时间，纸不超过 35%。
- 每章用量上限：「穿过去」最多 2 次，纸擦除最多 1 次，3D 照片最多 3 张且不能连着两镜，同一种转场最多 3 次。纸每次出现都换一种呈现方式。每章要有一个招牌画面。
- 树状图一屏 3–6 张卡，讲完就收。第 8 期全树 151 个节点，片尾收到 17 个。
- 字号 ≥40（出处小字 ≥30），不压字幕（y ≤880），一屏一个主角。
- 运动模糊是 `SP.world(t, cam, items, { mb: … })` 里的 `mb`。cross_check 或 glitch_scan 在哪一镜报了半帧，就把那一镜的 `mb` 改成 0，再重渲这一章。v18 还有很多镜头的 mb 在 .25–.6 之间，用稳妥参数渲出来是干净的。
- 每章至少一个真人说话的镜头，配原声，每段 ≤6 秒。
- 真东西左下角用 `K.src` 写出处，只写来源名，不写「自述」「自报」。

### 改代码的规矩
1. 注释单独一行，或者用 `/* */`。不在代码行中间加 `//`。第 8 期两次因此整章空白，第二次空白的 2K 还发给了主讲。
2. 改完逐个文件跑 `node --check`。`node --check a.js b.js` 只查第一个文件。
3. 抽帧亲眼看：改过的章，开头、中间、结尾各看一张。
4. 让 render.mjs 直接写日志（像 `tools/finish_v18.sh` 里的 `one()` 那样，文件名 `log_<序号>_<前缀>_stable.txt`），查里面的错误行，有一行就算失败。`tools/part.py` 吞掉了 render.mjs 的输出，只留下同时含章名和「出错」的行，查不出语法错和整章占位，不能拿它的日志当检查依据。
5. 改 `lib/` 时记住，它是 film_full 的软链接。
6. 改之前留备份（第 8 期是 `tools/*_before_*.js`）。
7. 交付前和主讲看过的上一版并排出联系表，逐张对着看：至少一半镜头是新的，再列出换了哪些。第 8 期 v10 有几章只是 v9 换了层皮。

### 给 AI 代理（cwd `film_v9`）
```bash
node render.mjs --stills 12.5,30.2 --h 540 --out /private/tmp/<自己的临时文件夹>   # 改代码时抽帧，用 Read 打开 jpg 看
for f in lib/kit8.js ch/open.js; do node --check "$f" || echo "$f 语法错"; done
grep -hE 'pageerror|出错|找不到|树上没有|空档|重叠' out/parts/log_*_stable.txt out/parts2k/log_*_stable.txt | sort -u   # 有输出就算失败
python3 tools/repeat_audit.py   # 防重复镜头；写死了和 out/v9_noaudio.mp4 比，换期时改成上一版
python3 tools/clip.py <前缀> <名字> <源.mp4> <起秒> <长秒> [crop=宽:高:x:y]   # 素材入库；前缀必须在 film.js 的 PRE 里
# 联系表：每张图约 96 秒，两版各出一套对着看
ffmpeg -v error -i <成片> -vf "fps=1/2,scale=320:-1,tile=8x6" /private/tmp/<文件夹>/sheet_%02d.jpg
# 素材自带的切点，打出来的是帧号。nf_dots 打出 1 4 6 7 10 40 126，干净段是第 40–125 帧
ffmpeg -hide_banner -nostats -framerate 30 -i "assets/clips/<名字>/%04d.jpg" -vf "select='gt(scene,0.3)',showinfo" -an -f null - 2>&1 | grep -o 'pts_time:[0-9.]*' | awk -F: '{printf "%d ", $2*30+1}'
# 截图白板：标准差低于 5 的是白板或纯色，要重截（第 8 期 assets/s1 的 45 张里最低是 37.8）
python3 -c "from PIL import Image, ImageStat; import sys; [print(f, round(ImageStat.Stat(Image.open(f).convert('L')).stddev[0], 1)) for f in sys.argv[1:]]" assets/s1/*.png
```

日志里有几条无害的噪音：`[http 404]` 的 `assets/s1/boxes_om.json`、`assets/s1/boxes_cm.json`、`favicon.ico`，以及随之而来的 `Failed to load resource` 行。上面那条 grep 不会抓到它们。

引用检查：修到只剩最后一行「时长 …」、退出码为 0 为止。

```bash
python3 - <<'EOF'
import json, re, glob, sys
T = json.load(open('timeline.json')); BT = {b['id']: b['text'] for b in T['beats']}
n = 0
for f in sorted(glob.glob('ch/*.js')):
    s = open(f).read()
    bad = [m.group(0) for m in re.finditer(r"\b(?:cue|w|c)\(\s*'([a-z]+\d*q?)'\s*(?:,\s*'([^']*)')?\s*\)", s) if m.group(1) not in BT or (m.group(2) and m.group(2) not in BT[m.group(1)])]
    bad += [m.group(0) for m in re.finditer(r"\bB\(\s*'([a-z]+\d*q?)'\s*\)", s) if m.group(1) not in BT]
    if bad: print(f, bad); n += 1
print('时长', T['duration']); sys.exit(1 if n else 0)
EOF
```

这个检查只查得出「找不到」，查不出「取到了第一个同字」。

## 7. 配乐和音效

配乐的规矩：用网上现成的曲子，按情绪分段；说话时压低，气口里抬起；严肃处不欢快；每首都记授权。第 8 期配乐被主讲指出四次：听不见、头痛、开场太欢快、下一代章名太欢快。

### 来源
- 用 Pixabay Music / Sound Effects、Freesound CC0，不自己合成。主讲 10-28：「你还是不要自己去造音乐了」。
- 不从别人的视频里扒音乐（有版权问题，抖音会识别指纹）。想用热门曲，走剪映/抖音的正版库。
- 避开作者登记了 BMI 的曲子。第 8 期原定的 Mystery（Monume）就因此换掉。
- 第 8 期主讲给过长期授权「全都允许 不用问我」，代理自己挑曲、核授权、下载。下一期在开工单里重新确认。
- Pixabay 的文件在浏览器里手动下载，不用脚本抓；下载页的地址记进 `audio_lib/*/urls.txt`。

### 编排
- 按情绪分段，每段一首，写在 `music_plan_v17.json` 的 `sections` 里：`{file, from, to, offset, under, breath, fin, fout}`。第 8 期共 33 段，每段大多 15–60 秒（中位数约 25 秒），最长约 90 秒。
- 锚点写法：`END`、`句id`（开口）、`句id.cut`、`句id.end`、`句id:字`，后面可以跟 ±秒。`句id:字` 取第一次出现的那个字。
- `drops` 是撤掉音乐的地方（讲定义、爆点前），`hits` 是爆点音效。第 8 期有 9 段 drops、8 个 hits。
- 同一首曲子只在回扣的地方再出现。

### 音量
| 位置 | 第 8 期设置 |
|---|---|
| 冷开场，人声底下（`under`） | −13 dB |
| 正文，人声底下（`under`） | −20 dB，切掉 140 Hz 以下（mix_plan.py 自动做） |
| 气口里（`breath`） | −4 到 −6 dB |
| 章名卡、新闻插段那几段 | under −18，breath −7 到 −9，fin ≥1.0 |
| 原声底下 | 再低 6 dB |
| 音效 | `sfx_db −5`：在画面登记的音量上整体再降 5 dB（不是绝对音量）；`sfx_keep` 留 11 类 |
| 人声链 | −16 LUFS |
| 成片 | −15 LUFS，loudnorm 两遍；TP 目标 −1.5（编码后实测会到 −1.0，以实测 ≤−1.0 为准） |

- 音量不要一档到底。v7 的配乐固定比人声低 17 dB，主讲「小到我都听不见了」。v13 中频只低 7–10 dB，又垫了低频脉冲，主讲「听完后感觉头痛」。解法是两档：说话时压低，气口里抬起。
- 底乐先测低频：低频的平均音量要比全频低 2 dB 以上（命令见下）。detective_beat 只低 0.7 dB（v13 用它平铺了 4 分钟，被说头痛）；sun_electro 低 2.3 dB（通过）。这只是粗测，低通不是硬切。人声底下的配乐 mix_plan.py 已经切掉了 140 Hz 以下，所以这条主要管气口段。
- boom 只放在章节转换和爆点。v13 有 172 个音效，53 个是 boom。v18 是画面登记了 194 个、留下 94 个、另加 8 个爆点（mix_plan.py 最后一行会打印），约每分钟 6 个。
- 同一个音效不连用 3 次以上。核对办法：读 `cues.json` 里的 sfx，按时间排序看。第 8 期没有脚本，下一期补一个。
- 气口：口播里两个 ≥1.2 秒的空档之间，最长不超过 40 秒；LRA ≥4（命令见第 9 节）。v13 的 LRA 只有 2.7，94% 的时间在说话；v18 最长间隔 39.4 秒，主讲没提意见。

### 章名、插段和选曲
- 章名卡和新闻插段所在的那一段：breath 不高于 −7 dB，fin 不短于 1.0 秒；明亮的大调曲子不放在这里。第 8 期第 28 段（JSON 下标 27，下一代章名那段）原来用 `calm/sun_mountain`（breath −6、fin 1.0），原声一停音乐就冲上来，被说欢快；后来换成 `calm/sun_electro`，breath −9、fin 1.5。
- 修一处就查同类的全部位置。第 8 期修好了开场片名卡，主讲又指出下一代章名「这么突然这么欢快」。
- 每首入选曲先测调性（大调还是小调）和亮度。严肃段默认用小调、偏暗的曲子。
- 照小Lin 的路子：多用 90–120 BPM 的小调，讲解段亮一点，冷开场像预告片，结尾用大调。

### 版权和出处
- 每下载一个，立刻在 `film_vN/CREDITS.md` 记一行：网址、作者、授权、下载日期、用在哪章。模板是 `film_full/CREDITS.md` 和 `film_full/CREDITS_footage.md`。
- Freesound 的曲子逐个打开授权页，核对是 CC0、BY 还是 NC。
- 第 8 期 v18 至今没有出处清单：film_v9 下没有 credit 文件，film_full/CREDITS.md 只管 v1–v7。下一期不能这样，检查命令见第 9 节。

### 给 AI 代理（cwd `film_v9`）
```bash
python3 mix_plan.py out/v18_noaudio.mp4 "out/重估_第8期_Anthropic招股书_v18_1080p.mp4" voice/clone/v18_owner.wav music_plan_v17.json
NOVO=1 python3 mix_plan.py out/v18_noaudio.mp4 out/v18_novo.mp4 voice/clone/v18_owner.wav music_plan_v17.json
bash tools/remix_v18.sh   # 只换音乐，画面不动。最后一行会调 upload_v18.sh 自动传 Release；主讲说可以发之前，先删掉这一行
# 底乐低频粗测：「差」≥2 才用
for g in audio_lib/<目录>/*.mp3; do a=$(ffmpeg -hide_banner -nostats -i "$g" -af "lowpass=f=120:p=2,volumedetect" -f null - 2>&1 | grep -o 'mean_volume: [-0-9.]*' | awk '{print $2}'); b=$(ffmpeg -hide_banner -nostats -i "$g" -af volumedetect -f null - 2>&1 | grep -o 'mean_volume: [-0-9.]*' | awk '{print $2}'); echo "$g 差 $(echo "$b - $a" | bc)"; done
```

- 两遍混音都在 cwd 里写 `mix_plan.wav` 和 `cues.json`，不能同时跑两个混音。
- 1080p 重混以后，2K 不用重渲，只要重新配声音（第 8 节）。
- 新的混音规则先出 60 秒样，主讲用手机听过再用到全片。代理听不到，只能看电平数字。

## 8. 渲染

渲染的规矩：交付版用稳妥参数，一次一章；写完就收；只重出变了的章。第 8 期 11 月 4 日为半帧和进程挂住返工了 3 轮以上，每轮 12–28 分钟。

### 参数
| 用途 | 参数 | 并行 | 整片用时 |
|---|---|---|---|
| 1080p 样片（只给主讲看，不交付；`tools/part.py`） | `--h 1080 --workers 6 --stable 3`（写死在 part.py 里） | 3 章同时，约 21 个 Chrome | 约 14 分钟（实测） |
| 1080p 交付版 | `--h 1080 --workers 6 --stable 8 --tol .002 --gpumem 8192` | 一次一章 | 约 20 分钟（推算） |
| 2K 交付版 | `--h 1440 --workers 6 --stable 8 --tol .002 --gpumem 8192` | 一次一章 | 约 24 分钟（推算） |
| 2K 第一遍（别再用） | `--h 1440 --workers 5 --stable 3` | 3 章同时，约 18 个 Chrome | 18 分钟；开头一章（1:16 的 ANT，1080p 也有）加另外 5 章出了只在 2K 有的半帧，逐块扫描标出 18 个可疑点 |

- 一个 render.mjs 会开 workers+1 个 Chrome：每个 worker 一个，再加一个一直开到结束的主浏览器。
- 第 8 期 1080p 开头那章的 ANT，用样片参数也掉过帧，一度已经传上了 Release，后来才用稳妥参数重出替换。交付版一律用上表的稳妥参数。
- `--stable N`：同一时刻最多再截 N 次，两次图片大小差小于 `--tol`（默认 .01）才算画完。半画的小牌子造成的差远不到 1%，默认 tol 拦不住。
- 半帧来自三样：机器太忙没画完就截了、2K 显存不够整层不画、运动模糊。稳妥参数管前两样；运动模糊按第 6 节，哪一镜报了就把那一镜的 `mb` 改成 0。显存型的缺层每帧都缺，`glitch_scan.py` 查不出来，只有 `cross_check.py`（2K 对 1080p 逐帧比）看得出。
- 渲染时不同时跑 whisper 核对，也不同时混音。
- 渲染时不在 Finder 里开着 `out/`。第 8 期开了 60 多个 Finder 窗口，在给新视频做预览，占掉一整个核。
- 2K 一页比 1080p 占内存多。`build_2k.sh` 的注释说 18 路会把 128 GB 用满（没实测过）。

### 程序出完不退出
- `render.mjs` 有时打印「video ->」以后不退出。`part.py` 没设超时，会一直卡着。第 8 期 2K 最后的 3 分 54 秒，只是在等 om 那章的进程退出。
- 不靠 pgrep 判断渲染结束：pgrep -f 会匹配到任何命令行里含这串字的 shell。记下 `$!`，用 `kill -0 $P` 看进程还在不在，同时轮询日志里有没有出现「video ->」；出现以后再等 10 秒，`kill -TERM`，用 ffprobe 断言时长差 <0.2 秒，再改成正式文件名。`tools/finish_v18.sh` 里的 `one()` 就是这么做的。
- 不用 `kill -9`。
- 在 `set -euo pipefail` 下，可能「找不到」或「被 TERM」的命令都要加 `|| true`：一是 `grep … | sort -u | head` 这类管道（grep 找不到时返回 1，整个脚本会停）；二是 `wait $PID`（进程被 TERM 后返回 143）。第 8 期 `fix_title_v18.sh` 就停在了第 9 行那个 grep 上，后面的检查和上传都没跑。
- 手动补跑时，原脚本里的检查一项都不能跳。

### 哪些情况只重出一章
| 改了什么 | 重出什么 |
|---|---|
| 一章的 `ch/*.js` 或它用的素材 | 只这一章 |
| `ch/calm.js` | wh、ob、nx 三章 |
| 共享文件（`lib/*`、`tree9.js`、`space9.js`、`treeskin.js`、`film.js`） | 用到它的所有章，通常是全片 |
| 口播或字幕 | 章内字幕或时刻变了的章都要重渲；`build_v18b.sh` 会打印各章 t0/t1 的对比，变了的标「！变了」 |
| 只换音乐 | 不重渲，只重混（`tools/remix_v18.sh`，先删掉末尾的上传） |
| 1080p 重混过 | 2K 不重渲，只重新配声音（下面的 `mux`） |
| 封面、简介 | 不渲 |

### 给 AI 代理（cwd `film_v9`）
```bash
# 样片：长的章先排，3 章并行（part.py 是 --stable 3，不交付）
printf 'oa\nnx\nob\nwh\nct\na\nls\nrv\nom\n' | xargs -P 3 -I{} sh -c 'python3 tools/part.py {} > out/parts/log_v18_{}.txt 2>&1; echo "  {} 完 $(date +%H:%M:%S)"; cat out/parts/log_v18_{}.txt'
# 交付：一次一章，用 tools/finish_v18.sh 里的 one()，核心是这一行
node render.mjs --video "$out.new.mp4" --from $T0 --to $T1 --h $2 --workers 6 --stable 8 --tol .002 --gpumem 8192 > "$log" 2>&1 & P=$!
# 拼接清单按 timeline.json 的章节顺序生成，不用 glob（1080p 把 parts2k 换成 parts）
python3 - out/parts2k <<'EOF' > out/parts2k/list.txt
import json, os, sys
T = json.load(open('timeline.json'))
for k, c in enumerate(T['chapters']):
    print(f"file '{os.getcwd()}/{sys.argv[1]}/{k:02d}_{c['pre']}.mp4'")
EOF
ffmpeg -v error -y -f concat -safe 0 -i out/parts2k/list.txt -c copy out/v18_2k_noaudio.mp4
# 配声音：无声画面加已经混好的成片的音轨
mux() { ffmpeg -v error -y -i "$1" -i "$2" -map 0:v -map 1:a -c copy -shortest -movflags +faststart out/_mux.mp4 && mv out/_mux.mp4 "$3"; }
```

- 不要用 glob 拼接：`out/parts/` 里还躺着旧编号的 `00_open`、`05_oa`、`06_ob`、`07_nx`，one() 中断时还会留下 `*.mp4.new.mp4`，都会被拼进去。
- `tools/build_2k.sh` 不能直接复用。它有三个问题：一是 3 章并行的旧参数（`--workers 5 --stable 3`，没有 `--tol .002 --gpumem 8192`）；二是用 `ls out/parts2k/0*_*.mp4` 现生成拼接清单；三是最后会自动 `gh release upload --clobber`、`gh release edit`，并用 `gh api` 改写 `第8期/README.md` 和根目录索引行。先改成一次一章、加上稳妥参数、改用上面生成的清单，再把上传和改 README 拆出去，等主讲说可以以后再跑。
- 2K 超过 1.95 GB 时用 crf 19 重压（`build_2k.sh` 里有这一步）。
- 清理 `out/`（第 8 期已经 42 GB）：只删各处的 `*.mp4.parts/` 和过时版本（v9–v17 的分段和手机版），删之前要主讲同意。`.mp4.parts/` 只有下次渲同一个文件时才会被 render.mjs 清掉。下面这些要保留：`out/编辑包_v17/说明.md`（pack_v18 的模板）、`out/v9_noaudio.mp4`（repeat_audit 要用）、`out/parts/list_v17.txt`、`out/parts2k/list.txt`，以及当前版本的分章文件。

## 9. 交付前检查清单

每一项都打了勾才发，发出去的必须就是查过的那一份文件。第 8 期发给主讲的「修好的 2K」开头整章没画面，因为发之前只查了改动附近的 1:16–1:22。

顺序固定：
1. 代理跑完下面带命令的检查，有一项不过就停。
2. 把完整手机版发给主讲。
3. 主讲看完，列出的问题全部改完，主讲说「可以发」。
4. 这时才传 Release、写 GitHub（「文件」组最后一项）。

每项开头的括号写谁来勾。命令的 cwd 都是 `film_vN`（第 8 期是 `film_v9`）。`<成片>` 指当前要发的 1080p 或 2K 文件，`vN` 换成本期版本号。

### 声音
- [ ] （代理）逐句听写对字幕，每处差异都已经三选一处理（第 5 节规则 6）：`cd voice && python3 check_lines.py clone/vN_owner.wav clone/vN_owner.spans.json > ../out/check_vN.txt 2>&1`
- [ ] （代理）拆段查重念，每个标记都看过：`cd voice && python3 chunks_check.py > ../out/chunks_vN.txt`
- [ ] （代理）静音前后逐字比，没有新少的字（第 8 期 nx04「今年 9 月」、rv05「哥」）：第 5 节命令里的两遍 check_lines 加 `diff`
- [ ] （代理）接缝清单全部判完，`make_seams.py` 已重跑；重新分段的句子已重审：`cd voice && python3 audit_local.py`
- [ ] （代理）以上检查都在渲染之前跑完，检查结果文件的时间早于分章文件：`stat -f '%Sm %N' out/check_vN.txt out/chunks_vN.txt out/parts/00_*.mp4`
- [ ] （代理）待办清零，事实口误也在内（补录，或者字幕和画面一致地更正；第 8 期 wh14、oa17 没处理）：`awk -F'\t' '$4=="open"' out/flags_vN.txt | wc -l`，结果必须是 0
- [ ] （代理）成片说话字速在 290–340 汉字/分之间（v18 是 316）：命令 A
- [ ] （代理）响度：I 在 −15±0.5 LUFS，LRA ≥4，Peak ≤−1.0 dBFS（v18 是 −15.1 / 4.4 / −1.0）：`ffmpeg -hide_banner -nostats -i <成片> -vn -af ebur128=peak=true -f null - 2>&1 | grep -E '^ +(I|LRA|Peak):'`
- [ ] （代理）没失真：任取两段 60 秒，最响的 10% 和最静的 10% 相差 15 dB 以上（v18 在 2:00、10:00 两处实测 30.3、26.4 dB）：命令 B
- [ ] （代理）气口：口播里两个 ≥1.2 秒的空档之间最长不超过 40 秒（v18 是 39.4 秒）：命令 C
- [ ] （代理）配乐编排：说话时比人声低 12–20 dB，气口抬升不高于 −4 dB，下面的命令没有输出才算过（v18 没有输出）；章名卡和新闻插段那几段，再逐段对第 7 节的数（breath ≤−7、fin ≥1.0）：`python3 -c "import json;[print(s['file'],s['from'],s['under'],s['breath'],s['fin']) for s in json.load(open('music_plan_vN.json'))['sections'] if not -20<=s['under']<=-12 or s['breath']>-4]"`
- [ ] （主讲）戴耳机，用手机从头到尾看完、听完，按「分:秒 + 问题」列出来；列的每一条都改了，同类位置也全查过。手机完整版：`ffmpeg -v error -y -i <1080p成片> -vf scale=960:540 -c:v libx264 -preset medium -b:v 180k -maxrate 260k -bufsize 520k -c:a aac -b:a 56k -ac 1 -movflags +faststart out/第N期vN_完整版_手机.mp4`

### 画面
- [ ] （代理）渲染日志里没有错误行，日志必须是 render.mjs 直接写的，不是 part.py 的：`grep -hE 'pageerror|出错|找不到|树上没有|空档|重叠' out/parts/log_*_stable.txt out/parts2k/log_*_stable.txt | sort -u`，没有输出才算过
- [ ] （代理）引用检查（第 6 节末那段 python）只打出最后一行「时长 …」，退出码为 0
- [ ] （代理）每章都有画面：每章里接近纯色的帧（像素标准差 <3）不超过 20%。v18 1080p 最多的是越界·开场 om，5.9%（快剪里的黑场）；空白章会接近 100%。整片约 14 秒：命令 D
- [ ] （代理）每章时长等于 timeline 里的 t1−t0，差 <0.2 秒（1080p 用 `out/parts`，2K 用 `out/parts2k`）：命令 E
- [ ] （代理）闪帧：两个都跑过，报警逐条看，不整批放过（越界·开场的快剪是故意的）；flicker_scan 报的每个「短镜头」也逐个看，素材自带切换的已换掉：`python3 ../film_full/work/edit/flash.py <成片>`；`python3 tools/flicker_scan.py <成片>`
- [ ] （代理）逐块查半帧：只拿来比两版或两次之间的差别，不当绝对标准（终版 1080p 仍报 102 处，大多是片子本来的快速动画）：`python3 tools/glitch_scan.py <成片>`
- [ ] （代理）2K 对 1080p 逐帧比，每章 0 段，两版用的是同一份时间线：`python3 tools/cross_check.py <2K成片> <1080p成片>`
- [ ] （代理）关键帧从成片文件里抽出来亲眼看，不用 `render.mjs --stills`（它是从网页现截的，查不到成片里的半帧和拼接错）。要看的秒数：每章的 t0+1、正中、t1−1，片名卡，每个章名，三段新闻插段，片尾，树图拉远的那页（第 8 期 1:16 的 ANT）：`for t in <秒数列表>; do ffmpeg -v error -y -ss $t -i <成片> -frames:v 1 -q:v 3 /private/tmp/<文件夹>/k_$t.jpg; done`，再用 Read 打开
- [ ] （代理）和主讲看过的上一版逐镜对比，至少一半镜头是新的，列出换了什么：两版各出一套联系表，`ffmpeg -v error -i <成片> -vf "fps=1/2,scale=320:-1,tile=8x6" /private/tmp/<文件夹>/sheet_%02d.jpg`

### 文件
- [ ] （代理）时长和 `timeline.json` 的 `duration` 一致（第 8 期是 975.67 秒）：`ffprobe -v error -show_entries format=duration -of csv=p=0 <成片>`
- [ ] （代理）大小：1080p 约 1.1 GB；2K 小于 1.95 GB（超了用 crf 19 重压）：`stat -f '%z %N' <成片>`
- [ ] （代理）2K 已经配上最新 1080p 的声音，两个文件的音轨哈希一致：`for f in <1080p成片> <2K成片>; do ffmpeg -v error -i "$f" -map 0:a -c copy -f md5 -; done`
- [ ] （代理）手机版每段都小于 29.5 MiB。pack_vN.py 超了会重压，但压到 crf 36 就放弃，也不报错（第 8 期编辑包里「画面加配乐_没有你的口播」的手机版是 42.7 MB）：`find out -maxdepth 2 -name '*vN*手机*' -size +30932992c`，没有输出才算过
- [ ] （代理）出处清单 `CREDITS.md` 没漏：命令 F
- [ ] （代理）发布前 24 小时内，底稿里标了「会变」的条目逐条重查，每条写上核查日期和结果，有变化的交主讲定：`grep -n '会变' ../外部事实核查底稿_vN.md`
- [ ] （代理）要发的就是查过的那份：大小和修改时间与检查时记下的一致：`stat -f '%z %Sm %N' <成片>`
- [ ] （主讲）说了「可以发」。
- [ ] （代理，上传后）Release 已传完，大小和本地一致、state=uploaded：`gh release view ep<N>-v<版本> --repo GavinGudz/chonggu-podcast --json assets --jq '.assets[] | "\(.name) \(.size) \(.state)"'; stat -f '%z %N' <成片>`

给主讲的汇报只写实际跑了哪些检查、查了哪一段，不写「全片没问题」。

### 命令 A–F（cwd `film_vN`）

A 字速：
```bash
python3 - <<'EOF'
import json, re
S = json.load(open('voice/clone/vN_owner.spans.json')); T = json.load(open('timeline.json')); TX = {b['id']: b['text'] for b in T['beats']}
Q = {'e0', 'rv00', 'oa23q', 'ob14q', 'nx15', 'wh10q', 'wh11q'}   # 第 8 期的原声句，换期要改
S = {k: v for k, v in S.items() if k not in Q}
n = sum(len(re.findall(r'[一-鿿]', TX.get(k, ''))) for k in S); d = sum(b - a for a, b in S.values())
print(round(n / d * 60), '汉字/分')
EOF
```

B 失真：
```bash
ffmpeg -v error -ss 120 -t 60 -i <成片> -vn -ac 1 -ar 48000 -f f32le - | python3 -c "import sys,numpy as np;y=np.frombuffer(sys.stdin.buffer.read(),np.float32);e=20*np.log10(np.sqrt((y[:len(y)//960*960].reshape(-1,960)**2).mean(1))+1e-9);print(np.percentile(e,90)-np.percentile(e,10))"
```

C 气口：
```bash
python3 - voice/clone/vN_owner.wav <<'EOF'
import sys, numpy as np, soundfile as sf
y, sr = sf.read(sys.argv[1], dtype='float32'); y = y if y.ndim == 1 else y.mean(1)
f = int(sr * .02); n = len(y) // f; e = 20 * np.log10(np.sqrt((y[:n * f].reshape(n, f) ** 2).mean(1)) + 1e-9) < -45
g, k = [], 0
while k < n:
    j = k
    while j < n and e[j] == e[k]: j += 1
    if e[k] and (j - k) * .02 >= 1.2: g.append((k * .02, j * .02))
    k = j
ends = [0] + [b for a, b in g]; starts = [a for a, b in g] + [n * .02]
print(len(g), '个气口；最长间隔', round(max(s - e0 for e0, s in zip(ends, starts)), 1), '秒')
EOF
```

D 每章有画面：
```bash
python3 - <成片> <<'EOF'
import json, subprocess, sys, numpy as np
T = json.load(open('timeline.json'))
r = subprocess.run(['ffmpeg','-v','error','-i',sys.argv[1],'-vf','fps=2,scale=96:54,format=gray','-f','rawvideo','-'], capture_output=True).stdout
S = np.frombuffer(r, np.uint8).reshape(-1,54,96).astype(np.float32).std((1,2))
bad = [c['pre'] for c in T['chapters'] if (S[int(c['t0']*2):int(c['t1']*2)] < 3).mean() > .2]
sys.exit(f'这几章大半是纯色：{bad}') if bad else print('每章都有画面')
EOF
```

E 每章时长：
```bash
python3 - out/parts <<'EOF'
import json, subprocess, sys
T = json.load(open('timeline.json'))
for k, c in enumerate(T['chapters']):
    f = f"{sys.argv[1]}/{k:02d}_{c['pre']}.mp4"
    d = float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f], capture_output=True, text=True).stdout)
    e = d - (c['t1'] - c['t0'])
    print(f, round(e, 2), '不对' if abs(e) >= .2 else '')
EOF
```

F 出处清单：
```bash
python3 -c "import json;C=open('CREDITS.md').read();print(sorted({s['file'] for s in json.load(open('music_plan_vN.json'))['sections'] if s['file'].split('/')[-1] not in C}))"   # 打印 [] 才算过
ls assets/clips | while read n; do grep -q "$n" CREDITS.md || echo "没记：$n"; done   # 没有输出才算过
```

## 10. 封面、标题、简介

封面、标题、简介用同一个钩子，钩子用片里最硬的那条事实。第 8 期封面改了三轮：第一版的钩子是一句长话，底图是带字幕的截图，字还是细体。

### 钩子
- 先出 3 个钩子方案，至少一个带大数字，按手机缩略图的大小并排给主讲挑。
- 用最硬的事实，拿原文当证据。第 8 期定稿（`tools/cover_v18b.py`）：
    - 标题「AI 开始造下一代 AI 了」。
    - 主视觉是大号黄色「90%」加发光的紫色闭环，底色是深紫色径向渐变。
    - 副标题：16:9 版是「Anthropic 的代码 / 是 Claude 自己写的」（后半句黄字）；3:4 版是「Anthropic 的代码，是 Claude 自己写的」。
    - 招股书第 183 页的那一句用荧光笔标出来，整页斜着浮在一边当证据（16:9 在右边，3:4 在上面），小字注「2026 年 9 月 · 招股书第 183 页」。
- 第一版是「只是工具？」配一句长钩子。主讲：「这句话一般般，没啥冲击力」。
- 底图不用成片截图。第一版的底图还带着片里的字幕框。要用原始素材（第 8 期用的是 `assets/s1/nx_c90.png` 招股书原页）。

### 字
- 要粗、要大。第 8 期第一版把 `/System/Library/Fonts/Hiragino Sans GB.ttc` 的 index=1 当成了粗体，其实那是 W3 细体；W6 是 index=2。
- 选字重之前，先打印 `ImageFont.truetype(路径, 字号, index=i).getname()`，确认是 W6 或 Bold。
- 字别压到底图和纸边：第 8 期第三版初稿「是 Claude 自己写的」就碰到了纸的左边，出图后缩小看一遍。
- 用 macOS 自带的字体。要换免费可商用字体，只从官网下，并写清来源和授权。

### 尺寸
| 尺寸 | 用在 | 第 8 期文件 |
|---|---|---|
| 16:9，1920×1080 | B 站、抖音横屏 | `out/重估_第8期_封面_16比9.png` |
| 3:4，1080×1440 | 抖音竖屏、小红书 | `out/重估_第8期_封面_3比4.png` |

### 署名
- 单人期封面加「主讲 X」，名字要看得清。第 8 期做成黄框牌子「主讲 X」，名字比「重估 · 第 8 期」大一号，放在左下角；但不和标题、大数字抢。
- 简介第一行写「本期主讲：X」。

### 标题
- 写 3 个，第 1 个是推荐的，三个都和封面用同一个钩子。
- 第 8 期第 1 个：「AI 开始造下一代 AI 了：Anthropic 招股书拆解，它的代码九成是 Claude 写的」。

### 简介
- 短版（三行加标签，不放时间轴）和长版都写进 `发布简介_第N期.md`，短版放最前面，随上传脚本一起传上 GitHub。主讲要的是短版：「给我简介，不用时间轴」「短点」。第 8 期的短版只贴在了对话里，文件里没有，所以 `intro_vN.py` 的输出里要加上短版。
- 长版备用：主讲署名、四根枝、章节时间戳、一句出处、「以上内容不构成投资建议」。
- 标签：`#重估播客 #Anthropic #招股书 #Claude #OpenAI #人工智能`。`#重估播客` 每期都带。

### 给 AI 代理（cwd `film_v9`）
```bash
python3 tools/cover_v18b.py [预览图.png]   # 生成两张封面
python3 tools/intro_v18.py                 # 生成 out/发布简介_第8期.md，章节时间戳从 timeline.json 算
```

- `cover_v18b.py` 用的是 `assets/s1/nx_c90.png` 和 `boxes_nx.json` 里的荧光笔框，字体是 Hiragino Sans GB 和 Avenir Next Heavy。换期时底图要换。
- `intro_v18.py` 的发布提示只写了「16:9 横版 1080p」，有 2K 时要手动补上。
- `upload_v18.sh` 会再跑一遍 `intro_v18.py`，手改的简介会被覆盖。要改就改脚本。

## 11. 上传和发布

成片整个文件放在 GitHub Release，平台由发布人用自己的账号发。第 8 期是主讲问了「为啥是分段，不是一整个吗」之后才改成整片的；上传中途还停过一次，Release 空了 23 分钟。

### GitHub
- 仓库 `GavinGudz/chonggu-podcast` 是**公开的**（PUBLIC），传上去的东西所有人都能下载。推之前要主讲点头；版权或授权没核完的素材不传。开工时用 `gh repo view GavinGudz/chonggu-podcast --json visibility` 再确认一次。
- 不要 clone 这个仓库，里面全是视频分段。
- 成片放 Release（单个文件上限 2 GB），不放进 git（单个文件上限 100 MB），也不拆分段。2K 超过 1.95 GB 时用 crf 19 重压。
- asset 用 ASCII 文件名（先 `cp -c` 到 `mktemp` 建的目录），中文名写在 `#` 后面当显示名。
- `output` 分支每期一个文件夹 `第N期/`，放 README.md、两张封面、发布简介。根目录的 README 是索引，每期只加一行，别的行不动。这些都用 `gh api` 写。

### 上传只在一个地方做
- 构建脚本里不放上传。第 8 期有 4 个脚本末尾带着 `gh release upload --clobber`：`tools/remix_v18.sh`（经由 `upload_v18.sh`）、`tools/build_2k.sh`、`tools/finish_v18.sh`、`tools/fix_title_v18b.sh`。下一期照抄这些脚本时，先删掉里面的 gh 行。
- 上传只放在 `tools/upload_vN.sh` 里，主讲说「可以发」之后单独跑（第 9 节的顺序）。

### 换文件
- `--clobber` 是先删旧文件、再传新文件。传到一半停掉，Release 里就没有这个文件了。第 8 期 10:29 停掉了一个正在上传的任务，10:52 才补传完。
- 上传进行中不停任务。要能随时停，就先用新文件名传，确认大小一致、state=uploaded，再删旧的；代价是下载链接会变，README 要跟着改。
- 汇报 Release 状态之前先跑 `gh release view`，不凭印象说。第 8 期代理先说「Release 现在还是空的」，后来又更正。
- `upload_v18.sh` 按模板整份重写 `第8期/README.md`，模板里没有 2K 那一行。2K 上传之后再跑它，2K 的链接会被冲掉（推断）。下一期在模板里加上 2K。
- 上传速度约 2.3–2.4 MB/s：1080p 约 8 分钟，2K 约 15 分钟。每修一次都要重传，所以先过主讲这一关再传。

### 发布人照做
1. 下载：打开 `https://github.com/GavinGudz/chonggu-podcast/releases/tag/ep<N>-v<版本>`（第 8 期是 `ep8-v18`）。B 站用 2K 那个文件；抖音用哪个还没定，先用 1080p。
2. 封面在 output 分支的 `第N期/` 文件夹里：B 站和抖音横屏用名字带「16比9」的那张，抖音竖屏和小红书用带「3比4」的那张。
3. 标题用 `发布简介_第N期.md` 里的第 1 个。
4. 简介用同一个文件里的短版，不贴章节时间。
5. 「内容由 AI 生成」按开工单定的来勾。放进《重估》合集。

### 平台和署名
- 第 8 期是 16:9 横版长片，主要给 B 站，抖音也发横屏。没做抖音专版，要不要做还没定。
- 「内容由 AI 生成」：第 8 期的简介和 README 都写了要勾，当初的理由是克隆声。v18 已经是真声，但画面和剪辑仍然是 AI 做的，下一期开工时两人再定一次。
- 发之前过一遍平台风险（第 3 节）。
- 第 8 期用发布人的个人抖音号发，《重估》在抖音做成合集。
- 单人期封面加「主讲 X」，简介第一行署名。

### 给 AI 代理
```bash
bash tools/upload_v18.sh   # 1080p 传到 Release ep8-v18，写 output 分支的 第8期/ 和索引行；主讲说可以发之后才跑
gh release upload ep8-v18 --repo GavinGudz/chonggu-podcast --clobber "$TMP/chonggu_ep8_anthropic_s1_v18_2k.mp4#重估_第8期_Anthropic招股书_v18_2K.mp4"
gh release view ep8-v18 --repo GavinGudz/chonggu-podcast --json assets
```

- 发到主讲手机的文件要小于 30 MiB，大文件给本地路径或 Release 链接。第 8 期 103 MB 的逐句压缩包、83 MB 的 720p 都没发出去。
- 给发布人发邮件前，先把草稿给主讲看。

## 12. 第 8 期踩过的坑

下表按严重程度从上往下排。前 15 条是高：每一条都让一整轮返工，或者把错的东西发了出去。其余是中。每条最后的括号是规矩所在的节。

| 现象 | 原因 | 以后怎么避免 |
|---|---|---|
| 发给主讲的「修好的 2K」开头 0–1:22 没画面 | 只查了改动附近的 1:16–1:22；flash.py 对空白画面也报通过；照着工具输出汇报 | 每章查纯色帧比例；关键帧从成片里抽；只说查了哪一段（第 9 节） |
| 代码行中间插了 `//` 注释，整章空白，出了两次 | 注释吞掉同一行的后半截，整个文件不执行；日志里只有一行 `[pageerror]`，渲染照常出片，part.py 的日志还把它吞了 | 注释单独一行；逐个文件 `node --check`；render.mjs 原始日志有 pageerror 就算失败（第 6 节） |
| 接缝碎音：剪过的句子带着邻句的半个字（「新公司，司」） | 录音句间没停顿；按 whisper 的字时刻下刀；整句听写查不出 | 录音句间停半秒；切在能量谷底；audit_local → make_seams → apply_seams（第 4、5 节） |
| 半句重念漏进成片：ob03、oa18、wh09、wh10、wh13、ct19 | 整句听写把重念并成一遍；筛查早就标出来，没进待办 | chunks_check 逐段查；标记全进 flags 文件，清零才交付（第 5 节） |
| 剪丢真字：nx04「今年 9 月」、rv05「哥」、nx11「重视」、nx14「说」 | 静音位置算偏；把上一句的结尾当余音；差异被直接判成听写错 | 静音前后逐字比；判听写错要有重听证据（第 5 节） |
| 2K 半帧和缺画：1:16 的 ANT 只画了半截，另有 5 章只在 2K 有半帧 | 显存不够，整层不画；3 章并行压满机器；stable 3 加 tol 1% 太松 | `--stable 8 --tol .002 --gpumem 8192`，一次一章；cross_check 每章 0 段（第 8 节） |
| v18 先传了 Release，主讲才听出 6 处、扫描又找出 ct19，只好重做重传 | 上传写在 4 个构建脚本的末尾；清单里上传排在主讲看片之前 | 上传单独一个脚本，主讲说「可以发」才跑（第 9、11 节） |
| 克隆声像假声、夹着嗓子，v11–v15 整条路线作废 | IndexTTS-2.5 的音高总比参考高（153–185 Hz，真声 141–145 Hz）；上线前没量 | 默认真声；换方案先出 30 秒 A/B，基频差超过 1 个半音就不用（第 4 节） |
| v13 让主讲「听完后感觉头痛」 | 低频脉冲底乐；配乐只比人声低 7–10 dB；94% 的时间在说话；LRA 2.7；53 个 boom | 两档音量；底乐先测低频；boom 只放在转换处（第 7 节） |
| 稿子方向来回变，干巴巴、像读稿（v1–v9） | 开工前没定参考片、语气、时长；按招股书章节排；全片做完才通读 | 开工单；稿子贴给主讲读；90 秒样片认可后再铺全片（第 3 节） |
| 同一类句子主讲删了四次（「我算的」「自己报的」「别人没查」「账」） | 代理习惯标出处；每次只改被点名的那一句 | 禁用词检查；否掉一句就找全同类（第 3 节） |
| 周额度两次见底 | 大量并行子代理；18 个版本；小改动整段重跑 | 开工定预算；扇出前先 get_usage；检查写成脚本断言（第 13 节） |
| 子代理把主讲的邮箱写进了 Wikimedia 请求的 User-Agent | 任务书没写隐私规则 | 每份任务书第一段写明隐私规则（第 6 节） |
| v4 发出的是旧结尾的配音，字幕却是新词 | score_takes 按文件名缓存，旧 take 带着 cer=0 胜出 | 改词后旧选段作废，听写和字幕逐字比（第 5 节） |
| v5 初稿写 Anthropic 偏软 | 写稿的代理是 Anthropic 的模型 | 开工申报利益冲突；每版做公平审稿、出对照表（第 3 节） |
| 页码全部多 1 页；6,370 亿的柱子画到了 2045 年 | 页码规则没对照原页；未披露的金额画成了已知；代理信自己「已核过」 | 用 s1page.py 查页码；未披露部分换样式；信渲染了原页的审稿人（第 3 节） |
| 1:18 片名卡闪一下，从 v10 带到 v18 | 底片 nf_dots 自带切换，frameSrc 来回放；flash.py 不查硬切 | 素材入库跑切点检测；titleCard 传 c0、rate（第 6 节） |
| 章名配乐太欢快，被指出两次（开场、下一代） | 选曲只看曲名；修了一处没查同类 | 测调性和亮度；breath ≤−7、fin ≥1.0；同类位置全查（第 7 节） |
| v7 配乐小到听不见（固定 −17 dB） | 照参考片的测量值设；没先让主讲听样 | 两档音量；60 秒样先给主讲听（第 7 节） |
| 字幕和录音对不上，v18 又改了 18 句 | 主讲念的时候改了词，没留记录 | 录完说出改了哪些词；逐句听写对字幕（第 4、5 节） |
| 事实口误没修：wh14《国防安全法》，oa17「牺牲是值得的」 | 只核了稿子，没核录音；补录没有流程 | 录完当天核录音、当天补录；补录并入办法（第 4、5 节） |
| 主讲没听懂：「评测公司」指谁、官司那两句 | 指代没点名；一句里塞了两场判决 | 冷听众审稿；一句一件事（第 3 节） |
| 克隆读音错：Claude、ChatGPT、「重估」读成 zhòng、「一签 20 年」 | TTS 读歪英文名；多音字和数字没逐句查 | 合成前打印拼音；难读词表（第 3、4 节） |
| 克隆语速太快太匀，主讲「喘不过气」（owner_lines.py 记的是说话时 347 字/分，真声约 246） | 整体对标小Lin 的上沿，不分句长 | 倍数按实测字速算；成片 290–340 字/分（第 5、9 节） |
| 样片剪得太碎（28.7 刀/分） | 照搬小Lin 的切点数，可她快切的是实拍 | 按镜头类型分别取数（第 6 节） |
| 画面像 PPT、素材重复、树太满（v7–v10）；v10 有几章是 v9 换层皮 | 镜头类型单一；没和上一版、参考片对比 | 每章用量上限；联系表并排比，至少一半镜头是新的（第 6 节） |
| 照片和人对不上（达沃斯照、Cat Wu 特写） | 选图只看长相；没人查引语和画面的配对 | 图注写明人名才用；引语只配说话者本人（第 6 节） |
| 渲染进程出完片不退出，脚本卡住；修补脚本停在一条 grep 上，后面的检查和上传都没跑 | render.mjs 关浏览器时有时不返回（原因未查实）；`set -euo pipefail` 下 grep 找不到就返回 1 | 轮询「video ->」后 TERM；可能失败的命令加 `\|\| true` 兜底（第 8 节） |
| 停掉一个 `--clobber` 上传，Release 空了 23 分钟 | `--clobber` 先删后传；汇报前没查 | 上传中途不停；先传新名再删旧的；`gh release view` 之后再汇报（第 11 节） |
| 报时说错：09:13 说「2K 大约 4:55 出完」 | 没看钟；速度凭印象估 | 先跑 `date`；ETA 按实测帧率算（第 13 节） |
| 核对和渲染同时跑，查出 nx04 后补渲两章 | `build_v18.sh` 把 check_lines 放在后台 | 口播检查放在渲染前，阻塞执行（第 5 节） |
| 改 17 句字幕要整片重渲 | 字幕画在网页里，和画面一起截图 | 下一期字幕单独做一层（第 2 节） |
| 封面没冲击力，字是细体 | Hiragino index=1 是 W3；底图带字幕；钩子是长句；标题另写一套 | 打印字名确认 W6；出 3 个方案；标题和封面同一个钩子（第 10 节） |
| 音乐和素材的授权出处没跟上，v18 至今没有 CREDITS | 下载时没同时记录 | 下载即记一行；发布前跑漏项检查（第 7、9 节） |
| 编辑包里一个手机版 42.7 MB，超限没人发现 | pack_v18 压到 crf 36 就放弃，不报错 | 跑完逐个核大小（第 9 节） |
| 代理自己加了「只用招股书」的规矩 | 自己推断的限制没当成假设去问 | 开工单列出「我做的假设」，逐条确认（第 3 节） |
| 主讲问了约 32 次进度，有三次插话没得到单独回复 | 没主动报；插话没先回 | 固定里程碑，每 20 分钟一报，插话先答（第 13 节） |

低等级的另有 8 条，规矩也都写进了前面：汇报前不核实（误报「你的 Chrome 开着 74 个网页」，第 13 节）；上下文压缩后改用英文回复（第 13 节）；超过 30 MiB 的文件发不到手机（第 11 节）；Finder 开着 out/ 占掉一个核（第 8 节）；把克隆用的 `breathe()` 用在真声上（第 5 节）；截图坐标没算滚动，截成白板（第 6 节）；API 断线约 50 分钟（第 13 节）；先动手后问，比如自动下载配乐、用空镜做放松段（第 3 节）。

## 13. 时间和额度

一整轮重做只要约 22 分钟电脑时间，真正耗掉时间和额度的是返工的轮数。第 8 期从 10-27 选题到 11-04 交付，用了 9 天，出了 18 版。

### 每步大概多久
| 步骤 | 用时 |
|---|---|
| 降噪加整条听写（24 分钟的录音） | 约 1 分钟（降噪 42 秒，实测；听写约 31 秒，推算） |
| 口播重建加两项核对 | 约 8 分钟（重建约 2.5 分钟，check_lines 2–3 分钟，chunks_check 不超过 2 分 11 秒） |
| 1080p 交付版，一次一章 | 约 20 分钟（推算，约 25 fps） |
| 2K 交付版，一次一章 | 约 24 分钟（推算，约 22 fps） |
| 混音两遍（1080p 和 NOVO） | 机器空闲时约 2 分钟；和渲染同跑时每遍 2–3 分钟 |
| 手机版加编辑包（`pack_v18.py`） | 约 4 分钟 |
| 上传 Release | 1080p 约 8 分钟，2K 约 15 分钟 |
| 一整轮重做（`build_v18c.sh`，从拼口播到编辑包，1080p 用 3 章并行的样片参数） | 约 22 分钟（03:56:41–04:18:34） |

### 省额度
- 每期开工时定额度预算（开工单第 6 项），例如全期不超过周额度的 30%。
- 扇出超过 20 个代理、或者整章重做之前，先 `get_usage`，报出估算。
- 先用样片定标准，再扇出。第 8 期 v9、v10 各重做了 7 章，v17 又派 8 个代理改章。
- 同时最多跑 2–3 个重工作流。
- 把步骤合成脚本放在后台跑。渲染、听写、混音只花电脑算力，不花额度。范例 `build_v18c.sh` 有三处要改了再用：① 第 19 行的 check_lines 不放后台，和 chunks_check 一起跑在渲染之前；② 引用检查有问题时 `sys.exit(1)`；③ 渲染前断言 flags 文件里没有 open。
- 检查写成脚本里的断言（时长、纯色帧、`pageerror`、引用、少字），失败就停，不让模型每一步都去看一眼。
- 额度快用完时，把剩下的步骤写成脚本，设定时任务在额度重置后接着跑。第 8 期设过一个 06:01 的任务。

### 断线或额度恢复之后
先查有没有写了一半的东西，再接着干：

```bash
date '+%H:%M %Z'; pgrep -fl "node render.mjs"; ls -lt out | head; ls out/parts*/*.new.mp4 2>/dev/null
```

写了一半的文件不拼进成片，重出一遍覆盖它（`.mp4.parts/` 目录本来就不会自动删，不算在内）。第 8 期 10-31 API 连续断了约 50 分钟，主讲连发了 4 次「请再试一次」。

### 报时间
- 报任何钟点之前，先跑 `date '+%H:%M %Z'`，用它打出来的本地时间。主讲不在这台电脑所在的时区时，开工单里写明他的时区，报时换算成他的钟点。第 8 期代理在 09:13 说「2K 版大约 4:55 出完」，主讲回：「现在不是九点吗」。
- ETA = 剩余帧数 ÷ 日志里实测的帧率，不凭印象估。第 8 期 1080p 按每秒 10 帧估，实际约 60 帧；2K 估了 30–35 分钟，实际 18 分钟。
- 参考帧率：全片约 29267 帧；1080p 3 章并行时整机约 60 fps；2K 一次一章约 22 fps。

### 报进度
- 主讲在代理干活时插进来的话，下一条回复的第一句先答它。第 8 期主讲问了约 32 次「还要多久」「进度」「好了吗」，其中三次插话没有得到单独回复。
- 里程碑固定是这几个：稿子好、样片好、录音处理完、核对完、开始渲染、渲染完、混音完、手机版发出、上传完。每到一个报一句：做完了什么，正在做什么，几点能好（本地钟点），要不要主讲做什么。
- 两个里程碑之间超过 20 分钟，就每 20 分钟主动报一次。
- 有样片就直接发文件，不只给路径。发到手机的上限是 30 MiB。
- 只说实际查过什么、查了哪一段，不说「没问题」。
- 汇报进程、文件、Release 状态之前，先用命令核实：`ps`、`date`、`gh release view`。第 8 期误报过「你的 Chrome 开着 74 个网页」。
- 一直用中文，上下文压缩后续接的第一句也是中文。

## 14. 以后批量做：固定成模板

**已建好（2026-11-04）**：工具包在 [GavinGudz/chonggu-podcast 的 kit 分支](https://github.com/GavinGudz/chonggu-podcast/tree/kit)，Mac 和 Windows 通用。下面表里的 `ep 命令` 实际写成 `python -m chonggu 命令`。用第 8 期录音重做，口播和 v18 逐字节一致，时间线也一致；示例期（35 秒）从头到尾跑通，质检 16 项全过。还没在 Windows 实机上跑过，那边遇到的问题由那台电脑上的 Claude 就地修。自动测试（CI）的配置在 `ci/demo.yml`，要仓库主人启用（见 `ci/README.md`）。

**新电脑上手三步**

1. 把 `kit` 分支下载到电脑上，放在短路径、全英文、不在 OneDrive 里的地方，比如 `C:\chonggu-kit`（GitHub 网页切到 kit 分支 → Code → Download ZIP，或 `git clone -b kit <仓库地址> C:\chonggu-kit`）。
2. 在这个文件夹里打开 Claude Code。
3. 对它说：「按 CLAUDE.md 把环境装好，跑通示例期」。它会装环境、自检、下素材、做出示例期；要装软件或下大文件之前会先问。

第 8 期的程序大半已经能复用，卡住批量的是「写死」：录音编号、文件名、章节清单、上传地址散在几十个脚本里。主讲人每提一条意见，就要新写一个一次性脚本：这期写了 9 个，留下 59 个备份文件。改成「一期一个配置文件 + 一步一条命令 + 自动门槛」，下一期人只管稿子、录音和画面内容。

**三类东西**

| 类别 | 是什么 | 例子 |
| --- | --- | --- |
| 原样复用 | 渲染、混音、检查工具、共用画面零件 | `render.mjs`、`mix_plan.py`、`glitch_scan.py`、`cross_check.py`；`lib/` 里的卡片、原文页加荧光笔、3D 空间、树、新闻插段 |
| 改成读配置 | 写死了这一期的东西 | 录音编号 `rec16` 散在 12 个脚本里；原声句清单抄了 13 份；章节列表、片名卡文字、成片文件名、GitHub 仓库和 tag、手机版分段 |
| 每期重写 | 本来就是内容 | 稿子、录音、每章画面（这期 10 章、共 3,687 行）、配乐编排、素材、封面字 |

**一期一个配置文件 `episode.yaml`**：期数、版本、主讲人、稿子、录音、原声句（只在这里登记一次）、章节、新闻插段、片名卡、配乐、渲染设置、手机版分段、封面字、标题简介、发布地址。所有文件名都从这里生成。

**一步一条命令**（前一步门槛没过，后一步跑不了。命令已建好：表里的 ep voice 实际是 python -m chonggu voice <期>，其余同理，全部命令见工具包里的 docs/命令说明.md）

| 命令 | 做什么 | 门槛 |
| --- | --- | --- |
| `ep new 9 --from 8` | 建新一期的骨架 | 无 |
| `ep script-check` | 查稿子格式、估时长 | 句号不重复；原声句都登记了 |
| `ep voice` | 降噪、听写、选遍、拼接、处理接缝、收停顿提速 | 拆段查重复 0 处；接缝疑点都判完 |
| `ep check-voice` | 逐句对字幕 | 只剩白名单里的差异；主讲人签「听过了」 |
| `ep timeline` | 排时间线 | 画面引用的字全找得到 |
| `ep render --res 1080` 或 `--res 2k`，可加 `--only rv,nx` | 出画面 | 日志无报错；每章时长对；闪帧、半帧查干净；2K 和 1080p 逐帧对得上 |
| `ep mix` | 混音 | 响度 −15 LUFS，峰值不超过 −1.5 dB |
| `ep qa` | 交付前检查报告 | 第 9 节清单全过 |
| `ep pack` | 手机版、编辑包、封面、简介 | 每段手机版小于 29.5 MiB |
| `ep publish` | 传 GitHub | 先空跑看改动；主讲人说「传」；文件小于 1.95 GB |
| `ep build` | 从口播串到打包 | 停在第一个没过的门槛 |

主讲人提一条意见，只重跑受影响的那一步：改字幕跑 `ep timeline` 再重出相关的章；换音乐只跑 `ep mix`；改一章画面只跑 `ep render --only 那一章`。

**每期还要人做的**

- 选题、观点、稿子定稿（事实核查可以 AI 先做）。
- 录音。
- 拼好后把整条口播听一遍。第 8 期最后 7 处漏网（「老大哥」的「哥」、方向盘三处重复等）都是主讲人听出来的。
- 先看一章样片，点头了再推开到全片。
- 否决配乐、选封面和标题、决定敏感内容删不删、平台上传。

**给 AI 的说明书（skill）要写的**：触发词（做第 N 期、出片、重渲、换音乐）；上面这张命令表和门槛；硬规矩（每个助手只改自己那一章、时刻按字幕里的字定不写死秒数、一段素材全片只用一次、两家公司同样对待、发布前先问）；第 12 节的坑。

**先做什么、要多久**（AI 工时）

| 步骤 | 内容 | 工时 |
| --- | --- | --- |
| 1 | 共用工具收进一个工具包，写配置文件的读取 | 3–4 小时 |
| 2 | 口播流水线改成读配置，用第 8 期录音重跑，结果要和现在一样 | 6–8 小时 |
| 3 | 渲染和检查命令（2K 设置、卡住处理、只重出几章） | 3–4 小时 |
| 4 | 混音、打包、封面、简介、发布改成读配置 | 4–5 小时 |
| 5 | 章节清单、片名卡、配色进配置；这期专用的零件移出共用库 | 5–7 小时 |
| 6 | 镜头配方库（七成镜头用现成配方），带防雷同检查 | 8–12 小时 |
| 7 | 写说明书，用第 8 期从头演练一遍 | 3–4 小时 |

先做 1–4 和 7，约 19–25 小时，能省掉这期大部分返工。第 6 步等第 9 期做完、看清哪些镜头真的会重复再做：主讲人最反感「像放 PPT」，配方库必须防雷同。另外，这期的 `out/` 已经 42 GB，旧版本的分段要定期清（删之前先问）。

**实际进度（2026-11-04）**：第 1–5 步和第 7 步已完成，多个 AI 代理并行，一个下午做完。第 7 步的第 8 期演练做到了口播、时间线和抽帧，没有整片重渲。第 6 步（镜头配方库）照原计划，等第 9 期做完再定。

## 15. 横版拆成 4:3 短视频（第 9 期）

短视频不是把横版缩小贴进去。第 9 期的五段成片做了四件事：整幅铺满；每个镜头单独取景；前四章按 4:3 重排构图；音效全换成真实录音，每段单独做母带。主讲 2026-11-25 看完最终版：「我们这一期做的视频挺不错的」。下一期照这一节做。

17 分 10 秒的全片按章拆成 5 段，每段 2:20–4:37，1440×1080、30 帧。一段 = 约 3 秒的开头 + 正文 + 段尾定格。工程在 `chonggu-ep9/film/`，本节的命令都在这个文件夹里跑。

分三轮交。每一轮都比上一轮好，每一轮都先发手机版给主讲看：

| 轮 | 改什么 | 要不要重渲画面 |
| --- | --- | --- |
| 1 | 铺满版式、逐镜取景、颜色、手机版清晰度 | 不用，只重压片 |
| 2 | 音效、混音、每段母带和收尾 | 不用，画面原样拷贝，只换声音 |
| 3 | 4:3 专用构图、高清素材 | 要，十章约 45 分钟（6 路并行） |

### 版式（主讲定的）

- 整幅铺满：从 1920×1080 的无字幕画面里裁一个 1440×1080 的窗口，不缩放。
- 不要黑条、标题条、蒙层、虚化条、角标、黑底牌子，也不整片压暗。带标题条的第一版，主讲 11-23 说「不要这个黑框」；蒙层版改到第三版，主讲仍说「还是没有到效果」，最后定了铺满。
- 字幕直接压在画面上：冬青黑体 W6 约 60 px，白字加投影和细描边，字中心 y≈965。y 905–1035 是字幕带，画面里要看的字不放进这一带。
- 字幕和画面里的字撞了，按镜头把字幕上下挪，不加底条。写在 `sub_shift/<章>.json`，一条是 `{t0, t1, y, why}`。
- 每屏不超过 22 个字，长句在标点处切；每段开头不带上一段的字。
- 画面左上角的出处小字在短视频里去掉，出处整段贴进发布简介（`画面出处清单_发布简介用.txt`）。

### 画面

画面分四步。前两步不用重渲，做完就能发；后两步要重渲，是「越到后面越高质量」的那一轮。

| 步骤 | 做什么 | 文件和工具 | 门槛 |
| --- | --- | --- | --- |
| 1 取景表 | 每个镜头定窗口左边的位置 x0（0–480，居中是 240），镜头内可以从 x0a 慢慢走到 x0b。第 9 期十章共 275 镜 | `work_v20/短视频4比3/reframe/<章>.json` | 人脸、引文、数字不被切；窗口不在叠化中间跳；相邻两镜接得上 |
| 2 颜色 | 老的无字幕画面是全范围 BT.601。成片一律转成 BT.709 有限范围，四个颜色标记写全 | `tools/make_4x3.py` 自动做 | 抽帧和来源比色差，第 9 期不超过 0.8 ΔE |
| 3 4:3 专用构图 | 把章节代码拷一份只给 4:3 用，在拷贝上重排版；16:9 定稿一个字不动。第 9 期前四章整章重排，后六章改 17 处；黑底字卡换成纸卡；整片颗粒减半 | `ch43/`、`props43/`、`tools/render_43.py`，出 `out/parts_43/v21_43_nosub.mp4` | 每镜出取景拼图看过 |
| 4 高清素材 | 实拍素材重新取高画质的源，按源片自己的帧率抽帧。第 9 期重取 149 条源，登记 241 条序列，其中 77 条是 1440 高 | `tools/hq_seq.py`，出 `assets/clips_hq/` 和 `meta.json` | `render_43.py check-hq` |

- 取景表的格式：`{"pre": "hook", "shots": [{"t0": 45.2, "t1": 48.9, "x0a": 240, "x0b": 300}]}`，时间是全片秒。不在任何一镜里的时刻用 240。
- 改一镜的取景，前后两镜一起看。第 9 期改了一镜，和前一镜之间跳了 30 px。
- 实拍镜头一卡一卡，先查取帧。工具包 `film_base.js` 的 `clipSrc` 取整前没有加余量，浮点算出 x.9999 时少取一帧：一帧放两遍，下一帧跳过，每秒只有 15–19 个不同的帧。4:3 这条线在 `out/stage/lib43.js` 里加了 `+1e-6`。
- 换成高清源以后，小于 1080p 的老影像放大照样糊；慢放（rate 小于 1）的镜头会顿，要顺就别慢放或换素材。
- 黑底小牌子换纸卡、去角标、去下沿压暗，统一写在舞台页 `out/stage/index_43.html` 的覆盖里，不用逐章改。

### 声音

- 音效只用真实录音，不合成。第 9 期旧音效被查出听不清、同一个声音反复出现，换成 119 处、78 个切好的单下：翻页 51、荧光笔 29、卡片 14、闷响 10、筹码 7、转场 6、其他 2。
- 来源：Sonniss GDC 2026、Adobe Audition 音效包、Kenney Casino（CC0）、原有的 Freesound CC0。每个文件的来源记在 `assets/sfx_lib/picked/来源.tsv`。原始素材和切好的文件都不进公开仓库。
- 同一种音效轮着用，相邻 3 次不重复；每次变调不超过 1 个半音，电平 ±1.5 dB。
- 音量不用固定值：按它前后 0.3 秒里「口播 + 音乐」在 2–8 kHz 的电平来定。每个音效过 120 Hz 高通。
- 最响的那一下钉在画面动作的那一帧，不贴音乐的拍线。撞到口播字头（±40 毫秒）就挪开，挪不开压 3 dB。
- 人声：加一点清晰度（+1.5 dB），压齿音，轻压缩（2.5:1）。
- 音乐另做一个「手机声部」：低音和底鼓加谐波，手机喇叭放不出低频也听得到节奏。
- 每段单独做母带：−14 LUFS，真峰值不超过 −1.5 dBTP。（全片是 −15 LUFS，见第 7 节。）
- 段尾不在音乐中间切断：音乐接着走到下一条小节线，在强拍上收，带约 1 秒尾巴；多出来的时间画面定格最后一帧。第 9 期前四段各多 1.1–2.1 秒，最后一段用片子自己的结尾。
- 开头 3 秒：前半（鼓、音乐、一句话）比后半（只剩一句话）响 4–6 LU，切点上一声闷响。
- 代理听不到。每轮声音改完，剪几段「先旧后新」的对比发给主讲听（第 9 期在 `work_v20/声音对比/`），主讲听过再定稿。

### 手机版和交付

- 手机版用 HEVC（libx265）两遍编码，分辨率一律 1440×1080，文件小于 30 MiB。视频码率 = 28.5×8×1024÷时长（秒）− 132 kbps，声音 AAC 128k。
- 码率低也不降分辨率。同样大小，1440×1080 的 VMAF 是 89.4，降了分辨率只有 83.5。旧的 960×720 H.264 预览就是主讲看着糊的那一版。
- 成片先写成 `_tmp_` 开头的名字，自查过了再改成正式名字。
- 每一轮的成片放各自的文件夹，文件名带轮次（「铺满」「新声音」「新画面」）。第 9 期最终版在 `work_v20/短视频4比3/铺满/第三轮_新画面/`。
- 交付时写清楚：发平台用哪个文件夹的哪五个文件；手机版只是预览，不拿去发；别的文件夹是旧版。
- 发布文案（标题、简介、话题、置顶评论）和出处清单放进成片同一个文件夹。换过素材以后，出处清单要重新核一遍。
- 交付前总管自己看一遍每段的抽帧拼图。第 9 期最后一遍看出第 2 段开头的字幕压在芯片的字上，改了再发。

### 额度

- 要看图、要跑工具的代理比只读文字的贵得多。报估算时，按算出来的两倍报。
- 逐章「改、验收、再改」只用在最显眼的章；其余列固定清单，改完总管自己看拼图。
- 质量检查做一次就够：它给出了后面三轮的全部清单。
- 分工：总管定计划、做决定、看结果；派出去的代理做执行。
- 被限流的代理在额度重置后会自己接着跑。重置后派新人之前，先看旧代理是不是已经在改同一批文件。

### 第 9 期短视频踩过的坑

前四条是成片里看得见、听得见的毛病；其余是做的过程里出的错。

| 现象 | 原因 | 以后怎么避免 |
| --- | --- | --- |
| 手机预览版糊 | 960×720 H.264；后来还想靠降分辨率省码率 | 1440×1080 HEVC 两遍，不降分辨率 |
| 手机上颜色发灰、偏暗 | 中间片是全范围 BT.601，成片没转换，颜色标记也不对 | 成片一律 BT.709 有限范围，四个标记写全；抽帧量色差 |
| 实拍镜头一卡一卡 | 取帧的浮点取整错：一帧放两遍，下一帧跳过 | 取整前加 1e-6；改完量相邻帧差 |
| 音效听不清，同一个声音反复出现 | 素材少；电平按固定值定 | 真实录音轮着用；电平按旁边的口播和音乐定 |
| 第 3 段压出来所有镜头都是居中裁，取景表没生效 | 多线程同时读取景表，读串了 | 读表加锁；自查逐镜比对实际窗口和表里的窗口（重压后 23 镜全对） |
| 两章改到一半的成品被盖掉 | 验收的代理不带参数跑了 `render_43.py`，它默认十章全渲 | 渲染命令必须写章名；下一期把不带参数改成报错 |
| 代理「看」一个旧脚本时把它跑了，盖掉一份旧日志 | 说明里没写只许读 | 说明里写明：不认识的脚本只读不跑 |
| 两批代理同时改同一批文件 | 被限流的代理在额度重置后自己恢复，这时又派了新人 | 派新人前先查旧代理；一个文件只归一个人 |
| 代理拿着下一轮的取景表去重压上一轮的成片 | 分工没说清谁压片、用哪一套表 | 成片先写 `_tmp_` 名字（这次靠它没盖掉正式文件）；说明里写明谁压片；上一轮的表留备份 |
| 改了一镜的取景，和前一镜之间跳了 30 px | 只看了被改的那一镜 | 改一镜，前后两镜一起看 |
| 第 2 段开头的字幕压在芯片的字上 | 开头片段没查字幕带 | 开头和正文一样查字幕带；交付前总管看拼图 |
| 额度估算两次偏低，中途停工 | 看图的代理比读文字的贵得多 | 估算乘 2；做法见上面「额度」 |
| 补取 21 条高清源，只下到 9 条 | YouTube 要求登录确认 | 停下，其余 12 条用旧源；不绕过 |

### 给 AI 代理（cwd `film/`）

```bash
# 0. 开工先查额度（get_usage），报估算；扇出前把估算乘 2

# 1. 画面：只改 4:3 专用代码 ch43/、props43/，不碰 ch/、props/
python3 tools/render_43.py hook --draft --tag 名字            # 一章小样（720 高）
python3 tools/render_43.py --from 63.8 --to 67.4 --tag 名字    # 一段正式画质（全片秒）
python3 tools/crop43_preview.py hook 63.8 67.4 --sheet         # 按取景表看 4:3：红框是窗口，黄线之间是字幕带
python3 tools/render_43.py hook --tag 名字                     # 一章正式；十章齐了自动接成 out/parts_43/v21_43_nosub.mp4
# 不带章名跑 render_43.py 会十章全渲、盖掉成品，不许这样跑

# 2. 高清素材（不联网；源片由总管下载到 assets/src_clips_hq/）
python3 tools/hq_seq.py run --set all
python3 tools/render_43.py check-hq

# 3. 声音：音效 → 混音 → 五个开头的声音 → 每段母带
python3 tools/score6/sfx.py --ver v20e --arr v20d --events work_v19/score6/sfx_events_v20e.json --timeline work_v19/score6/inputs_v20d/timeline.json --narr auto
VER=v20e PLAN=v20e NARR=auto CUES=out/cues.json PARTS=out/parts SKIPSFX=1 zsh tools/score6/rerun.sh --no-video
python3 tools/hooks_audio_v20e.py
python3 tools/score6/parts_master.py --ver v20e                # 出 work_v19/score6/parts_v20e/<N>of5.wav 和 manifest.json

# 4. 压片：先字幕和开头，再五段；成片先叫 _tmp_，自查过了再改名
python3 tools/make_4x3.py subs --layout 4x3fill43
python3 tools/make_hooks.py --layout 4x3fill43
python3 tools/make_4x3.py parts --layout 4x3fill43
python3 tools/check_4x3.py --hook --layout 4x3fill43
python3 tools/make_4x3.py promote --layout 4x3fill43

# 只换声音（画面原样拷贝）、只重出手机版
python3 tools/make_4x3.py remux_audio 1of5 --layout 4x3fill43
python3 tools/make_4x3.py phone_hd 2of5 --layout 4x3fill43
```

- 改章节的详细规矩（取帧约定、渲染锁、共用文件登记）在 `work_v20/画面第三轮/说明_给改章节的人.md`。
- 版式名：`4x3fill` 是第一轮（旧画面、旧声音），`4x3fill_v20e` 是第二轮（旧画面、新声音），`4x3fill43` 是第三轮（新画面、新声音）。
- 每段的帧数以 `parts_v20e/manifest.json` 为准：开头 NH 帧 + 正文 N 帧 + 定格 extra_frames 帧，声音长度正好是总帧数 ÷ 30 秒。
- 给子代理的说明里固定写四条：只改自己那一章的 `ch43/`、`props43/`；渲染命令必须带章名和 `--tag`；不认识的脚本只读不跑；结果写在回复里（子代理写不了报告文件）。
- 下载由总管做，子代理只找链接、读本地文件。遇到 403、429、登录确认就停，不绕过；每下一个文件记进出处清单。
- 不动的东西：`ch/`、`props/`、`out/parts/`、`timeline.json`、配乐文件、全片成品。16:9 定稿和 4:3 这条线完全分开。

### 下一期开工前

- 口播留一份无损录音。第 9 期拿到的是 60 kbps 的 AAC，11 kHz 以上没有声音，后期补不回来。
- 平台上传规格没查到官方说明。发之前在抖音和小红书各私密上传 1440×1080 和 2880×2160 两版，在手机上比过再定发哪版。
- 把取帧的修正改进工具包的 `film_base.js`。现在只改在 4:3 这条线里，16:9 全片的实拍镜头还带着这个毛病。
- 把 `render_43.py` 不带参数的默认行为改成报错。
- 配乐授权在动工前定。
- 16:9 全片要不要也换上新声音和新画面，主讲定。第 9 期全片还是 v20d。
- 总管的建议，主讲还没定：写章节代码时就留出 4:3 的安全区，要看的字和人脸放在中间 1440 宽以内，y 905–1035 不放字。这样拆短视频只要取景表，不用整章重排。

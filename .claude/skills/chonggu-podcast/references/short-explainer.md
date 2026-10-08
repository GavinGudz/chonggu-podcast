# 讲解短片：几十秒、一个模拟、一个道理

第一条是 `chonggu-ep4/tuihuo/`（2026-10-07，模拟退火，16:9，58 秒）。流水线和对谈节目完全不同：没有录音，口播是合成的，画面跟着模拟数据走。新做一条时整个文件夹复制过去改。

## 流水线

```
sim.py        模拟 -> data/sim.json（地形、主角轨迹、统计结果、要在画面上引用的事实）
script.json   口播稿：每句一行 {id, scene, text, gap}
tts.py        edge-tts（zh-CN-YunxiNeural，+10%）逐句合成、去掉首尾静音 -> audio/line_*.wav、data/timeline.json（每句起止 + 字时间）
page/scene.js Canvas 画面，window.renderFrame(t) 是 t 的纯函数；场景边界、相机、字幕、标注全部从 timeline.json 推出来
render.mjs    无头 Chrome 并行渲染（--stills 出单帧，--events 导出音效点，--cover 出竖版封面）
mix.py        配乐（片头的合成器）+ 音效（按 events.json）+ 口播，压缩后两遍 loudnorm 到 -14 LUFS
```

```bash
PY=../.venv/bin/python
$PY sim.py && $PY tts.py
node render.mjs --events data/events.json && $PY mix.py
node render.mjs --out out/video.mp4 --workers 8
ffmpeg -y -i out/video.mp4 -i audio/final.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart out/成片.mp4
```

58 秒的片子 8 个 worker 渲染约 30 秒，改一处到出片几分钟，适合快速迭代：改 `script.json` 或 `scene.js` → `--stills` 看几帧 → 整片渲染。

## 做的时候学到的

- **数字全部来自自己的模拟**，片中引用的每个数都从 `sim.json` 读，不手写；主角轨迹可以挑「最能讲故事的那一跑」，但统计用全部样本，并在 README 里写清楚。
- **口播先定时长**：先生成配音看总长，再删字。第一版 75 秒，删到 55 秒才接近参考片的节奏；段与段之间留 0.3–0.9 秒呼吸给画面。
- **画面要等口播**：说「20 岁」时左上角的年龄要正好走到 20；数字类的标注在说到那个数时出现。用 `charTimes` 把短语映射到时间（同 `wt(id, '短语')`）。
- **全景镜头**：横向拉远时把高度单独放大（相机有 `ex` 竖向夸张系数），否则山被压成一条线；地形两端做镜像，避免画面边缘露空。
- **混音**：音乐在人声下面约 12 dB，说话时再压 8 dB；先过一道轻压缩，loudnorm 才能在 -1 dBTP 以内到 -14 LUFS。
- **人物要自己设计**：这条用的是戴宽檐帽、提一盏灯的小人，灯的亮度 = 温度（敢不敢走下坡），金色的人登顶后灯灭了、红色的人到老灯还亮着——设计本身就在讲道理。

## 照着别人的视频做（「复刻」）

1. **先看原片**：视频号网页版放不了，用 Mac 微信的视频号（要全屏控制，搜作者或在微信内置浏览器的地址栏粘贴分享链接），每 0.5–1 秒截一帧，记下结构、节奏、镜头顺序和画面风格。
2. **可以跟的**：格式、时长、镜头顺序、版式和配色这类风格、模拟的设定。
3. **要自己做的**：口播和字幕的措辞（不照抄原句），人物和画面元素（不逐帧临摹），数据（自己跑）。开始前跟用户说清楚这条线；如果原片就是用户自己的，那就没有这个限制。

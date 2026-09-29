# 《重估》第 2 期 · 配图紧凑版（成片）

5:18，1920×1080 60fps，H.264 + AAC 256k，-14.1 LUFS，峰值 -1.4 dBFS。

成片 171 MB，按 42 MiB 拆成了 5 段。在 Mac 终端里拼回：

```bash
cd ~/Desktop/重估          # 放到哪里都行
git clone --single-branch --branch output https://github.com/GavinGudz/chonggu-podcast.git 成片
cd 成片
cat 重估_第2期_完整版_紧凑_配图.mp4.part_* > 重估_第2期_完整版_紧凑_配图.mp4
shasum -a 256 重估_第2期_完整版_紧凑_配图.mp4   # 应与 .sha256 文件里的值一致
```

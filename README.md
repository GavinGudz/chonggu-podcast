# 《重估》第 2 期 · 配图紧凑版（成片 v2）

5:18，1920×1080 60fps，H.264 + AAC 256k，-14.2 LUFS，峰值 -1.4 dBFS。

v2 相对 v1：只给吴原同的声音加了去齿音（「s / c / sh」音不再刺耳），画面与 v1 逐字节相同。v1 仍在本分支的上一个提交里。

成片 171 MB，按 42 MiB 拆成了 5 段。在 Mac 终端里拼回：

```bash
cd ~/Desktop/重估          # 放到哪里都行
git clone --depth 1 --single-branch --branch output https://github.com/GavinGudz/chonggu-podcast.git 成片
cd 成片
cat 重估_第2期_完整版_紧凑_配图_v2.mp4.part_* > 重估_第2期_完整版_紧凑_配图_v2.mp4
shasum -a 256 重估_第2期_完整版_紧凑_配图_v2.mp4   # 应与 .sha256 文件里的值一致
```

已经 clone 过的话，在那个文件夹里先运行 `git pull`，再执行上面的 cat。

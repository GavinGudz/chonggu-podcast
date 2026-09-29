# 《重估》第 2 期 · 配图紧凑版（成片 v3）

5:18，1920×1080 60fps，H.264 + AAC 256k，-14.2 LUFS，峰值 -1.4 dBFS。

v3 相对 v2：照片放大到画面右侧约 2/3，跟着原片元素弹出，遇到新标题、方框时缩到一边让位；图注改为照片左下角的标签。音频与 v2 相同。v1、v2 在本分支的历史提交里。

在 Mac 终端里拼回：

```bash
cd ~/Desktop/重估
git clone --depth 1 --single-branch --branch output https://github.com/GavinGudz/chonggu-podcast.git 成片v3
cd 成片v3
cat 重估_第2期_完整版_紧凑_配图_v3.mp4.part_* > 重估_第2期_完整版_紧凑_配图_v3.mp4
```

已经 clone 过的话，在那个文件夹里 `git pull` 后再执行 cat。

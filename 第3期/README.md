# 《重估》第 3 期 · 注意力价值（顾东政，3:4 竖版）

3:28，1080×1440 60fps，-14.0 LUFS，峰值 -1.5 dBFS。2026.09.29 录制。

2026.09.29 的录制拆成两期：本期是顾东政的部分，吴原同的部分是[第 4 期](../第4期/)。拆分时去掉了抖音审核容易误伤的内容（美国地标和交易所照片、「下注」「变现」等字样的画面强调、狗狗币资料卡、医生段落）。原来的合并版（7:12）不再使用，仍在本分支的提交历史里。

结构：冷开场（三句金句）→ 片头（竖版重排）→ 正片 4 章（该向谁看齐 / 拯救自己 / 一道面试题 / 另一种自由）→ 谢谢收听。

在 Mac 终端里拼回：

```bash
cd ~/Desktop/重估
git clone --depth 1 --single-branch --branch output https://github.com/GavinGudz/chonggu-podcast.git 重估成片
cd 重估成片/第3期
cat 重估_第3期_注意力价值_顾东政_3比4.mp4.part_* > 重估_第3期_注意力价值_顾东政_3比4.mp4
shasum -a 256 -c 重估_第3期_注意力价值_顾东政_3比4.mp4.sha256
```

封面：竖版 3:4 `重估_第3期_封面_竖版.png`。制作素材在 `ep3` 分支的 `第3期/` 目录。

照片署名（发布时贴进简介；公有领域也注明来源）：

- 录制现场：腾讯会议录屏（顾东政身后海报已虚化）
- Herbert A. Simon：Rochester Institute of Technology，Public domain，已裁切调色。来源：https://commons.wikimedia.org/wiki/File:Herbert_Simon_close-up_(cropped).jpg

资料卡出处：Herbert A. Simon, “Designing Organizations for an Information-Rich World”, 1971。

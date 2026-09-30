# 《重估》3.1 / 3.2（3:4 竖版）

2026.09.29 的录制按说话人拆成上下两集，1080×1440 60fps，-14.0 LUFS：

| 集 | 标题 | 说话人 | 时长 | 章节 |
|---|---|---|---|---|
| 3.1 | 注意力价值 | 顾东政 | 3:28 | 该向谁看齐 / 拯救自己 / 一道面试题 / 另一种自由 |
| 3.2 | 方向性直觉 | 吴原同 | 3:44 | 方向性直觉 / 浸泡出来的直觉 / AI 的边界 / 比你想象的值钱 |

每集：冷开场（三句金句）→ 片头（竖版重排）→ 正片 4 章 → 谢谢收听（结尾互相指向上集 / 下集）。

拆分时去掉了抖音审核容易误伤的内容：美国地标和交易所照片、「下注」「变现」「财富自由」的画面红色强调、狗狗币资料卡、医生照片和那段较长的医生例子（查即将上市的药和设备、提前读论文）。3.2 里还留着一句简短的例子（一个医生看了几千个病人之后，也许会形成某种临床直觉），画面只有听诊器图标和文字卡。台词不改字，字幕与原声一致。原来的 7:12 合并版不再使用，仍在本分支的提交历史里。

在 Mac 终端里拼回：

```bash
cd ~/Desktop/重估
git clone --depth 1 --single-branch --branch output https://github.com/GavinGudz/chonggu-podcast.git 重估成片
cd 重估成片/第3期
cat 重估_3.1_注意力价值_顾东政_3比4.mp4.part_* > 重估_3.1_注意力价值_顾东政_3比4.mp4
cat 重估_3.2_方向性直觉_吴原同_3比4.mp4.part_* > 重估_3.2_方向性直觉_吴原同_3比4.mp4
shasum -a 256 -c 重估_3.1_注意力价值_顾东政_3比4.mp4.sha256 重估_3.2_方向性直觉_吴原同_3比4.mp4.sha256
```

封面：竖版 3:4 `重估_3.1_封面_竖版.png`、`重估_3.2_封面_竖版.png`。制作素材在 `ep3` 分支的 `第3期/` 目录。

## 照片署名（发布时贴进对应那集的简介）

3.1：

- 录制现场：腾讯会议录屏（顾东政身后海报已虚化）
- Herbert A. Simon：Rochester Institute of Technology，Public domain，已裁切调色。来源：https://commons.wikimedia.org/wiki/File:Herbert_Simon_close-up_(cropped).jpg

资料卡出处：Herbert A. Simon, “Designing Organizations for an Information-Rich World”, 1971。

3.2（CC BY-SA 要求写明作者、许可和修改）：

- Daniel Kahneman：nrkbeta，CC BY-SA 2.0（https://creativecommons.org/licenses/by-sa/2.0/），已裁切调色。来源：https://commons.wikimedia.org/wiki/File:Daniel_Kahneman_(3283955327)_(cropped).jpg

资料卡出处：Kahneman & Klein, “Conditions for Intuitive Expertise: A Failure to Disagree”, American Psychologist, 2009。

## 3.2 建议人耳确认的几处（识别模型意见不一，按打分定稿）

| 成片时间 | 字幕写法 | 备选 |
|---|---|---|
| 1:01 | 它的编排很好，它的选题很好。 | 原话后面还有「情绪/形式很好」，听不清，剪掉 |
| 2:44 | 我当时觉得**这种** AI 太强了 | 这东西 |
| 2:59 | 它会做得非常**糟** | 早 |
| 3:03 | 它的直觉非常非常**差** | 惨 |
| 3:08 | 把 AI **当作**一个非常厉害的工具 | 原声更像「装作」（口误，按原意写「当作」） |
| 3:12 | 人是负责提供方向和**直接**判断的 | 直觉判断 |
| 3:35 | 甚至二十年形成**的**专业直觉 | 形成专业直觉 |

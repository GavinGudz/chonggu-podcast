# 《重估》第 {{EP}} 期 · {{TOPIC}}（3:4 竖版）

{{DATE}} 录制，1080×1440 60fps，-14 LUFS。

结构：冷开场（金句）→ 片头 → 章节 → 谢谢收听。

| 段 | 说话人 | 章节 |
|---|---|---|
|  |  |  |

剪掉的内容：（说错重说只留后一遍；为过审删掉的句子逐条写在这里）

在 Mac 终端里拼回：

```bash
git clone --depth 1 --single-branch --branch output https://github.com/GavinGudz/chonggu-podcast.git 重估成片
cd 重估成片/第{{EP}}期
cat {{VIDEO}}.part_* > {{VIDEO}}
shasum -a 256 -c {{VIDEO}}.sha256
```

发布用的标题、简介、章节时间和话题标签：`发布简介.md`。制作素材在 `ep{{EP}}` 分支的 `第{{EP}}期/`。

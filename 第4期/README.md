# 第 4 期制作素材（顾东政 + 吴原同，一条成片）

- `work/make_plans.py`：剪辑表（录音里每一句的起止时间和校对后的字幕），生成 `plan_J.json`（顾东政 7 章 + 吴原同 7 章；脚本里的 A / B 是两人各自的段落）。
- `work/plan_to_edl.py` → `edl_J.json` → `work/assemble2.py`：按剪辑表剪音频。连着说的部分整段保留原始停顿和换气，只在删掉内容的地方剪接；字幕时间来自成片音频的整段识别。（旧的 `assemble.py` 逐句切开、句间插静音，已弃用。）
- `work/sb/ch_01.py … ch_14.py`：每章的竖版 3:4 分镜（97 个场景）；`work/sb_build.py` 合成 `storyboard_final.json`；`work/preview.sh` 渲染某几章的预览总览图。
- `work/build_ep.py` + `work/mix.py`：时间线和混音（-14 LUFS，约 -64 dBFS 底噪）。
- `render/engine.js`：渲染引擎。第 4 期新增：尺子、成绩榜（可模糊）、AI 聊天窗、曲线、积木、门、门票、印章、计数、点阵、荧光笔、划掉换词；方框先描边后填色；每个场景缓慢推近。
- `重估_片头_第4期_学历.json`：片头（顾东政三句版口播）的切句时间。
- `work/qa_asr.py`：成片音频整段重新识别，和剪辑表逐句对照。

录音原文件和整段逐字稿没有上传。

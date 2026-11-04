"""口播流水线：主讲的录音 → 每句挑最后完整的一遍 → 拼口播 → 查接缝、查重念 → 人声链 → 逐句收停顿、提速 → 整条口播 → 时间线。
命令入口在 chonggu.voice.pipeline（voice、check-voice、timeline）。这里不 import 任何东西，免得只用一个小函数也要装齐听写模型。
两边通用的底层（Mac 和 Windows 各用各的后端）：asr.py 听写、stretch.py 变速不变调、denoise.py 降噪。"""

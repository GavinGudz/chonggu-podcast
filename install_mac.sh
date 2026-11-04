#!/bin/sh
# 苹果电脑一键安装（可以反复跑，装好的会跳过）：打开「终端」，把工具包文件夹拖进去前面加 cd 回车，再输入 sh install_mac.sh 回车。要先装 Homebrew（https://brew.sh）。具体做什么见 chonggu/doctor.py 的 install。
cd "$(dirname "$0")" && { command -v brew >/dev/null 2>&1 || [ -x /opt/homebrew/bin/brew ] || { echo '先装 Homebrew：打开 https://brew.sh ，把首页那一行命令粘到终端里回车，装完再跑 sh install_mac.sh'; exit 1; }; } && { command -v python3.12 >/dev/null 2>&1 || "$(command -v brew || echo /opt/homebrew/bin/brew)" install python@3.12; } && PATH="/opt/homebrew/bin:$PATH" exec python3.12 -m chonggu doctor --install "$@"

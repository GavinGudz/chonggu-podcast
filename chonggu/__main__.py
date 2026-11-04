if __name__ == '__main__':   # Windows 的多进程（spawn）会按 __mp_main__ 再导入一遍这个文件：不能在导入时就跑命令
    from chonggu.cli import main
    raise SystemExit(main())

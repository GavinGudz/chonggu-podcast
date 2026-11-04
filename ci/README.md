# 自动测试（CI）：待启用

`demo.yml` 是 GitHub Actions 的配置：每次推到 `kit` 分支，就在 Windows 和 Mac 的云端电脑上把示例期从头做一遍（装环境 → 下素材 → 自检 → build），成片和检查报告留作下载。一次大约 15–25 分钟，公开仓库不收费。

现在还没启用：推 `.github/workflows/` 里的文件，需要带 `workflow` 权限的 GitHub 授权。要启用，用仓库主人自己的账号做一次：

```sh
mkdir -p .github/workflows
cp ci/demo.yml .github/workflows/demo.yml
git add .github/workflows/demo.yml
git commit -m "启用示例期 CI"
git push origin kit
```

用 `gh` 登录的话，推之前先 `gh auth refresh -s workflow` 给授权加上这项权限。也可以在 GitHub 网页上进 Actions，新建一个 workflow，把 `demo.yml` 的内容贴进去。

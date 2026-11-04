# 项目规范

## 发布命令

在项目根目录执行 `make full VERSION=x.y.z`。统一目标为 `build-ui`、`build-helm`、`build-image`、`push-zpk`、`full`；本项目没有 UI 和自有镜像，`full` 只打包 Helm 并推送到现有 ZPK 应用。发布前设置 `ZPK_IDC_PASSWORD`（兼容 `PASSWORD`），不要把密码写进命令行或文件。

- 每次完成本项目的代码、配置或行为改动后，必须同步更新根目录 `CHANGELOG.md`。
- Changelog 条目必须说明改动内容及其原因；若改动修复故障，还要记录故障触发条件和预期效果。

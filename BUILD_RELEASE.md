# Windows 安装程序构建指南

## 前置要求

1. **Node.js 环境**
   - Node.js >= 14.0.0
   - npm 已安装

2. **Inno Setup**（仅 Windows）
   - 下载地址：https://jrsoftware.org/isdl.php
   - 安装后确保 `iscc.exe` 在 PATH 中

## 构建步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 构建 Windows 可执行文件

```bash
# 构建 Windows 版本
npm run build:win
```

这会在 `dist/` 目录下生成 `ais-win.exe`

### 3. 验证可执行文件

```bash
# 检查文件是否存在
ls dist/ais-win.exe

# 测试可执行文件（在 Windows 上）
dist/ais-win.exe -V
```

### 4. 构建安装程序（仅 Windows）

```bash
# 使用 Inno Setup 构建安装程序
npm run build:installer
```

或者手动运行：

```bash
iscc installer\windows\ais-setup.iss
```

安装程序会生成在 `dist/installer/ais-setup-1.5.2.exe`

### 5. 测试安装程序

1. 运行 `dist/installer/ais-setup-1.5.2.exe`
2. 按照安装向导完成安装
3. 打开新的终端窗口
4. 运行 `ais -V` 验证版本

## 一键构建（Windows）

```bash
# 构建可执行文件和安装程序
npm run build:win-installer
```

## 发布到 GitHub Release

### 1. 创建 Release

```bash
# 确保已经打了 tag
git tag -a v1.5.2 -m "Version 1.5.2"
git push --tags
```

### 2. 上传文件到 Release

在 GitHub Release 页面上传以下文件：

- `dist/installer/ais-setup-1.5.2.exe` - Windows 安装程序
- `dist/ais-win.exe` - Windows 独立可执行文件（可选）

## 常见问题

### Q: 安装后 `ais -V` 显示旧版本？

**原因**：可能存在多个安装位置，PATH 优先级问题。

**解决方案**：

1. 检查所有 ais 位置：
   ```powershell
   where ais
   ```

2. 卸载 npm 全局版本：
   ```bash
   npm uninstall -g ai-account-switch
   ```

3. 重新打开终端测试

### Q: 安装程序构建失败？

**检查清单**：

1. ✅ `dist/ais-win.exe` 文件存在
2. ✅ Inno Setup 已安装
3. ✅ `iscc.exe` 在 PATH 中
4. ✅ 在项目根目录运行命令

### Q: 可执行文件无法运行？

**可能原因**：

1. Node.js 版本不匹配（需要 >= 14.0.0）
2. pkg 构建失败
3. 缺少依赖

**解决方案**：

```bash
# 清理并重新构建
rm -rf dist/
npm run build:win
```

## 目录结构

```
project/
├── dist/
│   ├── ais-win.exe              # Windows 可执行文件
│   └── installer/
│       └── ais-setup-1.5.2.exe  # Windows 安装程序
├── installer/
│   └── windows/
│       └── ais-setup.iss        # Inno Setup 脚本
└── package.json
```

## 版本更新清单

发布新版本时需要更新：

- [ ] `package.json` - version 字段
- [ ] `installer/windows/ais-setup.iss` - MyAppVersion 定义
- [ ] `README.md` - Changelog 部分
- [ ] `README_ZH.md` - 更新日志部分
- [ ] Git tag - 创建新版本标签

## 自动化构建（GitHub Actions）

项目已配置 GitHub Actions 自动构建：

- 文件：`.github/workflows/build-installer.yml`
- 触发：推送 tag 时自动构建
- 输出：自动上传到 GitHub Release

手动触发：

```bash
git tag -a v1.5.2 -m "Version 1.5.2"
git push --tags
```

GitHub Actions 会自动：
1. 构建 Windows 可执行文件
2. 创建安装程序
3. 上传到 Release

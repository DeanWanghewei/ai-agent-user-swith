# Windows 安装程序优化方案

## 概述

为了提供更好的 Windows 用户体验，我们使用 **Inno Setup** 创建了一个专业的 Windows 安装程序。

## 用户体验对比

### 之前（手动安装）
1. 下载 `ais-win.exe`
2. 手动创建目录
3. 移动文件到目录
4. 手动添加到 PATH（需要打开系统设置）
5. 重启终端
6. 验证安装

### 现在（一键安装）
1. 下载 `ais-setup-1.5.1.exe`
2. 双击运行
3. 点击"下一步"几次
4. 完成！

## 安装程序特性

### ✅ 自动化功能
- **自动 PATH 配置**：安装时自动添加到用户 PATH
- **自动卸载**：完整的卸载程序，包括 PATH 清理
- **无需管理员权限**：安装到用户目录，普通用户即可安装

### ✅ 用户友好
- **现代化向导界面**：清晰的安装步骤
- **多语言支持**：英文和中文界面
- **开始菜单集成**：自动创建开始菜单项
- **可选桌面快捷方式**：用户可选择是否创建

### ✅ 专业性
- **版本管理**：显示版本号和发布信息
- **许可协议**：显示 MIT 许可证
- **卸载程序**：标准的 Windows 卸载体验

## 技术实现

### 使用的工具

**Inno Setup**
- 免费开源的 Windows 安装程序制作工具
- 被广泛使用（Node.js、VS Code 等都使用它）
- 支持脚本化配置
- 生成标准的 Windows 安装程序

### 文件结构

```
installer/
├── README.md                    # 安装程序说明
└── windows/
    ├── ais-setup.iss           # Inno Setup 配置脚本
    ├── ais-icon.ico            # 应用图标（可选）
    └── build-installer.md      # 构建说明文档
```

### 自动化构建

GitHub Actions 工作流 (`.github/workflows/build-installer.yml`):
- 在创建新 tag 时自动触发
- 构建 Windows 可执行文件
- 使用 Inno Setup 创建安装程序
- 自动上传到 GitHub Releases

## 构建安装程序

### 前提条件

1. **安装 Inno Setup**
   - 下载：https://jrsoftware.org/isdl.php
   - 版本：6.0 或更高

2. **构建可执行文件**
   ```bash
   npm run build:win
   ```

### 构建方法

**方法 1：使用 npm 脚本（推荐）**
```bash
npm run build:win-installer
```

**方法 2：使用 Inno Setup GUI**
1. 打开 Inno Setup Compiler
2. 打开 `installer/windows/ais-setup.iss`
3. 点击 "Build" → "Compile"

**方法 3：命令行**
```bash
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer\windows\ais-setup.iss
```

### 输出

安装程序将生成在：
```
dist/installer/ais-setup-1.5.1.exe
```

## 安装程序功能详解

### 安装过程

1. **欢迎页面**
   - 显示应用名称和版本
   - 多语言支持

2. **许可协议**
   - 显示 MIT 许可证
   - 用户需要接受才能继续

3. **选择安装目录**
   - 默认：`C:\Users\<username>\AppData\Local\Programs\AI Account Switch`
   - 用户可以自定义

4. **选择组件**
   - 添加到 PATH（推荐，默认选中）
   - 创建桌面快捷方式（可选）

5. **安装**
   - 复制文件
   - 配置 PATH
   - 创建快捷方式

6. **完成**
   - 显示成功消息
   - 提示用户可以使用 `ais` 命令

### 卸载过程

用户可以通过以下方式卸载：
- 开始菜单 → AI Account Switch → Uninstall
- Windows 设置 → 应用 → AI Account Switch → 卸载

卸载程序会：
- 删除所有安装的文件
- 从 PATH 中移除
- 删除开始菜单项
- 删除桌面快捷方式（如果有）

## PATH 配置原理

### 自动添加到 PATH

安装程序使用 Pascal 脚本自动修改用户的 PATH 环境变量：

```pascal
procedure EnvAddPath(Path: string);
var
    Paths: string;
begin
    { 读取当前 PATH }
    if not RegQueryStringValue(HKEY_CURRENT_USER, 'Environment', 'Path', Paths)
    then Paths := '';

    { 检查是否已存在 }
    if Pos(';' + Uppercase(Path) + ';', ';' + Uppercase(Paths) + ';') > 0 then exit;

    { 添加到 PATH }
    Paths := Paths + ';'+ Path +';'

    { 写入注册表 }
    RegWriteStringValue(HKEY_CURRENT_USER, 'Environment', 'Path', Paths);
end;
```

### 自动从 PATH 移除

卸载时自动清理：

```pascal
procedure EnvRemovePath(Path: string);
var
    Paths: string;
    P: Integer;
begin
    { 读取当前 PATH }
    if not RegQueryStringValue(HKEY_CURRENT_USER, 'Environment', 'Path', Paths) then
        exit;

    { 查找并删除 }
    P := Pos(';' + Uppercase(Path) + ';', ';' + Uppercase(Paths) + ';');
    if P = 0 then exit;

    Delete(Paths, P - 1, Length(Path) + 1);

    { 写入注册表 }
    RegWriteStringValue(HKEY_CURRENT_USER, 'Environment', 'Path', Paths);
end;
```

## 自定义配置

### 修改版本号

编辑 `installer/windows/ais-setup.iss`:
```iss
#define MyAppVersion "1.5.1"  ; 修改这里
```

### 修改安装目录

```iss
DefaultDirName={autopf}\{#MyAppName}  ; 当前：Program Files
; 或使用：
DefaultDirName={localappdata}\Programs\{#MyAppName}  ; 用户目录
```

### 添加更多文件

在 `[Files]` 部分添加：
```iss
[Files]
Source: "path\to\file"; DestDir: "{app}"; Flags: ignoreversion
```

### 添加注册表项

在 `[Registry]` 部分添加：
```iss
[Registry]
Root: HKCU; Subkey: "Software\AIAccountSwitch"; ValueType: string; ValueName: "InstallPath"; ValueData: "{app}"
```

## 发布流程

### 手动发布

1. 构建安装程序：
   ```bash
   npm run build:win-installer
   ```

2. 测试安装程序（在干净的 Windows 机器上）

3. 上传到 GitHub Releases

### 自动发布

1. 创建新 tag：
   ```bash
   git tag v1.5.1
   git push origin v1.5.1
   ```

2. GitHub Actions 自动：
   - 构建可执行文件
   - 创建安装程序
   - 上传到 Releases

## 优势总结

| 特性 | 手动安装 | 安装程序 |
|------|---------|---------|
| 安装步骤 | 6+ 步 | 3 步 |
| PATH 配置 | 手动 | 自动 |
| 管理员权限 | 有时需要 | 不需要 |
| 卸载 | 手动删除 | 一键卸载 |
| 开始菜单 | 无 | 有 |
| 用户体验 | 复杂 | 简单 |
| 专业性 | 低 | 高 |

## 下一步

1. ✅ 创建 Inno Setup 脚本
2. ✅ 添加 GitHub Actions 工作流
3. ✅ 更新 package.json 脚本
4. ⏳ 创建应用图标（可选但推荐）
5. ⏳ 在 Windows 机器上测试
6. ⏳ 更新 README 安装说明
7. ⏳ 发布新版本

## 参考资源

- [Inno Setup 官方文档](https://jrsoftware.org/ishelp/)
- [Inno Setup 示例](https://jrsoftware.org/isinfo.php)
- [PATH 环境变量管理](https://jrsoftware.org/ishelp/index.php?topic=setup_changesenvironment)

## 支持

如有问题，请查看：
- `installer/windows/build-installer.md` - 详细构建说明
- `installer/README.md` - 安装程序概述
- GitHub Issues - 报告问题

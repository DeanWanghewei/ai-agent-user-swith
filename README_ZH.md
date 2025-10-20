# AI Account Switch (ais)

[English](README.md) | 简体中文

一个跨平台的命令行工具，用于管理和切换不同项目的 Claude/Codex 账户配置。

## 特性

- **跨平台支持**：在 macOS、Linux 和 Windows 上无缝运行
- **多账户管理**：存储和管理多个 AI 服务账户
- **项目级配置**：每个项目可以使用不同的账户
- **智能目录检测**：在项目的任何子目录中都能工作（类似 git）
- **Claude Code 集成**：自动生成 `.claude/settings.local.json` 配置文件
- **Web UI 管理界面**：
  - 🎨 现代化单页面应用,支持深色/浅色主题
  - 🌍 中英文双语支持,一键切换
  - ⚙️ 可视化管理账号:增删改查一目了然
  - 📤 导入/导出功能:批量管理账号配置
  - 🔍 实时搜索过滤账号
  - 💾 自定义环境变量配置
  - 🎯 主题自动跟随系统设置
- **安全存储**:账户凭证仅存储在本地
- **交互式命令行**：所有操作都有易用的交互式提示
- **多种账户类型**：支持 Claude、Codex 和其他 AI 服务

## 安装

### 方式 1：全局 npm 安装（推荐）

```bash
npm install -g ai-account-switch
```

安装后，`ais` 命令将在全局可用。

**注意**：如果安装后提示"命令未找到"，可能需要将 npm 的全局 bin 目录添加到 PATH：

```bash
# 查看 npm 全局 bin 路径
npm config get prefix

# 添加到 PATH (Linux/macOS)
export PATH="$PATH:$(npm config get prefix)/bin"

# Windows 上，添加到系统 PATH：%APPDATA%\npm
```

### 方式 2：下载预编译二进制文件

从 [Releases 页面](https://github.com/yourusername/ai-agent-user-swith/releases) 下载适合你平台的最新版本：

**Windows（自动安装 - 推荐）：**

使用自动安装程序，它会下载最新版本并自动添加到 PATH：

**方法 1：PowerShell（推荐）**
```powershell
# 在 PowerShell 中运行（建议使用管理员权限进行系统级安装）
irm https://github.com/yourusername/ai-agent-user-swith/releases/latest/download/install.ps1 | iex
```

**方法 2：下载并运行安装脚本**
1. 从 [Releases 页面](https://github.com/yourusername/ai-agent-user-swith/releases) 下载 `install.ps1` 或 `install.bat`
2. 右键点击 `install.ps1` 并选择"使用 PowerShell 运行"
   - 或双击运行 `install.bat`

安装程序将：
- 下载最新的 `ais-win.exe`
- 安装到 `%LOCALAPPDATA%\ais`（用户安装）或 `C:\Program Files\ais`（系统安装）
- 自动添加到 PATH
- 验证安装

安装完成后，打开**新的终端**并验证：
```cmd
ais --version
```

**Windows（手动安装）：**

如果你更喜欢手动安装：

1. 从 [Releases 页面](https://github.com/yourusername/ai-agent-user-swith/releases) 下载 `ais-win.exe`

2. 选择安装位置（推荐：`C:\Program Files\ais\`）
   ```cmd
   mkdir "C:\Program Files\ais"
   ```

3. 将下载的文件移动到安装目录并重命名：
   ```cmd
   move "%USERPROFILE%\Downloads\ais-win.exe" "C:\Program Files\ais\ais.exe"
   ```

4. 添加到 PATH：

   **方法 1：使用系统设置（推荐）**
   - 打开开始菜单，搜索"环境变量"
   - 点击"编辑系统环境变量"
   - 点击"环境变量..."按钮
   - 在"系统变量"（或"用户变量"，仅对当前用户有效）下，找到并选择"Path"
   - 点击"编辑..."
   - 点击"新建"
   - 添加 `C:\Program Files\ais`
   - 在所有对话框上点击"确定"
   - **重启终端**使更改生效

   **方法 2：使用 PowerShell（管理员权限）**
   ```powershell
   # 添加到用户 PATH
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\ais", "User")

   # 或添加到系统 PATH（需要管理员权限）
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\ais", "Machine")
   ```

   **方法 3：使用命令提示符（管理员权限）**
   ```cmd
   setx PATH "%PATH%;C:\Program Files\ais"
   ```

5. 验证安装：
   ```cmd
   # 打开新的终端窗口
   ais --version
   ```

**注意**：如果你希望安装到用户目录而不需要管理员权限，可以使用 `%LOCALAPPDATA%\ais`：
```cmd
mkdir "%LOCALAPPDATA%\ais"
move "%USERPROFILE%\Downloads\ais-win.exe" "%LOCALAPPDATA%\ais\ais.exe"
# 然后将 %LOCALAPPDATA%\ais 添加到你的用户 PATH
```

**macOS：**

1. 下载并安装到 `/usr/local/bin`：
   ```bash
   curl -L https://github.com/yourusername/ai-agent-user-swith/releases/latest/download/ais-macos -o /usr/local/bin/ais
   chmod +x /usr/local/bin/ais
   ```

2. 如果你没有 `/usr/local/bin` 的写入权限，使用 sudo：
   ```bash
   sudo curl -L https://github.com/yourusername/ai-agent-user-swith/releases/latest/download/ais-macos -o /usr/local/bin/ais
   sudo chmod +x /usr/local/bin/ais
   ```

3. 或者，安装到用户目录（无需 sudo）：
   ```bash
   mkdir -p ~/.local/bin
   curl -L https://github.com/yourusername/ai-agent-user-swith/releases/latest/download/ais-macos -o ~/.local/bin/ais
   chmod +x ~/.local/bin/ais

   # 如果还未添加到 PATH，请添加
   echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```

4. 验证安装：
   ```bash
   ais --version
   ```

**Linux：**

1. 下载并安装到 `/usr/local/bin`：
   ```bash
   curl -L https://github.com/yourusername/ai-agent-user-swith/releases/latest/download/ais-linux -o /usr/local/bin/ais
   chmod +x /usr/local/bin/ais
   ```

2. 如果你没有 `/usr/local/bin` 的写入权限，使用 sudo：
   ```bash
   sudo curl -L https://github.com/yourusername/ai-agent-user-swith/releases/latest/download/ais-linux -o /usr/local/bin/ais
   sudo chmod +x /usr/local/bin/ais
   ```

3. 或者，安装到用户目录（无需 sudo）：
   ```bash
   mkdir -p ~/.local/bin
   curl -L https://github.com/yourusername/ai-agent-user-swith/releases/latest/download/ais-linux -o ~/.local/bin/ais
   chmod +x ~/.local/bin/ais

   # 如果还未添加到 PATH，请添加
   echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
   source ~/.bashrc
   ```

4. 验证安装：
   ```bash
   ais --version
   ```

### 方式 3：从源码安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/ai-agent-user-swith.git
cd ai-agent-user-swith

# 安装依赖
npm install

# 全局链接 CLI 工具
npm link
```

**维护者说明**：请查看 [NPM_PUBLISH.md](NPM_PUBLISH.md) 了解发布说明。

## 使用方法

### 命令概览

| 命令 | 别名 | 描述 |
|------|------|------|
| `ais add [name]` | - | 添加新的账户配置 |
| `ais list` | `ls` | 列出所有可用账户 |
| `ais use [name]` | - | 为当前项目设置账户 |
| `ais info` | - | 显示当前项目的账户信息 |
| `ais current` | - | 显示当前账户名称 |
| `ais remove [name]` | `rm` | 删除账户 |
| `ais paths` | - | 显示配置文件路径 |
| `ais doctor` | - | 诊断 Claude Code 配置问题 |
| `ais export <name>` | - | 导出账户为 JSON 格式 |
| `ais ui` | - | 启动 Web UI 管理界面 |
| `ais help` | - | 显示帮助信息 |
| `ais --version` | - | 显示版本号 |

### 快速开始

#### 1. 添加账户

交互式添加第一个账户：

```bash
ais add
```

或直接指定名称：

```bash
ais add my-claude-account
```

系统将提示你输入：
- 账户类型（Claude、Codex、其他）
- API Key
- API URL（可选）
- Email（可选）
- 描述（可选）
- 自定义环境变量（可选）
  - 使用 `KEY=VALUE` 格式输入（例如：`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`）
  - 工具会在完成前显示所有已添加的变量
  - 直接按回车（不输入）即可完成添加

#### 2. 列出所有账户

查看所有已配置的账户：

```bash
ais list
# 或
ais ls
```

当前项目激活的账户将用绿色圆点标记。

#### 3. 为当前项目切换账户

设置当前项目使用的账户：

```bash
ais use my-claude-account
```

或交互式选择：

```bash
ais use
```

**注意**：此命令会自动生成 `.claude/settings.local.json` 文件用于 Claude Code CLI 集成。
如果检测到当前项目是 Git 仓库，还会自动将配置文件添加到 `.gitignore` 中，避免将敏感信息提交到版本控制。
你可以在项目的任何子目录中运行此命令 - 它会自动找到项目根目录。

#### 4. 查看当前项目信息

查看当前项目激活的账户：

```bash
ais info
```

或仅显示账户名称：

```bash
ais current
```

**注意**：这些命令可以在项目的任何子目录中使用，类似 git 命令的工作方式。

#### 5. 使用 Web UI 管理界面

启动可视化管理界面:

```bash
ais ui
```

这将在浏览器中打开 Web UI,服务器会自动使用一个随机的高位端口(49152-65535)。如果端口被占用,会自动尝试其他端口,提供以下功能:

**界面特性:**
- **账号管理**: 可视化的卡片界面,显示所有账号信息
- **添加/编辑账号**: 友好的表单界面,支持所有配置项
- **删除账号**: 一键删除,带确认提示
- **搜索过滤**: 实时搜索账号名称、邮箱或类型
- **批量操作**:
  - 导出所有账号为 JSON 文件
  - 从 JSON 文件导入账号(支持覆盖选项)
- **主题切换**:
  - iOS 风格的 Switch 开关
  - 支持浅色和深色主题
  - 默认跟随系统主题设置
- **多语言支持**:
  - 中文/英文一键切换
  - 界面默认使用中文
  - 语言设置自动保存

**UI 使用提示:**
- 所有修改实时同步到本地配置
- 关闭浏览器窗口不影响数据
- 按 `Ctrl+C` 停止 Web 服务器
- 支持在任何浏览器中使用

#### 6. 删除账户

删除不再需要的账户：

```bash
ais remove old-account
# 或
ais rm
```

### 高级用法

#### 显示配置路径

查看配置文件的存储位置：

```bash
ais paths
```

#### 诊断配置问题

如果 Claude Code 使用了错误的账户，运行诊断：

```bash
ais doctor
```

此命令会检查：
- 当前目录和项目根目录
- AIS 项目配置
- Claude Code 配置
- 全局 Claude 配置
- 提供解决建议

#### 导出账户配置

以 JSON 格式导出账户配置：

```bash
ais export my-claude-account
```

## 配置

### 全局配置

所有账户都存储在用户主目录的全局配置中：

- **macOS/Linux**: `~/.ai-account-switch/config.json`
- **Windows**: `%USERPROFILE%\.ai-account-switch\config.json`

### 项目配置

每个项目将其活动账户引用存储在：

```
./.ais-project-config
```

此文件在运行 `ais use` 时自动创建，应添加到 `.gitignore` 中。

### Claude Code 集成

运行 `ais use` 时，工具会自动创建 `.claude/settings.local.json`，结构如下：

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "your-api-key",
    "ANTHROPIC_BASE_URL": "your-api-url",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"
  },
  "permissions": {
    "allow": [],
    "deny": [],
    "ask": []
  }
}
```

这确保 Claude Code CLI 自动使用项目的正确账户。

#### 自定义环境变量

在创建账户时可以添加自定义环境变量。在提示时，使用 `KEY=VALUE` 格式输入：

**输入格式：**
```
? Environment variable (KEY=VALUE format): CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
✓ Added: CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1

📋 Current environment variables:
   • CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1

? Add another environment variable? (y/N)
```

**常见示例：**
- `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` - 禁用非必要网络流量
- `HTTP_PROXY=http://proxy.example.com:8080` - 设置 HTTP 代理
- `HTTPS_PROXY=https://proxy.example.com:8080` - 设置 HTTPS 代理
- 其他你需要的环境变量

**功能特性：**
- 单行输入格式（`KEY=VALUE`）
- 实时显示已添加的变量
- 直接按回车即可完成
- 变量会自动包含在 `.claude/settings.local.json` 文件中

## 使用示例

### 示例 1：设置多个账户

```bash
# 添加个人 Claude 账户
ais add personal-claude

# 添加工作 Claude 账户
ais add work-claude

# 添加 Codex 账户
ais add codex-dev

# 列出所有账户
ais list
```

### 示例 2：为不同项目使用不同账户

```bash
# 在个人项目中
cd ~/my-personal-project
ais use personal-claude

# 在工作项目中
cd ~/work/company-project
ais use work-claude

# 检查激活的账户
ais info
```

### 示例 3：管理账户

```bash
# 查看所有账户
ais list

# 检查当前账户
ais current

# 导出账户配置
ais export personal-claude

# 删除旧账户
ais remove old-account

# 查看配置位置
ais paths
```

### 示例 4：诊断问题

```bash
# 如果 Claude Code 使用了错误的账户
cd ~/your-project
ais doctor

# 根据诊断建议操作
# 然后重新设置账户
ais use correct-account
```

## 安全注意事项

- API 密钥仅存储在本地机器上
- 全局配置文件包含敏感凭证
- `ais use` 命令会自动将配置文件添加到 `.gitignore` (如果项目是 Git 仓库)
- 始终验证 `.gitignore` 包含以下文件：
  - `.ais-project-config`
  - `.claude/settings.local.json`
- 切勿将账户凭证提交到版本控制
- 显示 API 密钥时会进行掩码处理（仅显示前 4 位和后 4 位字符）

## 平台兼容性

| 平台 | 状态 | 备注 |
|------|------|------|
| macOS | ✅ 完全支持 | 已在 macOS 10.15+ 上测试 |
| Linux | ✅ 完全支持 | 已在 Ubuntu 20.04+ 上测试 |
| Windows | ✅ 完全支持 | 已在 Windows 10+ 上测试 |

## 系统要求

- Node.js >= 14.0.0
- npm >= 6.0.0

## 项目结构

```
ai-agent-user-swith/
├── bin/
│   └── ais.js              # 可执行入口点
├── src/
│   ├── index.js            # 主 CLI 程序
│   ├── commands.js         # 命令实现
│   └── config.js           # 配置管理器
├── .github/
│   └── workflows/
│       └── release.yml     # GitHub Actions 自动发布
├── package.json
├── .gitignore
├── .npmignore
├── README.md               # 英文文档
├── README_ZH.md            # 中文文档
├── NPM_PUBLISH.md          # npm 发布指南
└── RELEASE.md              # 发布指南
```

## 故障排除

### 命令未找到：ais

如果安装后出现此错误，确保已链接包：

```bash
npm link
```

### 权限被拒绝

在 Unix 系统上，确保 bin 文件可执行：

```bash
chmod +x bin/ais.js
```

### 未找到账户

确保你已添加至少一个账户：

```bash
ais add
```

### Claude Code 使用了错误的账户

如果 Claude Code 使用了非预期的账户：

1. 运行诊断：
   ```bash
   ais doctor
   ```

2. 检查全局 Claude 配置是否覆盖了项目配置：
   - 如果 `~/.claude/settings.json` 包含 `env.ANTHROPIC_AUTH_TOKEN`，可能会冲突
   - **解决方案**：从全局配置中删除 `env` 部分，或仅保留 `permissions`

3. 确保从项目目录或子目录启动 Claude Code

4. 重新生成项目配置：
   ```bash
   ais use <你的账户名>
   ```

### 在子目录中未找到项目配置

工具应该在任何子目录中工作。如果不行：

```bash
# 确保你在已配置的项目中
cd /path/to/your/project
ais use <account>

# 然后从子目录尝试
cd src/
ais current  # 应该显示你的账户
```

## 贡献

欢迎贡献！你可以：
- 报告 bug
- 建议新功能
- 提交 pull request

## 许可证

MIT License - 欢迎在你的项目中使用此工具！

## 更新日志

### v1.4.0
- **添加 Web UI 管理界面**：
  - 现代化单页面应用，支持深色/浅色主题
  - 中英文双语支持，默认中文
  - 可视化账号管理：增删改查一目了然
  - 导入/导出功能：批量管理账号配置
  - 实时搜索过滤账号
  - 自定义环境变量配置
  - 主题自动跟随系统设置
  - iOS 风格的主题切换开关
- **端口优化**：
  - UI 服务器使用随机高位端口（49152-65535）
  - 自动检测端口冲突并重试
- **界面改进**：
  - 修复账号卡片按钮位置不一致问题
  - 按钮始终固定在卡片底部
- **移除组织 ID 配置**：
  - 简化账号配置流程
  - 移除 CLI 和 UI 中的组织 ID 选项

### v1.3.0
- **改进自定义环境变量输入**：
  - 支持单行 `KEY=VALUE` 格式输入（例如：`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`）
  - 配置过程中实时显示已添加的变量
  - 直接按回车即可完成变量添加
  - 更清晰的错误提示和用户指引
- 增强文档，添加详细的示例和使用说明

### v1.2.0
- 添加账户自定义环境变量支持
- 添加 `ais doctor` 命令用于配置诊断
- 增强 `ais help` 显示所有新功能
- 更新安装文档（npm 作为推荐安装方式）
- 改进 PATH 配置说明
- 在 `ais list` 和 `ais info` 中显示自定义环境变量

### v1.1.0
- 添加智能目录检测（在任何子目录中工作）
- 自动生成 Claude Code `.claude/settings.local.json` 配置
- 在 `ais info` 命令中显示项目根目录
- 改进跨平台兼容性

### v1.0.0
- 初始版本
- 基本账户管理（添加、列出、删除）
- 项目级账户切换
- 跨平台支持
- 交互式 CLI 提示
- 账户导出功能

## 未来增强

未来版本的潜在功能：
- 账户验证
- 批量导入/导出
- 账户模板
- 环境变量导出
- 账户共享（加密）
- 云同步支持
- 账户使用统计

## 支持

如果遇到任何问题或有疑问：
1. 查看故障排除部分
2. 查看现有 issues
3. 创建新 issue 并提供详细信息

---

**祝你与 AI 助手编码愉快！** 🤖

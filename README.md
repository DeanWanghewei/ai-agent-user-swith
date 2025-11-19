# AI Account Switch (ais)

简体中文 | [English](README_EN.md)

一个跨平台的命令行工具，用于管理和切换不同项目的 Claude/Codex/Droids 账户配置。

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
- **MCP Web UI 管理**：完整的 MCP (Model Context Protocol) 服务器管理
  - 🖥️ 直观的界面添加、编辑、删除 MCP 服务器
  - 🔌 支持 stdio、sse、http 三种服务器类型
  - 🧪 测试 MCP 服务器连接
  - ⚡ 一键启用/禁用项目级服务器
  - 🔍 搜索和筛选功能
  - 🌐 完整的中英文支持
- **安全存储**:账户凭证仅存储在本地
- **交互式命令行**：所有操作都有易用的交互式提示
- **多种账户类型**：支持 Claude、Codex、CCR (Claude Code Router)、Droids 和其他 AI 服务

## 安装

### npm 安装（推荐）

```bash
npm install -g ai-account-switch
```

安装后，`ais` 命令将在全局可用。

**故障排除**：如果安装后提示"命令未找到"：

```bash
# 查看 npm 全局 bin 路径
npm config get prefix

# 添加到 PATH (Linux/macOS)
export PATH="$PATH:$(npm config get prefix)/bin"

# Windows 上，添加到系统 PATH：%APPDATA%\npm
```

### 从源码安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/ai-agent-user-swith.git
cd ai-agent-user-swith

# 安装依赖
npm install

# 全局链接 CLI 工具
npm link
```

## 使用方法

### 命令概览

| 命令 | 别名 | 描述 |
|------|------|------|
| `ais add [name]` | - | 添加新的账户配置 |
| `ais list` | `ls` | 列出所有可用账户（含ID） |
| `ais use [name-or-id]` | - | 通过名称或ID为当前项目设置账户 |
| `ais info` | - | 显示当前项目的账户信息 |
| `ais current` | - | 显示当前账户名称 |
| `ais remove [name-or-id]` | `rm` | 通过名称或ID删除账户 |
| `ais model list` | `ls` | 列出当前账户的所有模型组 |
| `ais model add [name]` | - | 添加新的模型组 |
| `ais model use <name>` | - | 切换到不同的模型组 |
| `ais model remove [name]` | `rm` | 删除模型组 |
| `ais model show [name]` | - | 显示模型组配置 |
| `ais mcp add [name]` | - | 添加新的 MCP 服务器 |
| `ais mcp list` | `ls` | 列出所有 MCP 服务器 |
| `ais mcp show [name]` | - | 显示 MCP 服务器详情 |
| `ais mcp update [name]` | - | 更新 MCP 服务器配置 |
| `ais mcp remove [name]` | `rm` | 删除 MCP 服务器 |
| `ais mcp enable [name]` | - | 为当前项目启用 MCP 服务器 |
| `ais mcp disable [name]` | - | 为当前项目禁用 MCP 服务器 |
| `ais mcp enabled` | - | 显示已启用的 MCP 服务器 |
| `ais mcp sync` | - | 同步 MCP 配置到 Claude Code |
| `ais ui` | - | 启动 Web UI 管理界面 |
| `ais paths` | - | 显示配置文件路径 |
| `ais doctor` | - | 诊断 Claude Code 配置问题 |
| `ais export <name-or-id>` | - | 通过名称或ID导出账户为 JSON 格式 |
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
- 账户类型（Claude、Codex、CCR、Droids、其他）
- API Key
- API URL（可选）
- Email（可选）
- 描述（可选）
- 自定义环境变量（可选）
  - 使用 `KEY=VALUE` 格式输入（例如：`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`）
  - 工具会在完成前显示所有已添加的变量
  - 直接按回车（不输入）即可完成添加

#### 2. 列出所有账户

查看所有已配置的账户及其ID：

```bash
ais list
# 或
ais ls
```

输出示例：
```
📋 Available Accounts (可用账号):

● [1] my-claude-account
   Type: Claude
   API Key: sk-a****xyz
   ...

  [2] work-codex
   Type: Codex
   API Key: sk-b****abc
   ...
```

当前项目激活的账户将用绿色圆点标记。

#### 3. 为当前项目切换账户

设置当前项目使用的账户（可以使用账户名或ID）：

```bash
# 使用账户名
ais use my-claude-account

# 或使用ID（更快捷）
ais use 1
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

### Codex 集成

当你添加 **Codex** 类型账户并运行 `ais use` 时，工具会自动在 `~/.codex/config.toml` 中创建 profile，并在项目目录中创建 `.codex-profile` 文件。

#### 添加 Codex 账户

添加 Codex 账户时，你会看到有用的配置提示：

```bash
ais add my-codex-account

? Select account type: Codex

📝 Codex Configuration Tips:
   • API URL should include the full path (e.g., https://api.example.com/v1)
   • AIS will automatically add /v1 if missing
   • Codex uses OpenAI-compatible API format

? Enter API Key: sk-xxx...
? Enter API URL (e.g., https://api.example.com or https://api.example.com/v1): https://zone.veloera.org
```

**重要说明：**
- AIS 会自动为 API URL 添加 `/v1` 路径（如果缺少）
- 配置使用 `wire_api = "chat"`（OpenAI 兼容格式）
- 这可以防止常见的 Cloudflare 400 错误

#### 在项目中使用 Codex

使用 Codex 账户运行 `ais use` 后：

```bash
cd ~/my-project
ais use my-codex-account

# 输出：
# ✓ Switched to account 'my-codex-account' for current project.
# ✓ Codex profile created: ais_my-project
#   Use: codex --profile ais_my-project [prompt]
```

工具会创建：
1. **全局 Profile**：`~/.codex/config.toml` 包含你的账户配置
2. **项目引用**：`.codex-profile` 包含 profile 名称

#### 运行 Codex

使用生成的 profile 运行 Codex：

```bash
# 在项目目录中
codex --profile ais_my-project "your prompt here"

# 或使用 .codex-profile 中的 profile 名称
codex --profile $(cat .codex-profile) "your prompt"
```

#### Codex 配置结构

在 `~/.codex/config.toml` 中生成的配置：

```toml
# AIS Profile for project: /path/to/your/project
[profiles.ais_my-project]
model_provider = "ais_my-codex-account"

[model_providers.ais_my-codex-account]
name = "ais_my-codex-account"
base_url = "https://zone.veloera.org/v1"
wire_api = "chat"
http_headers = { "Authorization" = "Bearer sk-xxx..." }
```

#### 在不同项目间切换

每个项目可以使用不同的 Codex 账户：

```bash
# 项目 A
cd ~/project-a
ais use codex-account-1
codex --profile ais_project-a "implement feature X"

# 项目 B
cd ~/project-b
ais use codex-account-2
codex --profile ais_project-b "fix bug Y"
```

#### Codex 故障排除

**错误："duplicate key" in TOML**
- 这是因为 profile 没有正确清理
- 解决方案：再次运行 `ais use <account>` 重新生成配置

**错误："400 Bad Request" from Cloudflare**
- 这通常意味着 API URL 不正确
- 解决方案：确保 API URL 包含 `/v1` 或让 AIS 自动添加
- 运行 `ais use <account>` 使用正确的配置重新生成

**检查 Codex 配置**
```bash
# 查看你的 Codex profile
cat .codex-profile

# 检查配置
grep -A 10 "$(cat .codex-profile)" ~/.codex/config.toml

# 或使用 doctor 命令
ais doctor
```

### CCR (Claude Code Router) 集成

[Claude Code Router](https://github.com/musistudio/claude-code-router) 是一个强大的 Claude Code 路由层，允许你无缝使用多个 AI 提供商和模型。

当你添加 **CCR** 类型账户并运行 `ais use` 时，工具会自动：
1. 更新 `~/.claude-code-router/config.json` 中的 Provider 和 Router 配置
2. 生成指向本地 CCR Router 的 `.claude/settings.local.json`
3. 自动重启 CCR Router 以应用更改

**前提条件：**
- 安装 Claude Code Router：`npm install -g @musistudio/claude-code-router`
- 启动 CCR Router：`ccr start`

#### 添加 CCR 账户

添加 CCR 账户时，你会看到有用的配置提示：

```bash
ais add my-ccr-account

? Select account type: CCR

📝 CCR Configuration Tips:
   • CCR configuration will be stored in ~/.claude-code-router/config.json
   • You need to provide Provider name and models
   • Router configuration will be automatically updated

? Enter API Key: sk-xxx...
? Enter API URL: http://localhost:3000/v1/chat/completions
? Enter Provider name: Local-new-api
? Enter default model: gemini-2.5-flash
? Enter background model: gemini-2.5-flash
? Enter think model: gemini-2.5-pro
```

**重要说明：**
- 默认 API URL 是 `http://localhost:3000/v1/chat/completions`
- 你需要指定三个模型：default、background 和 think
- 模型会在 Provider 配置中自动去重

#### 在项目中使用 CCR

使用 CCR 账户运行 `ais use` 后：

```bash
cd ~/my-project
ais use my-ccr-account

# 输出：
# ✓ Switched to account 'my-ccr-account' for current project.
# 🔄 Restarting CCR Router...
# ✓ CCR Router restarted successfully
# ✓ CCR configuration updated at: ~/.claude-code-router/config.json
# ✓ Claude configuration generated at: .claude/settings.local.json
#
# 📖 Next Steps:
#    Start interactive session: claude
#    This will enter project-level interactive mode
#    Claude Code will use CCR Router to route requests
```

工具会：
1. **更新 CCR 配置**：在 `~/.claude-code-router/config.json` 中添加/更新 Provider
2. **更新 Router**：设置 default、background 和 think 模型
3. **生成 Claude 配置**：创建 `.claude/settings.local.json`，`ANTHROPIC_BASE_URL` 指向 CCR Router
4. **重启 CCR**：自动运行 `ccr restart` 以应用更改

#### 使用 CCR 运行 Claude

启动 Claude 交互会话：

```bash
# 在项目目录中
claude

# Claude Code 会自动使用 CCR Router
# 请求会根据你的 CCR 配置进行路由
```

#### CCR 配置结构

在 `~/.claude-code-router/config.json` 中生成的配置：

```json
{
  "PORT": 3456,
  "Providers": [
    {
      "api_base_url": "http://localhost:3000/v1/chat/completions",
      "api_key": "sk-xxx...",
      "models": ["gemini-2.5-flash", "gemini-2.5-pro"],
      "name": "Local-new-api"
    }
  ],
  "Router": {
    "default": "Local-new-api,gemini-2.5-flash",
    "background": "Local-new-api,gemini-2.5-flash",
    "think": "Local-new-api,gemini-2.5-pro"
  }
}
```

在 `.claude/settings.local.json` 中生成的配置：

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "your-api-key",
    "ANTHROPIC_BASE_URL": "http://127.0.0.1:3456"
  }
}
```

#### 在不同项目间切换

每个项目可以使用不同的 CCR 配置：

```bash
# 项目 A
cd ~/project-a
ais use ccr-account-1
claude

# 项目 B
cd ~/project-b
ais use ccr-account-2
claude
```

#### CCR 故障排除

**检查 CCR 配置**
```bash
# 查看你的 CCR 配置
cat ~/.claude-code-router/config.json

# 查看 Claude 配置
cat .claude/settings.local.json

# 或使用 doctor 命令
ais doctor
```

**CCR Router 未安装**
- 从 npm 安装：`npm install -g @musistudio/claude-code-router`
- 访问项目页面：https://github.com/musistudio/claude-code-router

**CCR Router 未重启**
- 确保 CCR CLI 已安装并在 PATH 中可用
- 如果自动重启失败，手动运行 `ccr restart`
- 检查 CCR Router 是否运行：`ccr status`

**Claude 未使用 CCR Router**
- 验证 `.claude/settings.local.json` 中的 `ANTHROPIC_BASE_URL` 指向正确的端口
- 检查 CCR Router 是否在配置的端口上运行
- 配置更改后重启 Claude Code

### Droids 集成

当你添加 **Droids** 类型账户并运行 `ais use` 时，工具会自动在项目目录中创建 `.droids/config.json` 配置文件。

#### 添加 Droids 账户

添加 Droids 账户时，你会看到有用的配置提示：

```bash
ais add my-droids-account

? Select account type: Droids

📝 Droids Configuration Tips:
   • Droids configuration will be stored in .droids/config.json
   • API URL is optional (defaults to Droids default endpoint)
   • You can configure custom models and settings

? Enter API Key: sk-xxx...
? Enter API URL (optional): https://api.example.com
? Do you want to specify a model? (Optional) Yes
? Enter model name: droids-model-v1
```

#### 在项目中使用 Droids

使用 Droids 账户运行 `ais use` 后：

```bash
cd ~/my-project
ais use my-droids-account

# 输出：
# ✓ Switched to account 'my-droids-account' for current project.
# ✓ Droids configuration generated at: .droids/config.json
#
# 📖 Next Steps:
#    Start interactive session: droid
#    This will enter project-level interactive mode
#    Droids will automatically use the configuration from .droids/config.json
```

工具会创建：
- **项目配置**：`.droids/config.json` 包含你的账户设置

#### 运行 Droids

启动 Droids 交互会话：

```bash
# 在项目目录中
droid

# Droids 会自动从 .droids/config.json 加载配置
```

#### Droids 配置结构

在 `.droids/config.json` 中生成的配置：

```json
{
  "apiKey": "your-api-key",
  "baseUrl": "https://api.example.com",
  "model": "droids-model-v1",
  "customSettings": {
    "CUSTOM_VAR": "value"
  }
}
```

#### 在不同项目间切换

每个项目可以使用不同的 Droids 账户：

```bash
# 项目 A
cd ~/project-a
ais use droids-account-1
droid

# 项目 B
cd ~/project-b
ais use droids-account-2
droid
```

#### Droids 故障排除

**检查 Droids 配置**
```bash
# 查看你的 Droids 配置
cat .droids/config.json

# 或使用 doctor 命令
ais doctor
```

**Droids CLI 未找到**
- 确保 Droids CLI 已安装并在 PATH 中可用
- 运行 `droid --version` 验证安装

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

# 添加 Droids 账户
ais add droids-dev

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

- **Node.js**: >= 16.0.0
- **npm**: >= 7.0.0

**注意**: 此工具需要 Node.js 16 或更高版本（因为 commander@11.x 依赖要求）。你可以使用以下命令检查当前版本:
```bash
node --version
npm --version
```

如果需要升级 Node.js，请访问 [nodejs.org](https://nodejs.org/) 或使用版本管理器如 [nvm](https://github.com/nvm-sh/nvm)。

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

### MCP (Model Context Protocol) 集成

AIS 支持全局管理 MCP 服务器并按项目启用。MCP 服务器为 Claude Code 扩展额外的工具和功能。

你可以通过 **CLI 命令**和 **Web UI** 两种方式管理 MCP 服务器。

#### Web UI 管理（推荐）

管理 MCP 服务器最简单的方式是通过 Web UI：

```bash
ais ui
```

然后点击 **"MCP 服务器"** 标签页：

**功能：**
- ✅ **添加 MCP 服务器**：点击"+ 添加 MCP 服务器"添加新服务器
  - 选择服务器类型：stdio、sse 或 http
  - 填写配置（命令、URL、环境变量等）
  - 添加描述便于识别
- ✅ **编辑服务器**：点击"编辑"修改现有服务器配置
- ✅ **测试连接**：点击"测试连接"验证服务器可用性
- ✅ **启用/禁用**：一键切换当前项目的服务器状态
- ✅ **搜索和筛选**：快速按名称或类型查找服务器
- ✅ **删除服务器**：删除不再需要的服务器
- ✅ **同步配置**：点击"同步配置"同步到 Claude Code

**优势：**
- 直观的可视化界面
- 实时验证
- 无需记忆命令语法
- 一目了然查看所有服务器
- 状态指示器（已启用/未启用）
- 支持中英文

**示例工作流程：**
1. 启动 Web UI：`ais ui`
2. 点击"MCP 服务器"标签页
3. 点击"+ 添加 MCP 服务器"
4. 选择类型："stdio"
5. 输入命令："npx"
6. 输入参数："@modelcontextprotocol/server-filesystem,/path"
7. 点击"保存"
8. 点击"测试连接"验证
9. 点击"启用"为当前项目启用

#### CLI 管理

你也可以通过 CLI 命令管理 MCP 服务器：

##### 添加 MCP 服务器

交互式添加新的 MCP 服务器：

```bash
ais mcp add filesystem
```

你将被提示配置：
- **服务器类型**：stdio、sse 或 http
- **命令和参数**（stdio 类型）
- **URL**（sse/http 类型）
- **环境变量**（可选）
- **请求头**（sse/http 可选）
- **描述**（可选）

**示例：添加 stdio MCP 服务器**
```bash
$ ais mcp add filesystem
? 选择 MCP 服务器类型: stdio
? 输入命令: npx
? 输入参数（逗号分隔）: @modelcontextprotocol/server-filesystem,/Users/user/workspace
? 添加环境变量? 是
? 环境变量 (KEY=VALUE): ALLOWED_PATHS=/Users/user/workspace
? 添加另一个? 否
? 输入描述: 文件系统访问 MCP 服务器
✓ MCP 服务器 'filesystem' 添加成功！
```

##### 列出 MCP 服务器

查看所有配置的 MCP 服务器：

```bash
ais mcp list
```

输出显示服务器名称、类型、启用状态和描述。

##### 为项目启用 MCP 服务器

为当前项目启用 MCP 服务器：

```bash
cd ~/my-project
ais mcp enable filesystem
```

这将：
1. 将服务器添加到项目的启用列表
2. 更新 `.claude/settings.local.json` 的 MCP 配置
3. 使 MCP 服务器在此项目中对 Claude Code 可用

##### 管理 MCP 服务器

```bash
# 显示 MCP 服务器详情
ais mcp show filesystem

# 更新 MCP 服务器配置
ais mcp update filesystem

# 为当前项目禁用 MCP 服务器
ais mcp disable filesystem

# 显示当前项目已启用的 MCP 服务器
ais mcp enabled

# 同步 MCP 配置到 Claude Code
ais mcp sync

# 删除 MCP 服务器
ais mcp remove filesystem
```

## 贡献

欢迎贡献！你可以：
- 报告 bug
- 建议新功能
- 提交 pull request

## 许可证

MIT License - 欢迎在你的项目中使用此工具！

## 更新日志

### v1.9.0
- **账号ID功能**：
  - 为每个账号自动分配唯一数字ID（从1开始递增）
  - 支持通过ID快速切换账号：`ais use 1`
  - 支持通过ID删除账号：`ais remove 2`
  - 支持通过ID导出账号：`ais export 3`
  - 账号列表展示格式优化：`[ID] AccountName`
  - ID使用黄色高亮显示，更加清晰可见
  - 完全向后兼容：已有账号自动分配ID
  - 交互式选择账号时同时显示ID和名称
- **文档更新**：
  - 更新所有命令说明，添加ID使用示例
  - 中英文README同步更新
  - Help命令输出优化

### v1.7.0
- **MCP Web UI 管理**：
  - 通过 Web UI 完整管理 MCP 服务器
  - 标签页导航系统（账号管理 / MCP 服务器）
  - 直观界面添加、编辑、删除 MCP 服务器
  - 测试 MCP 服务器连接
  - 一键启用/禁用项目级服务器
  - 搜索和筛选功能
  - 实时验证和状态指示器
  - 完整的中英文支持
- **MCP CLI 集成**：
  - 使用 `ais mcp` 命令全局管理 MCP 服务器
  - 项目级 MCP 服务器启用/禁用功能
  - 支持 stdio、sse 和 http MCP 服务器类型
  - 自动生成 Claude Code 的 MCP 配置
  - 命令：`ais mcp add`、`ais mcp list`、`ais mcp show`、`ais mcp update`、`ais mcp remove`
  - 项目命令：`ais mcp enable`、`ais mcp disable`、`ais mcp enabled`、`ais mcp sync`
  - 交互式 MCP 服务器配置，带验证
  - 支持 MCP 服务器的环境变量和请求头
- **Bug 修复**：
  - 修复添加标签页后账号数据不显示的问题
  - 修复 "switchTab is not defined" 错误
  - 修复搜索结果提示信息不正确的问题
- **改进**：
  - 更好的用户体验，提示信息更清晰
  - 现代 JavaScript 实践（事件监听器）
  - 改进代码质量和可维护性
  - 32 个自动化测试全部通过

### v1.6.0
- **CCR (Claude Code Router) 集成**：
  - 完整支持 Claude Code Router
  - 自动生成 `~/.claude-code-router/config.json` 配置
  - Provider 和 Router 配置管理
  - 配置更改后自动重启 CCR Router
  - Claude Code 与本地 CCR Router 端点集成
  - 支持 default、background 和 think 模型路由
- **Web UI 增强**：
  - 添加账户状态检查，带颜色指示器（绿色：可用，橙色：不稳定，红色：不可用）
  - 状态结果会保存并在页面加载时显示
  - 实时状态检查，带"状态检查"按钮
  - 改进账户卡片布局，状态显示在右上角
  - 状态检查期间增强视觉反馈
- **配置改进**：
  - CCR 账户自动生成 CCR 和 Claude 两种配置
  - 从 CCR 配置动态读取端口用于 Claude 集成
  - 更好的错误处理和用户反馈

### v1.5.7
- **Droids 集成**：
  - 完整支持 Droids AI 助手
  - 自动生成 `.droids/config.json` 配置文件
  - Droids 账户的简单模型配置
  - 交互会话命令：`droid`
  - 增强 `ais doctor` 命令，支持 Droids 配置检测
- **UI 增强**：
  - 添加类型筛选下拉框，快速过滤账户
  - 按类型为账户卡片着色（Claude: 蓝色，Codex: 紫色，Droids: 绿色，Other: 橙色）
  - 账户卡片左侧边框颜色指示器
  - 改进视觉层次和用户体验
- **模型配置改进**：
  - 为不同账户类型分离模型配置
  - Claude: 复杂的模型组，支持多个模型设置
  - Codex/Droids: 简单的模型字段，配置更直观
  - 所有模型设置移至可折叠的"高级配置"区域
- **更好的用户指引**：
  - 增强 `ais use` 命令，提供清晰的下一步操作说明
  - 为每个 AI 助手提供特定类型的使用示例
  - 交互模式提示而非一次性命令示例

### v1.5.1
- **Codex 集成增强**：
  - 完整支持 Codex CLI 的 profile 配置
  - 自动为 Codex 账户生成 `~/.codex/config.toml` profiles
  - 项目级 `.codex-profile` 文件方便引用 profile
  - 智能 API URL 处理：自动添加 `/v1` 路径（如果缺少）
  - 使用 OpenAI 兼容的 `wire_api = "chat"` 格式
  - 通过正确配置防止 Cloudflare 400 错误
- **用户体验改进**：
  - 添加 Codex 账户时显示配置提示
  - 账户创建后显示使用说明
  - 增强 `ais doctor` 命令，支持 Codex 配置检测
  - 改进 TOML 文件中的重复 profile 清理
- **Bug 修复**：
  - 修复 Codex 配置中的重复 profile key 错误
  - 改进 profile 删除的正则表达式模式
  - 分离 Claude 和 Codex 配置生成逻辑
- **文档更新**：
  - README 中添加全面的 Codex 集成指南
  - 常见 Codex 问题的故障排除部分
  - 多项目 Codex 使用示例

### v1.5.0
- **模型组管理系统**：
  - 重构模型配置为灵活的模型组（Model Groups）系统
  - 每个账户可以拥有多个不同配置的模型组
  - 快速切换模型组，自动更新 Claude 配置
- **新增 CLI 命令**：
  - `ais model list/ls` - 列出当前账户的所有模型组
  - `ais model add [name]` - 创建新的模型组
  - `ais model use <name>` - 切换到不同的模型组
  - `ais model remove/rm [name]` - 删除模型组
  - `ais model show [name]` - 显示模型组配置详情
- **功能增强**：
  - 增强账户创建流程，支持模型组配置
  - Web UI 更新，支持可折叠的模型组管理界面
  - 修复切换账户时模型配置不更新的问题
  - 优化 CLI 输出颜色一致性
  - DEFAULT_MODEL 自动填充其他未设置的模型配置
- **向后兼容**：
  - 保持对旧 modelConfig 结构的支持
  - 现有账户无需迁移即可继续使用

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

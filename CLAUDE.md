# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指导。

## 项目概述

AI Account Switch (ais) 是一个跨平台的命令行工具，用于在项目级别管理和切换不同的 AI 服务账号（Claude、Codex、CCR、Droids）。它会自动为各种 AI 工具生成配置文件，并提供 CLI 和 Web UI 两种界面。

## 开发命令

### 测试
```bash
# 本地运行 CLI 工具
npm test

# 全局链接以便测试
npm link
```

### 安装
```bash
# 安装依赖
npm install

# 开发时全局链接
npm link
```

## 架构设计

### 核心组件

**ConfigManager (`src/config.js`)**
- 中央配置管理类
- 处理全局配置 (`~/.ai-account-switch/config.json`) 和项目配置 (`.ais-project-config`)
- 实现智能目录检测（类似 git 向上搜索）
- 管理账号 ID、MCP 服务器和模型组
- 关键方法：
  - `findProjectRoot()` - 向上搜索项目配置
  - `readGlobalConfig()` / `saveGlobalConfig()` - 全局账号存储
  - `readProjectConfig()` / `saveProjectConfig()` - 项目特定设置
  - `generateClaudeConfig()` - 创建 `.claude/settings.local.json`
  - `generateCodexProfile()` - 创建 Codex TOML profiles
  - `generateCCRConfig()` - 更新 CCR router 配置
  - `generateDroidsConfig()` - 创建 Droids JSON 配置

**命令模块 (`src/commands/`)**
- 模块化命令结构，单一职责
- `account.js` - 账号 CRUD 操作（添加、列表、使用、删除、导出）
- `model.js` - Claude 账号的模型组管理
- `mcp.js` - MCP (Model Context Protocol) 服务器管理
- `env.js` - 环境变量管理（列表、添加、设置、删除、显示、清空、编辑）
- `utility.js` - 诊断和辅助命令（doctor、paths）
- `helpers.js` - 共享工具函数（maskApiKey、验证）
- `index.js` - 统一导出接口

**Web UI 服务器 (`src/ui-server.js`)**
- 内嵌 HTML/CSS/JS 的 HTTP 服务器
- 提供账号管理的单页应用
- 账号、MCP 和环境变量操作的 REST API 端点
- 使用随机高位端口（49152-65535）避免冲突
- 支持双语界面（中文/英文）

**CLI 入口点 (`src/index.js`)**
- 基于 Commander.js 的 CLI 界面
- 定义所有命令和子命令
- 双语帮助文本（中文/英文）

### 生成的配置文件

**Claude Code 集成**
- `.claude/settings.local.json` - 项目级 Claude 配置
- 包含 `env.ANTHROPIC_AUTH_TOKEN` 和 `env.ANTHROPIC_BASE_URL`
- 包含账号配置中的自定义环境变量
- 自动添加到 `.gitignore`

**Codex 集成**
- `~/.codex/config.toml` - 全局 Codex profiles
- `.codex-profile` - 项目级 profile 引用
- 使用 OpenAI 兼容的 `wire_api = "chat"` 格式
- 支持三种 wire API 模式：chat、responses、env
- 自动为仅域名的 URL 添加 `/v1`

**CCR (Claude Code Router) 集成**
- `~/.claude-code-router/config.json` - CCR 配置
- 更新 Providers 和 Router 部分
- 配置更改后自动重启 CCR router
- 路由到本地 CCR 端点（默认端口 3456）

**Droids 集成**
- `.droids/config.json` - 项目级 Droids 配置
- 简单的模型配置结构

**MCP 集成**
- 在 `~/.ai-account-switch/config.json` 中全局管理
- 项目级启用状态在项目配置中跟踪
- 同步到 `.claude/settings.local.json` 的 `mcpServers` 键下
- 支持 stdio、sse 和 http 服务器类型
- 支持三种作用范围（scope）：
  - `local`（默认）：仅当前项目可用，配置存储在全局，启用状态在项目配置中
  - `project`：与项目成员共享，配置存储在项目配置的 `projectMcpServers` 中
  - `user`：当前用户所有项目可用，配置存储在全局，自动在所有项目中启用

**环境变量管理 (env)**
- 项目级别：存储在 `.claude/settings.local.json` 的 `env` 属性中
- 用户级别：存储在 `~/.claude/settings.json` 的 `env` 属性中（跨平台兼容）
- 支持的命令：
  - `ais env list` - 列出所有环境变量（项目和用户级别）
  - `ais env add` - 交互式添加环境变量
  - `ais env set <key> <value>` - 直接设置环境变量
  - `ais env remove` / `ais env rm` - 交互式删除环境变量
  - `ais env unset <key>` - 直接删除环境变量
  - `ais env show <key>` - 显示特定环境变量的值
  - `ais env clear` - 清空所有环境变量
  - `ais env edit` - 交互式编辑环境变量
- 配置合并：更新环境变量时保留其他配置设置（permissions、statusLine、enabledPlugins）
- Web UI 支持：提供环境变量的可视化管理和编辑

### 账号类型及其行为

**Claude**
- 标准 Anthropic API 集成
- 支持包含多个模型配置的复杂模型组
- 环境变量传递给 Claude Code

**Codex**
- 在 `~/.codex/config.toml` 中生成 TOML profiles
- 创建项目级 `.codex-profile` 文件
- 处理重复 profile 清理
- 智能 URL 处理（需要时自动添加 `/v1`）
- 支持 wire_api 模式选择（chat/responses/env）

**CCR (Claude Code Router)**
- 同时更新 Provider 和 Router 配置
- 需要三种模型类型：default、background、think
- 在 Provider 配置中自动去重模型
- 通过 `ccr restart` 自动重启 CCR router

**Droids**
- 简单的配置结构
- 可选的模型规格
- 项目级 `.droids/config.json`

### 关键设计模式

**智能目录检测**
- 类似 git 的 `.git` 目录搜索
- `findProjectRoot()` 向上遍历目录树
- 允许命令在任何子目录中工作
- 如果未找到项目配置则回退到当前目录

**账号 ID 系统**
- 自动递增的数字 ID（从 1 开始）
- 允许通过 `ais use 1` 快速切换而不是完整名称
- 向后兼容现有账号
- 首次运行时在迁移期间分配 ID

**模型组**
- 每个 Claude 账号可以有多个模型组
- 活动模型组决定使用哪些模型
- 切换模型组会自动更新 Claude 配置
- 支持 DEFAULT_MODEL 作为未指定模型的回退

**MCP 服务器管理**
- 全局服务器定义，项目级启用
- 与 `.mcp.json` 双向同步（导入/导出）
- 通过 spawn/HTTP 请求进行连接测试
- 三种服务器类型，不同的配置模式
- 支持三种作用范围（scope）：
  - `local`：仅当前项目可用，服务器定义在全局配置，启用状态在项目配置中
  - `project`：与项目成员共享，服务器定义存储在项目配置的 `projectMcpServers` 中
  - `user`：当前用户所有项目可用，服务器定义在全局配置，自动在所有项目中启用

**配置隔离**
- 全局账号存储在用户主目录
- 项目配置从不包含敏感数据（仅账号引用）
- 自动更新 `.gitignore` 以保护敏感文件
- 通过 `os.homedir()` 和 `path.join()` 处理跨平台路径

## 重要实现细节

### Wire API 模式处理（Codex）
添加 Codex 账号时，工具支持三种 wire API 模式：
- `chat`（默认）- OpenAI 兼容的聊天格式
- `responses` - Anthropic responses 格式
- `env` - 使用环境变量进行身份验证

模式存储在账号配置中，并在生成 Codex profiles 时应用。

### URL 规范化（Codex）
工具智能处理 API URL：
- 仅域名的 URL（如 `https://api.example.com`）→ 自动添加 `/v1`
- 带路径的 URL（如 `https://api.example.com/v2`）→ 保持原样
- 这可以防止常见的 Cloudflare 400 错误

### CCR Router 集成
使用 CCR 账号时：
1. 使用 Provider 和 Router 配置更新 `~/.claude-code-router/config.json`
2. 从配置中动态读取 CCR 端口（默认 3456）
3. 生成指向 `http://127.0.0.1:{port}` 的 `.claude/settings.local.json`
4. 尝试通过 `ccr restart` 命令重启 CCR
5. 如果未找到 CCR CLI，提供清晰的后续步骤

### Doctor 命令
`ais doctor` 命令通过检查以下内容诊断配置问题：
- 当前目录和项目根目录
- AIS 项目配置是否存在
- Claude Code 配置（`.claude/settings.local.json`）
- 全局 Claude 配置（`~/.claude/settings.json`）
- 账号类型特定的配置（Codex TOML、CCR JSON、Droids JSON）
- 提供可操作的修复建议

### Web UI 架构
UI 服务器将所有 HTML/CSS/JS 嵌入单个文件：
- 无外部依赖或构建步骤
- 为根路径提供静态 HTML
- 数据操作的 REST API 端点
- 自动端口冲突解决
- 启动时自动打开浏览器

### 环境变量管理实现细节
**跨平台路径处理**
- 使用 `ConfigManager.getClaudeUserConfigPath()` 方法获取用户配置文件路径
- 优先级顺序：`~/.claude/settings.json` > 平台特定路径 > `~/.claude.json`（遗留）
- Windows 支持：`%APPDATA%\claude\settings.json`
- macOS/Linux 支持：`~/.config/claude/settings.json`

**配置合并策略**
- 读取现有配置文件，保留非 `env` 属性设置
- 仅更新 `env` 属性，不覆盖 `permissions`、`statusLine`、`enabledPlugins` 等
- 确保 `env` 属性存在，避免 `undefined` 错误

**命令模式**
- 交互式命令（add、remove、edit）：使用 Inquirer.js 提供友好的用户界面
- 非交互式命令（set、unset、show）：适合脚本和自动化
- 支持通过 `--level` 选项指定项目或用户级别

**安全性考虑**
- 显示环境变量时自动屏蔽包含 `KEY` 或 `TOKEN` 的变量值
- 支持在 Web UI 中安全地编辑敏感变量

## 测试注意事项

测试或修改时：
- 测试跨平台行为（macOS、Linux、Windows）
- 验证 `.gitignore` 更新正常工作
- 从各种子目录测试目录检测
- 确保账号 ID 迁移适用于现有配置
- 测试所有账号类型（Claude、Codex、CCR、Droids）
- 验证 MCP 服务器连接测试
- 在不同浏览器中测试 Web UI
- 测试环境变量命令的跨平台路径解析
- 验证环境变量配置合并不会丢失其他设置
- 测试环境变量在项目和用户级别的正确隔离

## 常见陷阱

**Codex Profile 重复**
- 写入新 profile 之前必须清理旧 profile
- 使用正则表达式匹配包括嵌套内容的整个 profile 部分
- 使用各种 TOML 结构进行测试

**CCR Router 重启**
- CCR CLI 必须已安装并在 PATH 中
- 优雅处理未找到 `ccr` 命令的情况
- 提供手动重启的清晰说明

**路径处理**
- 始终使用 `path.join()` 以实现跨平台兼容性
- 使用 `os.homedir()` 而不是 `~` 扩展
- 正确处理路径中的空格

**配置合并**
- 更新配置时，保留现有的非 AIS 设置
- 不要覆盖用户的自定义权限或其他设置
- 仅更新 AIS 管理的特定部分

**环境变量配置处理**
- 读取配置时确保 `env` 属性存在，避免 `undefined` 错误
- 写入配置时必须先读取现有配置，只合并 `env` 属性
- 使用跨平台兼容的路径方法 `ConfigManager.getClaudeUserConfigPath()`
- 不同操作系统的用户配置文件路径可能不同（Windows 使用 APPDATA，macOS/Linux 使用 .config）

**终端颜色使用规范**
⚠️ **重要：所有 CLI 输出必须严格遵守以下颜色规范**

| 颜色 | 用途 | 示例 |
|------|------|------|
| `chalk.green` | ✅ 成功操作、可用状态、完成标记 | `console.log(chalk.green('✓ Account added successfully!'))` |
| `chalk.red` | ❌ 错误、失败、不可用状态 | `console.error(chalk.red('✗ Error:'), error.message)` |
| `chalk.yellow` | ⚠️ 警告、取消操作、未配置、信息提示 | `console.log(chalk.yellow('⚠ No account set'))` |
| `chalk.cyan` | 📋 **标签**（如 "Path:", "Config:", "Level:"）、信息标题、变量名 | `` `${chalk.cyan('Path:')} ${path}` `` |
| `chalk.yellow` | **变量值** | `` `${chalk.cyan(key)} = ${chalk.yellow(value)}` `` |
| `chalk.gray` | 辅助信息、次要内容、bullet 点 | `console.log(chalk.gray('  • Server name'))` |
| `chalk.bold` | 🔍 标题、章节标题 | `console.log(chalk.bold('COMMANDS:'))` |
| `chalk.green.bold` | 活动状态标记 | `console.log(chalk.green.bold('● Active'))` |

**格式规范：**
- **标签格式**：`` `${chalk.cyan('Label:')} value` ``（标签用 cyan，值用默认颜色）
- **错误格式**：`console.error(chalk.red('✗ Error:'), error.message)`
- **成功格式**：`console.log(chalk.green('✓ Success message'))`
- **警告格式**：`console.log(chalk.yellow('⚠ Warning message'))`
- **标题格式**：`console.log(chalk.bold('Section Title:'))`

**反面示例（禁止使用）：**
```javascript
// ❌ 错误：标签不应该用 gray
console.log(chalk.gray(`  Config: ${configPath}`));

// ❌ 错误：标签不应该用 bold
console.log(chalk.bold('Level:'), 'Project');

// ❌ 错误：不应该整行用一种颜色
console.log(chalk.cyan(`  Config file: ${configPath}`));
```

**正确示例：**
```javascript
// ✅ 正确：标签用 cyan，值用默认颜色
console.log(`  ${chalk.cyan('Config:')} ${configPath}`);

// ✅ 正确：标题用 cyan
console.log(chalk.cyan(`\n📋 Environment Variables\n`));

// ✅ 正确：变量名用 cyan，值用 yellow
console.log(`  ${chalk.gray('•')} ${chalk.cyan(key)} = ${chalk.yellow(value)}`);
```

## 文件命名约定

- 全局配置：`~/.ai-account-switch/config.json`
- 项目配置：`.ais-project-config`
- Claude 配置：`.claude/settings.local.json`
- Claude 用户配置：`~/.claude/settings.json`（跨平台：Windows `%APPDATA%\claude\settings.json`，macOS/Linux `~/.config/claude/settings.json`）
- Codex profile：`.codex-profile`
- Codex 全局：`~/.codex/config.toml`
- CCR 配置：`~/.claude-code-router/config.json`
- Droids 配置：`.droids/config.json`

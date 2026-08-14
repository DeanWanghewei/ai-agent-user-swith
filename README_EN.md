# AI Account Switch (ais)

[简体中文](README.md) | English

A cross-platform CLI tool to manage and switch between Claude/Codex/Droids account configurations for different projects.

## Features

- **Cross-Platform**: Works seamlessly on macOS, Linux, and Windows
- **Multiple Accounts**: Store and manage multiple AI service accounts
- **Project-Specific**: Each project can use a different account
- **Smart Directory Detection**: Works in any subdirectory of your project (like git)
- **Claude Code Integration**: Automatically generates `.claude/settings.local.json` for Claude Code CLI
- **Secure Storage**: Account credentials stored locally in your home directory
- **Interactive CLI**: Easy-to-use interactive prompts for all operations
- **Account Types**: Support for Claude, Codex, CCR (Claude Code Router), Droids, and other AI services
- **Web UI**: Modern web interface with account status checking and management
- **MCP Web UI Management**: Complete MCP (Model Context Protocol) server management through Web UI
  - Add, edit, delete MCP servers with intuitive interface
  - Support for stdio, sse, and http server types
  - Test MCP server connections
  - Enable/disable servers per project
  - Search and filter functionality
  - Full internationalization (Chinese/English)

## Installation

### npm Installation (Recommended)

```bash
npm install -g ai-account-switch
```

After installation, the `ais` command will be available globally.

**Troubleshooting**: If you encounter "command not found" after installation:

```bash
# Check npm global bin path
npm config get prefix

# Add to PATH (Linux/macOS)
export PATH="$PATH:$(npm config get prefix)/bin"

# On Windows, add to system PATH: %APPDATA%\npm
```

### Install from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-agent-user-swith.git
cd ai-agent-user-swith

# Install dependencies
npm install

# Link the CLI tool globally
npm link
```

## Usage

### Commands Overview

| Command | Alias | Description |
|---------|-------|-------------|
| `ais add [name]` | - | Add a new account configuration |
| `ais list` | `ls` | List all available accounts with IDs |
| `ais use [name-or-id]` | - | Set account for current project by name or ID |
| `ais info` | - | Show current project's account info |
| `ais current` | - | Show current account name |
| `ais remove [name-or-id]` | `rm` | Remove an account by name or ID |
| `ais model list` | `ls` | List all model groups for current account |
| `ais model add [name]` | - | Add a new model group |
| `ais model use <name>` | - | Switch to a different model group |
| `ais model remove [name]` | `rm` | Remove a model group |
| `ais model show [name]` | - | Show model group configuration |
| `ais mcp add [name]` | - | Add a new MCP server |
| `ais mcp list` | `ls` | List all MCP servers |
| `ais mcp show [name]` | - | Show MCP server details |
| `ais mcp update [name]` | - | Update MCP server configuration |
| `ais mcp remove [name]` | `rm` | Remove an MCP server |
| `ais mcp enable [name]` | - | Enable MCP server for current project |
| `ais mcp disable [name]` | - | Disable MCP server for current project |
| `ais mcp enabled` | - | Show enabled MCP servers |
| `ais mcp sync` | - | Sync MCP configuration to Claude Code |
| `ais ui` | - | Start web-based UI manager |
| `ais paths` | - | Show configuration file paths |
| `ais doctor` | - | Diagnose configuration issues |
| `ais export <name-or-id>` | - | Export account as JSON by name or ID |
| `ais help` | - | Display help information |
| `ais --version` | - | Show version number |

### Quick Start

#### 1. Add an Account

Add your first account interactively:

```bash
ais add
```

Or specify a name directly:

```bash
ais add my-claude-account
```

You'll be prompted to enter:
- Account type (Claude, Codex, CCR, Droids, Other)
- API Key
- API URL (optional)
- Organization ID (optional)
- Email (optional)
- Description (optional)
- Custom environment variables (optional)
  - Enter in `KEY=VALUE` format (e.g., `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`)
  - The tool will display all added variables before completion
  - Press Enter without input to finish adding variables

#### 2. List All Accounts

View all your configured accounts with their IDs:

```bash
ais list
# or
ais ls
```

Example output:
```
📋 Available Accounts:

● [1] my-claude-account
   Type: Claude
   API Key: sk-a****xyz
   ...

  [2] work-codex
   Type: Codex
   API Key: sk-b****abc
   ...
```

The active account for the current project will be marked with a green dot.

#### 3. Switch Account for Current Project

Set which account to use in your current project (by name or ID):

```bash
# Use account by name
ais use my-claude-account

# Or use account by ID (faster)
ais use 1
```

Or select interactively:

```bash
ais use
```

**Note:** This command automatically generates `.claude/settings.local.json` for Claude Code CLI integration.
You can run this command from any subdirectory within your project - it will automatically find the project root.

#### 4. Check Current Project Info

See which account is active for your current project:

```bash
ais info
```

Or just show the account name:

```bash
ais current
```

**Note:** These commands work from any subdirectory within your project, similar to how git commands work.

#### 5. Remove an Account

Remove an account you no longer need:

```bash
ais remove old-account
# or
ais rm
```

### Preset Providers

The first step of `ais add` lets you pick a built-in **Claude-protocol (Anthropic-compatible) preset** — just enter the API Key and confirm/edit the Base URL to quickly create a well-configured Claude account:

| Provider | Base URL | Recommended model (auto-latest) |
|---|---|---|
| GLM (Zhipu) | `https://open.bigmodel.cn/api/anthropic` | e.g. `glm-5.3` |
| MiniMax | `https://api.minimax.io/anthropic` | e.g. `MiniMax-M2.7` |
| Qwen (Alibaba) | `https://dashscope.aliyuncs.com/apps/anthropic` | e.g. `qwen3-coder-plus` |
| Kimi (Moonshot) | `https://api.moonshot.ai/anthropic` | e.g. `kimi-k3` |

```bash
ais add
# Select provider → GLM (or MiniMax / Qwen / Kimi / Custom)
# Enter API Key → latest flagship models are fetched automatically → confirm or edit Base URL → choose active model group
```

- **Provider-level env** (all presets): `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1`
- **Model-group-level params** (follow the active group): e.g. GLM's `CLAUDE_CODE_AUTO_COMPACT_WINDOW=1000000`, `ENABLE_TOOL_SEARCH=0`
- Each preset ships two model groups — `latest` (all latest) and `balanced` (haiku uses a cheaper model); default active = `latest`
- A preset is just a starting point — every field (including model groups and special params) is editable, and you can add custom groups with `ais model add`
- The **Web UI** supports it too: the "Provider" dropdown at the top of the add-account modal

> Env layering: provider-level vars go into the account's `customEnv`; model-group-level vars go into the model-group config (`GROUP_ENV_KEYS`) and are applied **preserve-only** (only keys the group defines are set; user-set values are never removed).
>
> Upgrade migration: on the first run of a new version (interactive TTY only), you're prompted once to retrofit recommended config onto existing Claude accounts — non-destructive, opt-in, never silent.

#### Automatic model updates (no tool upgrade needed)

When a provider releases a new model (e.g. GLM-5.3) you do **not** need to wait for an ais release — two layers keep you current:

1. **Live discovery**: right after you enter an API Key in `ais add`, and whenever you run `ais model refresh`, ais queries the provider's model list (`/v1/models`) with your key and resolves the latest flagship automatically (GLM / MiniMax / Kimi; Qwen has no such endpoint and uses recommended values)
2. **Remote registry**: recommended values come from [`presets.registry.json`](./presets.registry.json) at the repo root (cached locally for 24h; GitHub raw first, with a jsDelivr npm mirror fallback for networks where GitHub is blocked). The maintainer updates that single JSON and users pick it up within a day — no npm release required

**When the network is unreachable, ais silently falls back** to the local cache / values bundled with the package — no errors, no blocking. You can always edit model groups manually (`ais model add` / Web UI).

Upgrade an existing account to the latest models:

```bash
ais model refresh           # current project account: fetch latest models, preview diff, apply on confirm
ais model refresh <name>    # a specific account
ais model refresh --yes     # skip confirmation (for scripts)
```

Advanced: the `AIS_PRESETS_REGISTRY_URL` env var points ais at a custom registry (comma-separate several, e.g. an internal mirror); set it to `off` to disable all network access.

### Advanced Usage

#### Show Configuration Paths

See where your configurations are stored:

```bash
ais paths
```

#### Export Account Configuration

Export an account's configuration as JSON:

```bash
ais export my-claude-account
```

## Configuration

### Global Configuration

All accounts are stored globally in your home directory:

- **macOS/Linux**: `~/.ai-account-switch/config.json`
- **Windows**: `%USERPROFILE%\.ai-account-switch\config.json`

### Project Configuration

Each project stores its active account reference in:

```
./.ais-project-config
```

This file is created automatically when you run `ais use` and should be added to `.gitignore`.

### Claude Code Integration

When you run `ais use`, the tool automatically creates `.claude/settings.local.json` with the following structure:

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "your-api-key",
    "ANTHROPIC_BASE_URL": "your-api-url",
    "ANTHROPIC_ORGANIZATION_ID": "your-org-id",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"
  },
  "permissions": {
    "allow": [],
    "deny": [],
    "ask": []
  }
}
```

This ensures Claude Code CLI automatically uses the correct account for your project.

### Codex Integration

When you add a **Codex** type account and run `ais use`, the tool automatically creates a profile in `~/.codex/config.toml` and a `.codex-profile` file in your project directory.

#### Adding a Codex Account

When adding a Codex account, you'll see helpful configuration tips:

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

**Important Notes:**
- AIS automatically adds `/v1` to the API URL if it's missing
- The configuration uses `wire_api = "chat"` (OpenAI-compatible format)
- This prevents common issues like Cloudflare 400 errors

#### Using Codex with Your Project

After running `ais use` with a Codex account:

```bash
cd ~/my-project
ais use my-codex-account

# Output:
# ✓ Switched to account 'my-codex-account' for current project.
# ✓ Codex profile created: ais_my-project
#   Use: codex --profile ais_my-project [prompt]
```

The tool creates:
1. **Global Profile**: `~/.codex/config.toml` with your account configuration
2. **Project Reference**: `.codex-profile` containing the profile name

#### Running Codex

Use Codex with the generated profile:

```bash
# In your project directory
codex --profile ais_my-project "your prompt here"

# Or use the profile name from .codex-profile
codex --profile $(cat .codex-profile) "your prompt"
```

#### Codex Configuration Structure

The generated configuration in `~/.codex/config.toml`:

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

#### Switching Between Projects

Each project can use a different Codex account:

```bash
# Project A
cd ~/project-a
ais use codex-account-1
codex --profile ais_project-a "implement feature X"

# Project B
cd ~/project-b
ais use codex-account-2
codex --profile ais_project-b "fix bug Y"
```

#### Troubleshooting Codex

**Error: "duplicate key" in TOML**
- This happens if profiles weren't cleaned up properly
- Solution: Run `ais use <account>` again to regenerate the configuration

**Error: "400 Bad Request" from Cloudflare**
- This usually means the API URL is incorrect
- Solution: Make sure your API URL includes `/v1` or let AIS add it automatically
- Run `ais use <account>` to regenerate with the correct configuration

**Check Codex Configuration**
```bash
# View your Codex profile
cat .codex-profile

# Check the configuration
grep -A 10 "$(cat .codex-profile)" ~/.codex/config.toml

# Or use the doctor command
ais doctor
```

### CCR (Claude Code Router) Integration

[Claude Code Router](https://github.com/musistudio/claude-code-router) is a powerful routing layer for Claude Code that allows you to use multiple AI providers and models seamlessly.

When you add a **CCR** type account and run `ais use`, the tool automatically:
1. Updates `~/.claude-code-router/config.json` with Provider and Router configuration
2. Generates `.claude/settings.local.json` pointing to the local CCR Router
3. Automatically restarts CCR Router to apply changes

**Prerequisites:**
- Install Claude Code Router: `npm install -g @musistudio/claude-code-router`
- Start CCR Router: `ccr start`

#### Adding a CCR Account

When adding a CCR account, you'll see helpful configuration tips:

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

**Important Notes:**
- Default API URL is `http://localhost:3000/v1/chat/completions`
- You need to specify three models: default, background, and think
- Models are automatically deduplicated in the Provider configuration

#### Using CCR with Your Project

After running `ais use` with a CCR account:

```bash
cd ~/my-project
ais use my-ccr-account

# Output:
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

The tool:
1. **Updates CCR Config**: Adds/updates Provider in `~/.claude-code-router/config.json`
2. **Updates Router**: Sets default, background, and think models
3. **Generates Claude Config**: Creates `.claude/settings.local.json` with `ANTHROPIC_BASE_URL` pointing to CCR Router
4. **Restarts CCR**: Automatically runs `ccr restart` to apply changes

#### Running Claude with CCR

Start Claude interactive session:

```bash
# In your project directory
claude

# Claude Code will automatically use CCR Router
# Requests are routed based on your CCR configuration
```

#### CCR Configuration Structure

The generated configuration in `~/.claude-code-router/config.json`:

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

The generated configuration in `.claude/settings.local.json`:

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "your-api-key",
    "ANTHROPIC_BASE_URL": "http://127.0.0.1:3456"
  }
}
```

#### Switching Between Projects

Each project can use a different CCR configuration:

```bash
# Project A
cd ~/project-a
ais use ccr-account-1
claude

# Project B
cd ~/project-b
ais use ccr-account-2
claude
```

#### Troubleshooting CCR

**Check CCR Configuration**
```bash
# View your CCR configuration
cat ~/.claude-code-router/config.json

# View Claude configuration
cat .claude/settings.local.json

# Or use the doctor command
ais doctor
```

**CCR Router not installed**
- Install from npm: `npm install -g @musistudio/claude-code-router`
- Visit the project page: https://github.com/musistudio/claude-code-router

**CCR Router not restarting**
- Make sure CCR CLI is installed and available in your PATH
- Run `ccr restart` manually if automatic restart fails
- Check if CCR Router is running: `ccr status`

**Claude not using CCR Router**
- Verify `ANTHROPIC_BASE_URL` in `.claude/settings.local.json` points to correct port
- Check CCR Router is running on the configured port
- Restart Claude Code after configuration changes

### Droids Integration

When you add a **Droids** type account and run `ais use`, the tool automatically creates a configuration file at `.droids/config.json` in your project directory.

#### Adding a Droids Account

When adding a Droids account, you'll see helpful configuration tips:

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

#### Using Droids with Your Project

After running `ais use` with a Droids account:

```bash
cd ~/my-project
ais use my-droids-account

# Output:
# ✓ Switched to account 'my-droids-account' for current project.
# ✓ Droids configuration generated at: .droids/config.json
#
# 📖 Next Steps:
#    Start interactive session: droid
#    This will enter project-level interactive mode
#    Droids will automatically use the configuration from .droids/config.json
```

The tool creates:
- **Project Configuration**: `.droids/config.json` with your account settings

#### Running Droids

Start Droids interactive session:

```bash
# In your project directory
droid

# Droids will automatically load configuration from .droids/config.json
```

#### Droids Configuration Structure

The generated configuration in `.droids/config.json`:

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

#### Switching Between Projects

Each project can use a different Droids account:

```bash
# Project A
cd ~/project-a
ais use droids-account-1
droid

# Project B
cd ~/project-b
ais use droids-account-2
droid
```

#### Troubleshooting Droids

**Check Droids Configuration**
```bash
# View your Droids configuration
cat .droids/config.json

# Or use the doctor command
ais doctor
```

**Droids CLI not found**
- Make sure Droids CLI is installed and available in your PATH
- Run `droid --version` to verify installation

#### Custom Environment Variables

You can add custom environment variables when creating an account. When prompted, enter them in `KEY=VALUE` format:

**Input Format:**
```
? Environment variable (KEY=VALUE format): CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
✓ Added: CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1

📋 Current environment variables:
   • CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1

? Add another environment variable? (y/N)
```

**Common Examples:**
- `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` - Disable non-essential network traffic
- `HTTP_PROXY=http://proxy.example.com:8080` - Set HTTP proxy
- `HTTPS_PROXY=https://proxy.example.com:8080` - Set HTTPS proxy
- Any other environment variables needed for your setup

**Features:**
- One-line input format (`KEY=VALUE`)
- Real-time display of added variables
- Press Enter without input to finish
- Variables are automatically included in `.claude/settings.local.json`

### MCP (Model Context Protocol) Integration

AIS supports managing MCP servers globally and enabling them per project. MCP servers extend Claude Code with additional tools and capabilities.

You can manage MCP servers through both **CLI commands** and **Web UI**.

#### Web UI Management (Recommended)

The easiest way to manage MCP servers is through the Web UI:

```bash
ais ui
```

Then click on the **"MCP 服务器" (MCP Servers)** tab to:

**Features:**
- ✅ **Add MCP Servers**: Click "+ 添加 MCP 服务器" to add new servers
  - Choose server type: stdio, sse, or http
  - Fill in configuration (command, URL, environment variables, etc.)
  - Add description for easy identification
- ✅ **Edit Servers**: Click "编辑" to modify existing server configurations
- ✅ **Test Connection**: Click "测试连接" to verify server availability
- ✅ **Enable/Disable**: Toggle servers for the current project with one click
- ✅ **Search & Filter**: Quickly find servers by name or type
- ✅ **Delete Servers**: Remove servers you no longer need
- ✅ **Sync Configuration**: Click "同步配置" to sync to Claude Code

**Benefits:**
- Intuitive visual interface
- Real-time validation
- No need to remember command syntax
- See all servers at a glance
- Status indicators (enabled/disabled)
- Supports Chinese and English

**Example Workflow:**
1. Start Web UI: `ais ui`
2. Click "MCP 服务器" tab
3. Click "+ 添加 MCP 服务器"
4. Select type: "stdio"
5. Enter command: "npx"
6. Enter arguments: "@modelcontextprotocol/server-filesystem,/path"
7. Click "保存"
8. Click "测试连接" to verify
9. Click "启用" to enable for current project

#### CLI Management

You can also manage MCP servers through CLI commands:

##### Adding an MCP Server

Add a new MCP server interactively:

```bash
ais mcp add filesystem
```

You'll be prompted to configure:
- **Server type**: stdio, sse, or http
- **Command and arguments** (for stdio type)
- **URL** (for sse/http types)
- **Environment variables** (optional)
- **Headers** (optional for sse/http)
- **Description** (optional)

**Example: Adding a stdio MCP server**
```bash
$ ais mcp add filesystem
? Select MCP server type: stdio
? Enter command: npx
? Enter arguments (comma-separated): @modelcontextprotocol/server-filesystem,/Users/user/workspace
? Add environment variables? Yes
? Environment variable (KEY=VALUE): ALLOWED_PATHS=/Users/user/workspace
? Add another? No
? Enter description: File system access MCP server
✓ MCP server 'filesystem' added successfully!
```

##### Listing MCP Servers

View all configured MCP servers:

```bash
ais mcp list
```

Output shows server name, type, enabled status, and description.

##### Enabling MCP Servers for a Project

Enable an MCP server for the current project:

```bash
cd ~/my-project
ais mcp enable filesystem
```

This will:
1. Add the server to the project's enabled list
2. Update `.claude/settings.local.json` with the MCP configuration
3. Make the MCP server available to Claude Code in this project

##### Managing MCP Servers

```bash
# Show MCP server details
ais mcp show filesystem

# Update MCP server configuration
ais mcp update filesystem

# Disable MCP server for current project
ais mcp disable filesystem

# Show enabled MCP servers for current project
ais mcp enabled

# Sync MCP configuration to Claude Code
ais mcp sync

# Remove an MCP server
ais mcp remove filesystem
```

#### MCP Configuration Structure

MCP servers are stored globally in `~/.ai-account-switch/config.json`:

```json
{
  "accounts": { ... },
  "mcpServers": {
    "filesystem": {
      "name": "filesystem",
      "type": "stdio",
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "/Users/user/workspace"],
      "env": {
        "ALLOWED_PATHS": "/Users/user/workspace"
      },
      "description": "File system access MCP server",
      "createdAt": "2025-01-03T00:00:00.000Z",
      "updatedAt": "2025-01-03T00:00:00.000Z"
    }
  }
}
```

Project-level enabled servers are stored in `.ais-project-config`:

```json
{
  "activeAccount": "my-account",
  "projectPath": "/path/to/project",
  "setAt": "2025-01-03T00:00:00.000Z",
  "enabledMcpServers": ["filesystem"]
}
```

When enabled, MCP servers are automatically added to `.claude/settings.local.json`:

```json
{
  "env": { ... },
  "permissions": { ... },
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "/Users/user/workspace"],
      "env": {
        "ALLOWED_PATHS": "/Users/user/workspace"
      }
    }
  }
}
```

#### MCP Server Types

**stdio**: Communicates via standard input/output
- Requires: `command`, `args`
- Optional: `env`

**sse**: Server-Sent Events
- Requires: `url`
- Optional: `headers`

**http**: HTTP requests
- Requires: `url`
- Optional: `headers`

## Examples

### Example 1: Setting Up Multiple Accounts

```bash
# Add your personal Claude account
ais add personal-claude

# Add your work Claude account
ais add work-claude

# Add a Codex account
ais add codex-dev

# Add a Droids account
ais add droids-dev

# List all accounts
ais list
```

### Example 2: Using Different Accounts for Different Projects

```bash
# In your personal project
cd ~/my-personal-project
ais use personal-claude

# In your work project
cd ~/work/company-project
ais use work-claude

# Check what's active
ais info
```

### Example 3: Managing Accounts

```bash
# View all accounts
ais list

# Check current account
ais current

# Export an account config
ais export personal-claude

# Remove old accounts
ais remove old-account

# View config locations
ais paths
```

## Security Notes

- API keys are stored locally on your machine only
- The global configuration file contains sensitive credentials
- Always add `.ais-project-config` to your `.gitignore`
- Never commit account credentials to version control
- API keys are masked when displayed (shows first and last 4 characters only)

## Platform Compatibility

| Platform | Status | Notes |
|----------|--------|-------|
| macOS | ✅ Fully Supported | Tested on macOS 10.15+ |
| Linux | ✅ Fully Supported | Tested on Ubuntu 20.04+ |
| Windows | ✅ Fully Supported | Tested on Windows 10+ |

## Requirements

- **Node.js**: >= 16.0.0
- **npm**: >= 7.0.0

**Note**: This tool requires Node.js version 16 or higher (due to commander@11.x dependency). You can check your current version with:
```bash
node --version
npm --version
```

If you need to upgrade Node.js, visit [nodejs.org](https://nodejs.org/) or use a version manager like [nvm](https://github.com/nvm-sh/nvm).

## Project Structure

```
ai-agent-user-swith/
├── bin/
│   └── ais.js              # Executable entry point
├── src/
│   ├── index.js            # Main CLI program
│   ├── commands.js         # Command implementations
│   └── config.js           # Configuration manager
├── package.json
├── .gitignore
└── README.md
```

## Troubleshooting

### Command not found: ais

If you get this error after installation, make sure you've linked the package:

```bash
npm link
```

### Permission denied

On Unix systems, ensure the bin file is executable:

```bash
chmod +x bin/ais.js
```

### No accounts found

Make sure you've added at least one account:

```bash
ais add
```

### Claude Code uses wrong account

If Claude Code is using a different account than expected:

1. Run diagnostics:
   ```bash
   ais doctor
   ```

2. Check if global Claude config is overriding project config:
   - If `~/.claude/settings.json` contains `env.ANTHROPIC_AUTH_TOKEN`, it may conflict
   - **Solution**: Remove the `env` section from global config, or only keep `permissions`

3. Ensure you're starting Claude Code from your project directory or subdirectory

4. Regenerate project config:
   ```bash
   ais use <your-account-name>
   ```

### Project config not found in subdirectory

The tool should work in any subdirectory. If it doesn't:

```bash
# Make sure you're within a configured project
cd /path/to/your/project
ais use <account>

# Then try from subdirectory
cd src/
ais current  # Should show your account
```

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests

## License

MIT License - feel free to use this tool in your projects!

## Changelog

### v1.9.0
- **Account ID Feature**:
  - Automatically assign unique numeric ID to each account (starting from 1)
  - Quick account switching by ID: `ais use 1`
  - Remove account by ID: `ais remove 2`
  - Export account by ID: `ais export 3`
  - Optimized account list display format: `[ID] AccountName`
  - ID displayed in yellow color for better visibility
  - Fully backward compatible: existing accounts automatically assigned IDs
  - Interactive selection shows both ID and name
- **Documentation Updates**:
  - Updated all command descriptions with ID usage examples
  - Synchronized Chinese and English README
  - Optimized help command output

### v1.7.0
- **MCP Web UI Management**:
  - Complete MCP server management through Web UI
  - Tab navigation system (Accounts / MCP Servers)
  - Add, edit, delete MCP servers with intuitive interface
  - Test MCP server connections
  - Enable/disable servers per project with one click
  - Search and filter functionality
  - Real-time validation and status indicators
  - Full internationalization (Chinese/English)
- **MCP CLI Integration**:
  - Global MCP server management with `ais mcp` commands
  - Project-level MCP server enable/disable functionality
  - Support for stdio, sse, and http MCP server types
  - Automatic Claude Code configuration generation with MCP servers
  - Commands: `ais mcp add`, `ais mcp list`, `ais mcp show`, `ais mcp update`, `ais mcp remove`
  - Project commands: `ais mcp enable`, `ais mcp disable`, `ais mcp enabled`, `ais mcp sync`
  - Interactive MCP server configuration with validation
  - Environment variables and headers support for MCP servers
- **Bug Fixes**:
  - Fixed account data not showing after adding tabs
  - Fixed "switchTab is not defined" error
  - Fixed incorrect search result messages
- **Improvements**:
  - Better user experience with clearer messages
  - Modern JavaScript practices (event listeners)
  - Improved code quality and maintainability
  - 32 automated tests all passing

### v1.6.0
- **CCR (Claude Code Router) Integration**:
  - Added full support for Claude Code Router
  - Automatic generation of `~/.claude-code-router/config.json` configuration
  - Provider and Router configuration management
  - Automatic CCR Router restart after configuration changes
  - Claude Code integration with local CCR Router endpoint
  - Support for default, background, and think model routing
- **Web UI Enhancements**:
  - Added account status checking with color-coded indicators (green: available, orange: unstable, red: unavailable)
  - Status results are saved and displayed on page load
  - Real-time status checking with "状态检查" button
  - Improved account card layout with status in top-right corner
  - Enhanced visual feedback during status checks
- **Configuration Improvements**:
  - CCR accounts automatically generate both CCR and Claude configurations
  - Dynamic port reading from CCR config for Claude integration
  - Better error handling and user feedback

### v1.5.8
- **Bilingual Support (双语支持)**:
  - All CLI commands now display both English and Chinese text (所有 CLI 命令现在同时显示中英文)
  - Help messages, prompts, and output messages are bilingual (帮助信息、提示和输出消息都支持双语)
  - Better user experience for Chinese-speaking users (为中文用户提供更好的使用体验)
  - No configuration needed - works out of the box (无需配置 - 开箱即用)
  - Uses parentheses format for better clarity: `English text (中文)` (使用括号格式更清晰)

### v1.5.7
- **Droids Integration**:
  - Added full support for Droids AI assistant
  - Automatic generation of `.droids/config.json` configuration
  - Simple model configuration for Droids accounts
  - Interactive session command: `droid`
  - Enhanced `ais doctor` command with Droids configuration detection
- **UI Enhancements**:
  - Added type filter dropdown for quick account filtering
  - Color-coded account cards by type (Claude: blue, Codex: purple, Droids: green, Other: orange)
  - Left border color indicators on account cards
  - Improved visual hierarchy and user experience
- **Model Configuration Improvements**:
  - Separated model configuration for different account types
  - Claude: Complex model groups with multiple model settings
  - Codex/Droids: Simple model field for straightforward configuration
  - All model settings moved to collapsible "Advanced Configuration" section
- **Better User Guidance**:
  - Enhanced `ais use` command with clear next-step instructions
  - Type-specific usage examples for each AI assistant
  - Interactive mode prompts instead of one-time command examples

### v1.5.1
- **Codex Integration Enhancements**:
  - Added full support for Codex CLI with profile-based configuration
  - Automatic generation of `~/.codex/config.toml` profiles for Codex accounts
  - Project-level `.codex-profile` file for easy profile reference
  - Smart API URL handling: automatically adds `/v1` path if missing
  - Uses OpenAI-compatible `wire_api = "chat"` format
  - Prevents Cloudflare 400 errors with correct configuration
- **Improved User Experience**:
  - Configuration tips displayed when adding Codex accounts
  - Usage instructions shown after account creation
  - Enhanced `ais doctor` command with Codex configuration detection
  - Better duplicate profile cleanup in TOML files
- **Bug Fixes**:
  - Fixed duplicate profile key errors in Codex configuration
  - Improved profile deletion regex patterns
  - Separated Claude and Codex configuration generation logic
- **Documentation**:
  - Comprehensive Codex integration guide in README
  - Troubleshooting section for common Codex issues
  - Examples for multi-project Codex usage

### v1.5.0
- **Model Groups Management System**:
  - Refactored model configuration to use flexible Model Groups
  - Each account can have multiple model groups with different configurations
  - Quick switching between model groups with automatic Claude config updates
- **New CLI Commands**:
  - `ais model list/ls` - List all model groups for current account
  - `ais model add [name]` - Create a new model group
  - `ais model use <name>` - Switch to a different model group
  - `ais model remove/rm [name]` - Remove a model group
  - `ais model show [name]` - Show model group configuration
- **Enhancements**:
  - Enhanced account creation workflow with model group support
  - Web UI updated with collapsible model group management
  - Fixed model configuration not switching when changing accounts
  - Better color consistency in CLI output
  - DEFAULT_MODEL auto-fills other model configs when not specified
- **Backward Compatibility**:
  - Maintains support for old modelConfig structure
  - Existing accounts continue to work without migration

### v1.4.0
- **Added Web UI Management Interface**:
  - Modern single-page application with dark/light theme support
  - Bilingual support (English/Chinese), default English
  - Visual account management: CRUD operations at a glance
  - Import/Export functionality: batch manage account configurations
  - Real-time search and filter accounts
  - Custom environment variables configuration
  - Theme follows system settings automatically
  - iOS-style theme toggle switch
- **Port Optimization**:
  - UI server uses random high ports (49152-65535)
  - Automatic port conflict detection and retry
- **UI Improvements**:
  - Fixed inconsistent button positioning in account cards
  - Buttons now consistently fixed at card bottom
- **Removed Organization ID**:
  - Simplified account configuration process
  - Removed organization ID option from CLI and UI

### v1.3.0
- **Improved custom environment variables input**:
  - One-line `KEY=VALUE` format input (e.g., `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`)
  - Real-time display of added variables during configuration
  - Press Enter without input to finish adding variables
  - Better error messages and user guidance
- Enhanced documentation with detailed examples and usage instructions

### v1.2.0
- Added custom environment variables support for accounts
- Added `ais doctor` command for configuration diagnostics
- Enhanced `ais help` with all new features
- Updated installation documentation (npm as recommended method)
- Improved PATH configuration instructions
- Display custom env variables in `ais list` and `ais info`

### v1.1.0
- Added smart directory detection (works in any subdirectory)
- Automatic Claude Code `.claude/settings.local.json` generation
- Project root display in `ais info` command
- Improved cross-platform compatibility

### v1.0.0
- Initial release
- Basic account management (add, list, remove)
- Project-specific account switching
- Cross-platform support
- Interactive CLI prompts
- Account export functionality

## Future Enhancements

Potential features for future versions:
- Account validation
- Bulk import/export
- Account templates
- Environment variable export
- Account sharing (encrypted)
- Cloud sync support
- Account usage statistics

## Support

If you encounter any issues or have questions:
1. Check the troubleshooting section
2. Review existing issues
3. Create a new issue with detailed information

---

**Happy coding with your AI assistants!** 🤖

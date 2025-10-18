# AI Account Switch (ais)

English | [简体中文](README_ZH.md)

A cross-platform CLI tool to manage and switch between Claude/Codex account configurations for different projects.

## Features

- **Cross-Platform**: Works seamlessly on macOS, Linux, and Windows
- **Multiple Accounts**: Store and manage multiple AI service accounts
- **Project-Specific**: Each project can use a different account
- **Smart Directory Detection**: Works in any subdirectory of your project (like git)
- **Claude Code Integration**: Automatically generates `.claude/settings.local.json` for Claude Code CLI
- **Secure Storage**: Account credentials stored locally in your home directory
- **Interactive CLI**: Easy-to-use interactive prompts for all operations
- **Account Types**: Support for Claude, Codex, and other AI services

## Installation

### Option 1: Global npm Installation (Recommended)

```bash
npm install -g ai-account-switch
```

After installation, the `ais` command will be available globally.

**Note**: If you encounter "command not found" after installation, you may need to add npm's global bin directory to your PATH:

```bash
# Check npm global bin path
npm config get prefix

# Add to PATH (Linux/macOS)
export PATH="$PATH:$(npm config get prefix)/bin"

# On Windows, add to system PATH: %APPDATA%\npm
```

### Option 2: Download Pre-built Binary

Download the latest release for your platform from the [Releases page](https://github.com/yourusername/ai-agent-user-swith/releases):

**Windows (Automatic Installation - Recommended):**

Use the automated installer that downloads the latest version and adds it to PATH automatically:

**Method 1: PowerShell (Recommended)**
```powershell
# Run in PowerShell (Administrator recommended for system-wide install)
irm https://github.com/yourusername/ai-agent-user-swith/releases/latest/download/install.ps1 | iex
```

**Method 2: Download and Run Installer Script**
1. Download `install.ps1` or `install.bat` from the [Releases page](https://github.com/yourusername/ai-agent-user-swith/releases)
2. Right-click on `install.ps1` and select "Run with PowerShell"
   - Or run `install.bat` by double-clicking it

The installer will:
- Download the latest `ais-win.exe`
- Install to `%LOCALAPPDATA%\ais` (user install) or `C:\Program Files\ais` (system install)
- Automatically add to PATH
- Verify the installation

After installation, open a **new terminal** and verify:
```cmd
ais --version
```

**Windows (Manual Installation):**

If you prefer manual installation:

1. Download `ais-win.exe` from the [Releases page](https://github.com/yourusername/ai-agent-user-swith/releases)

2. Choose an installation location (recommended: `C:\Program Files\ais\`)
   ```cmd
   mkdir "C:\Program Files\ais"
   ```

3. Move the downloaded file to the installation directory and rename it:
   ```cmd
   move "%USERPROFILE%\Downloads\ais-win.exe" "C:\Program Files\ais\ais.exe"
   ```

4. Add to PATH:

   **Method 1: Using System Settings (Recommended)**
   - Open Start Menu and search for "Environment Variables"
   - Click "Edit the system environment variables"
   - Click "Environment Variables..." button
   - Under "System variables" (or "User variables" for current user only), find and select "Path"
   - Click "Edit..."
   - Click "New"
   - Add `C:\Program Files\ais`
   - Click "OK" on all dialogs
   - **Restart your terminal** for changes to take effect

   **Method 2: Using PowerShell (Administrator)**
   ```powershell
   # Add to User PATH
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\ais", "User")

   # Or add to System PATH (requires admin)
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\ais", "Machine")
   ```

   **Method 3: Using Command Prompt (Administrator)**
   ```cmd
   setx PATH "%PATH%;C:\Program Files\ais"
   ```

5. Verify installation:
   ```cmd
   # Open a NEW terminal window
   ais --version
   ```

**Note**: If you prefer a user-local installation without admin rights, use `%LOCALAPPDATA%\ais` instead:
```cmd
mkdir "%LOCALAPPDATA%\ais"
move "%USERPROFILE%\Downloads\ais-win.exe" "%LOCALAPPDATA%\ais\ais.exe"
# Then add %LOCALAPPDATA%\ais to your User PATH
```

**macOS:**

1. Download and install to `/usr/local/bin`:
   ```bash
   curl -L https://github.com/yourusername/ai-agent-user-swith/releases/latest/download/ais-macos -o /usr/local/bin/ais
   chmod +x /usr/local/bin/ais
   ```

2. If you don't have write permissions for `/usr/local/bin`, use sudo:
   ```bash
   sudo curl -L https://github.com/yourusername/ai-agent-user-swith/releases/latest/download/ais-macos -o /usr/local/bin/ais
   sudo chmod +x /usr/local/bin/ais
   ```

3. Alternatively, install to your user directory (no sudo required):
   ```bash
   mkdir -p ~/.local/bin
   curl -L https://github.com/yourusername/ai-agent-user-swith/releases/latest/download/ais-macos -o ~/.local/bin/ais
   chmod +x ~/.local/bin/ais

   # Add to PATH if not already there
   echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```

4. Verify installation:
   ```bash
   ais --version
   ```

**Linux:**

1. Download and install to `/usr/local/bin`:
   ```bash
   curl -L https://github.com/yourusername/ai-agent-user-swith/releases/latest/download/ais-linux -o /usr/local/bin/ais
   chmod +x /usr/local/bin/ais
   ```

2. If you don't have write permissions for `/usr/local/bin`, use sudo:
   ```bash
   sudo curl -L https://github.com/yourusername/ai-agent-user-swith/releases/latest/download/ais-linux -o /usr/local/bin/ais
   sudo chmod +x /usr/local/bin/ais
   ```

3. Alternatively, install to your user directory (no sudo required):
   ```bash
   mkdir -p ~/.local/bin
   curl -L https://github.com/yourusername/ai-agent-user-swith/releases/latest/download/ais-linux -o ~/.local/bin/ais
   chmod +x ~/.local/bin/ais

   # Add to PATH if not already there
   echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
   source ~/.bashrc
   ```

4. Verify installation:
   ```bash
   ais --version
   ```

### Option 3: Install from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-agent-user-swith.git
cd ai-agent-user-swith

# Install dependencies
npm install

# Link the CLI tool globally
npm link
```

**For Maintainers**: See [NPM_PUBLISH.md](NPM_PUBLISH.md) for publishing instructions.

## Usage

### Commands Overview

| Command | Alias | Description |
|---------|-------|-------------|
| `ais add [name]` | - | Add a new account configuration |
| `ais list` | `ls` | List all available accounts |
| `ais use [name]` | - | Set account for current project |
| `ais info` | - | Show current project's account info |
| `ais current` | - | Show current account name |
| `ais remove [name]` | `rm` | Remove an account |
| `ais paths` | - | Show configuration file paths |
| `ais export <name>` | - | Export account as JSON |
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
- Account type (Claude, Codex, Other)
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

View all your configured accounts:

```bash
ais list
# or
ais ls
```

The active account for the current project will be marked with a green dot.

#### 3. Switch Account for Current Project

Set which account to use in your current project:

```bash
ais use my-claude-account
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

## Examples

### Example 1: Setting Up Multiple Accounts

```bash
# Add your personal Claude account
ais add personal-claude

# Add your work Claude account
ais add work-claude

# Add a Codex account
ais add codex-dev

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

- Node.js >= 14.0.0
- npm >= 6.0.0

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

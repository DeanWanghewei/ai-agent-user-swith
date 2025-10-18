# Windows Installation Guide

This guide provides detailed instructions for installing AI Account Switch (ais) on Windows.

## Quick Install (Recommended)

### Method 1: One-Line PowerShell Install

Open PowerShell and run:

```powershell
irm https://github.com/yourusername/ai-agent-user-swith/releases/latest/download/install.ps1 | iex
```

This will:
- Download the latest version
- Install to `%LOCALAPPDATA%\ais` (no admin rights required)
- Automatically add to your PATH
- Verify the installation

### Method 2: Download and Run Installer

1. Download `install.ps1` or `install.bat` from the [Releases page](https://github.com/yourusername/ai-agent-user-swith/releases)
2. Right-click `install.ps1` → "Run with PowerShell"
   - Or double-click `install.bat`

### System-Wide Installation

If you want to install for all users (requires Administrator):

```powershell
# Run PowerShell as Administrator
irm https://github.com/yourusername/ai-agent-user-swith/releases/latest/download/install.ps1 | iex -SystemWide
```

Or run the downloaded `install.ps1` with the `-SystemWide` parameter:

```powershell
.\install.ps1 -SystemWide
```

This installs to `C:\Program Files\ais` instead of the user directory.

## Manual Installation

If you prefer to install manually, see the main [README.md](README.md) for detailed instructions.

## Verify Installation

After installation, open a **new terminal window** and run:

```cmd
ais --version
```

You should see the version number displayed.

## Troubleshooting

### Command not found

If `ais` command is not found after installation:

1. Close and reopen your terminal (PATH changes require a new session)
2. Verify the installation directory is in your PATH:
   ```cmd
   echo %PATH%
   ```
3. Re-run the installer

### Permission Denied

If you get permission errors:

1. Run PowerShell as Administrator
2. Or use the user-local installation (default, no admin required)

### Antivirus Blocking

Some antivirus software may flag the executable. This is a false positive. You can:

1. Add an exception in your antivirus software
2. Download and verify the file manually from GitHub Releases
3. Install from npm instead: `npm install -g ai-account-switch`

## Uninstallation

To uninstall ais:

1. Remove the installation directory:
   ```cmd
   rmdir /s "%LOCALAPPDATA%\ais"
   ```
   Or for system-wide installation:
   ```cmd
   rmdir /s "C:\Program Files\ais"
   ```

2. Remove from PATH:
   - Open "Edit the system environment variables"
   - Click "Environment Variables"
   - Find "Path" and remove the ais directory entry

## Alternative Installation Methods

- **npm**: `npm install -g ai-account-switch` (requires Node.js)
- **From source**: Clone the repository and run `npm link`

See [README.md](README.md) for more details.

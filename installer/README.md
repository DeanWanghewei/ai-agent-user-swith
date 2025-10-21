# Windows Installer

This directory contains the configuration and scripts for building the Windows installer for AI Account Switch.

## Quick Start

### For Users

Download `ais-setup-1.5.1.exe` from the [Releases page](https://github.com/DeanWanghewei/ai-agent-user-swith/releases) and run it. The installer will:

1. Install the application
2. Automatically add `ais` to your PATH
3. Create Start Menu shortcuts
4. Optionally create a desktop shortcut

After installation, open a new terminal and run:
```cmd
ais --version
```

### For Developers

See [windows/build-installer.md](windows/build-installer.md) for detailed build instructions.

## Directory Structure

```
installer/
├── README.md                    # This file
└── windows/
    ├── ais-setup.iss           # Inno Setup script
    ├── ais-icon.ico            # Application icon (optional)
    └── build-installer.md      # Build instructions
```

## Features

- ✅ One-click installation
- ✅ Automatic PATH configuration
- ✅ No admin rights required
- ✅ Clean uninstaller
- ✅ Multi-language support (English/Chinese)
- ✅ Modern wizard interface

## Building

### Prerequisites

1. Install [Inno Setup](https://jrsoftware.org/isdl.php)
2. Build the Windows executable: `npm run build:win`

### Build Installer

```bash
# Using Inno Setup GUI
# Open installer/windows/ais-setup.iss and click Compile

# Or using command line
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer\windows\ais-setup.iss
```

The installer will be created in `dist/installer/ais-setup-1.5.1.exe`.

## Automated Builds

The installer is automatically built by GitHub Actions when you:
- Push a new tag (e.g., `v1.5.1`)
- Manually trigger the workflow

See [.github/workflows/build-installer.yml](../.github/workflows/build-installer.yml) for details.

## Customization

Edit `windows/ais-setup.iss` to customize:
- Application name and version
- Installation directory
- File associations
- Registry entries
- Custom actions

## Support

For issues or questions about the installer, please open an issue on GitHub.

# Building Windows Installer

This guide explains how to build the Windows installer for AI Account Switch.

## Prerequisites

1. **Inno Setup**: Download and install from https://jrsoftware.org/isdl.php
   - Version 6.0 or later recommended
   - Free and open source

2. **Node.js and npm**: Required to build the executable
   - Node.js 14.0 or later

## Build Steps

### Step 1: Build the Windows Executable

```bash
# Install dependencies
npm install

# Build Windows executable using pkg
npm run build:win
# Or manually:
npx pkg . --targets node18-win-x64 --output dist/ais-win.exe
```

This will create `dist/ais-win.exe`.

### Step 2: Create Application Icon (Optional)

If you want a custom icon:

1. Create or obtain a `.ico` file (256x256 recommended)
2. Save it as `installer/windows/ais-icon.ico`
3. If no icon is provided, the installer will use the default Windows icon

### Step 3: Build the Installer

**Option A: Using Inno Setup GUI (Recommended for first-time)**

1. Open Inno Setup Compiler
2. Click "File" → "Open"
3. Navigate to `installer/windows/ais-setup.iss`
4. Click "Build" → "Compile"
5. The installer will be created in `dist/installer/ais-setup-1.5.1.exe`

**Option B: Using Command Line**

```bash
# On Windows with Inno Setup installed
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer\windows\ais-setup.iss
```

**Option C: Using npm script (Add to package.json)**

Add this to your `package.json` scripts:

```json
{
  "scripts": {
    "build:win": "pkg . --targets node18-win-x64 --output dist/ais-win.exe",
    "build:installer": "iscc installer\\windows\\ais-setup.iss",
    "build:win-installer": "npm run build:win && npm run build:installer"
  }
}
```

Then run:
```bash
npm run build:win-installer
```

## Installer Features

The generated installer includes:

- ✅ **Automatic PATH Configuration**: Adds `ais` to system PATH
- ✅ **Modern Wizard Interface**: Clean, professional installation experience
- ✅ **Uninstaller**: Complete removal including PATH cleanup
- ✅ **Multi-language Support**: English and Chinese
- ✅ **User-level Installation**: No admin rights required (installs to user directory)
- ✅ **Desktop Shortcut**: Optional desktop icon
- ✅ **Start Menu Entry**: Adds program to Start Menu

## Installation Process for Users

1. Download `ais-setup-1.5.1.exe`
2. Double-click to run
3. Follow the installation wizard:
   - Choose installation directory (default: `C:\Users\<username>\AppData\Local\Programs\AI Account Switch`)
   - Select "Add to PATH" option (recommended, checked by default)
   - Optionally create desktop shortcut
4. Click "Install"
5. Done! Open a new terminal and type `ais --version` to verify

## Uninstallation

Users can uninstall via:
- Start Menu → AI Account Switch → Uninstall
- Windows Settings → Apps → AI Account Switch → Uninstall

The uninstaller will:
- Remove all installed files
- Remove PATH entry
- Clean up Start Menu entries

## Customization

### Change App Version

Edit `ais-setup.iss`:
```iss
#define MyAppVersion "1.5.1"  ; Change this
```

### Change Installation Directory

Edit `ais-setup.iss`:
```iss
DefaultDirName={autopf}\{#MyAppName}  ; Current: Program Files
; Or use:
DefaultDirName={localappdata}\Programs\{#MyAppName}  ; User directory
```

### Add More Files

Edit the `[Files]` section in `ais-setup.iss`:
```iss
[Files]
Source: "path\to\file"; DestDir: "{app}"; Flags: ignoreversion
```

## Troubleshooting

### "ISCC.exe not found"

Make sure Inno Setup is installed and added to PATH, or use the full path:
```bash
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer\windows\ais-setup.iss
```

### "Source file not found"

Ensure you've built the executable first:
```bash
npm run build:win
```

### Icon file missing

If you don't have an icon file, comment out this line in `ais-setup.iss`:
```iss
; SetupIconFile=ais-icon.ico
```

## Distribution

After building, distribute the installer:

1. Upload `dist/installer/ais-setup-1.5.1.exe` to GitHub Releases
2. Users download and run the installer
3. No manual PATH configuration needed!

## Advantages Over Current Method

| Feature | Current (Manual) | With Installer |
|---------|-----------------|----------------|
| PATH Setup | Manual | Automatic |
| Uninstall | Manual file deletion | Clean uninstaller |
| User Experience | Complex | One-click install |
| Admin Rights | Sometimes needed | Not required |
| Start Menu Entry | No | Yes |
| Version Management | Manual | Automatic |

## Next Steps

1. Create an icon file (optional but recommended)
2. Build the installer
3. Test on a clean Windows machine
4. Add to GitHub Actions for automated builds
5. Update README with new installation instructions

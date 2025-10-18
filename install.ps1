# AI Account Switch (ais) - Windows Installer
# This script downloads and installs ais, automatically adding it to PATH

param(
    [string]$InstallDir = "$env:LOCALAPPDATA\ais",
    [switch]$SystemWide = $false
)

$ErrorActionPreference = "Stop"

# Colors
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-ColorOutput Green "=========================================="
Write-ColorOutput Green "  AI Account Switch (ais) Installer"
Write-ColorOutput Green "=========================================="
Write-Output ""

# Determine installation directory
if ($SystemWide) {
    $InstallDir = "$env:ProgramFiles\ais"
    $PathScope = "Machine"
    Write-Output "Installing system-wide (requires administrator privileges)"
} else {
    $InstallDir = "$env:LOCALAPPDATA\ais"
    $PathScope = "User"
    Write-Output "Installing for current user"
}

Write-Output "Installation directory: $InstallDir"
Write-Output ""

# Create installation directory
if (!(Test-Path $InstallDir)) {
    Write-Output "Creating installation directory..."
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# Download the latest release
$LatestReleaseUrl = "https://api.github.com/repos/yourusername/ai-agent-user-swith/releases/latest"
$ExePath = Join-Path $InstallDir "ais.exe"

Write-Output "Downloading latest release..."
try {
    $release = Invoke-RestMethod -Uri $LatestReleaseUrl
    $asset = $release.assets | Where-Object { $_.name -eq "ais-win.exe" }

    if (!$asset) {
        throw "Could not find ais-win.exe in the latest release"
    }

    $downloadUrl = $asset.browser_download_url
    Write-Output "Downloading from: $downloadUrl"

    # Download with progress
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $downloadUrl -OutFile $ExePath
    $ProgressPreference = 'Continue'

    Write-ColorOutput Green "✓ Downloaded successfully"
} catch {
    Write-ColorOutput Red "Failed to download: $_"
    exit 1
}

# Add to PATH if not already there
Write-Output ""
Write-Output "Adding to PATH..."

$currentPath = [Environment]::GetEnvironmentVariable("Path", $PathScope)

if ($currentPath -notlike "*$InstallDir*") {
    try {
        $newPath = $currentPath + ";$InstallDir"
        [Environment]::SetEnvironmentVariable("Path", $newPath, $PathScope)
        Write-ColorOutput Green "✓ Added to PATH"

        # Update current session PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

    } catch {
        Write-ColorOutput Yellow "! Could not add to PATH automatically"
        Write-Output "Please add the following to your PATH manually:"
        Write-Output "  $InstallDir"
    }
} else {
    Write-ColorOutput Green "✓ Already in PATH"
}

# Verify installation
Write-Output ""
Write-Output "Verifying installation..."

try {
    $version = & $ExePath --version 2>&1
    Write-ColorOutput Green "✓ Installation successful!"
    Write-Output ""
    Write-ColorOutput Green "=========================================="
    Write-ColorOutput Green "  Installation Complete!"
    Write-ColorOutput Green "=========================================="
    Write-Output ""
    Write-Output "Version: $version"
    Write-Output "Installed to: $ExePath"
    Write-Output ""
    Write-Output "You can now use 'ais' command in a new terminal window."
    Write-Output ""
    Write-Output "Quick start:"
    Write-Output "  ais add      - Add a new account"
    Write-Output "  ais list     - List all accounts"
    Write-Output "  ais use      - Set account for current project"
    Write-Output "  ais help     - Show all commands"
    Write-Output ""
    Write-ColorOutput Yellow "Note: Please restart your terminal or open a new one for PATH changes to take effect."

} catch {
    Write-ColorOutput Red "Installation may have issues. Error: $_"
    Write-Output ""
    Write-Output "Installed to: $ExePath"
    Write-Output "Please verify manually by running: $ExePath --version"
    exit 1
}

@echo off
REM AI Account Switch (ais) - Windows Installer (Batch)
REM This script downloads and installs ais, automatically adding it to PATH

setlocal enabledelayedexpansion

echo ==========================================
echo   AI Account Switch (ais) Installer
echo ==========================================
echo.

REM Determine installation directory (user-local by default)
set "INSTALL_DIR=%LOCALAPPDATA%\ais"
set "PATH_SCOPE=User"

echo Installing for current user
echo Installation directory: %INSTALL_DIR%
echo.

REM Create installation directory
if not exist "%INSTALL_DIR%" (
    echo Creating installation directory...
    mkdir "%INSTALL_DIR%"
)

REM Download using PowerShell (available on all modern Windows)
set "EXE_PATH=%INSTALL_DIR%\ais.exe"
set "DOWNLOAD_URL=https://github.com/yourusername/ai-agent-user-swith/releases/latest/download/ais-win.exe"

echo Downloading latest release...
echo From: %DOWNLOAD_URL%
echo.

powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%DOWNLOAD_URL%' -OutFile '%EXE_PATH%'}"

if %errorlevel% neq 0 (
    echo [ERROR] Failed to download ais-win.exe
    echo Please check your internet connection and try again.
    pause
    exit /b 1
)

echo [OK] Downloaded successfully
echo.

REM Add to PATH
echo Adding to PATH...

REM Check if already in PATH
echo %PATH% | findstr /C:"%INSTALL_DIR%" >nul
if %errorlevel% equ 0 (
    echo [OK] Already in PATH
) else (
    REM Use PowerShell to update PATH permanently
    powershell -Command "& {$path = [Environment]::GetEnvironmentVariable('Path', 'User'); if ($path -notlike '*%INSTALL_DIR%*') { [Environment]::SetEnvironmentVariable('Path', $path + ';%INSTALL_DIR%', 'User') }}"

    if !errorlevel! equ 0 (
        echo [OK] Added to PATH
        REM Update current session PATH
        set "PATH=%PATH%;%INSTALL_DIR%"
    ) else (
        echo [WARNING] Could not add to PATH automatically
        echo Please add the following to your PATH manually:
        echo   %INSTALL_DIR%
    )
)

echo.
echo Verifying installation...

REM Test the executable
"%EXE_PATH%" --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Installation successful!
    echo.
    echo ==========================================
    echo   Installation Complete!
    echo ==========================================
    echo.

    REM Display version
    "%EXE_PATH%" --version

    echo.
    echo Installed to: %EXE_PATH%
    echo.
    echo You can now use 'ais' command in a new terminal window.
    echo.
    echo Quick start:
    echo   ais add      - Add a new account
    echo   ais list     - List all accounts
    echo   ais use      - Set account for current project
    echo   ais help     - Show all commands
    echo.
    echo [NOTE] Please restart your terminal or open a new one for PATH changes to take effect.
) else (
    echo [WARNING] Installation may have issues
    echo Installed to: %EXE_PATH%
    echo Please verify manually by running: "%EXE_PATH%" --version
)

echo.
pause

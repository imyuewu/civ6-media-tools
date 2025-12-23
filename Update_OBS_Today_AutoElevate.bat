@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion

REM =====================================================
REM Civ6 OBS helper (Windows) - UNC version
REM - Auto-elevate to admin (UAC)
REM - Get today's date (yyyy-MM-dd)
REM - Create \\MAC_IP\SHARE_NAME\00_Inbox_Recording\yyyy-MM-dd
REM - Update local symlink: F:\OBS_Today -> that folder
REM - Log: %TEMP%\Update_OBS_Today.log
REM =====================================================

REM ====== 这里改成你的真实信息 ======
set "MAC_IP=192.168.31.81"
set "SHARE_NAME=Civ6_Recordings"
REM ==================================

REM ---- Config ----
set "BASE_PATH=\\%MAC_IP%\%SHARE_NAME%\00_Inbox_Recording"
set "LINK_PATH=F:\OBS_Today"
set "LOG=%TEMP%\Update_OBS_Today.log"

>>"%LOG%" echo ==================================================
>>"%LOG%" echo Start: %DATE% %TIME%
>>"%LOG%" echo Script: %~f0
>>"%LOG%" echo User: %USERNAME%
>>"%LOG%" echo BASE_PATH=%BASE_PATH%
>>"%LOG%" echo LINK_PATH=%LINK_PATH%
>>"%LOG%" echo.

REM ---- Admin check ----
net session >nul 2>&1
if %errorlevel%==0 goto :MAIN

if /I "%~1"=="elevated" goto :ELEVATE_FAILED

echo [INFO] Need admin privileges. Triggering UAC...
>>"%LOG%" echo Not admin, requesting elevation via VBScript...

set "VBS=%TEMP%\_uac_elevate.vbs"
>"%VBS%"  echo Set UAC = CreateObject^("Shell.Application"^)
>>"%VBS%" echo UAC.ShellExecute "%~f0", "elevated", "", "runas", 1

cscript //nologo "%VBS%" >>"%LOG%" 2>&1
del /f /q "%VBS%" >nul 2>&1

echo [INFO] Elevation requested. If no UAC prompt appears, check SmartScreen / security software / policy.
echo [INFO] Debug log: %LOG%
exit /b 0

:ELEVATE_FAILED
echo [ERROR] Still not running as admin after requesting elevation.
echo         Please right-click this .bat and choose "Run as administrator".
echo [INFO]  Debug log: %LOG%
>>"%LOG%" echo ELEVATE_FAILED
exit /b 1

:MAIN
>>"%LOG%" echo Running elevated.

REM ---- Sanity checks ----
if not exist "F:\" goto :ERR_F

REM 检查 UNC 是否可达：先检查共享根
if not exist "\\%MAC_IP%\%SHARE_NAME%\" goto :ERR_UNC_ROOT

REM ---- Get today's date (yyyy-MM-dd) ----
for /f %%i in ('powershell -NoProfile -Command "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; Get-Date -Format yyyy-MM-dd"') do set "TODAY=%%i"
if "%TODAY%"=="" goto :ERR_DATE

set "TARGET=%BASE_PATH%\%TODAY%"

echo [INFO] Today  = %TODAY%
echo [INFO] Target = %TARGET%
echo [INFO] Link   = %LINK_PATH%
echo [INFO] Log    = %LOG%

>>"%LOG%" echo TODAY=%TODAY%
>>"%LOG%" echo TARGET=%TARGET%

REM ---- Create target folder if missing ----
if exist "%TARGET%\" goto :SKIP_MKDIR
>>"%LOG%" echo Creating folder: %TARGET%
mkdir "%TARGET%" >>"%LOG%" 2>&1
if not exist "%TARGET%\" goto :ERR_MKDIR
:SKIP_MKDIR

REM ---- Recreate local symlink ----
if not exist "%LINK_PATH%" goto :MAKE_LINK
>>"%LOG%" echo Removing existing LINK_PATH: %LINK_PATH%
rmdir "%LINK_PATH%" >>"%LOG%" 2>&1
if exist "%LINK_PATH%" goto :ERR_RMDIR

:MAKE_LINK
>>"%LOG%" echo mklink /D "%LINK_PATH%" "%TARGET%"
mklink /D "%LINK_PATH%" "%TARGET%" >>"%LOG%" 2>&1
if errorlevel 1 goto :ERR_MKLINK
if not exist "%LINK_PATH%\" goto :ERR_VERIFY

echo [OK] Done: %LINK_PATH%  ->  %TARGET%
>>"%LOG%" echo SUCCESS
exit /b 0

:ERR_UNC_ROOT
echo [ERROR] Cannot access UNC share: \\%MAC_IP%\%SHARE_NAME%\
echo         Check Mac IP, share name, and that File Sharing is enabled.
>>"%LOG%" echo ERR_UNC_ROOT
exit /b 9

:ERR_F
echo [ERROR] F: drive not available. Check LINK_PATH drive.
>>"%LOG%" echo ERR_F
exit /b 12

:ERR_DATE
echo [ERROR] Failed to get date (TODAY empty). Is PowerShell allowed?
>>"%LOG%" echo ERR_DATE
exit /b 13

:ERR_MKDIR
echo [ERROR] Failed to create target folder: %TARGET%
echo         Possible: no write permission on Mac share / network issue.
>>"%LOG%" echo ERR_MKDIR
exit /b 14

:ERR_RMDIR
echo [ERROR] Failed to remove existing %LINK_PATH% (likely in use). Close OBS/Explorer windows and retry.
>>"%LOG%" echo ERR_RMDIR
exit /b 15

:ERR_MKLINK
echo [ERROR] mklink failed. Ensure running as admin and F: is NTFS.
echo [INFO]  Debug log: %LOG%
>>"%LOG%" echo ERR_MKLINK
exit /b 16

:ERR_VERIFY
echo [ERROR] Link created but not accessible: %LINK_PATH%
>>"%LOG%" echo ERR_VERIFY
exit /b 17
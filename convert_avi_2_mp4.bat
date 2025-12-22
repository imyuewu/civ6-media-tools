@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ==========================
REM Civ6 AVI -> MP4 batch converter
REM Usage:
REM   convert_avi_2_mp4.bat "D:\input_avi" "D:\output_mp4"
REM ==========================

if "%~1"=="" goto :usage
if "%~2"=="" goto :usage

set "IN_DIR=%~1"
set "OUT_DIR=%~2"

REM ---- normalize: remove trailing backslash ----
if "%IN_DIR:~-1%"=="\" set "IN_DIR=%IN_DIR:~0,-1%"
if "%OUT_DIR:~-1%"=="\" set "OUT_DIR=%OUT_DIR:~0,-1%"

REM ---- find ffmpeg (prefer PATH; fallback to MediaTools) ----
set "FFMPEG="

for /f "delims=" %%P in ('where ffmpeg.exe 2^>nul') do (
  set "FFMPEG=%%P"
  goto :gotff
)

REM fallback: assume script lives under ...\MediaTools\Scripts\
set "FFMPEG=%~dp0..\ffmpeg\bin\ffmpeg.exe"

:gotff
if not exist "%FFMPEG%" (
  echo [ERROR] ffmpeg not found.
  echo   Checked PATH via where, and fallback:
  echo   "%~dp0..\ffmpeg\bin\ffmpeg.exe"
  exit /b 2
)

if not exist "%IN_DIR%" (
  echo [ERROR] Input folder does not exist:
  echo         "%IN_DIR%"
  exit /b 3
)

if not exist "%OUT_DIR%" (
  mkdir "%OUT_DIR%" >nul 2>nul
  if errorlevel 1 (
    echo [ERROR] Cannot create output folder:
    echo         "%OUT_DIR%"
    exit /b 4
  )
)

REM ---- options ----
set "CRF=18"
set "PRESET=slow"
set "AUDIO_BR=160k"

REM 0 = only top-level; 1 = recursive subfolders
set "RECURSIVE=1"

REM 0 = skip if output exists; 1 = overwrite if output exists
set "OVERWRITE=0"

echo ==========================================
echo Input : "%IN_DIR%"
echo Output: "%OUT_DIR%"
echo ffmpeg: "%FFMPEG%"
echo Video : libx264 preset=%PRESET% crf=%CRF%
echo Audio : aac %AUDIO_BR%
echo Recursive : %RECURSIVE%
echo Overwrite : %OVERWRITE%
echo ==========================================
echo.

set /a total=0, ok=0, skipped=0, fail=0

if "%RECURSIVE%"=="1" (
  for /r "%IN_DIR%" %%F in (*.avi) do call :process_one "%%~fF"
) else (
  for %%F in ("%IN_DIR%\*.avi") do call :process_one "%%~fF"
)

echo.
echo -------- Summary --------
echo Total   : %total%
echo OK      : %ok%
echo Skipped : %skipped%
echo Failed  : %fail%
echo -------------------------
exit /b 0


:process_one
set /a total+=1
set "IN_FILE=%~1"

for %%A in ("%IN_FILE%") do (
  set "FILE_DIR=%%~dpA"
  set "FILE_NAME=%%~nA"
  set "FILE_EXT=%%~xA"
)

REM normalize FILE_DIR: remove trailing backslash
if "!FILE_DIR:~-1!"=="\" set "FILE_DIR=!FILE_DIR:~0,-1!"

REM compute relative dir:
REM if FILE_DIR starts with IN_DIR, REL = FILE_DIR minus IN_DIR
set "REL_DIR="
set "PREFIX=%IN_DIR%"
if "!FILE_DIR:~0,%=len_prefix=%!"=="" (
  REM (dummy line to avoid syntax highlight issues)
)

REM Get prefix length safely
call set "PREFIX_LEN=%%=len.IN_DIR%%"
REM The above won't work in pure cmd; do it manually:
set "PREFIX_LEN=0"
for /l %%i in (0,1,260) do (
  if "!IN_DIR:~%%i,1!"=="" (set "PREFIX_LEN=%%i" & goto :gotlen)
)
:gotlen

REM If file is under input dir, strip it; else keep no subdir
if /i "!FILE_DIR:~0,%PREFIX_LEN%!"=="%IN_DIR%" (
  set "REL_DIR=!FILE_DIR:~%PREFIX_LEN%!"
) else (
  set "REL_DIR="
)

REM REL_DIR may start with "\" -> remove it
if "!REL_DIR:~0,1!"=="\" set "REL_DIR=!REL_DIR:~1!"

set "TARGET_DIR=%OUT_DIR%"
if not "!REL_DIR!"=="" set "TARGET_DIR=%OUT_DIR%\!REL_DIR!"

if not exist "!TARGET_DIR!" mkdir "!TARGET_DIR!" >nul 2>nul

set "OUT_FILE=!TARGET_DIR!\!FILE_NAME!.mp4"

if exist "!OUT_FILE!" (
  if "%OVERWRITE%"=="0" (
    echo [SKIP] "!OUT_FILE!" already exists
    set /a skipped+=1
    goto :eof
  )
)

echo [DO] "!FILE_NAME!!FILE_EXT!"  ^>  "!OUT_FILE!"

set "YFLAG=-n"
if "%OVERWRITE%"=="1" set "YFLAG=-y"

"%FFMPEG%" %YFLAG% -hide_banner -loglevel error ^
  -i "!IN_FILE!" ^
  -c:v libx264 -preset %PRESET% -crf %CRF% -pix_fmt yuv420p ^
  -c:a aac -b:a %AUDIO_BR% ^
  "!OUT_FILE!"

if errorlevel 1 (
  echo [FAIL] "!FILE_NAME!!FILE_EXT!"
  set /a fail+=1
) else (
  echo [OK]   "!FILE_NAME!!FILE_EXT!"
  set /a ok+=1
)

goto :eof


:usage
echo Usage:
echo   %~nx0 "D:\path\to\avi_folder" "D:\path\to\output_mp4_folder"
echo Example:
echo   %~nx0 "F:\Civ6_Asserts\Movies\Expansion2\Raw" "F:\Civ6_Asserts\Movies\Expansion2\Mp4"
exit /b 1

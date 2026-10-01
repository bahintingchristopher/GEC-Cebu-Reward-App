@echo off
if "%1"=="hidden" goto RUN

:: Re-launch this batch script invisibly using VBScript
mshta vbscript:CreateObject("WScript.Shell").Run("""%~f0"" hidden",0,False)(window.close)
exit /b

:RUN
cd /d "%~dp0backend"

:: Check if Node.js is installed and available in PATH
where node >nul 2>&1
if %errorlevel% neq 0 exit /b 1

:: Check if the server is already running on port 5000
powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>&1
if %errorlevel%==0 exit /b 0

:: Start Node.js headlessly and redirect output logs to backend\server.log
node server.js > server.log 2>&1
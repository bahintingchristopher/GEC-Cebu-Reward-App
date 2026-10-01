@echo off
if "%1"=="hidden" goto RUN

:: Re-launch invisibly
mshta vbscript:CreateObject("WScript.Shell").Run("""%~f0"" hidden",0,False)(window.close)
exit /b

:RUN
:: Find PID running on port 5000 and kill it
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTEN') do (
    taskkill /F /PID %%a >nul 2>&1
)
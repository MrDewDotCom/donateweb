@echo off
REM Emergency stop: use this only if the Donate web window was lost or got stuck.
REM Normally just press Ctrl+C in (or close) the Donate web window.
taskkill /IM cloudflared.exe /T /F >nul 2>&1
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":3000 .*LISTENING" /c:":4173 .*LISTENING"') do taskkill /PID %%p /T /F >nul 2>&1
echo Donate web is now offline.
pause

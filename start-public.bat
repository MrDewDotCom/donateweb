@echo off
title Donate web
cd /d "%~dp0"

REM First run only: install the launcher (concurrently)
if not exist node_modules (
  echo Installing launcher...
  call npm install || goto :fail
)

echo [1/3] Updating database...
cd /d "%~dp0back"
call npx prisma migrate deploy || goto :fail
call npx prisma generate || goto :fail
cd /d "%~dp0"

echo [2/3] Building backend...
call npm --prefix back run build || goto :fail
echo [3/3] Building frontend...
call npm --prefix front run build || goto :fail

cls
echo ============================================================
echo   Donate web is ONLINE:  https://donate.misterdew.com
echo   To go offline: press Ctrl+C here, or just close this window
echo ============================================================
echo.
call npm run public
echo.
echo Donate web is now OFFLINE.
pause
exit /b 0

:fail
echo.
echo Build failed. Site was NOT opened.
pause
exit /b 1

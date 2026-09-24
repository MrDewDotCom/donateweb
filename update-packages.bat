@echo off
title Update packages - Donate web
cd /d "%~dp0"
echo ============================================================
echo   Install package updates (security fixes)
echo   Make sure the site is OFFLINE first (close the Donate web window)
echo ============================================================
echo.
pause

echo [1/2] Backend packages...
cd /d "%~dp0back"
call npm install --no-fund --no-audit || goto :fail
call npx prisma generate || goto :fail

echo.
echo [2/2] Frontend packages...
cd /d "%~dp0front"
call npm install --no-fund --no-audit || goto :fail

echo.
echo Security check:
cd /d "%~dp0back"
call npm audit --omit=dev
cd /d "%~dp0front"
call npm audit --omit=dev

echo.
echo Done. Run start-public.bat to open the site again.
pause
exit /b 0

:fail
echo.
echo Update failed. Send the error above to Claude.
pause
exit /b 1

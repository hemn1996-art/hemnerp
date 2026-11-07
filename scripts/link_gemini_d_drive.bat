@echo off
echo ========================================================
echo   Connecting Antigravity Chat History to D:\.gemini
echo ========================================================
echo.
echo NOTE: Make sure Antigravity IDE / app is completely closed before running!
echo.
pause

echo Stopping any remaining Antigravity processes...
taskkill /F /IM antigravity.exe 2>nul
taskkill /F /IM "Antigravity IDE.exe" 2>nul

echo Removing fresh empty directory at %USERPROFILE%\.gemini ...
rmdir /s /q "%USERPROFILE%\.gemini" 2>nul

echo Creating Directory Junction to D:\.gemini ...
mklink /J "%USERPROFILE%\.gemini" "D:\.gemini"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   SUCCESS! Antigravity is now permanently linked to D:\.gemini
    echo   Open Antigravity IDE and all past chats will be back!
    echo ========================================================
) else (
    echo.
    echo [ERROR] Failed to create link. Please right-click this bat file and choose 'Run as administrator'.
)

echo.
pause

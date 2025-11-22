@echo off
title CV Screener
echo ==========================================
echo        Iniciando CV Screener
echo ==========================================
echo.
echo Abriendo aplicacion en tu navegador...
echo.

:: Try to find Chrome
set "CHROME_PATH="
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" set "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "CHROME_PATH=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

if defined CHROME_PATH (
    echo Abriendo en Google Chrome...
    start "" "%CHROME_PATH%" "%~dp0dist\index.html"
) else (
    echo Chrome no encontrado, abriendo en navegador predeterminado...
    start "" "%~dp0dist\index.html"
)

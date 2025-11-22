@echo off
title CV Screener Portable
echo ==========================================
echo        Iniciando CV Screener (Portable)
echo ==========================================
echo.

:: Define path to portable node (check bin folder first, then root)
set "NODE_EXE=%~dp0bin\node.exe"
if not exist "%NODE_EXE%" (
    set "NODE_EXE=%~dp0node.exe"
)

:: Check if portable node exists
if not exist "%NODE_EXE%" (
    echo ERROR: No se encontro 'node.exe'.
    echo.
    echo Por favor descarga el binario de Node.js "node.exe" y colocalo en:
    echo   1. Una carpeta llamada 'bin' (recomendado)
    echo   2. O en esta misma carpeta
    echo.
    echo Puedes descargarlo aqui: https://nodejs.org/dist/latest-v20.x/win-x64/node.exe
    echo.
    pause
    exit
)

echo Iniciando servidor local...
echo.
echo NOTA: No cierres esta ventana mientras uses la aplicacion.
echo.

:: Open browser
start http://localhost:5173

:: Start server using portable node
"%NODE_EXE%" portable-server.js
if %errorlevel% neq 0 pause

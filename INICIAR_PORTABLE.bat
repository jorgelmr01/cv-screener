@echo off
title CV Screener Portable
echo ==========================================
echo        Iniciando CV Screener (Portable)
echo ==========================================
echo.

set "ROOT_DIR=%~dp0"
set "BIN_DIR=%~dp0bin"

echo Buscando node.exe en:
echo 1. "%BIN_DIR%\node.exe"
echo 2. "%ROOT_DIR%node.exe"
echo.

:: Check bin/node.exe
if exist "%BIN_DIR%\node.exe" (
    set "NODE_EXE=%BIN_DIR%\node.exe"
    goto :FOUND
)

:: Check root/node.exe
if exist "%ROOT_DIR%node.exe" (
    set "NODE_EXE=%ROOT_DIR%node.exe"
    goto :FOUND
)

:: Check for common mistake: node.exe.exe (double extension)
if exist "%ROOT_DIR%node.exe.exe" (
    set "NODE_EXE=%ROOT_DIR%node.exe.exe"
    goto :FOUND
)

:NOT_FOUND
echo ERROR: No se encontro 'node.exe'.
echo.
echo --- DIAGNOSTICO ---
echo Archivos .exe encontrados en esta carpeta:
dir /b /a-d "*.exe" 2>nul
if errorlevel 1 echo (Ninguno)
echo.
echo Archivos en carpeta bin:
if exist "%BIN_DIR%" ( dir /b "%BIN_DIR%\*.exe" 2>nul ) else ( echo (Carpeta bin no existe) )
echo -------------------
echo.
echo Por favor asegurate de que el archivo se llame EXACTAMENTE "node.exe".
echo Si Windows oculta las extensiones, puede que veas solo "node" (tipo Aplicacion).
echo.
pause
exit

:FOUND
echo Node encontrado: "%NODE_EXE%"
echo Iniciando servidor local...
echo.
echo NOTA: No cierres esta ventana mientras uses la aplicacion.
echo.

:: Open browser
start http://localhost:5173

:: Start server using portable node
"%NODE_EXE%" portable-server.js
if %errorlevel% neq 0 pause

@echo off
title CV Screener Launcher
echo ==========================================
echo        Iniciando CV Screener...
echo ==========================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado.
    echo Por favor instala Node.js desde https://nodejs.org/
    echo.
    pause
    exit
)

:: Check if node_modules exists, if not install dependencies
if not exist "node_modules" (
    echo Instalando dependencias necesarias... (esto puede tardar unos minutos)
    call npm install
    if %errorlevel% neq 0 (
        echo Hubo un error instalando las dependencias.
        pause
        exit
    )
)

echo Iniciando servidor y abriendo navegador...
echo.
echo NOTA: No cierres esta ventana mientras uses la aplicacion.
echo.

:: Start the app
start http://localhost:5173
call npm run dev

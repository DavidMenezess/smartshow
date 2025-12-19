@echo off
title SmartShow - Detector de Impressoras (Automático)
color 0A

echo ========================================
echo   SmartShow - Detector de Impressoras
echo   Detecção Automática - Windows
echo ========================================
echo.

:: Verificar se Node.js está instalado
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo [ERRO] Instale Node.js de: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js encontrado
echo.

:: Navegar para a pasta do script
cd /d "%~dp0"

:: Verificar se as dependências estão instaladas
if not exist "api\node_modules\express" (
    echo [INFO] Instalando dependencias...
    cd api
    call npm install express cors
    cd ..
)

:: Verificar se o servidor já está rodando
netstat -an | findstr ":3001" >nul
if %errorlevel% equ 0 (
    echo [AVISO] Porta 3001 ja esta em uso!
    echo [AVISO] Tentando parar servidor anterior...
    taskkill /F /IM node.exe /FI "WINDOWTITLE eq SmartShow*" >nul 2>&1
    timeout /t 2 >nul
)

:: Iniciar servidor
echo [INFO] Iniciando servidor de deteccao...
echo [INFO] Mantenha esta janela aberta enquanto usar o sistema
echo.
echo ========================================
echo   Servidor rodando em: http://localhost:3001
echo   Pressione Ctrl+C para parar
echo ========================================
echo.

node local-printer-detector.js

if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Erro ao iniciar servidor!
    echo [ERRO] Verifique se Node.js esta instalado corretamente
    pause
)


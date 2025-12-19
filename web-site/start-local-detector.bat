@echo off
echo ========================================
echo Iniciando Servidor Local de Detecção de Impressoras
echo ========================================
echo.
echo Este servidor detecta impressoras automaticamente no Windows
echo e permite que a aplicação web acesse a lista de impressoras.
echo.
echo Pressione Ctrl+C para parar o servidor.
echo.

cd /d "%~dp0"
node local-printer-detector.js

pause


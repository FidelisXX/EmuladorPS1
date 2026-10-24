@echo off
cd /d "%~dp0"
echo Modo celular: o servidor fica acessivel para aparelhos da sua rede local.
echo Se o Firewall do Windows perguntar, permita apenas em "Redes privadas".
echo Mantenha esta janela aberta enquanto joga.
echo.
node server.js --rede --abrir
pause

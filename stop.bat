@echo off
cd /d "%~dp0"
echo Parando o Postgres do ContaHora...
docker compose stop
echo.
echo Feito. Os dados ficam salvos no volume.
echo (para apagar TUDO do banco: docker compose down -v)
echo.
echo Obs: feche manualmente as janelas "ContaHora API" e "ContaHora WEB"
echo se ainda estiverem abertas.
pause

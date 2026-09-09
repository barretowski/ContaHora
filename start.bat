@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ==================================================
echo   ContaHora - ambiente local
echo ==================================================
echo.

REM ---------- Docker / Postgres ----------
where docker >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Docker nao encontrado. Abra o Docker Desktop e tente de novo.
  pause & exit /b 1
)

echo [1/6] Subindo o Postgres (container na porta 5433)...
docker compose up -d
if errorlevel 1 (
  echo [ERRO] Falha ao subir o Postgres. O Docker Desktop esta aberto?
  pause & exit /b 1
)

echo [2/6] Esperando o Postgres aceitar conexoes...
set _tries=0
:waitpg
docker compose exec -T db pg_isready -U contahora >nul 2>&1
if not errorlevel 1 goto pgready
set /a _tries+=1
if !_tries! geq 40 (
  echo [ERRO] Postgres nao respondeu a tempo.
  pause & exit /b 1
)
timeout /t 1 /nobreak >nul
goto waitpg
:pgready
echo        Postgres OK.

REM ---------- .env ----------
if not exist "api\.env" (
  echo [3/6] Criando api\.env a partir do .env.example
  copy /y "api\.env.example" "api\.env" >nul
) else (
  echo [3/6] api\.env ja existe.
)
if not exist "web\.env" (
  echo        Criando web\.env a partir do .env.example
  copy /y "web\.env.example" "web\.env" >nul
)

REM ---------- dependencias ----------
if not exist "api\node_modules" (
  echo [4/6] Instalando dependencias da API...
  pushd api
  call npm install
  popd
) else (
  echo [4/6] Dependencias da API OK.
)
if not exist "web\node_modules" (
  echo        Instalando dependencias do front...
  pushd web
  call npm install
  popd
) else (
  echo        Dependencias do front OK.
)

REM ---------- migrations + admin ----------
echo [5/6] Aplicando migrations e garantindo o admin...
pushd api
call npx prisma migrate deploy
call npm run seed
popd

REM ---------- sobe API e front em janelas separadas ----------
echo [6/6] Abrindo API e front...
start "ContaHora API" cmd /k "cd /d "%~dp0api" && npm run start:dev"
start "ContaHora WEB" cmd /k "cd /d "%~dp0web" && npm run dev"

echo        Esperando o front subir...
timeout /t 7 /nobreak >nul
start "" http://localhost:5173

echo.
echo --------------------------------------------------
echo  API .... http://localhost:3000/api
echo  Front .. http://localhost:5173
echo  Login .. admin@contahora.local / admin123
echo.
echo  Para PARAR: feche as janelas "ContaHora API" e
echo  "ContaHora WEB", e rode stop.bat (desliga o Postgres).
echo --------------------------------------------------
echo.
pause

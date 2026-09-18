@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies...
  call npm install
)
if not exist .env (
  copy .env.example .env >nul
  echo.
  echo IMPORTANT: Open .env and add FAL_KEY for AI Motion.
)
start "" http://localhost:3000
npm start
pause

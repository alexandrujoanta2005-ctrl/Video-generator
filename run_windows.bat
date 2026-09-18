@echo off
cd /d "%~dp0"
echo Starting Cinematic Maker at http://localhost:5500
start "" http://localhost:5500
python -m http.server 5500
pause

@echo off
REM Start a simple Python HTTP server on port 8000
python -m http.server 8000 || py -3 -m http.server 8000
pause
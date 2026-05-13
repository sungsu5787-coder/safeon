@echo off
chcp 65001 >nul
echo.
echo ====================================
echo   SafeOn 로컬 서버 시작
echo ====================================
echo.

cd /d "%~dp0"

where python >nul 2>&1
if %errorlevel% == 0 (
    echo Python 서버 시작: http://localhost:8181
    echo 종료하려면 Ctrl+C 를 누르세요.
    echo.
    start http://localhost:8181
    python -m http.server 8181
) else (
    where python3 >nul 2>&1
    if %errorlevel% == 0 (
        echo Python3 서버 시작: http://localhost:8181
        echo 종료하려면 Ctrl+C 를 누르세요.
        echo.
        start http://localhost:8181
        python3 -m http.server 8181
    ) else (
        echo [오류] Python이 설치되지 않았습니다.
        echo https://www.python.org 에서 Python을 설치하세요.
        pause
    )
)

@echo off
chcp 65001 > nul
title SafeOn Server
echo [SafeOn] 서버를 시작합니다...
set PORT=3001
node backend/server.js
pause
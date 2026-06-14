@echo off
chcp 65001 > nul
echo ============================================
echo   🍬 魔法糖果工坊 - 快速安装脚本
echo ============================================
echo.

echo [1/5] 检查 Node.js 环境...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未检测到 Node.js，请先安装 Node.js 18+
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js 版本:
node --version

echo.
echo [2/5] 检查 MongoDB 环境...
echo   提示: 请确保 MongoDB 服务已启动或已安装 MongoDB Compass
echo   默认连接: mongodb://localhost:27017/magic-candy

echo.
echo [3/5] 复制环境配置文件...
if not exist "server\.env" (
    copy "server\.env.example" "server\.env" > nul
    echo ✅ .env 配置文件已创建
) else (
    echo ✅ .env 配置文件已存在
)

echo.
echo [4/5] 安装后端依赖...
cd server
call npm install
if %errorlevel% neq 0 (
    echo ❌ 后端依赖安装失败
    cd ..
    pause
    exit /b 1
)
cd ..
echo ✅ 后端依赖安装完成

echo.
echo [5/5] 安装前端依赖...
cd client
call npm install
if %errorlevel% neq 0 (
    echo ❌ 前端依赖安装失败
    cd ..
    pause
    exit /b 1
)
cd ..
echo ✅ 前端依赖安装完成

echo.
echo ============================================
echo   ✨ 安装完成！下一步操作:
echo ============================================
echo.
echo   1️⃣  启动 MongoDB 服务 (如使用本地安装)
echo      或使用 Docker:
echo      docker run -d -p 27017:27017 mongo
echo.
echo   2️⃣  填充初始数据 (测试账号 + 原料库):
echo      npm run seed --workspace=server
echo.
echo   3️⃣  启动后端服务 (端口 3001):
echo      npm run dev:server
echo.
echo   4️⃣  启动前端服务 (端口 5173):
echo      npm run dev:client
echo.
echo   5️⃣  或同时启动前后端:
echo      npm run dev
echo.
echo ============================================
echo   🎮 默认测试账号:
echo   👑 首席调糖师: chief / chief123
echo   🎮 测试玩家: player1 ~ player5 / 123456
echo ============================================
echo.
pause

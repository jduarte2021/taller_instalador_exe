@echo off
:: ─────────────────────────────────────────────────────────────────────────────
:: build.bat — Genera el instalador TallerData.exe (versión SQLite/Prisma)
:: ─────────────────────────────────────────────────────────────────────────────

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║     TallerData — Build .exe (SQLite)     ║
echo  ╚══════════════════════════════════════════╝
echo.

:: Evitar que Puppeteer re-descargue Chrome durante el build
set PUPPETEER_SKIP_DOWNLOAD=true
set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

:: ── Paso 1: Build del frontend ───────────────────────────────────────────────
echo [1/5] Compilando frontend React...
cd taller
call npm install
call npm run build
cd ..
if errorlevel 1 ( echo ERROR en frontend. & pause & exit /b 1 )
echo      OK — taller\dist\ generado.
echo.

:: ── Paso 2: Instalar dependencias ────────────────────────────────────────────
echo [2/5] Instalando dependencias (npm install)...
call npm install
if errorlevel 1 ( echo ERROR en npm install. & pause & exit /b 1 )
echo      OK.
echo.

:: ── Paso 3: Generar Prisma Client ────────────────────────────────────────────
echo [3/5] Generando Prisma Client...
call npx prisma generate
if errorlevel 1 ( echo ERROR en prisma generate. & pause & exit /b 1 )
echo      OK.
echo.

:: ── Paso 4: Recompilar Prisma para Electron ──────────────────────────────────
echo [4/5] Recompilando modulos nativos para Electron...
call npx electron-rebuild -f -w @prisma/client
if errorlevel 1 ( echo ERROR en electron-rebuild. & pause & exit /b 1 )
echo      OK.
echo.

:: ── Paso 5: Generar instalador ───────────────────────────────────────────────
echo [5/5] Empaquetando con electron-builder...
call npx electron-builder --win
if errorlevel 1 ( echo ERROR en electron-builder. & pause & exit /b 1 )

echo.
echo  ✓ Listo. Instalador en dist\
echo.
pause

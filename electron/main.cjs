// ─────────────────────────────────────────────────────────────────────────────
// electron/main.cjs — SQLite via Prisma (sin MongoDB)
// ─────────────────────────────────────────────────────────────────────────────
const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path              = require('path');
const fs                = require('fs');
const net               = require('net');
const { pathToFileURL } = require('url');

let mainWindow;

const appRoot = app.isPackaged
  ? app.getAppPath()
  : path.join(__dirname, '..');

// ── Buscar Chrome para Puppeteer (PDFs) ──────────────────────────────────────
function findChromePath() {
  const candidates = [
    path.join(appRoot, '.cache', 'puppeteer', 'chrome-headless-shell',
      'win64-127.0.6533.88', 'chrome-headless-shell-win64', 'chrome-headless-shell.exe'),
    path.join(appRoot, '.cache', 'puppeteer', 'chrome',
      'win64-127.0.6533.88', 'chrome-win64', 'chrome.exe'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// ── Config opcional del usuario (Gmail, etc.) ─────────────────────────────────
function loadUserConfig() {
  const cfgPath = path.join(app.getPath('userData'), '.env.local');
  if (!fs.existsSync(cfgPath)) return;
  try {
    fs.readFileSync(cfgPath, 'utf8').split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eq = trimmed.indexOf('=');
      if (eq < 1) return;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !process.env[key]) process.env[key] = val;
    });
    console.log('[config] Config de usuario cargada:', cfgPath);
  } catch (e) {
    console.warn('[config] No se pudo leer .env.local:', e.message);
  }
}

// ── Iniciar Express + Prisma en el mismo proceso ──────────────────────────────
async function startExpress() {
  const uploadsBase = path.join(app.getPath('userData'), 'uploads');
  const dbPath      = path.join(app.getPath('userData'), 'meqanox.db');
  fs.mkdirSync(path.join(uploadsBase, 'perfiles'), { recursive: true });

  const chromePath = findChromePath();

  process.env.PORT         = '3000';
  // TOKEN_SECRET dinámico — basado en hardware del equipo
  // Así aunque alguien extraiga el .exe, no puede calcular el secret
  // porque depende del hostname y CPU de la máquina específica
  const { createHash } = require('crypto');
  const machineFingerprint = require('os').hostname() +
    (require('os').cpus()[0]?.model || 'cpu') +
    'meqanox-jwt-secret-v1';
  process.env.TOKEN_SECRET = createHash('sha512')
    .update(machineFingerprint)
    .digest('hex');
  process.env.NODE_ENV     = 'production';
  process.env.ELECTRON_APP = 'true';
  process.env.UPLOADS_BASE = uploadsBase;
  process.env.DATABASE_URL = `file:${dbPath}`;

  // Ruta del query engine de Prisma
  const prismaEngineDir = path.join(appRoot, 'node_modules', '.prisma', 'client');
  if (fs.existsSync(prismaEngineDir)) {
    const engineFile = fs.readdirSync(prismaEngineDir)
      .find(f => f.includes('query_engine-windows') && f.endsWith('.dll.node'));
    if (engineFile) {
      process.env.PRISMA_QUERY_ENGINE_LIBRARY = path.join(prismaEngineDir, engineFile);
      console.log('[prisma]   Engine:', engineFile);
    }
  }

  if (chromePath) {
    process.env.PUPPETEER_EXECUTABLE_PATH = chromePath;
    console.log('[chrome]   Usando:', chromePath);
  } else {
    console.warn('[chrome]   No se encontró Chrome empaquetado.');
  }

  loadUserConfig();

  const serverPath = path.join(appRoot, 'src', 'index.js');
  if (!fs.existsSync(serverPath)) {
    throw new Error('No se encontró src/index.js en: ' + serverPath);
  }
  console.log('[express]  Cargando:', serverPath);
  console.log('[db]       SQLite en:', dbPath);
  await import(pathToFileURL(serverPath).href);
}

// ── Sondear puerto hasta que Express esté listo ───────────────────────────────
function waitForPort(port, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const attempt = () => {
      const sock = net.createConnection({ port, host: '127.0.0.1' });
      sock.on('connect', () => { sock.destroy(); resolve(); });
      sock.on('error',   () => {
        sock.destroy();
        if (Date.now() > deadline) reject(new Error(`Timeout esperando puerto ${port}`));
        else setTimeout(attempt, 600);
      });
    };
    attempt();
  });
}

// ── Crear ventana principal ───────────────────────────────────────────────────
function createWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width:     1400,
    height:    900,
    minWidth:  1024,
    minHeight: 600,
    title:     'MeQanoX',
    icon: path.join(appRoot, 'electron', 'icon.ico'),
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
  });

  mainWindow.loadFile(path.join(appRoot, 'taller', 'dist', 'index.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow.setTitle('MeQanoX');
    mainWindow.show();
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── IPC: guardar PDF con diálogo nativo ──────────────────────────────────────
ipcMain.handle('save-pdf', async (event, buffer, filename) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title:       'Guardar orden PDF',
    defaultPath: path.join(app.getPath('documents'), filename),
    filters:     [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (canceled || !filePath) return { saved: false };
  try {
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return { saved: true, filePath };
  } catch (err) {
    return { saved: false, error: err.message };
  }
});

// ── IPC: guardar PDF directo en ruta especificada ────────────────────────────
ipcMain.handle('save-pdf-direct', async (event, buffer, filePath) => {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return { saved: true, filePath };
  } catch (err) {
    return { saved: false, error: err.message };
  }
});

// ── IPC: guardar cualquier archivo en carpeta + nombre ────────────────────────
// Usado por SettingsPage para guardar backups directamente en la carpeta configurada
ipcMain.handle('save-file', async (event, buffer, folder, filename) => {
  try {
    fs.mkdirSync(folder, { recursive: true });
    const filePath = path.join(folder, filename);
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return { saved: true, filePath };
  } catch (err) {
    return { saved: false, error: err.message };
  }
});

// ── IPC: seleccionar carpeta ──────────────────────────────────────────────────
ipcMain.handle('select-folder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title:      'Seleccionar carpeta',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (canceled || !filePaths.length) return null;
  return filePaths[0];
});

// ── Arranque ──────────────────────────────────────────────────────────────────
app.setName('MeQanoX');
if (process.platform === 'win32') app.setAppUserModelId('cl.qodeya.meqanox');

app.whenReady().then(async () => {
  try {
    await startExpress();

    console.log('[app] Esperando Express en puerto 3000...');
    await waitForPort(3000, 20000);

    console.log('[app] Listo. Abriendo ventana...');
    createWindow();
  } catch (err) {
    console.error('[app] Error en arranque:', err.message);
    if (!mainWindow) createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

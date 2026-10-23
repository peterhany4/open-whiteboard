import { spawn, execSync } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';

// 1. Compile electron TypeScript main & preload first
console.log('[Electron Dev] Compiling Electron main and preload scripts...');
execSync('npx tsc -p tsconfig.electron.json', { stdio: 'inherit' });

// 2. Function to check if Vite server is responding
function checkServer(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 304);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function start() {
  const devUrl = 'http://localhost:5173';
  let viteProcess = null;

  const isAlreadyRunning = await checkServer(devUrl);
  if (isAlreadyRunning) {
    console.log('[Electron Dev] Detected existing Vite dev server at', devUrl);
  } else {
    console.log('[Electron Dev] Starting Vite dev server...');
    viteProcess = spawn('npx', ['vite'], {
      shell: true,
      stdio: 'pipe',
    });

    viteProcess.stdout.on('data', (data) => {
      process.stdout.write(`[Vite] ${data}`);
    });
    viteProcess.stderr.on('data', (data) => {
      process.stderr.write(`[Vite Error] ${data}`);
    });

    // Wait for server to become ready
    console.log('[Electron Dev] Waiting for Vite server to become ready...');
    let ready = false;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 400));
      if (await checkServer(devUrl)) {
        ready = true;
        break;
      }
    }
    if (!ready) {
      console.error('[Electron Dev] Timed out waiting for Vite dev server.');
      if (viteProcess) viteProcess.kill();
      process.exit(1);
    }
  }

  console.log('[Electron Dev] Launching Electron Desktop Window...');
  const electronProcess = spawn('npx', ['electron', '.'], {
    shell: true,
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: devUrl,
    },
  });

  electronProcess.on('close', (code) => {
    console.log(`[Electron Dev] Electron window closed (exit code ${code}).`);
    if (viteProcess) {
      viteProcess.kill();
    }
    process.exit(code || 0);
  });
}

start().catch((err) => {
  console.error('[Electron Dev] Error starting electron dev:', err);
  process.exit(1);
});

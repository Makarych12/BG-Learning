import type { Plugin } from 'vite';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
/** Starts the prepared local model and reuses an already running backend. */
export function localTts(): Plugin {
  let child: ChildProcess | undefined;
  const start = async () => {
    try { if ((await fetch('http://127.0.0.1:8791/api/tts/health', { signal: AbortSignal.timeout(700) })).ok) return; } catch { /* Start the local backend. */ }
    const python = process.env.CHAMELEON_TTS_PYTHON || '.venv/bin/python';
    if (!existsSync(python) || !existsSync('data/voices/bg_BG-dimitar-medium.onnx')) return;
    child = spawn(python, ['scripts/tts-server.py'], { stdio: ['ignore', 'inherit', 'inherit'] });
    child.on('error', () => {});
  };
  return { name: 'chameleon-local-bulgarian-tts', async configureServer(server) { await start(); server.httpServer?.once('close', () => child?.kill()); }, async configurePreviewServer(server) { await start(); server.httpServer?.once('close', () => child?.kill()); }, closeBundle() { child?.kill(); } };
}

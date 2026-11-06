/**
 * Open Whiteboard — Milestone 38 Verification Suite
 *
 * Verifies:
 * 1. Web browser Alt+X Eraser Tool activation ONLY (NO single-key E, NO Alt+E)
 * 2. International layout and AltGr (Right-Alt) support for shortcuts
 * 3. Browser menu bar focus prevention (bare Alt key interception on keydown & keyup)
 * 4. Alt+W Pen Tool activation
 * 5. Universal Canvas Object Copy/Paste (Ctrl+C & Ctrl+V) with in-memory fallback
 * 6. Progressive spatial translation (+24px, +48px cascading offsets)
 * 7. Fresh unique entity IDs and Undo/Redo integration
 * 8. Strict Whitelist Enforcement (Cut Ctrl+X, Lock Ctrl+L, Layer order Ctrl+[/] removed)
 */

import { build } from 'vite';
import path from 'node:path';

async function main() {
  console.log('Bundling test with Vite...');
  await build({
    build: {
      lib: {
        entry: path.resolve('scratch/verify_shortcuts_m38.ts'),
        formats: ['es'],
        fileName: 'bundle_verify',
      },
      outDir: path.resolve('scratch/dist_verify'),
      emptyOutDir: true,
      rollupOptions: {
        external: ['node:assert', 'assert', 'node:fs', 'fs', 'node:path', 'path'],
      },
    },
    logLevel: 'warn',
  });

  console.log('Running verified test suite...');
  const { runAllTests } = await import('./dist_verify/bundle_verify.js');
  await runAllTests();
}

main().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

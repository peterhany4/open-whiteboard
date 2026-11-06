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

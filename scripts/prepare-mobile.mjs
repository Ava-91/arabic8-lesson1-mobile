import { cp, mkdir, rm } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const output = new URL('../www/', import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const item of ['index.html', '404.html', 'manifest.webmanifest', 'sw.js']) {
  await cp(new URL(item, root), new URL(item, output));
}
for (const item of ['css', 'js', 'assets', 'icons']) {
  await cp(new URL(item, root), new URL(item, output), { recursive: true });
}
console.log('Prepared local website assets for Capacitor in ./www');

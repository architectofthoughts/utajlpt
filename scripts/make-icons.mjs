#!/usr/bin/env node
// Placeholder icon generator. The design Claude will likely replace these
// with real artwork. Produces 192/512/512-maskable PNG-ish SVGs renamed as
// PNG so the manifest doesn't fail validation. Replace with real PNGs later.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(dirname(__dirname), 'public');

function svg(size, padding = 0.12) {
  const pad = Math.round(size * padding);
  const inner = size - pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="#0f172a"/>
  <text x="${size / 2}" y="${pad + inner * 0.78}" text-anchor="middle"
        font-family="'Noto Sans JP','Hiragino Sans',sans-serif"
        font-size="${Math.round(inner * 0.78)}" font-weight="700" fill="#f8fafc">頂</text>
</svg>`;
}

await writeFile(join(PUBLIC, 'icon-192.png'), svg(192));
await writeFile(join(PUBLIC, 'icon-512.png'), svg(512));
await writeFile(join(PUBLIC, 'icon-512-maskable.png'), svg(512, 0.2));
console.log('wrote placeholder icons (svg-as-png) to public/');

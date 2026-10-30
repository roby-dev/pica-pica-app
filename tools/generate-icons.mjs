// Draws the app icons (PNG, no dependencies) so they are reproducible: `node tools/generate-icons.mjs`.
// The artwork mirrors the app: violet-to-coral glow on near-black, a lime coin and two small ants.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const BASE = [23, 21, 31];
const VIOLET = [122, 99, 184];
const CORAL = [217, 135, 111];
const LIME = [230, 247, 130];
const INK = [28, 26, 40];

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const glow = (x, y, cx, cy, radius) => Math.max(0, 1 - Math.hypot(x - cx, y - cy) / radius) ** 1.6;

/** Colour of the artwork at (x, y) in 0..1 space. Everything stays inside the maskable safe zone. */
function sample(x, y) {
  let color = BASE;
  color = mix(color, VIOLET, glow(x, y, 0.35, 0.0, 0.95) * 0.9);
  color = mix(color, CORAL, glow(x, y, 1.0, 0.05, 0.7) * 0.85);

  const inCircle = (cx, cy, r) => Math.hypot(x - cx, y - cy) <= r;
  if (inCircle(0.46, 0.5, 0.21)) {
    color = LIME;
    if (inCircle(0.46, 0.5, 0.075)) color = INK; // the coin's hole: reads as a "p" counter at small sizes
  }
  if (inCircle(0.76, 0.73, 0.05)) color = LIME;
  if (inCircle(0.83, 0.62, 0.033)) color = LIME;
  return color;
}

function render(size) {
  const samples = 3; // 3x3 supersampling for smooth edges
  const pixels = Buffer.alloc(size * size * 3);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const sum = [0, 0, 0];
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const c = sample((px + (sx + 0.5) / samples) / size, (py + (sy + 0.5) / samples) / size);
          sum[0] += c[0];
          sum[1] += c[1];
          sum[2] += c[2];
        }
      }
      const o = (py * size + px) * 3;
      for (let i = 0; i < 3; i++) pixels[o + i] = Math.round(sum[i] / (samples * samples));
    }
  }
  return pixels;
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
}

/** 8-bit RGB with no alpha: iOS fills transparent icons with black, so the icons are fully opaque. */
function png(size) {
  const raw = render(size);
  const rows = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    rows[y * (size * 3 + 1)] = 0; // filter: none
    raw.copy(rows, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** A .ico can embed a PNG directly. */
function ico(size) {
  const image = png(size);
  const dir = Buffer.alloc(22);
  dir.writeUInt16LE(1, 2); // type: icon
  dir.writeUInt16LE(1, 4); // one image
  dir[6] = size;
  dir[7] = size;
  dir.writeUInt16LE(1, 10); // planes
  dir.writeUInt16LE(24, 12); // bits per pixel
  dir.writeUInt32LE(image.length, 14);
  dir.writeUInt32LE(22, 18);
  return Buffer.concat([dir, image]);
}

mkdirSync(join(OUT, 'icons'), { recursive: true });
const files = {
  'icons/icon-192.png': png(192),
  'icons/icon-512.png': png(512),
  'icons/icon-maskable-512.png': png(512),
  'icons/apple-touch-icon.png': png(180),
  'favicon.ico': ico(48),
};
for (const [name, data] of Object.entries(files)) {
  writeFileSync(join(OUT, name), data);
  console.log(`${name}  ${data.length} bytes`);
}

// Génère les icônes PNG de la PWA sans aucune dépendance (Node.js seul : zlib intégré).
// Usage : npm run icons
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

// --- Encodage PNG minimal -------------------------------------------------
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 8 bits par canal
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filtre « none »
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Dessin ---------------------------------------------------------------
// Avion vu de dessus (nez vers le haut), coordonnées dans [-1, 1].
const half = [
  [0, -0.62], [0.05, -0.57], [0.07, -0.48], [0.07, -0.12], [0.56, 0.12], [0.56, 0.22], [0.07, 0.08],
  [0.07, 0.38], [0.22, 0.5], [0.22, 0.57], [0.04, 0.52], [0, 0.56],
];
const PLANE = [...half, ...half.slice(1, -1).reverse().map(([x, y]) => [-x, y])].map(([x, y]) => [x * 0.92, y * 0.92 + 0.02]);

function inPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const TOP = [30, 58, 138]; // #1e3a8a
const BOTTOM = [29, 78, 216]; // #1d4ed8
const AMBER = [251, 191, 36]; // #fbbf24
const WHITE = [255, 255, 255];

/**
 * @param {number} size taille en pixels
 * @param {{ rounded: boolean, scale: number }} opts rounded : coins arrondis transparents ; scale : réduction du motif (zone sûre maskable)
 */
function drawIcon(size, { rounded, scale }) {
  const out = Buffer.alloc(size * size * 4);
  const SS = 4; // suréchantillonnage 4×4 pour l'anticrénelage
  const radius = 0.44; // rayon des coins arrondis, en fraction de la demi-taille
  const ringIn = 0.7 * scale;
  const ringOut = 0.8 * scale;
  const arcEnd = 0.72 * 2 * Math.PI; // 72 % de progression
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = ((px + (sx + 0.5) / SS) / size) * 2 - 1;
          const y = ((py + (sy + 0.5) / SS) / size) * 2 - 1;
          if (rounded) {
            const cx = Math.max(Math.abs(x) - (1 - radius), 0);
            const cy = Math.max(Math.abs(y) - (1 - radius), 0);
            if (cx * cx + cy * cy > radius * radius) continue;
          }
          const t = (y + 1) / 2;
          let col = TOP.map((c, i) => c + (BOTTOM[i] - c) * t);
          const d = Math.hypot(x, y);
          if (d >= ringIn && d <= ringOut) {
            let angle = Math.atan2(x, -y); // 0 en haut, sens horaire
            if (angle < 0) angle += 2 * Math.PI;
            col = angle <= arcEnd ? AMBER : col.map((c) => c + (255 - c) * 0.22);
          }
          if (inPolygon(x / scale, y / scale, PLANE)) col = WHITE;
          r += col[0];
          g += col[1];
          b += col[2];
          a += 255;
        }
      }
      const n = SS * SS;
      const o = (py * size + px) * 4;
      const cover = a / 255;
      out[o] = cover ? Math.round(r / cover) : 0;
      out[o + 1] = cover ? Math.round(g / cover) : 0;
      out[o + 2] = cover ? Math.round(b / cover) : 0;
      out[o + 3] = Math.round(a / n);
    }
  }
  return encodePng(size, out);
}

const targets = [
  ['icons/icon-192.png', 192, { rounded: true, scale: 1 }],
  ['icons/icon-512.png', 512, { rounded: true, scale: 1 }],
  ['icons/icon-maskable-512.png', 512, { rounded: false, scale: 0.78 }],
  // iOS applique son propre masque : icône carrée et opaque.
  ['apple-touch-icon.png', 180, { rounded: false, scale: 0.92 }],
];

for (const [file, size, opts] of targets) {
  const path = join(root, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, drawIcon(size, opts));
  console.log(`✓ ${file} (${size}×${size})`);
}

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 calculation for PNG chunks
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  typeBuf.copy(chunk, 4);
  data.copy(chunk, 8);
  const toCrc = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(toCrc);
  chunk.writeUInt32BE(crcVal, 8 + len);
  return chunk;
}

function encodePNG(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0; // compression method
  ihdrData[11] = 0; // filter method
  ihdrData[12] = 0; // interlace method
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Scanlines with filter byte 0
  const scanlineLength = width * 4;
  const rawData = Buffer.alloc(height * (1 + scanlineLength));
  let srcOffset = 0;
  let dstOffset = 0;
  for (let y = 0; y < height; y++) {
    rawData[dstOffset++] = 0; // Filter None
    rgbaBuffer.copy(rawData, dstOffset, srcOffset, srcOffset + scanlineLength);
    dstOffset += scanlineLength;
    srcOffset += scanlineLength;
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function distToRoundedBox(px, py, bx, by, bw, bh, r) {
  const cx = bx + bw / 2;
  const cy = by + bh / 2;
  const qx = Math.abs(px - cx) - (bw / 2 - r);
  const qy = Math.abs(py - cy) - (bh / 2 - r);
  const mx = Math.max(qx, 0);
  const my = Math.max(qy, 0);
  const distOutside = Math.hypot(mx, my);
  const distInside = Math.min(Math.max(qx, qy), 0);
  return distOutside + distInside - r;
}

// Drawing helper
function drawIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.44; // squircle radius
  const n = 4.0; // superellipse power
  const scale = 512 / size;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Distance from center normalized
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);
      const dist = Math.pow(Math.pow(dx / r, n) + Math.pow(dy / r, n), 1 / n);

      if (dist <= 1.0) {
        // Inside squircle
        const t = (x + y) / (2 * size);
        let bgR = Math.round(15 * (1 - t) + 2 * t);
        let bgG = Math.round(23 * (1 - t) + 6 * t);
        let bgB = Math.round(42 * (1 - t) + 23 * t);

        // Center ambient backlight
        const dCenter = Math.hypot(x - cx, y - cy) / (size * 0.5);
        if (dCenter < 1.0) {
          const glow = Math.pow(1 - dCenter, 2) * 0.25;
          bgR += Math.round(99 * glow);
          bgG += Math.round(102 * glow);
          bgB += Math.round(241 * glow);
        }

        // Border stroke (near dist = 0.94..1.0)
        if (dist > 0.94) {
          const edgeT = (dist - 0.94) / 0.06;
          const bR = Math.round(56 * (1 - t) + 30 * t);
          const bG = Math.round(189 * (1 - t) + 41 * t);
          const bB = Math.round(248 * (1 - t) + 59 * t);
          bgR = Math.round(bgR * (1 - edgeT) + bR * edgeT);
          bgG = Math.round(bgG * (1 - edgeT) + bG * edgeT);
          bgB = Math.round(bgB * (1 - edgeT) + bB * edgeT);
        }

        // Anti-aliasing at the squircle outer edge
        let alpha = 255;
        if (dist > 0.98) {
          alpha = Math.round(255 * (1 - (dist - 0.98) / 0.02));
        }

        // Render pure minimalist "IT" typography
        const px = x * scale;
        const py = y * scale;

        // Letter "I"
        const dI = distToRoundedBox(px, py, 119, 144, 58, 224, 16);

        // Letter "T" (crossbar + stem union)
        const dTCross = distToRoundedBox(px, py, 217, 144, 176, 54, 16);
        const dTStem = distToRoundedBox(px, py, 276, 144, 58, 224, 16);
        const dT = Math.min(dTCross, dTStem);

        const dText = Math.min(dI, dT);

        // Subpixel anti-aliasing for letters
        const letterAlpha = Math.max(0, Math.min(1, 0.5 - dText / scale));

        // Subtle drop shadow behind letters
        const dShadowI = distToRoundedBox(px, py - 6, 119, 144, 58, 224, 16);
        const dShadowT = Math.min(
          distToRoundedBox(px, py - 6, 217, 144, 176, 54, 16),
          distToRoundedBox(px, py - 6, 276, 144, 58, 224, 16)
        );
        const dShadow = Math.min(dShadowI, dShadowT);
        const shadowAlpha = Math.max(0, Math.min(0.4, (0.5 - dShadow / (scale * 2.5)) * 0.4));

        // Apply shadow
        if (shadowAlpha > 0 && letterAlpha < 1) {
          bgR = Math.round(bgR * (1 - shadowAlpha));
          bgG = Math.round(bgG * (1 - shadowAlpha));
          bgB = Math.round(bgB * (1 - shadowAlpha));
        }

        // Apply letter color (crisp bright white)
        if (letterAlpha > 0) {
          const textR = 255;
          const textG = 255;
          const textB = 255;

          bgR = Math.round(bgR * (1 - letterAlpha) + textR * letterAlpha);
          bgG = Math.round(bgG * (1 - letterAlpha) + textG * letterAlpha);
          bgB = Math.round(bgB * (1 - letterAlpha) + textB * letterAlpha);
        }

        buf[idx] = Math.min(255, bgR);
        buf[idx + 1] = Math.min(255, bgG);
        buf[idx + 2] = Math.min(255, bgB);
        buf[idx + 3] = alpha;
      } else {
        // Transparent outside
        buf[idx] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 0;
        buf[idx + 3] = 0;
      }
    }
  }

  return buf;
}

// Generate icons
const sizes = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 }
];

sizes.forEach(({ name, size }) => {
  console.log(`Generating ${name} (${size}x${size})...`);
  const rgba = drawIcon(size);
  const png = encodePNG(size, size, rgba);
  const outPath = path.join(__dirname, '..', 'public', name);
  fs.writeFileSync(outPath, png);
  console.log(`✓ Saved ${outPath}`);
});

console.log('All icons generated successfully!');

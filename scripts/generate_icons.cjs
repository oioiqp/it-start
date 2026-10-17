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

// Drawing helper
function drawIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.44; // squircle radius

  // Squircle curvature
  const n = 4.0; // superellipse power

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Distance from center normalized
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);
      const dist = Math.pow(Math.pow(dx / r, n) + Math.pow(dy / r, n), 1 / n);

      if (dist <= 1.0) {
        // Inside squircle
        // Gradient background from top-left to bottom-right: #0f172a to #030712
        const t = (x + y) / (2 * size);
        let bgR = Math.round(15 * (1 - t) + 3 * t);
        let bgG = Math.round(23 * (1 - t) + 7 * t);
        let bgB = Math.round(42 * (1 - t) + 18 * t);

        // Center ambient glow
        const dCenter = Math.hypot(x - cx, y - cy) / (size * 0.5);
        if (dCenter < 1.0) {
          const glow = Math.pow(1 - dCenter, 2) * 0.28;
          bgR += Math.round(99 * glow);
          bgG += Math.round(102 * glow);
          bgB += Math.round(241 * glow);
        }

        // Border glow (near dist = 1.0)
        if (dist > 0.94) {
          const edgeT = (dist - 0.94) / 0.06;
          // Gradient border: Indigo to Cyan
          const bR = Math.round(129 * (1 - t) + 56 * t);
          const bG = Math.round(140 * (1 - t) + 189 * t);
          const bB = Math.round(248 * (1 - t) + 248 * t);
          bgR = Math.round(bgR * (1 - edgeT) + bR * edgeT);
          bgG = Math.round(bgG * (1 - edgeT) + bG * edgeT);
          bgB = Math.round(bgB * (1 - edgeT) + bB * edgeT);
        }

        // Anti-aliasing at the very outer edge
        let alpha = 255;
        if (dist > 0.98) {
          alpha = Math.round(255 * (1 - (dist - 0.98) / 0.02));
        }

        // Render "IT" + Launch Arrow symbol
        // Coordinate system scaled to 0..1
        const nx = x / size;
        const ny = y / size;

        // Symbol 1: Bold "I" Bar
        const inIBar = nx >= 0.26 && nx <= 0.35 && ny >= 0.32 && ny <= 0.70;
        // Dot above I
        const inIDot = Math.hypot(nx - 0.305, ny - 0.23) <= 0.045;

        // Symbol 2: "T" Top Bar
        const inTTop = nx >= 0.42 && nx <= 0.74 && ny >= 0.32 && ny <= 0.41;

        // Symbol 3: Dynamic Launch Arrow (Rocket Chevron)
        // Vector pointing up-right from (0.47, 0.68) to (0.74, 0.41)
        // Stem of T
        const inTStem = nx >= 0.535 && nx <= 0.625 && ny >= 0.41 && ny <= 0.70;

        // Upward diagonal rocket thrust / arrow head
        const arrowX = nx - 0.58;
        const arrowY = ny - 0.45;
        const dDiag = arrowX - arrowY;
        const inArrowHead = nx >= 0.50 && nx <= 0.78 && ny >= 0.22 && ny <= 0.50 && Math.abs(dDiag) <= 0.09;

        // Star / Spark at (0.80, 0.20)
        const sparkDx = Math.abs(nx - 0.78);
        const sparkDy = Math.abs(ny - 0.22);
        const inSpark = Math.hypot(sparkDx, sparkDy) < 0.05 && (sparkDx < 0.015 || sparkDy < 0.015);

        if (inIBar || inTTop) {
          // Crisp clean white for base letters
          bgR = 255;
          bgG = 255;
          bgB = 255;
        } else if (inIDot || inSpark) {
          // Vibrant Cyan / Emerald
          bgR = 56;
          bgG = 189;
          bgB = 248;
        } else if (inTStem || inArrowHead) {
          // Electric Indigo to Cyan gradient
          const gradT = (nx - 0.4) / 0.4;
          bgR = Math.round(99 * (1 - gradT) + 56 * gradT);
          bgG = Math.round(102 * (1 - gradT) + 189 * gradT);
          bgB = Math.round(241 * (1 - gradT) + 248 * gradT);
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

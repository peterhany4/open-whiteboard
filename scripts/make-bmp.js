import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

async function pngToBmp(pngPath, bmpPath, targetWidth, targetHeight) {
  // Resize and extract raw RGB (3 channels, no alpha)
  const { data, info } = await sharp(pngPath)
    .resize(targetWidth, targetHeight, { fit: 'cover' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const rowPadding = (4 - ((width * 3) % 4)) % 4;
  const rowSize = width * 3 + rowPadding;
  const pixelDataSize = rowSize * height;
  const fileSize = 54 + pixelDataSize;

  const buf = Buffer.alloc(fileSize);

  // BMP File Header (14 bytes)
  buf.write('BM', 0); // 0-1
  buf.writeUInt32LE(fileSize, 2); // 2-5
  buf.writeUInt32LE(0, 6); // 6-9
  buf.writeUInt32LE(54, 10); // 10-13 offset

  // DIB Header (40 bytes, BITMAPINFOHEADER)
  buf.writeUInt32LE(40, 14); // 14-17 header size
  buf.writeInt32LE(width, 18); // 18-21 width
  buf.writeInt32LE(height, 22); // 22-25 height (positive = bottom-to-top)
  buf.writeUInt16LE(1, 26); // 26-27 planes
  buf.writeUInt16LE(24, 28); // 28-29 bits per pixel
  buf.writeUInt32LE(0, 30); // 30-33 compression (BI_RGB = 0)
  buf.writeUInt32LE(pixelDataSize, 34); // 34-37 image size
  buf.writeInt32LE(2835, 38); // 38-41 h-res
  buf.writeInt32LE(2835, 42); // 42-45 v-res
  buf.writeUInt32LE(0, 46); // 46-49 colors
  buf.writeUInt32LE(0, 50); // 50-53 important colors

  // Pixel data (bottom-to-top, BGR)
  let offset = 54;
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 3;
      const r = data[srcIdx];
      const g = data[srcIdx + 1];
      const b = data[srcIdx + 2];

      buf[offset++] = b;
      buf[offset++] = g;
      buf[offset++] = r;
    }
    for (let p = 0; p < rowPadding; p++) {
      buf[offset++] = 0;
    }
  }

  fs.writeFileSync(bmpPath, buf);
  console.log(`Generated BMP: ${bmpPath} (${width}x${height}, ${fileSize} bytes)`);
}

async function run() {
  await pngToBmp('build/installerHeader.png', 'build/installerHeader.bmp', 150, 57);
  await pngToBmp('build/installerSidebar.png', 'build/installerSidebar.bmp', 164, 314);
  await pngToBmp('build/installerSidebar.png', 'build/uninstallerSidebar.bmp', 164, 314);
}

run().catch(console.error);

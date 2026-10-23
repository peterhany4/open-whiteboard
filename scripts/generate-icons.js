import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ICON_SOURCE = 'C:/Users/peake/.gemini/antigravity-ide/brain/745ff8e4-f6f8-45fc-8b7c-75b4711d7875/whiteboard_app_icon_1792770074270.jpg';
const BANNER_SOURCE = 'C:/Users/peake/.gemini/antigravity-ide/brain/745ff8e4-f6f8-45fc-8b7c-75b4711d7875/installer_banner_1792770091409.jpg';

const BUILD_DIR = path.resolve('build');
if (!fs.existsSync(BUILD_DIR)) {
  fs.mkdirSync(BUILD_DIR, { recursive: true });
}

// Function to construct Windows ICO buffer from PNG buffers
function createIcoFromPngs(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const headerAndDirSize = headerSize + dirEntrySize * count;

  let currentOffset = headerAndDirSize;
  const entries = [];

  for (const { buffer, size } of pngBuffers) {
    entries.push({
      width: size === 256 ? 0 : size,
      height: size === 256 ? 0 : size,
      size: buffer.length,
      offset: currentOffset,
      buffer,
    });
    currentOffset += buffer.length;
  }

  const outBuffer = Buffer.alloc(currentOffset);

  // Write ICO Header
  outBuffer.writeUInt16LE(0, 0); // Reserved
  outBuffer.writeUInt16LE(1, 2); // Type 1 = ICO
  outBuffer.writeUInt16LE(count, 4); // Number of images

  // Write Directory Entries
  let entryOffset = 6;
  for (const entry of entries) {
    outBuffer.writeUInt8(entry.width, entryOffset); // Width
    outBuffer.writeUInt8(entry.height, entryOffset + 1); // Height
    outBuffer.writeUInt8(0, entryOffset + 2); // Color count
    outBuffer.writeUInt8(0, entryOffset + 3); // Reserved
    outBuffer.writeUInt16LE(1, entryOffset + 4); // Color planes
    outBuffer.writeUInt16LE(32, entryOffset + 6); // Bits per pixel
    outBuffer.writeUInt32LE(entry.size, entryOffset + 8); // Image size in bytes
    outBuffer.writeUInt32LE(entry.offset, entryOffset + 12); // Offset in file
    entryOffset += 16;
  }

  // Write PNG buffers
  for (const entry of entries) {
    entry.buffer.copy(outBuffer, entry.offset);
  }

  return outBuffer;
}

async function run() {
  console.log('Generating high-resolution app icon and installer branding assets...');

  // 1. Generate master PNG (512x512 and 256x256)
  const masterPng = await sharp(ICON_SOURCE)
    .resize(512, 512, { fit: 'cover' })
    .png({ quality: 100 })
    .toBuffer();

  fs.writeFileSync(path.join(BUILD_DIR, 'icon.png'), masterPng);
  console.log('Saved build/icon.png (512x512)');

  // 2. Generate multi-resolution PNG buffers for ICO
  const sizes = [256, 128, 64, 48, 32, 24, 16];
  const pngBuffers = [];

  for (const size of sizes) {
    const buf = await sharp(ICON_SOURCE)
      .resize(size, size, { fit: 'cover' })
      .png({ quality: 100 })
      .toBuffer();
    pngBuffers.push({ size, buffer: buf });
  }

  // 3. Write build/icon.ico
  const icoBuffer = createIcoFromPngs(pngBuffers);
  fs.writeFileSync(path.join(BUILD_DIR, 'icon.ico'), icoBuffer);
  console.log('Saved build/icon.ico (contains 16, 24, 32, 48, 64, 128, 256 px resolutions)');

  // 4. Generate NSIS Installer Graphics
  // Installer Header: 150x57 bmp/png
  await sharp(BANNER_SOURCE)
    .resize(150, 57, { fit: 'cover', position: 'right' })
    .png()
    .toFile(path.join(BUILD_DIR, 'installerHeader.png'));
  console.log('Saved build/installerHeader.png');

  // Installer Welcome / Finish Sidebar: 164x314 bmp/png
  await sharp(BANNER_SOURCE)
    .resize(164, 314, { fit: 'cover', position: 'center' })
    .png()
    .toFile(path.join(BUILD_DIR, 'installerSidebar.png'));
  console.log('Saved build/installerSidebar.png');

  // Also copy icon to public/favicon.ico and public/icon.png so the web version gets the gorgeous icon too!
  const publicDir = path.resolve('public');
  if (fs.existsSync(publicDir)) {
    fs.copyFileSync(path.join(BUILD_DIR, 'icon.png'), path.join(publicDir, 'icon.png'));
    fs.copyFileSync(path.join(BUILD_DIR, 'icon.ico'), path.join(publicDir, 'favicon.ico'));
    console.log('Synced icon assets to public/ directory for browser favicons.');
  }

  console.log('--- All icon and branding assets successfully generated! ---');
}

run().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});

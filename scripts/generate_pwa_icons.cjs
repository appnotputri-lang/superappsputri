const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

// Colors
const BG_COLOR = { r: 15, g: 23, b: 42, a: 255 };      // #0f172a (Slate 900)
const ACCENT_COLOR = { r: 20, g: 184, b: 166, a: 255 }; // #14b8a6 (Teal 500)
const GOLD_COLOR = { r: 217, g: 119, b: 6, a: 255 };    // #d97706 (Amber 600)
const WHITE_COLOR = { r: 255, g: 255, b: 255, a: 255 }; // #ffffff

function createIcon(width, height, isMaskable = false) {
  const png = new PNG({ width, height });

  // Safe radius factor for maskable vs standard
  // Standard has padding, maskable has ~10-15% safe margin
  const marginFactor = isMaskable ? 0.22 : 0.12;
  const centerX = width / 2;
  const centerY = height / 2;
  const size = Math.min(width, height);
  const outerRadius = (size / 2) * (1 - marginFactor);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;

      // Default background: #0f172a
      let r = BG_COLOR.r;
      let g = BG_COLOR.g;
      let b = BG_COLOR.b;
      let a = BG_COLOR.a;

      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Rounded container / circle badge inside background
      if (dist <= outerRadius) {
        // Inner badge background - slightly elevated dark slate #1e293b
        r = 30;
        g = 41;
        b = 59;

        // Outer golden / teal ring border (thickness 4% of size)
        const borderThick = size * 0.035;
        if (dist >= outerRadius - borderThick) {
          // Gradient ring from Gold to Teal
          const angle = Math.atan2(dy, dx);
          const t = (Math.sin(angle) + 1) / 2;
          r = Math.round(GOLD_COLOR.r * (1 - t) + ACCENT_COLOR.r * t);
          g = Math.round(GOLD_COLOR.g * (1 - t) + ACCENT_COLOR.g * t);
          b = Math.round(GOLD_COLOR.b * (1 - t) + ACCENT_COLOR.b * t);
        }
      }

      // Draw "S P" text in center using crisp coordinate geometry
      // Normalizing x,y relative to center (-1 to +1 scale relative to icon content area)
      const contentScale = outerRadius * 0.65;
      const nx = dx / contentScale; // -1 to +1
      const ny = dy / contentScale; // -1 to +1

      let isTextPixel = false;

      // Letter "S" (left side, nx from -0.7 to -0.1)
      const sx = nx + 0.4; // centered around sx = 0
      const sy = ny;
      if (sx >= -0.32 && sx <= 0.32 && sy >= -0.55 && sy <= 0.55) {
        const thickness = 0.14;
        // Top bar
        if (sy >= -0.55 && sy <= -0.55 + thickness && sx >= -0.32 && sx <= 0.32) isTextPixel = true;
        // Top-left vertical
        if (sy >= -0.55 && sy <= 0.0 && sx >= -0.32 && sx <= -0.32 + thickness) isTextPixel = true;
        // Middle bar
        if (sy >= -0.07 && sy <= 0.07 && sx >= -0.32 && sx <= 0.32) isTextPixel = true;
        // Bottom-right vertical
        if (sy >= 0.0 && sy <= 0.55 && sx >= 0.32 - thickness && sx <= 0.32) isTextPixel = true;
        // Bottom bar
        if (sy >= 0.55 - thickness && sy <= 0.55 && sx >= -0.32 && sx <= 0.32) isTextPixel = true;
      }

      // Letter "P" (right side, nx from +0.1 to +0.7)
      const px = nx - 0.4; // centered around px = 0
      const py = ny;
      if (px >= -0.32 && px <= 0.32 && py >= -0.55 && py <= 0.55) {
        const thickness = 0.14;
        // Left main stem
        if (px >= -0.32 && px <= -0.32 + thickness && py >= -0.55 && py <= 0.55) isTextPixel = true;
        // Top bar
        if (py >= -0.55 && py <= -0.55 + thickness && px >= -0.32 && px <= 0.32) isTextPixel = true;
        // Right vertical of P loop
        if (py >= -0.55 && py <= 0.0 && px >= 0.32 - thickness && px <= 0.32) isTextPixel = true;
        // Middle bar
        if (py >= -0.07 && py <= 0.07 && px >= -0.32 && px <= 0.32) isTextPixel = true;
      }

      if (isTextPixel) {
        r = WHITE_COLOR.r;
        g = WHITE_COLOR.g;
        b = WHITE_COLOR.b;
      }

      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = a;
    }
  }

  return png;
}

const publicDir = path.join(__dirname, '..', 'public');

// 1. 192x192
const icon192 = createIcon(192, 192, false);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), PNG.sync.write(icon192));

// 2. 512x512
const icon512 = createIcon(512, 512, false);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), PNG.sync.write(icon512));

// 3. Maskable 512x512
const iconMaskable = createIcon(512, 512, true);
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), PNG.sync.write(iconMaskable));

console.log('Successfully generated PWA icons in /public:');
console.log(' - pwa-192x192.png');
console.log(' - pwa-512x512.png');
console.log(' - pwa-maskable-512x512.png');

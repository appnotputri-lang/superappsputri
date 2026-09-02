import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Master SVG template for Standard NP Icon
function createStandardSvg(size, rxRatio = 0.22) {
  const rx = Math.round(size * rxRatio);
  const fontSize = Math.round(size * 0.47);
  // Vertical text baseline adjustment
  const fontY = Math.round(size * 0.635);
  const letterSpacing = Math.round(size * -0.03);

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e61c3" />
      <stop offset="40%" stop-color="#2475c5" />
      <stop offset="75%" stop-color="#318ebf" />
      <stop offset="100%" stop-color="#4a9fa8" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${size}" height="${size}" rx="${rx}" fill="url(#primaryGrad)" />
  <text 
    x="${size / 2}" 
    y="${fontY}" 
    text-anchor="middle" 
    font-family="'Plus Jakarta Sans', 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif" 
    font-size="${fontSize}" 
    font-weight="900" 
    letter-spacing="${letterSpacing}" 
    fill="#ffffff"
  >NP</text>
</svg>`;
}

// Master SVG template for Maskable NP Icon (Full bleed background, text safely inside 80% center circle)
function createMaskableSvg(size) {
  const fontSize = Math.round(size * 0.38);
  const fontY = Math.round(size * 0.625);
  const letterSpacing = Math.round(size * -0.03);

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="primaryGradMaskable" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e61c3" />
      <stop offset="40%" stop-color="#2475c5" />
      <stop offset="75%" stop-color="#318ebf" />
      <stop offset="100%" stop-color="#4a9fa8" />
    </linearGradient>
  </defs>
  <!-- Full bleed square background so Android adaptive mask won't show transparent/white edges -->
  <rect x="0" y="0" width="${size}" height="${size}" fill="url(#primaryGradMaskable)" />
  <text 
    x="${size / 2}" 
    y="${fontY}" 
    text-anchor="middle" 
    font-family="'Plus Jakarta Sans', 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif" 
    font-size="${fontSize}" 
    font-weight="900" 
    letter-spacing="${letterSpacing}" 
    fill="#ffffff"
  >NP</text>
</svg>`;
}

async function main() {
  const publicDir = path.resolve('public');

  console.log('Generating NP PWA icons...');

  // 1. Standard pwa-512x512.png
  const svg512 = createStandardSvg(512);
  await sharp(Buffer.from(svg512))
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('✓ Created pwa-512x512.png');

  // 2. Standard pwa-192x192.png
  const svg192 = createStandardSvg(192);
  await sharp(Buffer.from(svg192))
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('✓ Created pwa-192x192.png');

  // 3. Maskable pwa-maskable-512x512.png
  const svgMaskable = createMaskableSvg(512);
  await sharp(Buffer.from(svgMaskable))
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('✓ Created pwa-maskable-512x512.png');

  // 4. apple-touch-icon.png (180x180)
  const svgApple = createStandardSvg(180, 0); // Apple touch icon is auto-rounded by iOS, so full rect background
  await sharp(Buffer.from(svgApple))
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ Created apple-touch-icon.png');

  // 5. favicon.ico / favicon.svg / favicon.png
  const svgFavicon = createStandardSvg(64, 0.22);
  await sharp(Buffer.from(svgFavicon))
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));
  
  // Save favicon.svg
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgFavicon);
  console.log('✓ Created favicon.png & favicon.svg');

  console.log('All NP PWA icons generated successfully!');
}

main().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});

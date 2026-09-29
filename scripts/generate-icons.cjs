const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

// 512x512 Master Vector SVG matching the user's uploaded Kiddies logo
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient: Electric Royal Blue -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284fe"/>
      <stop offset="50%" stop-color="#0072f5"/>
      <stop offset="100%" stop-color="#005fe0"/>
    </linearGradient>

    <!-- Multi-stop Gradient for the Letter K -->
    <linearGradient id="stemGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#00e5ff"/>
      <stop offset="35%" stop-color="#00b4f8"/>
      <stop offset="68%" stop-color="#6436e4"/>
      <stop offset="100%" stop-color="#4d16c9"/>
    </linearGradient>

    <linearGradient id="topArmGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00bdf8"/>
      <stop offset="25%" stop-color="#38d4b0"/>
      <stop offset="55%" stop-color="#ffd500"/>
      <stop offset="85%" stop-color="#ffb700"/>
      <stop offset="100%" stop-color="#ffa000"/>
    </linearGradient>

    <linearGradient id="bottomArmGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e83870"/>
      <stop offset="45%" stop-color="#ff0f7b"/>
      <stop offset="80%" stop-color="#ff2692"/>
      <stop offset="100%" stop-color="#ff339c"/>
    </linearGradient>

    <radialGradient id="junctionGlow" cx="42%" cy="48%" r="40%">
      <stop offset="0%" stop-color="#ffe153" stop-opacity="0.9"/>
      <stop offset="45%" stop-color="#ff7354" stop-opacity="0.75"/>
      <stop offset="75%" stop-color="#f81585" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#8020d0" stop-opacity="0"/>
    </radialGradient>

    <!-- Soft Drop Shadow on the entire K -->
    <filter id="kShadow" x="-10%" y="-10%" width="125%" height="125%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#002d7a" flood-opacity="0.38"/>
      <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#001844" flood-opacity="0.22"/>
    </filter>
  </defs>

  <!-- Squircle Background with Smooth Rounded Corners -->
  <rect x="0" y="0" width="512" height="512" rx="114" ry="114" fill="url(#bgGrad)" />

  <!-- Subtle Top Highlight on Squircle -->
  <path d="M 114 2 C 52 2 2 52 2 114 L 2 160 C 50 140 180 120 510 160 L 510 114 C 510 52 460 2 398 2 Z" fill="#ffffff" opacity="0.08" />

  <!-- Master Group with Shadow -->
  <g filter="url(#kShadow)">
    
    <!-- 1. WHITE OUTLINE / BACKING (Thick, rounded silhouette of the letter K) -->
    <!-- Vertical Stem White Outline -->
    <rect x="94" y="62" width="122" height="388" rx="61" ry="61" fill="#ffffff" />

    <!-- Top Diagonal Arm White Outline -->
    <path d="M 186 270 L 362 94 A 48 48 0 0 1 430 162 L 254 338 Z" fill="#ffffff" stroke="#ffffff" stroke-width="28" stroke-linecap="round" stroke-linejoin="round" />

    <!-- Bottom Diagonal Arm White Outline -->
    <path d="M 198 244 L 372 418 A 48 48 0 0 1 304 486 L 130 312 Z" fill="#ffffff" stroke="#ffffff" stroke-width="28" stroke-linecap="round" stroke-linejoin="round" />

    <!-- White Junction Bridge -->
    <circle cx="218" cy="272" r="54" fill="#ffffff" />

    <!-- 2. COLORED LETTER K INNER FILLS (Set with precise margins inside the white outline) -->
    
    <!-- Vertical Stem -->
    <rect x="108" y="76" width="94" height="360" rx="47" ry="47" fill="url(#stemGrad)" />

    <!-- Top Diagonal Arm -->
    <path d="M 198 260 L 368 90 A 35 35 0 0 1 418 140 L 248 310 Z" fill="url(#topArmGrad)" stroke="url(#topArmGrad)" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" />

    <!-- Bottom Diagonal Arm -->
    <path d="M 204 250 L 366 412 A 35 35 0 0 1 316 462 L 154 300 Z" fill="url(#bottomArmGrad)" stroke="url(#bottomArmGrad)" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" />

    <!-- Central Glowing Junction Blend -->
    <circle cx="218" cy="268" r="58" fill="url(#junctionGlow)" />

    <!-- Soft Glossy Pill Highlight on Vertical Stem -->
    <path d="M 125 110 C 125 90 140 85 155 85 C 160 85 165 87 165 92 L 165 240 C 165 245 160 248 155 248 C 140 248 125 235 125 210 Z" fill="#ffffff" opacity="0.22" />

    <!-- Soft Glossy Highlight on Top Arm -->
    <path d="M 270 185 L 360 95 C 375 80 395 85 405 95 C 410 100 405 108 395 118 L 305 208 Z" fill="#ffffff" opacity="0.25" />

  </g>
</svg>`;

const publicDir = path.join(__dirname, '..', 'public');
const svgPath = path.join(publicDir, 'icon.svg');

fs.writeFileSync(svgPath, svgContent);
console.log('Saved master vector SVG to:', svgPath);

// Targets to render
const targets = [
  { name: 'icon-512.png', size: 512 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'icon.png', size: 512 },
  { name: 'icon-192.png', size: 192 },
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon.png', size: 64 },
  { name: 'favicon.ico', size: 32 }
];

targets.forEach(({ name, size }) => {
  const destPath = path.join(publicDir, name);
  try {
    const resvg = new Resvg(svgContent, {
      fitTo: {
        mode: 'width',
        value: size
      }
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();
    fs.writeFileSync(destPath, pngBuffer);
    console.log(`Successfully rendered ${name} (${size}x${size}, ${pngBuffer.length} bytes)`);
  } catch (err) {
    console.error(`Error rendering ${name}:`, err);
  }
});

// Also copy root fallbacks
try {
  fs.copyFileSync(path.join(publicDir, 'apple-touch-icon.png'), path.join(__dirname, '..', 'apple-touch-icon.png'));
  fs.copyFileSync(path.join(publicDir, 'favicon.png'), path.join(__dirname, '..', 'favicon.png'));
  fs.copyFileSync(path.join(publicDir, 'favicon.ico'), path.join(__dirname, '..', 'favicon.ico'));
  fs.copyFileSync(path.join(publicDir, 'icon.png'), path.join(__dirname, '..', 'icon.png'));
  console.log('Root fallbacks copied successfully.');
} catch (e) {
  console.warn('Could not copy root fallbacks:', e.message);
}

console.log('ALL PWA AND LOGO ICONS GENERATED SUCCESSFULLY!');

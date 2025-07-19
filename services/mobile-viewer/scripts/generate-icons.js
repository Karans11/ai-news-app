const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconDir = path.join(__dirname, '../public/icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

// Create a base icon with gradient background and robot emoji
async function generateIcon(size) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#60A5FA;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#A78BFA;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
      <text x="50%" y="50%" font-size="${size * 0.5}" text-anchor="middle" dominant-baseline="central">🤖</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(iconDir, `icon-${size}x${size}.png`));
}

// Generate all icon sizes
Promise.all(sizes.map(generateIcon))
  .then(() => console.log('Icons generated successfully!'))
  .catch(err => console.error('Error generating icons:', err));

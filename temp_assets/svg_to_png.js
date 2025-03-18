import fs from 'fs';
import sharp from 'sharp';

// Read the SVG file
const svgBuffer = fs.readFileSync('./temp_assets/logo.svg');

// Convert to PNG with a white background and save at different sizes
Promise.all([
  // 256x256 version
  sharp(svgBuffer)
    .resize(256)
    .png()
    .toFile('./temp_assets/logo_256.png'),
  
  // 512x512 version
  sharp(svgBuffer)
    .resize(512)
    .png()
    .toFile('./temp_assets/logo_512.png'),
    
  // 1024x1024 version
  sharp(svgBuffer)
    .resize(1024)
    .png()
    .toFile('./temp_assets/logo_1024.png')
])
.then(() => console.log('Conversion complete! PNG files saved in temp_assets directory.'))
.catch(err => console.error('Error converting SVG to PNG:', err)); 
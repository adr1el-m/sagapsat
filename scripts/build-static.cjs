const fs = require('node:fs');

for (const file of ['index.html', 'style.css', 'app.js', 'explorer.js', 'interpretation.js', 'brand.svg', 'globe.js', 'earth-blue-marble.jpg', 'source-sans-3.woff2', 'source-sans-3-LICENSE.txt',
  'reception-experience.js', 'signal-example.mp3', 'signal-example.json', 'signal-waterfall.webp', 'signal-decoded-preview.webp']) {
  fs.copyFileSync(file, 'dist/' + file);
}

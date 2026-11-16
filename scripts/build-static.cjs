const fs = require('node:fs');

for (const file of ['index.html', 'style.css', 'app.js', 'explorer.js', 'interpretation.js', 'brand.svg', 'globe.js', 'earth-blue-marble.jpg']) {
  fs.copyFileSync(file, 'dist/' + file);
}

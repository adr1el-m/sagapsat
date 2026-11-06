const fs=require('node:fs');for(const file of ['index.html','style.css','app.js','explorer.js','interpretation.js','brand.svg'])if(fs.existsSync(file))fs.copyFileSync(file,'dist/'+file);

const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (f === 'node_modules' || f === '.git' || f === 'dist' || f === 'build' || f === '.next') return;
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('d:/fyeshi/project/traveller', (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.json') || filePath.endsWith('.html') || filePath.endsWith('.css') || filePath.endsWith('.md')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let newContent = content.replace(/TripMind/g, 'Roamie')
                            .replace(/tripmind/g, 'roamie')
                            .replace(/TRIPMIND/g, 'ROAMIE');
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log('Updated', filePath);
    }
  }
});

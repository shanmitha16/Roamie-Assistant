const fs = require('fs');
const path = require('path');

const dir = 'd:/fyeshi/project/traveller/apps/api/src/adapters/controllers';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  content = content.replace(/res\.status\(\)\.json\(\)/g, "res.status(404).json({ error: 'Not found' })");
  fs.writeFileSync(filePath, content);
});

console.log('Fixed res.status().json()');

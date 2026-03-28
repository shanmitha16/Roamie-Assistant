const fs = require('fs');
const path = require('path');

const dir = 'd:/fyeshi/project/traveller/apps/api/src/adapters/controllers';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace `if (condition) res.status(xyz).json(abc);\n return;` 
  // with `if (condition) { res.status(xyz).json(abc); return; }`
  content = content.replace(/if\s*\((.*?)\)\s*res\.status\((.*?)\)\.json\((.*?)\);\s*return;/g, 
    'if ($1) { res.status($2).json($3); return; }');

  // Also replace `if (condition) res.status(xyz).send(abc);\n return;` if any
  content = content.replace(/if\s*\((.*?)\)\s*res\.status\((.*?)\)\.send\((.*?)\);\s*return;/g, 
    'if ($1) { res.status($2).send($3); return; }');

  fs.writeFileSync(filePath, content);
});

console.log('Fixed all controllers');

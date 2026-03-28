const fs=require('fs');
const path=require('path');
const dirs = [
  'd:/fyeshi/project/traveller/apps/api/src/adapters/controllers',
  'd:/fyeshi/project/traveller/apps/api/src/infrastructure/middleware'
];

dirs.forEach(dir => {
  const files = fs.readdirSync(dir).filter(f=>f.endsWith('.ts'));
  files.forEach(file=>{
    const p=path.join(dir,file);
    let c=fs.readFileSync(p,'utf8');
    
    // Replace: return res.status(XXX).json(YYY);
    // With: res.status(XXX).json(YYY); return;
    const n = c.replace(/return\s+res\.status\((.*?)\)\.json\(([\s\S]*?)\);/g, 'res.status($1).json($2);\n      return;');
    
    // Also replace: return res.json(YYY);
    // With: res.json(YYY); return;
    const n2 = n.replace(/return\s+res\.json\(([\s\S]*?)\);/g, 'res.json($1);\n      return;');

    if(c!==n2){
      fs.writeFileSync(p,n2);
      console.log('Updated ' + file);
    }
  });
});

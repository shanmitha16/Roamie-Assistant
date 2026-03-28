const fs = require('fs');

const bPath = 'd:/fyeshi/project/traveller/apps/api/src/adapters/controllers/booking-suggestions.controller.ts';
let bContent = fs.readFileSync(bPath, 'utf8');
bContent = bContent.replace('if (!trip) res.status().json();', 'if (!trip) { res.status(404).json({ error: "Trip not found" }); return; }');
fs.writeFileSync(bPath, bContent);

const cPath = 'd:/fyeshi/project/traveller/apps/api/src/adapters/controllers/checklist.controller.ts';
let cContent = fs.readFileSync(cPath, 'utf8');
cContent = cContent.replace(/return\s+res\.status\((.*?)\)\.json\((.*?)\);/g, 'res.status($1).json($2);\n      return;');
fs.writeFileSync(cPath, cContent);

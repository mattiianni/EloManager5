const fs = require('fs');
const file = 'pages/StatistichePage.tsx';
let content = fs.readFileSync(file, 'utf8');

// The playerKey function is already in scope:
// const playerKey = (p: { name: string; surname: string }) => `${p.name}`.trim().toLowerCase() + '|' + `${p.surname}`.trim().toLowerCase();

content = content.replace(/p => p\.id === s\.id/g, 'p => playerKey(p) === playerKey(s)');

fs.writeFileSync(file, content);
console.log('Fixed p.id === s.id to playerKey(p) === playerKey(s)');

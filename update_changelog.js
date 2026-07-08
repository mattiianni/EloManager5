const fs = require('fs');
const changelog = fs.readFileSync('CHANGELOG.md', 'utf-8');
const newEntry = `## v5.0.2
- Mostrati i punteggi per singolo set anziché il totale games in Dashboard e Profilo Giocatore
- Aggiunta validazione (minimo 2 lettere per nome e cognome) in creazione e modifica giocatore
- Rimossi giocatori senza nome dal database di produzione
- Fixati dettagli minori nella visualizzazione dei tabelloni

`;
const newChangelog = changelog.replace('## v5.0.1', newEntry + '## v5.0.1');
fs.writeFileSync('CHANGELOG.md', newChangelog);
console.log("CHANGELOG.md updated");

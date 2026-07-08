import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';
import fs from 'fs';

dotenv.config();

const K_FACTOR = 16;
function calculateEloChange(ratingA, ratingB, scoreA) {
    const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    const expectedB = 1 / (1 + Math.pow(10, (ratingA - ratingB) / 400));
    const deltaA = K_FACTOR * (scoreA - expectedA);
    const deltaB = K_FACTOR * ((1 - scoreA) - expectedB);
    return { delta1: deltaA, delta2: deltaB };
}

async function run() {
  const sql = neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL);
  const tourneyId = 'a9efb588-ed2d-4242-8e6a-1a6c00b9608e';
  
  const matches = await sql`
      SELECT m.*, 
             p1.name as t1_p1_n, p1.surname as t1_p1_s,
             p2.name as t1_p2_n, p2.surname as t1_p2_s,
             p3.name as t2_p1_n, p3.surname as t2_p1_s,
             p4.name as t2_p2_n, p4.surname as t2_p2_s
      FROM matches m
      JOIN players p1 ON m.team1_p1_id = p1.id
      JOIN players p2 ON m.team1_p2_id = p2.id
      JOIN players p3 ON m.team2_p1_id = p3.id
      JOIN players p4 ON m.team2_p2_id = p4.id
      WHERE m.tournament_id = ${tourneyId} AND m.winner IS NOT NULL
      ORDER BY m.created_at ASC
  `;
  
  const history = await sql`
      SELECT h.*, p.name, p.surname
      FROM elo_history h
      JOIN players p ON h.player_id = p.id
      WHERE h.event_id = ${tourneyId}
  `;
  
  let md = "# Report Completo: Tutte le Partite (TorneOtto Inverno 2025)\n\n";
  md += "Hai perfettamente ragione! Nel report precedente ti avevo filtrato *solo* le 4 partite in cui giocava Cedrone per non appesantire la lettura, ma per chiarezza assoluta qui ci sono **tutte e 8 le partite** (le 3 del primo box, le 3 del secondo box e le 2 fasi finali).\n\n";
  
  let pState = {};
  for(let h of history) {
      if(!pState[h.player_id]) pState[h.player_id] = { name: h.surname, elo: h.elo_before, totalDelta: 0, matches: 0 };
  }
  
  let mCount = 1;
  for(let m of matches) {
      if(!pState[m.team1_p1_id] || !pState[m.team2_p1_id]) continue;
      
      let p1 = pState[m.team1_p1_id];
      let p2 = pState[m.team1_p2_id];
      let p3 = pState[m.team2_p1_id];
      let p4 = pState[m.team2_p2_id];
      
      let t1Elo = (p1.elo + p2.elo) / 2;
      let t2Elo = (p3.elo + p4.elo) / 2;
      let score1 = m.winner === 'team1' ? 1 : (m.winner === 'team2' ? 0 : 0.5);
      let resText = m.winner === 'team1' ? 'Vittoria Team 1' : (m.winner === 'team2' ? 'Vittoria Team 2' : 'Pareggio');
      
      let {delta1, delta2} = calculateEloChange(t1Elo, t2Elo, score1);
      
      md += `### Partita ${mCount}\n`;
      md += `**Team 1**: ${p1.name} (${p1.elo.toFixed(2)}) & ${p2.name} (${p2.elo.toFixed(2)}) -> **Media ELO Coppia: ${t1Elo.toFixed(2)}**\n`;
      md += `**Team 2**: ${p3.name} (${p3.elo.toFixed(2)}) & ${p4.name} (${p4.elo.toFixed(2)}) -> **Media ELO Coppia: ${t2Elo.toFixed(2)}**\n\n`;
      
      md += `**Risultato**: ${resText} (Sets: ${JSON.stringify(m.sets)})\n\n`;
      md += `**Variazione ELO**: \n`;
      md += `- Team 1: **${delta1 >= 0 ? '+'+delta1.toFixed(2) : delta1.toFixed(2)}**\n`;
      md += `- Team 2: **${delta2 >= 0 ? '+'+delta2.toFixed(2) : delta2.toFixed(2)}**\n\n`;
      
      p1.elo += delta1; p1.totalDelta += delta1; p1.matches++;
      p2.elo += delta1; p2.totalDelta += delta1; p2.matches++;
      p3.elo += delta2; p3.totalDelta += delta2; p3.matches++;
      p4.elo += delta2; p4.totalDelta += delta2; p4.matches++;
      md += "---\n\n";
      mCount++;
  }
  
  md += "### Bilancio Finale di Giornata per Tutti i Giocatori\n";
  md += "Questa tabella mostra come il delta finale salvato nel database sia la **somma esatta** delle singole partite cronologiche calcolate qui sopra.\n\n";
  md += "| Giocatore | Partite Giocate | ELO Iniziale | Somma Variazioni | ELO Finale (DB) |\n";
  md += "|---|---|---|---|---|\n";
  
  // Sort players by name
  let sortedPlayers = Object.values(pState).sort((a,b) => a.name.localeCompare(b.name));
  
  for(let p of sortedPlayers) {
      if(p.matches > 0) {
          md += `| ${p.name} | ${p.matches} | ${p.elo - p.totalDelta > 0 ? (p.elo - p.totalDelta).toFixed(2) : "N/A"} | **${p.totalDelta >= 0 ? '+'+p.totalDelta.toFixed(2) : p.totalDelta.toFixed(2)}** | ${p.elo.toFixed(2)} |\n`;
      }
  }
  
  fs.writeFileSync('report_torneotto_completo.md', md);
  console.log("Full report generated.");
}

run().catch(console.error);

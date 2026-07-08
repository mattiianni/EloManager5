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
  
  let md = "# Report Dettagliato: TorneOtto Inverno 2025\n\n";
  md += "Come richiesto, ecco la scomposizione passo-passo, partita per partita, di un tuo torneo reale per dimostrare come i valori cambino e si accumulino in modo dinamico e chirurgico.\n\n";
  md += "Analizziamo le 4 partite del primo Box (Cedrone, Verduci, Marianelli, Parentini).\n\n";
  
  let pState = {};
  for(let h of history) {
      if(!pState[h.player_id]) pState[h.player_id] = { name: h.surname, elo: h.elo_before, totalDelta: 0 };
  }
  
  let mCount = 1;
  for(let m of matches) {
      if(!pState[m.team1_p1_id] || !pState[m.team2_p1_id]) continue;
      
      let p1 = pState[m.team1_p1_id];
      let p2 = pState[m.team1_p2_id];
      let p3 = pState[m.team2_p1_id];
      let p4 = pState[m.team2_p2_id];
      
      if(p1.name !== 'Cedrone' && p2.name !== 'Cedrone' && p3.name !== 'Cedrone' && p4.name !== 'Cedrone') continue;
      
      let t1Elo = (p1.elo + p2.elo) / 2;
      let t2Elo = (p3.elo + p4.elo) / 2;
      let score1 = m.winner === 'team1' ? 1 : (m.winner === 'team2' ? 0 : 0.5);
      
      let {delta1, delta2} = calculateEloChange(t1Elo, t2Elo, score1);
      
      md += `### Partita ${mCount}\n`;
      md += `**Team 1**: ${p1.name} (${p1.elo.toFixed(2)}) & ${p2.name} (${p2.elo.toFixed(2)}) -> **Media: ${t1Elo.toFixed(2)}**\n`;
      md += `**Team 2**: ${p3.name} (${p3.elo.toFixed(2)}) & ${p4.name} (${p4.elo.toFixed(2)}) -> **Media: ${t2Elo.toFixed(2)}**\n\n`;
      
      md += `**Risultato**: Ha vinto il ${m.winner === 'team1' ? 'Team 1' : 'Team 2'} (${JSON.stringify(m.sets)})\n\n`;
      md += `**Variazione ELO calcolata**: \n`;
      md += `- Team 1: **${delta1 >= 0 ? '+'+delta1.toFixed(2) : delta1.toFixed(2)}**\n`;
      md += `- Team 2: **${delta2 >= 0 ? '+'+delta2.toFixed(2) : delta2.toFixed(2)}**\n\n`;
      
      p1.elo += delta1; p1.totalDelta += delta1;
      p2.elo += delta1; p2.totalDelta += delta1;
      p3.elo += delta2; p3.totalDelta += delta2;
      p4.elo += delta2; p4.totalDelta += delta2;
      mCount++;
  }
  
  md += "### Bilancio Finale di Giornata\n";
  md += "| Giocatore | ELO Partenza | Somma Variazioni | ELO Finale (DB) |\n";
  md += "|---|---|---|---|\n";
  for(let h of history) {
      if(h.surname === 'Cedrone' || h.surname === 'Verduci' || h.surname === 'Marianelli' || h.surname === 'Parentini') {
         let p = pState[h.player_id];
         md += `| ${h.surname} | ${h.elo_before.toFixed(2)} | **${p.totalDelta >= 0 ? '+'+p.totalDelta.toFixed(2) : p.totalDelta.toFixed(2)}** | ${p.elo.toFixed(2)} |\n`;
      }
  }
  
  fs.writeFileSync('report_torneotto.md', md);
  console.log("Report generated.");
}

run().catch(console.error);

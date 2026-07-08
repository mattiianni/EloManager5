import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL.trim().replace(/^['"]|['"]$/g, ''));

function calculateEloChange(elo1, elo2, score1) {
    const expectedScore1 = 1 / (1 + Math.pow(10, (elo2 - elo1) / 400));
    const expectedScore2 = 1 - expectedScore1;
    const score2 = 1 - score1;
    const kFactor1 = 16;
    const kFactor2 = 16;
    const delta1 = kFactor1 * (score1 - expectedScore1);
    const delta2 = kFactor2 * (score2 - expectedScore2);
    return { delta1, delta2 };
}

async function run() {
    console.log("🚀 Starting Full ELO Recalculation Script...");
    
    await sql`UPDATE players SET current_elo = initial_elo`;
    console.log("✅ Reset all players to initial_elo");
    
    await sql`DELETE FROM elo_history`;
    console.log("✅ Cleared elo_history");
    
    const normalMatches = await sql`
        SELECT m.id, m.date, m.team1_p1_id, m.team1_p2_id, m.team2_p1_id, m.team2_p2_id, m.winner, m.tournament_id, t.type as tournament_type, t.workspace_id, t.name as tournament_name
        FROM matches m
        JOIN tournaments t ON m.tournament_id = t.id
        WHERE m.winner IS NOT NULL
        ORDER BY m.date ASC
    `;
    
    const teamMatches = await sql`
        SELECT tm.id, tm.team1_players, tm.team2_players, tm.winner as team_winner, tm.matchday_id, md.date, md.phase, t.type as tournament_type, t.workspace_id, t.name as tournament_name, t.id as tournament_id
        FROM team_tournament_matchday_matches tm
        JOIN team_tournament_matchdays md ON tm.matchday_id = md.id
        JOIN tournaments t ON md.tournament_day_id = t.id
        WHERE tm.winner IS NOT NULL AND tm.cancelled = FALSE
        ORDER BY md.date ASC
    `;
    
    const allMatches = [];
    for (const m of normalMatches) {
        allMatches.push({ ...m, isTeamMatch: false, sortDate: new Date(m.date) });
    }
    for (const m of teamMatches) {
        allMatches.push({ ...m, isTeamMatch: true, sortDate: new Date(m.date) });
    }
    allMatches.sort((a, b) => a.sortDate - b.sortDate);
    
    console.log(`✅ Fetched ${allMatches.length} total matches`);
    
    let processed = 0;
    const playerCache = {};

    const nameToIdMap = {}; // workspace_id -> "name surname" -> id
    const allPlayersRes = await sql`SELECT id, name, surname, current_elo, workspace_id FROM players`;
    for (const p of allPlayersRes) {
        playerCache[p.id] = parseFloat(p.current_elo);
        if (!nameToIdMap[p.workspace_id]) nameToIdMap[p.workspace_id] = {};
            const key = `${p.name.trim().toLowerCase()} ${p.surname.trim().toLowerCase()}`;
            nameToIdMap[p.workspace_id][key] = p.id;
        }

        const getPlayer = async (id) => {
            return playerCache[id] !== undefined ? playerCache[id] : null;
        };

        for (const match of allMatches) {
            let team1Ids = [];
            let team2Ids = [];
            let score1 = 0;
            
            if (match.isTeamMatch) {
                const extractId = (item, wsId) => {
                    if (!item) return null;
                    if (typeof item === 'string') return item;
                    if (typeof item === 'object') {
                        if (item.id) return item.id;
                        if (item.name && item.surname && nameToIdMap[wsId]) {
                            const key = `${item.name.trim().toLowerCase()} ${item.surname.trim().toLowerCase()}`;
                            if (nameToIdMap[wsId][key]) return nameToIdMap[wsId][key];
                        }
                    }
                    return null;
                };
                team1Ids = (match.team1_players || []).map(x => extractId(x, match.workspace_id)).filter(Boolean);
                team2Ids = (match.team2_players || []).map(x => extractId(x, match.workspace_id)).filter(Boolean);
            if (match.team_winner === 'team1') score1 = 1;
            else if (match.team_winner === 'team2') score1 = 0;
            else if (match.team_winner === 'draw') score1 = 0.5;
            else continue;
        } else {
            team1Ids = [match.team1_p1_id, match.team1_p2_id].filter(Boolean);
            team2Ids = [match.team2_p1_id, match.team2_p2_id].filter(Boolean);
            if (match.winner === 'team1') score1 = 1;
            else if (match.winner === 'team2') score1 = 0;
            else if (match.winner === 'draw') score1 = 0.5;
            else continue;
        }
        
        if (team1Ids.length === 0 || team2Ids.length === 0) continue;
        
        const validT1 = [];
        const validT2 = [];
        for (const id of team1Ids) { if (await getPlayer(id) !== null) validT1.push(id); }
        for (const id of team2Ids) { if (await getPlayer(id) !== null) validT2.push(id); }
        
        if (validT1.length === 0 || validT2.length === 0) continue;
        
        const t1EloAvg = validT1.reduce((sum, id) => sum + playerCache[id], 0) / validT1.length;
        const t2EloAvg = validT2.reduce((sum, id) => sum + playerCache[id], 0) / validT2.length;
        
        const { delta1, delta2 } = calculateEloChange(t1EloAvg, t2EloAvg, score1);
        
        for (const id of validT1) {
            const oldElo = playerCache[id];
            const newElo = oldElo + delta1;
            await sql`UPDATE players SET current_elo = ${newElo} WHERE id = ${id}`;
            await sql`
                INSERT INTO elo_history (event_id, player_id, elo_before, elo_after, delta, date, type, workspace_id, source_label)
                VALUES (${match.isTeamMatch ? match.matchday_id : match.id}, ${id}, ${oldElo}, ${newElo}, ${delta1}, ${match.sortDate.toISOString()}, ${match.isTeamMatch ? 'team_tournament_matchday' : 'tournament'}, ${match.workspace_id}, ${match.tournament_name})
            `;
            playerCache[id] = newElo;
        }
        for (const id of validT2) {
            const oldElo = playerCache[id];
            const newElo = oldElo + delta2;
            await sql`UPDATE players SET current_elo = ${newElo} WHERE id = ${id}`;
            await sql`
                INSERT INTO elo_history (event_id, player_id, elo_before, elo_after, delta, date, type, workspace_id, source_label)
                VALUES (${match.isTeamMatch ? match.matchday_id : match.id}, ${id}, ${oldElo}, ${newElo}, ${delta2}, ${match.sortDate.toISOString()}, ${match.isTeamMatch ? 'team_tournament_matchday' : 'tournament'}, ${match.workspace_id}, ${match.tournament_name})
            `;
            playerCache[id] = newElo;
        }
        processed++;
    }
    
    console.log(`🎉 ELO recalculation complete! Processed ${processed} matches.`);
    
    const fs = await import('fs/promises');
    const taskPath = '../brain/a0b8cf76-f62b-444c-b075-1d1cc2886b24/task.md';
    try {
        let taskContent = await fs.readFile(taskPath, 'utf8');
        taskContent = taskContent.replace('- [ ] Create `scripts/recalculate_team_elo.js`', '- [x] Create `scripts/recalculate_team_elo.js`');
        taskContent = taskContent.replace('- [ ] Run ELO recalculation script', '- [x] Run ELO recalculation script');
        await fs.writeFile(taskPath, taskContent);
    } catch(e) {}
}

run();

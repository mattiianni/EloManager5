import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

let DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (DATABASE_URL) {
    DATABASE_URL = DATABASE_URL.trim().replace(/^["']|["']$/g, '');
}

if (!DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
}

const sql = neon(DATABASE_URL);

async function runMigration() {
    console.log('Avviando migrazione retroattiva team players (Fase 1)...');
    try {
        // Step 1: Migrate team_tournament_teams
        const teams = await sql`
            SELECT ttt.id, ttt.players, ttt.players_linked, t.workspace_id 
            FROM team_tournament_teams ttt
            JOIN tournaments t ON ttt.tournament_id = t.id
        `;
        console.log(`Trovati ${teams.length} team da elaborare.`);

        for (const team of teams) {
            let updatedPlayersLinked = [...(team.players_linked || [])];
            let needsUpdate = false;
            
            // old players format: [{name, surname, ...}]
            const oldPlayers = team.players || [];
            
            for (const p of oldPlayers) {
                // Check if already linked
                const alreadyLinked = updatedPlayersLinked.find(
                    l => l.name.toLowerCase() === p.name.toLowerCase() && l.surname.toLowerCase() === p.surname.toLowerCase()
                );
                
                if (!alreadyLinked || !alreadyLinked.id) {
                    needsUpdate = true;
                    // Find in global players table
                    const existing = await sql`
                        SELECT id FROM players 
                        WHERE workspace_id = ${team.workspace_id} 
                        AND LOWER(name) = LOWER(${p.name}) 
                        AND LOWER(surname) = LOWER(${p.surname})
                        LIMIT 1
                    `;
                    
                    let playerId;
                    if (existing.length > 0) {
                        playerId = existing[0].id;
                        console.log(`Trovato giocatore globale per ${p.name} ${p.surname}: ${playerId}`);
                    } else {
                        // Create new player
                        const insertRes = await sql`
                            INSERT INTO players (workspace_id, name, surname, position, current_elo, initial_elo)
                            VALUES (${team.workspace_id}, ${p.name}, ${p.surname}, 'Indifferente', 1500, 1500)
                            RETURNING id
                        `;
                        playerId = insertRes[0].id;
                        console.log(`Creato NUOVO giocatore globale per ${p.name} ${p.surname}: ${playerId}`);
                    }
                    
                    // Add to linked
                    if (alreadyLinked) {
                        alreadyLinked.id = playerId;
                    } else {
                        updatedPlayersLinked.push({
                            id: playerId,
                            name: p.name,
                            surname: p.surname
                        });
                    }
                }
            }
            
            if (needsUpdate) {
                await sql`
                    UPDATE team_tournament_teams 
                    SET players_linked = ${JSON.stringify(updatedPlayersLinked)}
                    WHERE id = ${team.id}
                `;
                console.log(`Team ${team.id} aggiornato.`);
            }
        }
        
        // Step 2: Migrate team_tournament_matchday_matches
        const matches = await sql`
            SELECT ttmm.id, ttmm.team1_players, ttmm.team2_players, ttmm.team1_player_ids, ttmm.team2_player_ids, t.workspace_id 
            FROM team_tournament_matchday_matches ttmm
            JOIN team_tournament_matchdays ttm ON ttmm.matchday_id = ttm.id
            JOIN tournaments t ON ttm.root_tournament_id = t.id
        `;
        console.log(`Trovati ${matches.length} matches da elaborare.`);
        
        for (const match of matches) {
            let t1Ids = [...(match.team1_player_ids || [])];
            let t2Ids = [...(match.team2_player_ids || [])];
            let needsUpdate = false;
            
            const getIdsForTeam = async (playersList, existingIds) => {
                let ids = [...existingIds];
                let changed = false;
                for (let i = 0; i < playersList.length; i++) {
                    const p = playersList[i];
                    if (!ids[i]) {
                        changed = true;
                        const existing = await sql`
                            SELECT id FROM players 
                            WHERE workspace_id = ${match.workspace_id} 
                            AND LOWER(name) = LOWER(${p.name}) 
                            AND LOWER(surname) = LOWER(${p.surname})
                            LIMIT 1
                        `;
                        if (existing.length > 0) {
                            ids[i] = existing[0].id;
                        } else {
                            // This shouldn't happen if step 1 worked correctly
                            console.warn(`Attenzione: giocatore ${p.name} ${p.surname} non trovato nel DB globale durante migrazione match!`);
                            ids[i] = null;
                        }
                    }
                }
                return { ids, changed };
            };
            
            const t1Res = await getIdsForTeam(match.team1_players || [], t1Ids);
            const t2Res = await getIdsForTeam(match.team2_players || [], t2Ids);
            
            if (t1Res.changed || t2Res.changed) {
                await sql`
                    UPDATE team_tournament_matchday_matches
                    SET team1_player_ids = ${JSON.stringify(t1Res.ids)},
                        team2_player_ids = ${JSON.stringify(t2Res.ids)}
                    WHERE id = ${match.id}
                `;
                console.log(`Match ${match.id} aggiornato.`);
            }
        }

        console.log('Migrazione Fase 1 completata con successo!');
    } catch (error) {
        console.error('Errore durante la migrazione:', error);
    }
}

runMigration();

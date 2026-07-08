import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL.trim().replace(/^['"]|['"]$/g, ''));

async function isolateWorkspaces() {
    console.log("🚀 Starting Workspace Isolation Script...");

    try {
        // 1. ISOLATE REGULAR MATCHES
        console.log("\n--- Checking Regular Matches ---");
        const matchColumns = ['team1_p1_id', 'team1_p2_id', 'team2_p1_id', 'team2_p2_id'];
        
        for (const col of matchColumns) {
            const query = `
                SELECT m.id as match_id, m.tournament_id, m.${col} as player_id, t.workspace_id as correct_workspace, p.name, p.surname, p.position, p.workspace_id as wrong_workspace
                FROM matches m
                JOIN tournaments t ON m.tournament_id = t.id
                JOIN players p ON m.${col} = p.id
                WHERE p.workspace_id != t.workspace_id
            `;
            const badMatches = await sql(query);
            
            if (badMatches.length > 0) {
                console.log(`Found ${badMatches.length} cross-workspace references in column ${col}`);
                
                for (const row of badMatches) {
                    let correctPlayer = await sql`
                        SELECT id FROM players 
                        WHERE name = ${row.name} AND surname = ${row.surname} AND workspace_id = ${row.correct_workspace}
                        LIMIT 1
                    `;
                    
                    let newId;
                    if (correctPlayer.length > 0) {
                        newId = correctPlayer[0].id;
                    } else {
                        console.log(`Creating duplicate player for ${row.name} ${row.surname} in workspace ${row.correct_workspace}`);
                        const newPlayer = await sql`
                            INSERT INTO players (name, surname, position, current_elo, initial_elo, workspace_id)
                            VALUES (${row.name}, ${row.surname}, ${row.position || 'right'}, 1500, 1500, ${row.correct_workspace})
                            RETURNING id
                        `;
                        newId = newPlayer[0].id;
                    }
                    
                    const updateQuery = `UPDATE matches SET ${col} = '${newId}' WHERE id = '${row.match_id}'`;
                    await sql(updateQuery);
                }
            } else {
                console.log(`✅ No cross-references found in ${col}`);
            }
        }

        // 2. ISOLATE TEAM TOURNAMENT TEAMS (players_linked)
        console.log("\n--- Checking Team Tournament Teams ---");
        const teams = await sql`
            SELECT tt.id, tt.players_linked, t.workspace_id
            FROM team_tournament_teams tt
            JOIN tournaments t ON tt.tournament_id = t.id
        `;
        
        let teamsUpdated = 0;
        for (const team of teams) {
            if (!team.players_linked || !Array.isArray(team.players_linked)) continue;
            
            let updated = false;
            const newPlayersLinked = [];
            
            for (const p of team.players_linked) {
                if (!p.id) {
                    newPlayersLinked.push(p);
                    continue;
                }
                
                const playerRes = await sql`SELECT workspace_id, name, surname, position FROM players WHERE id = ${p.id}`;
                if (playerRes.length === 0) {
                    newPlayersLinked.push(p);
                    continue;
                }
                
                if (playerRes[0].workspace_id !== team.workspace_id) {
                    updated = true;
                    let correctPlayer = await sql`
                        SELECT id FROM players 
                        WHERE name = ${playerRes[0].name} AND surname = ${playerRes[0].surname} AND workspace_id = ${team.workspace_id}
                        LIMIT 1
                    `;
                    
                    let newId;
                    if (correctPlayer.length > 0) {
                        newId = correctPlayer[0].id;
                    } else {
                        console.log(`Creating duplicate player for ${playerRes[0].name} ${playerRes[0].surname} in workspace ${team.workspace_id}`);
                        const newPlayer = await sql`
                            INSERT INTO players (name, surname, position, current_elo, initial_elo, workspace_id)
                            VALUES (${playerRes[0].name}, ${playerRes[0].surname}, ${playerRes[0].position || 'right'}, 1500, 1500, ${team.workspace_id})
                            RETURNING id
                        `;
                        newId = newPlayer[0].id;
                    }
                    
                    newPlayersLinked.push({ id: newId, name: p.name, surname: p.surname });
                } else {
                    newPlayersLinked.push(p);
                }
            }
            
            if (updated) {
                await sql`
                    UPDATE team_tournament_teams 
                    SET players_linked = ${JSON.stringify(newPlayersLinked)}
                    WHERE id = ${team.id}
                `;
                teamsUpdated++;
            }
        }
        console.log(`✅ Updated ${teamsUpdated} teams with correct player IDs`);

        // 3. ISOLATE TEAM TOURNAMENT MATCHES (team1_player_ids, team2_player_ids)
        console.log("\n--- Checking Team Tournament Matches ---");
        const teamMatches = await sql`
            SELECT tm.id, tm.team1_player_ids, tm.team2_player_ids, t.workspace_id
            FROM team_tournament_matchday_matches tm
            JOIN team_tournament_matchdays md ON tm.matchday_id = md.id
            JOIN tournaments t ON md.tournament_day_id = t.id
        `;
        
        let teamMatchesUpdated = 0;
        
        for (const tm of teamMatches) {
            let updated = false;
            
            const processArray = async (idsArray) => {
                if (!idsArray || !Array.isArray(idsArray)) return idsArray;
                const newArr = [];
                for (const pid of idsArray) {
                    const playerRes = await sql`SELECT workspace_id, name, surname, position FROM players WHERE id = ${pid}`;
                    if (playerRes.length === 0 || playerRes[0].workspace_id === tm.workspace_id) {
                        newArr.push(pid);
                    } else {
                        updated = true;
                        let correctPlayer = await sql`
                            SELECT id FROM players 
                            WHERE name = ${playerRes[0].name} AND surname = ${playerRes[0].surname} AND workspace_id = ${tm.workspace_id}
                            LIMIT 1
                        `;
                        
                        let newId;
                        if (correctPlayer.length > 0) {
                            newId = correctPlayer[0].id;
                        } else {
                            console.log(`Creating duplicate player for ${playerRes[0].name} ${playerRes[0].surname} in workspace ${tm.workspace_id}`);
                            const newPlayer = await sql`
                                INSERT INTO players (name, surname, position, current_elo, initial_elo, workspace_id)
                                VALUES (${playerRes[0].name}, ${playerRes[0].surname}, ${playerRes[0].position || 'right'}, 1500, 1500, ${tm.workspace_id})
                                RETURNING id
                            `;
                            newId = newPlayer[0].id;
                        }
                        newArr.push(newId);
                    }
                }
                return newArr;
            };
            
            const newT1 = await processArray(tm.team1_player_ids);
            const newT2 = await processArray(tm.team2_player_ids);
            
            if (updated) {
                await sql`
                    UPDATE team_tournament_matchday_matches 
                    SET team1_player_ids = ${JSON.stringify(newT1)}, team2_player_ids = ${JSON.stringify(newT2)}
                    WHERE id = ${tm.id}
                `;
                teamMatchesUpdated++;
            }
        }
        console.log(`✅ Updated ${teamMatchesUpdated} team matches with correct player IDs`);

        console.log("\n🎉 Isolation complete! Run the recalculation script next.");
        
        // Mark task done
        const fs = await import('fs/promises');
        const taskPath = '../brain/a0b8cf76-f62b-444c-b075-1d1cc2886b24/task.md';
        try {
            let taskContent = await fs.readFile(taskPath, 'utf8');
            taskContent = taskContent.replace('- [/] Create `scripts/isolate_workspaces.js`', '- [x] Create `scripts/isolate_workspaces.js`');
            taskContent = taskContent.replace('- [ ] Run workspace isolation script', '- [x] Run workspace isolation script');
            taskContent = taskContent.replace('- [ ] Create `scripts/recalculate_team_elo.js`', '- [/] Create `scripts/recalculate_team_elo.js`');
            await fs.writeFile(taskPath, taskContent);
        } catch(e) {}
    } catch (e) {
        console.error("Error isolating workspaces:", e);
    }
}

isolateWorkspaces();

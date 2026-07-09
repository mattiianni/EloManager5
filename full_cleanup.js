import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_QaHw1W3GbcON@ep-crimson-recipe-aglh7bqf-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require');

async function run() {
    try {
        const wid = 'a2664ea3-42bf-447e-b76a-3987380900e2';
        
        // Clean up orphaned elo_history for team_tournament_matchday where the matchday doesn't exist
        const deletedElo = await sql`
            DELETE FROM elo_history e
            WHERE workspace_id = ${wid}
            AND type = 'team_tournament_matchday'
            AND NOT EXISTS (
                SELECT 1 FROM team_tournament_matchdays m WHERE m.id = e.event_id
            )
            RETURNING id;
        `;
        console.log('Deleted orphaned elo_history:', deletedElo.length);

        // Run player cleanup
        const res = await sql`
            DELETE FROM players 
            WHERE workspace_id = ${wid}
            AND NOT EXISTS (SELECT 1 FROM elo_history WHERE player_id = players.id)
            AND NOT EXISTS (SELECT 1 FROM matches WHERE team1_p1_id = players.id OR team1_p2_id = players.id OR team2_p1_id = players.id OR team2_p2_id = players.id)
            AND id NOT IN (SELECT (elem)::uuid FROM team_tournament_teams, jsonb_array_elements_text(players) elem WHERE elem ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
            RETURNING id, name, surname;
        `;
        console.log('Deleted orphaned players:', res.length);

        const players = await sql`SELECT count(*) FROM players WHERE workspace_id = ${wid}`;
        console.log('Total players left:', players);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();

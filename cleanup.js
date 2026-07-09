import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_QaHw1W3GbcON@ep-crimson-recipe-aglh7bqf-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require');

async function run() {
    try {
        const res = await sql`
            DELETE FROM players 
            WHERE workspace_id = '3d23914d-4b49-4f46-a1bc-ad532fe16845'
            AND NOT EXISTS (SELECT 1 FROM elo_history WHERE player_id = players.id)
            AND NOT EXISTS (SELECT 1 FROM matches WHERE team1_p1_id = players.id OR team1_p2_id = players.id OR team2_p1_id = players.id OR team2_p2_id = players.id)
            AND id NOT IN (SELECT (elem)::uuid FROM team_tournament_teams, jsonb_array_elements_text(players) elem WHERE elem ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
            RETURNING id, name, surname;
        `;
        console.log('Deleted orphaned players:', res.length);
        console.log(res);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();

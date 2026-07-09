import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_QaHw1W3GbcON@ep-crimson-recipe-aglh7bqf-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require');

async function run() {
    try {
        const wid = '3d23914d-4b49-4f46-a1bc-ad532fe16845';
        const tournaments = await sql`SELECT id, name, type, status FROM tournaments WHERE workspace_id = ${wid}`;
        console.log('Tournaments:', tournaments);

        const eloHist = await sql`SELECT type, event_id, count(*) as c FROM elo_history WHERE workspace_id = ${wid} GROUP BY type, event_id`;
        console.log('Elo History stats:', eloHist);

        const players = await sql`SELECT count(*) FROM players WHERE workspace_id = ${wid}`;
        console.log('Total players:', players);

        const orphaned_elo = await sql`
            SELECT e.id, e.event_id, e.type
            FROM elo_history e
            LEFT JOIN tournaments t ON e.event_id = t.id
            LEFT JOIN matches m ON e.event_id = m.id
            WHERE e.workspace_id = ${wid}
            AND t.id IS NULL AND m.id IS NULL;
        `;
        console.log('Orphaned elo_history (event no longer exists):', orphaned_elo.length);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
